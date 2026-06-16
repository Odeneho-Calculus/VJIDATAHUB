const cron = require('node-cron');
const axios = require('axios');
const SystemSettings = require('../models/SystemSettings');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');
const { processOrderAfterVerifiedPayment } = require('../controllers/adminController');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

let isRunning = false;

const SUPPORTED_TRANSACTION_TYPES = ['wallet_topup', 'wallet_funding', 'data_purchase'];

const normalizePaystackStatus = (status) => String(status || '').trim().toLowerCase();

const isPaystackReferenceNotFound = (message) => {
  const normalized = String(message || '').trim().toLowerCase();
  return normalized === 'transaction reference not found.' || normalized === 'transaction reference not found';
};

const getEmptyStats = () => ({
  transactionsProcessed: 0,
  ordersProcessed: 0,
  duplicateRefsSkipped: 0,
  skippedTooNew: 0,
  skippedMissingReference: 0,
  skippedDuplicateReference: 0,
  status: 'idle',
});

const saveLastRunStats = async (settings, stats) => {
  try {
    settings.orderSettings.autonomousPaystackVerification.lastRunStats = {
      ...settings.orderSettings.autonomousPaystackVerification.lastRunStats,
      ...stats,
    };
    await settings.save();
  } catch (error) {
    console.error('[AutoVerify] Failed to save last run stats:', error.message);
  }
};

const saveLastRunAt = async (settings) => {
  try {
    settings.orderSettings.autonomousPaystackVerification.lastRunAt = new Date();
    await settings.save();
  } catch (error) {
    console.error('[AutoVerify] Failed to save last run time:', error.message);
  }
};

const verifyPaystackReference = async (reference) => {
  try {
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    const paystackData = response?.data?.data;
    const paystackMsg = response?.data?.message || '';

    if (!response?.data?.status || !paystackData) {
      if (isPaystackReferenceNotFound(paystackMsg)) {
        return { status: 'not_found', data: null, message: paystackMsg };
      }
      return { status: 'error', data: null, message: paystackMsg || 'Verification failed' };
    }

    return { status: normalizePaystackStatus(paystackData.status), data: paystackData, message: '' };
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    if (isPaystackReferenceNotFound(message)) {
      return { status: 'not_found', data: null, message };
    }
    console.error(`[AutoVerify] Paystack verify error for ${reference}:`, message);
    return { status: 'error', data: null, message };
  }
};

const processWalletTopUp = async (transaction, paystackData) => {
  const targetUserId = transaction.userId?._id || transaction.userId;
  if (!targetUserId) {
    console.log(`[AutoVerify] Transaction ${transaction._id} has no user, skipping wallet top-up`);
    return { processed: false, reason: 'missing_user' };
  }

  // Atomic lock: only process if still pending
  const lockedTx = await Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: 'pending',
      paymentStatus: 'pending',
    },
    {
      $set: {
        status: 'completed',
        paymentStatus: 'completed',
        paystackReference: paystackData.reference,
        autoVerifiedAt: new Date(),
        autoVerifiedBy: 'system',
      },
    },
    { new: true }
  );

  if (!lockedTx) {
    return { processed: false, reason: 'already_processed' };
  }

  await User.findByIdAndUpdate(targetUserId, {
    $inc: { balance: Math.abs(Number(transaction.amount) || 0) },
  });

  console.log(`[AutoVerify] Wallet credited: ${transaction.amount} to user ${targetUserId}`);
  return { processed: true };
};

const processDataPurchase = async (transaction, order, paystackData) => {
  if (!order) {
    console.log(`[AutoVerify] No linked order for data purchase transaction ${transaction._id}`);
    return { processed: false, reason: 'missing_order' };
  }

  // Atomic lock on BOTH transaction and order to prevent any double processing.
  // The order lock is the critical one: it prevents two parallel jobs from
  // calling the VTU provider twice for the same purchase.
  const lockedTransaction = await Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: 'pending',
      paymentStatus: 'pending',
    },
    {
      $set: {
        paystackReference: paystackData.reference,
        autoVerifiedAt: new Date(),
        autoVerifiedBy: 'system',
      },
    },
    { new: true }
  );

  if (!lockedTransaction) {
    console.log(`[AutoVerify] Transaction ${transaction._id} already processed by another thread, skipping`);
    return { processed: false, reason: 'already_processed' };
  }

  const lockedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: 'pending',
      paymentStatus: 'pending',
    },
    {
      $set: {
        paymentStatus: 'completed',
        paidAt: order.paidAt || new Date(),
        paystackReference: paystackData.reference,
        autoVerifiedAt: new Date(),
        autoVerifiedBy: 'system',
      },
    },
    { new: true }
  );

  if (!lockedOrder) {
    // Order was already processed by another thread (e.g. admin manual verify).
    // Roll back the transaction metadata update so it remains available for
    // manual verification / next cycle if still needed.
    console.log(`[AutoVerify] Order ${order._id} already processed by another thread, skipping`);
    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: {
        paystackReference: null,
        autoVerifiedAt: null,
        autoVerifiedBy: null,
      },
    });
    return { processed: false, reason: 'already_processed' };
  }

  const fulfillmentResult = await processOrderAfterVerifiedPayment(lockedOrder, paystackData.reference);

  if (fulfillmentResult.success) {
    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: {
        status: 'completed',
        paymentStatus: 'completed',
      },
    });
    return { processed: true };
  }

  // processOrderAfterVerifiedPayment already marks order/transaction failed on provider failure
  return { processed: true, providerFailed: true };
};

