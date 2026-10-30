const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const { fetch } = globalThis;
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Purchase = require('../src/models/Purchase');
const Transaction = require('../src/models/Transaction');
const Store = require('../src/models/Store');
const { getUserSpending, monthRange } = require('../src/services/spendingService');
const admin = require('../src/controllers/adminController');
const auth = require('../src/controllers/authController');
const { createCommissionPayout } = require('../src/controllers/storeController');
let db, server, base, owner;
const date = new Date('2026-10-15T12:00:00Z');
const response = () => ({ code: 200, data: null, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await Promise.all([User, Order, Purchase, Transaction, Store].map(model => model.init()));
  process.env.JWT_SECRET = 'isolated-account-statistics-test-secret';
  const app = express();
  app.use('/user', require('../src/routes/user'));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 900000 });
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (db) await db.stop();
});
beforeEach(async () => {
  for (const model of [User, Order, Purchase, Transaction, Store]) await model.deleteMany({});
  owner = new mongoose.Types.ObjectId();
  await User.collection.insertOne({ _id: owner, email: 'agent@example.com', name: 'Agent', role: 'agent',
    balance: 20, totalSpent: 999, isEmailVerified: true, status: 'active' });
});
const order = overrides => Order.create({ userId: owner, orderNumber: `ORDER-${new mongoose.Types.ObjectId()}`,
  amount: 8, phoneNumber: '0241234567', source: 'direct', status: 'processing', paymentStatus: 'completed', createdAt: date, ...overrides });
const transaction = overrides => Transaction.create({ userId: owner, type: 'data_purchase', amount: -8,
  reference: `TX-${new mongoose.Types.ObjectId()}`, status: 'completed', createdAt: date, ...overrides });
const monthly = month => fetch(`${base}/user/spending/monthly?month=${month}`, {
  headers: { Authorization: `Bearer ${jwt.sign({ id: String(owner) }, process.env.JWT_SECRET)}` },
});
test('counts linked order and debit once, with a positive spending amount', async () => {
  const tx = await transaction();
  await order({ transactionId: tx._id });
  assert.deepEqual(await getUserSpending(String(owner), { month: '2026-10' }), { totalSpent: 8, transactionCount: 1, totalTopUp: 0 });
});
test('failed, refunded, unpaid and store orders do not inflate personal spending', async () => {
  for (const overrides of [{ status: 'failed' }, { isRefunded: true }, { paymentStatus: 'pending' },
    { source: 'store', storeId: new mongoose.Types.ObjectId() }]) {
    const tx = await transaction();
    await order({ ...overrides, transactionId: tx._id });
  }
  assert.equal((await getUserSpending(owner)).totalSpent, 0);
});
test('deduplicates legacy purchases and includes transaction-only checker payments', async () => {
  await Purchase.create({ userId: owner, network: 'MTN', gb: 1, price: 3, recipient: '0241234567',
    reference: 'LEGACY', status: 'completed', createdAt: date });
  await transaction({ reference: 'LEGACY', amount: -3 });
  await transaction({ type: 'checker_purchase', amount: 2, status: 'successful' });
  const stats = await getUserSpending(owner, { month: '2026-10' });
  assert.equal(stats.totalSpent, 5);
  assert.equal(stats.transactionCount, 2);
});
test('separates top-ups and respects Ghana/UTC month boundaries', async () => {
  await order({ createdAt: new Date('2026-10-01T00:00:00Z'), amount: 4 });
  await order({ createdAt: new Date('2026-11-01T00:00:00Z'), amount: 9 });
  await transaction({ type: 'wallet_funding', amount: 100 });
  await transaction({ type: 'wallet_topup', amount: 50, status: 'failed' });
  assert.deepEqual(await getUserSpending(owner, { month: '2026-10' }), { totalSpent: 4, transactionCount: 1, totalTopUp: 100 });
  assert.equal((await getUserSpending(owner)).totalSpent, 13);
});
test('monthly HTTP endpoint works with a JWT string ID and rejects invalid months', async () => {
  await order();
  const result = await monthly('2026-10');
  assert.equal(result.status, 200);
  assert.equal((await result.json()).totalSpent, 8);
  assert.equal((await monthly('')).status, 400);
  const invalid = await monthly('2026-13');
  assert.equal(invalid.status, 400);
  assert.throws(() => monthRange('2026-00'), /YYYY-MM/);
  assert.throws(() => monthRange(['2026-10']), /YYYY-MM/);
});
test('admin list, admin detail and account profile return identical live spending', async () => {
  await order();
  await Store.create({ owner, slug: 'agent', name: 'Agent', totalRevenue: 100, totalOrders: 5 });
  const list = response();
  await admin.getAllUsers({ query: {} }, list);
  assert.equal(list.code, 200);
  assert.equal(list.data.users[0].totalSpent, 8);
  const detail = response();
  await admin.getUserById({ params: { id: String(owner) } }, detail);
  const profile = response();
  await auth.getProfile({ userId: String(owner) }, profile);
  assert.equal(detail.data.user.totalSpent, 8);
  assert.equal(profile.data.user.totalSpent, 8);
  const switched = response();
  await require('../src/controllers/userUpgradeController').switchRole(
    { userId: String(owner), body: { targetRole: 'user' } }, switched);
  assert.equal(switched.code, 200);
  assert.equal(switched.data.user.totalSpent, 8);
  assert.equal((await User.findById(owner)).totalSpent, 999); // reporting is read-only
});
test('new bank or unknown withdrawal methods are rejected before reserving funds', async () => {
  for (const method of ['bank', 'unknown']) {
    const res = response();
    await createCommissionPayout({ userId: String(owner), body: { amount: 5, method, details: { accountNumber: '1234567890' } } }, res);
    assert.equal(res.code, 400);
    assert.match(res.data.message, /Mobile Money only/);
  }
  assert.equal((await User.findById(owner)).balance, 20);
});

test('reference-only links and legacy purchase mirrors are counted as one order', async () => {
  await order({ transactionReference: 'SHARED-REFERENCE' });
  await transaction({ reference: 'SHARED-REFERENCE' });
  await Purchase.create({ userId: owner, network: 'MTN', gb: 1, price: 8, recipient: '0241234567',
    reference: 'SHARED-REFERENCE', status: 'completed', createdAt: date });
  assert.deepEqual(await getUserSpending(owner, { month: '2026-10' }), { totalSpent: 8, transactionCount: 1, totalTopUp: 0 });
});
test('monthly reporting does not leak another user spending or top-ups', async () => {
  const other = new mongoose.Types.ObjectId();
  await order({ userId: other, amount: 99 });
  await transaction({ userId: other, type: 'wallet_topup', amount: 200 });
  await order({ amount: 3.5 });
  assert.deepEqual(await getUserSpending(owner, { month: '2026-10' }), { totalSpent: 3.5, transactionCount: 1, totalTopUp: 0 });
});
