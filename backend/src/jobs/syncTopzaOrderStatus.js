const cron = require('node-cron');
const Order = require('../models/Order');
const SystemSettings = require('../models/SystemSettings');
const topzaApi = require('../utils/topzaApi');

let isSyncing = false;
let lastSyncAt = null;

const mapTopzaStatusToOrderStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'success' || normalized === 'delivered') return 'completed';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'in-progress') return 'processing';
  return 'pending';
};

const toTopzaProviderStatus = (status = '') => {
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

const extractTopzaOrder = (response = {}) => {
  const order = response?.order || response?.data || {};
  if (order && typeof order === 'object' && order.order) {
    return order.order;
  }
  return order;
};

const syncTopzaOrderStatus = async () => {
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

    // Dynamic mode switch: skip cron sync when webhook mode is selected.
    if (statusUpdateMethod !== 'cron') {
      isSyncing = false;
      return;
    }

    const activeProvider = settings?.vtuProvider || 'topza';
    if (activeProvider !== 'topza') {
      isSyncing = false;
      return;
    }

    const orders = await Order.find({
      provider: 'topza',
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

      let statusResult = await topzaApi.getOrderStatus(primaryIdentifier);

      // Retry with provider order number if the first identifier fails.
      if (!statusResult.success && order.externalOrderId && order.externalOrderNumber && order.externalOrderNumber !== primaryIdentifier) {
        statusResult = await topzaApi.getOrderStatus(order.externalOrderNumber);
      }

      if (!statusResult.success) {
        continue;
      }

      const providerOrder = extractTopzaOrder(statusResult);
      const rawProviderStatus = providerOrder?.status || providerOrder?.orderStatus || providerOrder?.state || '';
      const normalizedProviderStatus = toTopzaProviderStatus(rawProviderStatus);
      const mappedStatus = mapTopzaStatusToOrderStatus(rawProviderStatus);

      const nextExternalOrderId = providerOrder?.id || providerOrder?.orderId || order.externalOrderId;
      const nextExternalOrderNumber = providerOrder?.orderNumber || order.externalOrderNumber;
      const statusChanged = order.status !== mappedStatus;
      const providerStatusChanged = String(order.providerStatus || '') !== String(normalizedProviderStatus || '');

      if (!statusChanged && !providerStatusChanged && nextExternalOrderId === order.externalOrderId && nextExternalOrderNumber === order.externalOrderNumber) {
        continue;
      }

      const beforeStatus = order.status;

      order.status = mappedStatus;
      order.providerStatus = normalizedProviderStatus;
      order.externalOrderId = nextExternalOrderId || order.externalOrderId;
      order.externalOrderNumber = nextExternalOrderNumber || order.externalOrderNumber;
      order.providerMessage = `Topza cron sync: ${normalizedProviderStatus}`;

      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }

      const lastHistory = order.statusHistory[order.statusHistory.length - 1];
      const shouldAppendHistory = !lastHistory || lastHistory.status !== mappedStatus;

      if (shouldAppendHistory) {
        order.statusHistory.push({
          status: mappedStatus,
          updatedAt: toDateOrNow(providerOrder?.updatedAt),
          source: 'topza_cron',
          notes: `Topza status: ${normalizedProviderStatus}`,
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
        order.errorMessage = `Topza cron sync reported failed status${order.externalOrderNumber ? ` (${order.externalOrderNumber})` : ''}`;
      } else {
        order.completedAt = null;
        order.completedBy = null;
      }

      await order.save();

      if (beforeStatus !== order.status) {
        updatedCount += 1;
      }
    }

    if (updatedCount > 0) {
      console.log(`[Topza Status Sync] Updated ${updatedCount} order(s)`);
    }
    lastSyncAt = new Date();
  } catch (error) {
    console.error('[Topza Status Sync] Error syncing statuses:', error.message);
  } finally {
    isSyncing = false;
  }
};

const startTopzaOrderStatusSyncJob = () => {
  const cronExpression = '*/1 * * * *';
  const timezone = 'UTC';

  cron.schedule(
    cronExpression,
    async () => {
      await syncTopzaOrderStatus();
    },
    { timezone }
  );

  console.log('[Topza Status Sync] Cron scheduler started (checks every minute; interval controlled by DB setting)');
};

module.exports = {
  syncTopzaOrderStatus,
  startTopzaOrderStatusSyncJob,
};
