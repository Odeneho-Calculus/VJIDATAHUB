const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Order = require('../src/models/Order');
const Store = require('../src/models/Store');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const Commission = require('../src/models/SellerCommission');
const Ledger = require('../src/models/CommissionLedger');
const { processStoreOrderRefund } = require('../src/utils/refund');
const { creditCommissionForOrder, resolveAdminPriceForOrder } = require('../src/services/commissionService');
let db;
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await Promise.all([Order, Store, User, Transaction, Commission, Ledger].map(model => model.init()));
}, { timeout: 900000 });
after(async () => { await mongoose.disconnect(); if (db) await db.stop(); });
beforeEach(async () => {
  for (const model of [Order, Store, User, Transaction, Commission, Ledger]) await model.deleteMany({});
});
const fixture = async ({ status = 'earned', margin = 1, earned = 1, allocated = null, credited = true } = {}) => {
  const userId = new mongoose.Types.ObjectId();
  // Bypass signup hooks: these tests exercise accounting.
  await User.collection.insertOne({ _id: userId, email: 'agent@example.com', name: 'Agent', role: 'agent', balance: 0 });
  const store = await Store.create({ owner: userId, slug: 'agent', name: 'Agent' });
  const order = await Order.create({ orderNumber: 'ORDER-1', phoneNumber: '0241234567', isGuest: true,
    source: 'store', storeId: store._id, amount: 5, transactionCharge: 0.2, adminBasePrice: 4,
    status: 'failed', paymentStatus: 'completed', commissionStatus: credited ? 'earned' : 'none', agentCommission: credited ? margin : 0 });
  await Ledger.create({ storeId: store._id, storeOwnerId: userId, totalEarned: earned,
    totalCommissions: 1, totalPending: status === 'pending_withdrawal' ? margin : 0 });
  if (credited) await Commission.create({ storeId: store._id, storeOwnerId: userId, orderId: order._id,
    adminPlanPrice: 4, sellerPrice: 5, commissionEarned: margin, status, withdrawalAllocatedAmount: allocated });
  return { order, userId, store };
};
test('refunds GHS5 and reverses GHS1, excluding payment fees', async () => {
  const { order, userId, store } = await fixture();
  const result = await processStoreOrderRefund(order);
  assert.equal(result.success, true);
  assert.equal(result.amountRefunded, 5);
  assert.equal((await User.findById(userId)).balance, 5);
  assert.equal((await Ledger.findOne({ storeId: store._id })).totalEarned, 0);
  assert.equal((await Commission.findOne({ orderId: order._id })).status, 'reversed');
  assert.equal(await Transaction.countDocuments(), 1);
});
test('immediate failure without commission refunds full selling price', async () => {
  const { order, userId } = await fixture({ credited: false, earned: 0 });
  assert.equal((await processStoreOrderRefund(order)).success, true);
  assert.equal((await User.findById(userId)).balance, 5);
});
test('simultaneous refund requests credit exactly once', async () => {
  const { order, userId } = await fixture();
  const results = await Promise.all(Array.from({ length: 4 }, () => processStoreOrderRefund(order)));
  assert.equal(results.filter(result => result.success).length, 1);
  assert.equal((await User.findById(userId)).balance, 5);
  assert.equal(await Transaction.countDocuments({ type: 'refund' }), 1);
});
for (const status of ['pending_withdrawal', 'withdrawn']) {
  test(`${status} margin is recovered separately without changing payout`, async () => {
    const { order, userId } = await fixture({ status, earned: 0, allocated: 1 });
    const result = await processStoreOrderRefund(order);
    assert.equal(result.success, true);
    assert.equal(result.amountRefunded, 5);
    assert.equal(result.commissionRecovery, 1);
    assert.equal((await User.findById(userId)).balance, 4);
    assert.equal((await Commission.findOne({ orderId: order._id })).status, status);
    assert.equal((await Transaction.findOne({ type: 'admin_adjustment' })).amount, -1);
  });
}
test('partial reservation recovers actual allocation and reverses unreserved margin', async () => {
  const { order, userId, store } = await fixture({ status: 'pending_withdrawal', earned: 0.6, allocated: 0.4 });
  const result = await processStoreOrderRefund(order);
  assert.equal(result.success, true);
  assert.equal(result.commissionRecovery, 0.4);
  assert.equal((await User.findById(userId)).balance, 4.6);
  assert.equal((await Ledger.findOne({ storeId: store._id })).totalEarned, 0);
});
test('audit write failure rolls wallet, commission and order back', async () => {
  const { order, userId, store } = await fixture();
  await Transaction.create({ userId, type: 'refund', amount: 5, reference: `STOREREF-${order._id}` });
  assert.equal((await processStoreOrderRefund(order)).success, false);
  assert.equal((await User.findById(userId)).balance, 0);
  assert.equal((await Ledger.findOne({ storeId: store._id })).totalEarned, 1);
  assert.equal((await Commission.findOne({ orderId: order._id })).status, 'earned');
  assert.equal((await Order.findById(order._id)).isRefunded, false);
});
test('unpaid orders cannot credit wallets', async () => {
  const { order, userId } = await fixture();
  await Order.updateOne({ _id: order._id }, { paymentStatus: 'pending' });
  assert.equal((await processStoreOrderRefund(order)).success, false);
  assert.equal((await User.findById(userId)).balance, 0);
});
test('commission reconciliation skips failed and refunded orders', async () => {
  const { order } = await fixture();
  assert.equal((await creditCommissionForOrder(order)).reason, 'failed_or_refunded');
  await processStoreOrderRefund(order);
  assert.equal((await creditCommissionForOrder(order)).reason, 'failed_or_refunded');
});
test('commission calculation keeps purchase snapshot despite changed plan', async () => {
  assert.equal(await resolveAdminPriceForOrder({ adminBasePrice: 4, dataPlanId: new mongoose.Types.ObjectId(), planType: 'TopzaOffer' }), 4);
  assert.equal(await resolveAdminPriceForOrder({ adminBasePrice: 0 }), 0);
});