const markTransactionFailed = async (transaction, reason) => {
  await Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: 'pending',
      paymentStatus: 'pending',
    },
    {
      $set: {
        status: 'failed',
        paymentStatus: 'failed',
        errorMessage: reason,
      },
    }
  );
};

const markOrderFailed = async (order, reason) => {
  if (!order) return;
  await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: 'pending',
      paymentStatus: 'pending',
    },
    {
      $set: {
        status: 'failed',
        paymentStatus: 'failed',
        errorMessage: reason,
      },
    }
  );
};

const processCandidate = async (candidate, stats) => {
  const { reference, transaction, order } = candidate;

  const verifyResult = await verifyPaystackReference(reference);

  if (verifyResult.status === 'not_found' || verifyResult.status === 'error') {
    const reason = verifyResult.status === 'not_found'
      ? 'Paystack verification failed: Transaction reference not found.'
      : `Paystack verification error: ${verifyResult.message || 'Unknown error'}`;

    if (transaction) await markTransactionFailed(transaction, reason);
    if (order) await markOrderFailed(order, reason);
    return { processedTx: !!transaction, processedOrder: !!order };
  }

  if (['pending', 'ongoing', 'awaiting'].includes(verifyResult.status)) {
    // Leave untouched for next cycle or manual verification
    return { processedTx: false, processedOrder: false };
  }

  if (verifyResult.status !== 'success') {
    const reason = `Paystack verification failed with status: ${verifyResult.status}`;
    if (transaction) await markTransactionFailed(transaction, reason);
    if (order) await markOrderFailed(order, reason);
    return { processedTx: !!transaction, processedOrder: !!order };
  }

  const paystackData = verifyResult.data;

  if (transaction && SUPPORTED_TRANSACTION_TYPES.includes(transaction.type)) {
    if (transaction.type === 'wallet_topup' || transaction.type === 'wallet_funding') {
      const result = await processWalletTopUp(transaction, paystackData);
      if (result.processed) {
        stats.transactionsProcessed += 1;
      }
      return { processedTx: result.processed, processedOrder: false };
    }

    if (transaction.type === 'data_purchase') {
      const linkedOrder = order || await Order.findOne({
        $or: [
          { transactionId: transaction._id },
          { transactionReference: transaction.reference },
        ],
      });

      const result = await processDataPurchase(transaction, linkedOrder, paystackData);
      if (result.processed) {
        stats.transactionsProcessed += 1;
        if (linkedOrder) stats.ordersProcessed += 1;
      }
      return { processedTx: result.processed, processedOrder: !!linkedOrder && result.processed };
    }
  }

  // Order-only candidate (orphan order without a pending transaction candidate).
  // This is rare; normal data purchases are handled via the transaction candidate above.
  if (order && order.paymentMethod === 'paystack' && order.paymentStatus === 'pending') {
    const linkedTransaction = transaction || await Transaction.findById(order.transactionId);

    // For data orders, we must have a linked data_purchase transaction to keep both in sync.
    if (!linkedTransaction || linkedTransaction.type !== 'data_purchase') {
      return { processedTx: false, processedOrder: false };
    }

    // Lock transaction first
    const lockedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: linkedTransaction._id,
        status: 'pending',
        paymentStatus: 'pending',
      },
      {
        $set: {
          paystackReference: paystackData.reference,
          autoVerifiedAt: new Date(),
          autoVerifiedBy: 'system',
        },
      },
      { new: true }
    );

    if (!lockedTransaction) {
      console.log(`[AutoVerify] Linked transaction ${linkedTransaction._id} already processed, skipping orphan order ${order._id}`);
      return { processedTx: false, processedOrder: false };
    }

    // Lock order to prevent double VTU purchase
    const lockedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: 'pending',
        paymentStatus: 'pending',
      },
      {
        $set: {
          paymentStatus: 'completed',
          paidAt: order.paidAt || new Date(),
          paystackReference: paystackData.reference,
          autoVerifiedAt: new Date(),
          autoVerifiedBy: 'system',
        },
      },
      { new: true }
    );

    if (!lockedOrder) {
      console.log(`[AutoVerify] Orphan order ${order._id} already processed by another thread, skipping`);
      return { processedTx: false, processedOrder: false };
    }

    const fulfillmentResult = await processOrderAfterVerifiedPayment(lockedOrder, paystackData.reference);

    if (fulfillmentResult.success) {
      await Transaction.findByIdAndUpdate(linkedTransaction._id, {
        $set: {
          status: 'completed',
          paymentStatus: 'completed',
        },
      });
    }

    stats.ordersProcessed += 1;
    return { processedTx: false, processedOrder: true };
  }

  return { processedTx: false, processedOrder: false };
};

