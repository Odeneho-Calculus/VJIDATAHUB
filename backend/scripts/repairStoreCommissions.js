const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../src/config/database');
const Order = require('../src/models/Order');
const Store = require('../src/models/Store');
const SellerCommission = require('../src/models/SellerCommission');
const CommissionLedger = require('../src/models/CommissionLedger');
const { calculateStoreOrderCommission } = require('../src/services/commissionService');

const rebuildLedgers = async () => {
  const stores = await Store.find({}).select('_id owner');

  for (const store of stores) {
    const rows = await SellerCommission.find({ storeId: store._id });

    const totalCommissions = rows.reduce((sum, r) => sum + Number(r.commissionEarned || 0), 0);
    const totalEarned = rows
      .filter((r) => r.status === 'earned')
      .reduce((sum, r) => sum + Number(r.commissionEarned || 0), 0);
    const totalPending = rows
      .filter((r) => r.status === 'pending_withdrawal')
      .reduce((sum, r) => sum + Number(r.commissionEarned || 0), 0);
    const totalWithdrawn = rows
      .filter((r) => r.status === 'withdrawn')
      .reduce((sum, r) => sum + Number(r.commissionEarned || 0), 0);

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
      if (row) {
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
