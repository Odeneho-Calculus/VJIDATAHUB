const cron = require('node-cron');
const Order = require('../models/Order');
const { processStoreOrderRefund } = require('../utils/refund');
let running = false;

const retryStoreRefunds = async () => {
  if (running) return;
  running = true;
  try {
    // Includes immediate provider failures without an external order ID.
    // Rotate failed attempts to avoid starving later refunds behind bad records.
    const orders = await Order.find({ source: 'store', status: 'failed',
      paymentStatus: 'completed', isRefunded: false, adminModified: { $ne: true } })
      .sort({ refundLastAttemptAt: 1, createdAt: 1 }).limit(100);
    for (const order of orders) {
      await Order.updateOne({ _id: order._id }, { $set: { refundLastAttemptAt: new Date() } });
      await processStoreOrderRefund(order, 'Retry of failed store order refund');
    }
  } catch (error) {
    console.error('[StoreRefundRetry]', error.message);
  } finally {
    running = false;
  }
};
const startStoreRefundRetryJob = () => cron.schedule('*/5 * * * *', retryStoreRefunds);
module.exports = { retryStoreRefunds, startStoreRefundRetryJob };
