const mongoose = require('mongoose');
const Order = require('../models/Order');
const Purchase = require('../models/Purchase');
const Transaction = require('../models/Transaction');

const money = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const monthRange = (month) => {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1970) {
    const error = new Error('month must be YYYY-MM with a valid year and month');
    error.statusCode = 400;
    throw error;
  }
  const [year, number] = month.split('-').map(Number);
  return { $gte: new Date(Date.UTC(year, number - 1, 1)), $lt: new Date(Date.UTC(year, number, 1)) };
};
const currentMonth = () => new Date().toISOString().slice(0, 7);

const withoutOrders = mappings => mappings.flatMap(([localField, foreignField]) => [
  { $lookup: { from: Order.collection.name, localField, foreignField,
    pipeline: [{ $project: { _id: 1 } }, { $limit: 1 }], as: 'linkedOrder' } },
  { $match: { linkedOrder: { $size: 0 } } },
]);
const referenceLinks = [['reference', 'transactionReference'],
  ['reference', 'paystackReference'], ['reference', 'orderNumber']];

// Orders are authoritative. Transaction-only and legacy purchases fill gaps;
// linked transactions are excluded even when their order failed or was refunded.
const getUserSpending = async (userId, { month } = {}) => {
  const owner = new mongoose.Types.ObjectId(String(userId));
  const match = { userId: owner, ...(month === undefined ? {} : { createdAt: monthRange(month) }) };
  const group = amount => ({ $group: { _id: null, total: { $sum: amount }, count: { $sum: 1 } } });
  const [orders, purchases, transactions, topUps] = await Promise.all([
    Order.aggregate([
      { $match: { ...match, source: { $ne: 'store' }, storeId: null, isGuest: { $ne: true },
        paymentStatus: 'completed', status: { $in: ['pending', 'processing', 'completed'] }, isRefunded: { $ne: true } } },
      group({ $abs: '$amount' }),
    ]),
    Purchase.aggregate([
      { $match: { ...match, status: 'completed' } },
      ...withoutOrders(referenceLinks),
      group({ $abs: '$price' }),
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: { $in: ['data_purchase', 'checker_purchase', 'afa_purchase', 'afa_registration', 'purchase'] },
        status: { $in: ['completed', 'successful'] }, paymentStatus: { $ne: 'failed' } } },
      // Separate equality lookups use the order indexes. Filtering after each
      // lookup avoids scanning the order collection for every historical debit.
      ...withoutOrders([['_id', 'transactionId'], ...referenceLinks, ['orderNumber', 'orderNumber']]),
      { $lookup: { from: Purchase.collection.name, localField: 'reference', foreignField: 'reference', as: 'linkedPurchase' } },
      { $match: { linkedPurchase: { $size: 0 } } },
      group({ $abs: '$amount' }),
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: { $in: ['wallet_topup', 'wallet_funding'] }, amount: { $gt: 0 },
        status: { $in: ['completed', 'successful'] }, paymentStatus: { $ne: 'failed' } } },
      group('$amount'),
    ]),
  ]);
  const rows = [orders[0], purchases[0], transactions[0]];
  return { totalSpent: money(rows.reduce((sum, row) => sum + (row?.total || 0), 0)),
    transactionCount: rows.reduce((sum, row) => sum + (row?.count || 0), 0),
    totalTopUp: money(topUps[0]?.total) };
};
module.exports = { getUserSpending, monthRange, currentMonth };
