// Read-only: never credits wallets or rewrites historical accounting.
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
const Order = require('../src/models/Order');
const Transaction = require('../src/models/Transaction');
const SellerCommission = require('../src/models/SellerCommission');

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const report = [];
  const cursor = Order.find({ source: 'store', isRefunded: true, paymentStatus: 'completed' }).lean().cursor();
  for await (const order of cursor) {
    if (order.refundAmount != null) continue; // New settlements record their gross amount.
    const escaped = order.orderNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const refunds = await Transaction.find({
      type: 'refund', status: 'completed',
      $or: [{ orderNumber: order.orderNumber },
        { reference: /^STOREREF/, description: new RegExp(`failed order ${escaped}:`) }],
    }).lean();
    const commission = await SellerCommission.findOne({ orderId: order._id }).lean();
    const refunded = refunds.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const shortfall = Math.max(0, Math.round((Number(order.amount) - refunded) * 100) / 100);
    report.push({ orderId: String(order._id), orderNumber: order.orderNumber,
      storeId: String(order.storeId), sellingPrice: order.amount,
      recordedRefund: refunded, potentialShortfall: shortfall,
      refundReferences: refunds.map(tx => tx.reference),
      review: refunds.length !== 1 ? 'Missing or multiple refund records; inspect manually'
        : commission ? 'Commission record remains; check payout/reversal before any adjustment'
          : 'Verify commission reversal and wallet history before approving a top-up',
    });
  }
  console.log(JSON.stringify({ readOnly: true, orders: report,
    potentialShortfallTotal: Math.round(report.reduce((sum, row) => sum + row.potentialShortfall, 0) * 100) / 100 }, null, 2));
};
run().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
