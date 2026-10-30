const mongoose = require('mongoose');
const Order = require('../models/Order');
const SellerCommission = require('../models/SellerCommission');
const CommissionLedger = require('../models/CommissionLedger');
const Store = require('../models/Store');
const TopzaOffer = require('../models/TopzaOffer');
const SkdataplugOffer = require('../models/SkdataplugOffer');
const TopzaCheckerOffer = require('../models/TopzaCheckerOffer');
const AfaOffer = require('../models/AfaOffer');
const DataPlan = require('../models/DataPlan');

const getOrCreateLedger = async (storeId, storeOwnerId, session = null) => {
  let ledger = await CommissionLedger.findOne({ storeId }).session(session);
  if (!ledger) {
    [ledger] = await CommissionLedger.create([{
      storeId,
      storeOwnerId,
      totalEarned: 0,
      totalPending: 0,
      totalWithdrawn: 0,
      totalCommissions: 0,
    }], { session });
  }
  return ledger;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const resolveAdminPriceForOrder = async (order) => {
  // Keep the purchase-time snapshot, including a legitimate zero base price.
  if (order.adminBasePrice != null && Number.isFinite(Number(order.adminBasePrice)) && Number(order.adminBasePrice) >= 0) {
    return Number(order.adminBasePrice);
  }
  // Legacy orders without a snapshot use the plan fallback.
  if (!order.dataPlanId) {
    return toNumber(order.adminBasePrice) || 0;
  }

  let planDoc = null;
  if (order.planType === 'TopzaOffer') {
    planDoc = await TopzaOffer.findById(order.dataPlanId).select('agentPrice sellingPrice costPrice');
    if (!planDoc) return toNumber(order.adminBasePrice) || 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice) || toNumber(planDoc.costPrice) || 0;
  }

  if (order.planType === 'SkdataplugOffer') {
    planDoc = await SkdataplugOffer.findById(order.dataPlanId).select('agentPrice sellingPrice costPrice');
    if (!planDoc) return toNumber(order.adminBasePrice) || 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice) || toNumber(planDoc.costPrice) || 0;
  }

  if (order.planType === 'TopzaCheckerOffer') {
    planDoc = await TopzaCheckerOffer.findById(order.dataPlanId).select('agentPrice sellingPrice costPrice');
    if (!planDoc) return toNumber(order.adminBasePrice) || 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice) || toNumber(planDoc.costPrice) || 0;
  }

  if (order.planType === 'AfaOffer') {
    planDoc = await AfaOffer.findById(order.dataPlanId).select('agentPrice sellingPrice costPrice');
    if (!planDoc) return toNumber(order.adminBasePrice) || 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice) || toNumber(planDoc.costPrice) || 0;
  }

  planDoc = await DataPlan.findById(order.dataPlanId).select('costPrice sellingPrice price');
  if (!planDoc) return toNumber(order.adminBasePrice) || 0;
  return toNumber(planDoc.costPrice) || toNumber(planDoc.sellingPrice) || toNumber(planDoc.price) || 0;
};

const calculateStoreOrderCommission = async (order) => {
  const sellerPrice = toNumber(order.amount);
  const adminPrice = await resolveAdminPriceForOrder(order);
  const commissionEarned = Math.round((sellerPrice - adminPrice + Number.EPSILON) * 100) / 100;

  return {
    sellerPrice,
    adminPrice,
    commissionEarned,
  };
};

