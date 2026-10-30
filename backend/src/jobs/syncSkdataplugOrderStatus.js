const cron = require('node-cron');
const Order = require('../models/Order');
const SystemSettings = require('../models/SystemSettings');
const skdataplugApi = require('../utils/skdataplugApi');
const { processRefund, processStoreOrderRefund } = require('../utils/refund');
const { createNotification } = require('../controllers/notificationController');

let isSyncing = false;
let lastSyncAt = null;

const mapSkdataplugStatusToOrderStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'success' || normalized === 'delivered') return 'completed';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'in-progress') return 'processing';
  return 'pending';
};

const toSkdataplugProviderStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'success' || normalized === 'delivered') return 'Completed';
  if (normalized === 'failed' || normalized === 'error') return 'Failed';
  if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'in-progress') return 'Processing';
  return 'Pending';
};

const toDateOrNow = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
};

const extractSkdataplugOrder = (response = {}) => {
  const order = response?.order || response?.data || {};
  if (order && typeof order === 'object' && order.order) {
    return order.order;
  }
  return order;
};

const syncSkdataplugOrderStatus = async () => {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const settings = await SystemSettings.getSettings();
    const statusUpdateMethod = settings?.orderSettings?.statusUpdateMethod || 'cron';
    const syncIntervalMinutes = Math.max(1, Math.min(60, Number(settings?.orderSettings?.statusSyncIntervalMinutes || 5)));
    const batchLimit = Math.max(1, Math.min(500, Number(settings?.orderSettings?.statusSyncBatchLimit || 100)));

    if (lastSyncAt) {
      const elapsedMs = Date.now() - lastSyncAt.getTime();
      const waitMs = syncIntervalMinutes * 60 * 1000;
      if (elapsedMs < waitMs) {
        isSyncing = false;
        return;
      }
    }

    if (statusUpdateMethod !== 'cron') {
      isSyncing = false;
      return;
    }

    const activeProvider = settings?.vtuProvider || 'topza';
    if (activeProvider !== 'skdataplug') {
      isSyncing = false;
      return;
    }

    const orders = await Order.find({
      provider: 'skdataplug',
      status: { $in: ['pending', 'processing'] },
      paymentStatus: { $ne: 'failed' },
      $or: [
        { externalOrderId: { $ne: null } },
        { externalOrderNumber: { $ne: null } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(batchLimit);

    if (!orders.length) {
      isSyncing = false;
      return;
    }

    let updatedCount = 0;

    for (const order of orders) {
      const primaryIdentifier = order.externalOrderId || order.externalOrderNumber;
      if (!primaryIdentifier) continue;

      let statusResult = await skdataplugApi.getOrderStatus(primaryIdentifier);

      if (!statusResult.success && order.externalOrderId && order.externalOrderNumber && order.externalOrderNumber !== primaryIdentifier) {
        statusResult = await skdataplugApi.getOrderStatus(order.externalOrderNumber);
      }

      if (!statusResult.success) {
        continue;
      }

      const providerOrder = extractSkdataplugOrder(statusResult);
      const rawProviderStatus = providerOrder?.status || providerOrder?.orderStatus || providerOrder?.state || '';
      const normalizedProviderStatus = toSkdataplugProviderStatus(rawProviderStatus);
      const mappedStatus = mapSkdataplugStatusToOrderStatus(rawProviderStatus);

      const nextExternalOrderId = providerOrder?.id || providerOrder?.orderId || order.externalOrderId;
      const nextExternalOrderNumber = providerOrder?.orderNumber || order.externalOrderNumber;
      const statusChanged = order.status !== mappedStatus;
      const providerStatusChanged = String(order.providerStatus || '') !== String(normalizedProviderStatus || '');

      if (!statusChanged && !providerStatusChanged && nextExternalOrderId === order.externalOrderId && nextExternalOrderNumber === order.externalOrderNumber) {
        continue;
      }

      const beforeStatus = order.status;
      const isAdminModified = order.adminModified === true;

      order.status = mappedStatus;
      order.providerStatus = normalizedProviderStatus;
      order.externalOrderId = nextExternalOrderId || order.externalOrderId;
      order.externalOrderNumber = nextExternalOrderNumber || order.externalOrderNumber;
      order.providerMessage = `Service sync: ${normalizedProviderStatus}`;

      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }

      const lastHistory = order.statusHistory[order.statusHistory.length - 1];
      const shouldAppendHistory = !lastHistory || lastHistory.status !== mappedStatus;

      if (shouldAppendHistory) {
        order.statusHistory.push({
          status: mappedStatus,
          updatedAt: toDateOrNow(providerOrder?.updatedAt),
          source: 'service_sync',
          notes: `Service status: ${normalizedProviderStatus}`,
        });
      }

      if (mappedStatus === 'completed') {
        order.completedAt = toDateOrNow(providerOrder?.updatedAt);
        order.completedBy = 'system';
        if (order.paymentStatus !== 'failed') {
          order.paymentStatus = 'completed';
        }
        order.errorMessage = null;
      } else if (mappedStatus === 'failed') {
        order.completedAt = null;
        order.completedBy = null;
        order.errorMessage = `Service sync reported failed status${order.externalOrderNumber ? ` (${order.externalOrderNumber})` : ''}`;
      } else {
        order.completedAt = null;
        order.completedBy = null;
      }

      await order.save();

      if (!isAdminModified && mappedStatus === 'failed' && order.paymentStatus === 'completed' && !order.isRefunded) {
        if (order.source === 'store' && order.storeId) {
          const refundResult = await processStoreOrderRefund(order, normalizedProviderStatus || 'Service sync failure');
          console.log(`[Service Status Sync] Store order auto-refund result for order ${order.orderNumber}:`, refundResult);

          if (refundResult.success) {
            const Store = require('../models/Store');
            const store = await Store.findById(order.storeId).populate('owner', '_id name email');
            if (store && store.owner) {
              await createNotification({
                type: 'order_failed',
                title: 'Store Order Failed',
                message: `A customer order for ${order.dataAmount} (${order.phoneNumber}) failed after payment.`,
                description: `Order ${order.orderNumber} failed: ${normalizedProviderStatus || 'Service sync failure'}. Refund GHS ${refundResult.amountRefunded || 0}; commission recovery GHS ${refundResult.commissionRecovery || 0}; net wallet credit GHS ${refundResult.netWalletCredit || 0}. Please repurchase for the customer.`,
                severity: 'error',
                userId: store.owner._id,
                data: {
                  orderId: order._id.toString(),
                  orderNumber: order.orderNumber,
                  phoneNumber: order.phoneNumber,
                  dataAmount: order.dataAmount,
                  amount: order.amount,
                  storeId: order.storeId?.toString(),
                },
                actionUrl: `/store/orders`,
              });
            }
          }
        } else if (order.userId && !order.isGuest) {
          const refundResult = await processRefund(order, normalizedProviderStatus || 'Service sync failure');
          console.log(`[Service Status Sync] Auto-refund result for order ${order.orderNumber}:`, refundResult);

          if (refundResult.success) {
            await createNotification({
              type: 'refund',
              title: 'Order Failed - Refunded',
              message: `Your order ${order.orderNumber} failed and GHS ${(order.amount + (order.transactionCharge || 0)).toFixed(2)} has been refunded to your wallet.`,
              description: `The data purchase for ${order.phoneNumber} (${order.dataAmount}) failed. We have automatically refunded the full amount to your wallet.`,
              severity: 'warning',
              data: {
                userId: order.userId.toString(),
                amount: order.amount + (order.transactionCharge || 0),
                orderId: order._id.toString(),
              },
              actionUrl: `/orders/${order._id}`,
            });
          }
        }
      }

      if (beforeStatus !== order.status) {
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Service Status Sync] Updated ${updatedCount} SKDataPlug order(s)`);
    }
    lastSyncAt = new Date();
  } catch (error) {
    console.error('[Service Status Sync] Error syncing SKDataPlug statuses:', error.message);
  } finally {
    isSyncing = false;
  }
};

const startSkdataplugOrderStatusSyncJob = () => {
  const cronExpression = '*/1 * * * *';
  const timezone = 'UTC';

  cron.schedule(
    cronExpression,
    async () => {
      await syncSkdataplugOrderStatus();
    },
    { timezone }
  );

  console.log('[SKDataPlug Status Sync] Cron scheduler started (checks every minute; interval controlled by DB setting)');
};

module.exports = {
  syncSkdataplugOrderStatus,
  startSkdataplugOrderStatusSyncJob,
};
