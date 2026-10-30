const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../src/config/database');
const Order = require('../src/models/Order');
const Store = require('../src/models/Store');
const SellerCommission = require('../src/models/SellerCommission');
const CommissionLedger = require('../src/models/CommissionLedger');
const Payout = require('../src/models/AgentCommissionPayout');
const { calculateStoreOrderCommission } = require('../src/services/commissionService');

const rebuildLedgers = async () => {
  const stores = await Store.find({}).select('_id owner');

  for (const store of stores) {
    const rows = await SellerCommission.find({ storeId: store._id });

    // A partial withdrawal is an amount, not the full commission row value.
    // Refunded rows retain history and must not resurrect reversed commission.
    const totalCommissions = rows.reduce((sum, row) => sum + (row.status === 'reversed' ? 0
      : Number(row.commissionEarned || 0) - Number(row.refundReversedAmount || 0)), 0);
    const payouts = await Payout.find({ storeId: store._id });
    const totalPending = payouts.filter(p => ['pending', 'processing'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalWithdrawn = payouts.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalEarned = Math.round((totalCommissions - totalPending - totalWithdrawn) * 100) / 100;
    if (totalEarned < 0) throw new Error(`Store ${store._id} requires manual ledger reconciliation`);

    await CommissionLedger.findOneAndUpdate(
      { storeId: store._id },
      {
        storeOwnerId: store.owner,
        totalCommissions,
        totalEarned,
        totalPending,
        totalWithdrawn,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

const run = async () => {
  try {
    await connectDB();

    const orders = await Order.find({
      source: 'store',
      paymentStatus: 'completed',
      status: { $ne: 'failed' },
      isRefunded: { $ne: true },
    });

    let updatedOrders = 0;
    let updatedRows = 0;

    for (const order of orders) {
      const { sellerPrice, adminPrice, commissionEarned } = await calculateStoreOrderCommission(order);

      order.adminBasePrice = adminPrice;
      order.agentCommission = commissionEarned;
      await order.save();
      updatedOrders += 1;

      const row = await SellerCommission.findOne({ orderId: order._id });
      if (row && !row.refundSettled && row.status !== 'reversed') {
        row.adminPlanPrice = adminPrice;
        row.sellerPrice = sellerPrice;
        row.commissionEarned = commissionEarned > 0 ? commissionEarned : 0;
        await row.save();
        updatedRows += 1;
      }
    }

    await rebuildLedgers();

    console.log(`Orders recalculated: ${updatedOrders}`);
    console.log(`Commission rows recalculated: ${updatedRows}`);
    console.log('Store commission ledgers rebuilt successfully.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Repair script failed:', error);
    process.exit(1);
  }
};

run();