const creditCommissionInSession = async (orderOrId, session) => {
  const order = await Order.findById(typeof orderOrId === 'string' ? orderOrId : orderOrId._id).session(session);

  if (!order) {
    throw new Error('Order not found for commission credit');
  }

  if (!order.storeId || order.source !== 'store') {
    return { credited: false, reason: 'not_store_order' };
  }

  if (order.isRefunded || order.status === 'failed') {
    return { credited: false, reason: 'failed_or_refunded' };
  }

  if (order.paymentStatus !== 'completed') {
    return { credited: false, reason: 'payment_not_completed' };
  }

  if (order.commissionStatus === 'earned') {
    return { credited: false, reason: 'already_earned' };
  }

  const { sellerPrice, adminPrice, commissionEarned } = await calculateStoreOrderCommission(order);

  order.adminBasePrice = adminPrice;
  order.agentCommission = commissionEarned;
  order.commissionStatus = 'calculated';
  await order.save({ session });

  if (commissionEarned < 0) {
    throw new Error(`Negative commission is not allowed for order ${order.orderNumber}`);
  }

  if (commissionEarned === 0) {
    order.commissionStatus = 'earned';
    await order.save({ session });
    return { credited: false, reason: 'zero_margin', commissionEarned: 0 };
  }

  const existing = await SellerCommission.findOne({ orderId: order._id }).session(session);
  if (existing) {
    if (order.commissionStatus !== 'earned') {
      order.commissionStatus = 'earned';
      await order.save({ session });
    }
    return { credited: false, reason: 'duplicate_order_record' };
  }

  // Always resolve store owner from Store model — never trust order.userId
  // (guest orders have userId=null, and order.userId is the buyer, not the agent)
  const store = await Store.findById(order.storeId).select('owner').session(session);
  const storeOwnerId = store?.owner || null;

  if (!storeOwnerId) {
    throw new Error('Store owner not found for commission credit');
  }

  await SellerCommission.create([{
    storeId: order.storeId,
    storeOwnerId,
    orderId: order._id,
    adminPlanPrice: adminPrice,
    sellerPrice,
    commissionEarned,
    status: 'earned',
  }], { session });

  const ledger = await getOrCreateLedger(order.storeId, storeOwnerId, session);
  ledger.totalEarned += commissionEarned;
  ledger.totalCommissions += commissionEarned;
  await ledger.save({ session });

  order.commissionStatus = 'earned';
  await order.save({ session });

  return { credited: true, commissionEarned, ledger };
};

const creditCommissionForOrder = async (orderOrId) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await creditCommissionInSession(orderOrId, session);
    });
    if (typeof orderOrId !== 'string') {
      const fresh = await Order.findById(orderOrId._id);
      if (fresh) {
        orderOrId.commissionStatus = fresh.commissionStatus;
        orderOrId.adminBasePrice = fresh.adminBasePrice;
        orderOrId.agentCommission = fresh.agentCommission;
        orderOrId.isRefunded = fresh.isRefunded;
      }
    }
    return result;
  } finally {
    await session.endSession();
  }
};

const moveToPending = async ({ storeId, amount, session = null }) => {
  const ledger = await CommissionLedger.findOne({ storeId }).session(session);
  if (!ledger) {
    throw new Error('Commission ledger not found');
  }

  if (amount <= 0 || amount > ledger.totalEarned) {
    throw new Error('Invalid withdrawal amount against available earned balance');
  }

  ledger.totalEarned -= amount;
  ledger.totalPending += amount;
  await ledger.save({ session });

  return ledger;
};

const markAsWithdrawn = async ({ storeId, amount }) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid payout amount');
  const ledger = await CommissionLedger.findOneAndUpdate(
    { storeId, totalPending: { $gte: amount } },
    { $inc: { totalPending: -amount, totalWithdrawn: amount } }, { new: true });
  if (!ledger) throw new Error('Insufficient pending commission');
  return ledger;
};

const returnPendingToEarned = async ({ storeId, amount }) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid payout amount');
  const ledger = await CommissionLedger.findOneAndUpdate(
    { storeId, totalPending: { $gte: amount } },
    { $inc: { totalPending: -amount, totalEarned: amount } }, { new: true });
  if (!ledger) throw new Error('Insufficient pending commission');
  return ledger;
};

const reverseCommissionForOrder = async (orderOrId) => {
  const order = typeof orderOrId === 'string'
    ? await Order.findById(orderOrId)
    : orderOrId;

  if (!order) {
    throw new Error('Order not found for commission reversal');
  }

  if (order.commissionStatus !== 'earned') {
    return { reversed: false, reason: 'not_earned' };
  }

  const commission = await SellerCommission.findOne({ orderId: order._id });
  if (!commission) {
    order.commissionStatus = 'none';
    await order.save();
    return { reversed: false, reason: 'record_not_found' };
  }

  if (commission.status !== 'earned') {
    return { reversed: false, reason: `commission_already_${commission.status}` };
  }

  const amountToReverse = commission.commissionEarned;

  // Update Ledger
  const ledger = await CommissionLedger.findOne({ storeId: order.storeId });
  if (ledger) {
    ledger.totalEarned = Math.max(0, ledger.totalEarned - amountToReverse);
    ledger.totalCommissions = Math.max(0, ledger.totalCommissions - amountToReverse);
    await ledger.save();
  }

  // Delete/Invalidate commission record
  await SellerCommission.deleteOne({ _id: commission._id });

  order.commissionStatus = 'none';
  await order.save();

  return { reversed: true, amount: amountToReverse };
};

module.exports = {
  creditCommissionForOrder,
  getOrCreateLedger,
  moveToPending,
  markAsWithdrawn,
  returnPendingToEarned,
  resolveAdminPriceForOrder,
  calculateStoreOrderCommission,
  reverseCommissionForOrder,
};