test('legacy partial payout allocation is reconstructed without over-recovery', async () => {
  const { order, userId, store } = await fixture({ status: 'pending_withdrawal', earned: 0.6 });
  const Payout = require('../src/models/AgentCommissionPayout');
  const payout = await Payout.create({ agentId: userId, storeId: store._id, amount: 0.4,
    requestedAmount: 0.4, netAmount: 0.4, method: 'mobile_money', details: { phone: '0241234567', network: 'mtn' } });
  await Commission.updateOne({ orderId: order._id }, { withdrawalRequestId: payout._id });
  const result = await processStoreOrderRefund(order);
  assert.equal(result.success, true);
  assert.equal(result.commissionRecovery, 0.4);
  assert.equal((await User.findById(userId)).balance, 4.6);
});
test('missing ledger aborts rather than silently losing commission', async () => {
  const { order, userId } = await fixture();
  await Ledger.deleteMany({});
  assert.equal((await processStoreOrderRefund(order)).success, false);
  assert.equal((await User.findById(userId)).balance, 0);
  assert.equal((await Order.findById(order._id)).isRefunded, false);
});
test('concurrent commission credits create one row and one ledger increment', async () => {
  const { order, store } = await fixture({ credited: false, earned: 0 });
  await Order.updateOne({ _id: order._id }, { status: 'processing' });
  const results = await Promise.all(Array.from({ length: 3 }, () => creditCommissionForOrder(order)));
  assert.equal(results.filter(result => result.credited).length, 1);
  assert.equal(await Commission.countDocuments({ orderId: order._id }), 1);
  assert.equal((await Ledger.findOne({ storeId: store._id })).totalEarned, 1);
});
test('concurrent payout reservation and refund settle each margin once', async () => {
  const { order, userId, store } = await fixture();
  const { moveToPending } = require('../src/services/commissionService');
  const reserve = async () => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await moveToPending({ storeId: store._id, amount: 0.4, session });
        const row = await Commission.findOne({ orderId: order._id }).session(session);
        if (row.status !== 'earned') throw new Error('Already refunded');
        row.status = 'pending_withdrawal';
        row.withdrawalAllocatedAmount = 0.4;
        await row.save({ session });
      });
    } finally { await session.endSession(); }
  };
  const [reserved, refunded] = await Promise.allSettled([reserve(), processStoreOrderRefund(order)]);
  assert.equal(refunded.status, 'fulfilled');
  assert.equal(refunded.value.success, true);
  const balance = (await User.findById(userId)).balance;
  const ledger = await Ledger.findOne({ storeId: store._id });
  assert.equal(Math.round((balance + ledger.totalEarned + ledger.totalPending) * 100) / 100, 5);
  assert.equal(ledger.totalPending, reserved.status === 'fulfilled' ? 0.4 : 0);
});

test('historical report finds under-refunds without changing accounting', async () => {
  const { order, userId } = await fixture();
  await Order.updateOne({ _id: order._id }, { isRefunded: true });
  await Transaction.create({ userId, type: 'refund', amount: 4, reference: 'STOREREF-LEGACY',
    status: 'completed', paymentStatus: 'completed',
    description: `Store order refund for failed order ${order.orderNumber}: Provider failed` });
  const { promisify } = require('node:util');
  const { execFile } = require('node:child_process');
  const { stdout } = await promisify(execFile)(process.execPath, ['scripts/reportStoreRefundShortfalls.js'], {
    cwd: require('node:path').resolve(__dirname, '..'), env: { ...process.env, MONGODB_URI: db.getUri() },
  });
  const report = JSON.parse(stdout);
  assert.equal(report.readOnly, true);
  assert.equal(report.potentialShortfallTotal, 1);
  assert.equal(report.orders[0].recordedRefund, 4);
  assert.equal((await User.findById(userId)).balance, 0);
  assert.equal(await Transaction.countDocuments(), 1);
});