const autoVerifyPaystackPayments = async () => {
  if (isRunning) {
    console.log('[AutoVerify] Previous run still in progress, skipping');
    return;
  }

  isRunning = true;

  try {
    const settings = await SystemSettings.getSettings();
    const config = settings?.orderSettings?.autonomousPaystackVerification;

    if (!config || !config.enabled) {
      await saveLastRunStats(settings, { ...getEmptyStats(), status: 'idle' });
      return;
    }

    const now = new Date();
    const lastRunAt = config.lastRunAt ? new Date(config.lastRunAt) : null;
    const intervalMs = (Number(config.intervalMinutes) || 2) * 60 * 1000;

    if (lastRunAt && now.getTime() - lastRunAt.getTime() < intervalMs) {
      return;
    }

    const stats = getEmptyStats();
    stats.status = 'running';
    await saveLastRunStats(settings, stats);

    const minAgeMinutes = Number(config.minAgeMinutes) || 5;
    const minAgeDate = new Date(now.getTime() - minAgeMinutes * 60 * 1000);

    const candidateMap = new Map();

    // 1. Pending supported transactions
    const transactions = await Transaction.find({
      status: 'pending',
      paymentStatus: 'pending',
      type: { $in: SUPPORTED_TRANSACTION_TYPES },
      reference: { $exists: true, $ne: '' },
      createdAt: { $lte: minAgeDate },
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('userId', 'name email balance');

    for (const transaction of transactions) {
      if (!transaction.reference) {
        stats.skippedMissingReference += 1;
        continue;
      }
      if (candidateMap.has(transaction.reference)) {
        stats.skippedDuplicateReference += 1;
        continue;
      }
      candidateMap.set(transaction.reference, { transaction, order: null });
    }

    // 2. Pending Paystack orders (catches orphan orders)
    const orders = await Order.find({
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'paystack',
      createdAt: { $lte: minAgeDate },
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('transactionId');

    for (const order of orders) {
      const reference = order.transactionReference || order.transactionId?.reference;
      if (!reference) {
        stats.skippedMissingReference += 1;
        continue;
      }

      const existing = candidateMap.get(reference);
      if (existing) {
        // Prefer the existing candidate but attach the order if it was transaction-only
        if (!existing.order) {
          existing.order = order;
        }
        stats.duplicateRefsSkipped += 1;
        continue;
      }

      candidateMap.set(reference, { transaction: order.transactionId || null, order });
    }

    for (const [reference, candidate] of candidateMap) {
      try {
        await processCandidate({ reference, ...candidate }, stats);
      } catch (error) {
        console.error(`[AutoVerify] Error processing candidate ${reference}:`, error.message);
      }
    }

    stats.status = 'idle';
    await saveLastRunStats(settings, stats);
    await saveLastRunAt(settings);

    console.log(
      `[AutoVerify] Cycle complete. Tx: ${stats.transactionsProcessed}, Orders: ${stats.ordersProcessed}, Skipped duplicates: ${stats.duplicateRefsSkipped}`
    );
  } catch (error) {
    console.error('[AutoVerify] Job error:', error);
    try {
      const settings = await SystemSettings.getSettings();
      await saveLastRunStats(settings, { ...getEmptyStats(), status: 'idle' });
    } catch (innerError) {
      console.error('[AutoVerify] Failed to reset stats after error:', innerError.message);
    }
  } finally {
    isRunning = false;
  }
};

const startAutoVerifyPaystackJob = () => {
  const cronExpression = '*/1 * * * *';
  const timezone = 'UTC';

  cron.schedule(
    cronExpression,
    async () => {
      await autoVerifyPaystackPayments();
    },
    { timezone }
  );

  console.log('[AutoVerify] Paystack verification cron scheduler started (checks every minute; work controlled by DB setting)');
};

module.exports = {
  autoVerifyPaystackPayments,
  startAutoVerifyPaystackJob,
};
