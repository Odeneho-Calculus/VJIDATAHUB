const Order = require('../models/Order');
const SellerCommission = require('../models/SellerCommission');
const CommissionLedger = require('../models/CommissionLedger');
const XpresDataOffer = require('../models/XpresDataOffer');
const DigimallOffer = require('../models/DigimallOffer');
const TopzaOffer = require('../models/TopzaOffer');
const TopzaCheckerOffer = require('../models/TopzaCheckerOffer');
const DataPlan = require('../models/DataPlan');

const getOrCreateLedger = async (storeId, storeOwnerId) => {
  let ledger = await CommissionLedger.findOne({ storeId });
  if (!ledger) {
    ledger = await CommissionLedger.create({
      storeId,
      storeOwnerId,
      totalEarned: 0,
      totalPending: 0,
      totalWithdrawn: 0,
      totalCommissions: 0,
    });
  }
  return ledger;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const resolveAdminPriceForOrder = async (order) => {
  const existingBasePrice = toNumber(order.adminBasePrice);
  if (existingBasePrice > 0) {
    return existingBasePrice;
  }

  if (!order.dataPlanId) {
    return 0;
  }

  let planDoc = null;
  if (order.planType === 'XpresDataOffer') {
    planDoc = await XpresDataOffer.findById(order.dataPlanId).select('agentPrice sellingPrice');
    if (!planDoc) return 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice);
  }

  if (order.planType === 'DigimallOffer') {
    planDoc = await DigimallOffer.findById(order.dataPlanId).select('agentPrice sellingPrice');
    if (!planDoc) return 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice);
  }

  if (order.planType === 'TopzaOffer') {
    planDoc = await TopzaOffer.findById(order.dataPlanId).select('agentPrice sellingPrice');
    if (!planDoc) return 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice);
  }

  if (order.planType === 'TopzaCheckerOffer') {
    planDoc = await TopzaCheckerOffer.findById(order.dataPlanId).select('agentPrice sellingPrice');
    if (!planDoc) return 0;
    return toNumber(planDoc.agentPrice) || toNumber(planDoc.sellingPrice);
  }

  planDoc = await DataPlan.findById(order.dataPlanId).select('costPrice sellingPrice price');
  if (!planDoc) return 0;
  return toNumber(planDoc.costPrice) || toNumber(planDoc.sellingPrice) || toNumber(planDoc.price);
};

const calculateStoreOrderCommission = async (order) => {
  const sellerPrice = toNumber(order.amount);
  const adminPrice = await resolveAdminPriceForOrder(order);
  const commissionEarned = sellerPrice - adminPrice;

  return {
    sellerPrice,
    adminPrice,
    commissionEarned,
  };
};

const creditCommissionForOrder = async (orderOrId) => {
  const order = typeof orderOrId === 'string'
    ? await Order.findById(orderOrId)
    : orderOrId;

  if (!order) {
    throw new Error('Order not found for commission credit');
  }

  if (!order.storeId || order.source !== 'store') {
    return { credited: false, reason: 'not_store_order' };
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
  await order.save();

  if (commissionEarned < 0) {
    throw new Error(`Negative commission is not allowed for order ${order.orderNumber}`);
  }

  if (commissionEarned === 0) {
    order.commissionStatus = 'earned';
    await order.save();
    return { credited: false, reason: 'zero_margin', commissionEarned: 0 };
  }

  const existing = await SellerCommission.findOne({ orderId: order._id });
  if (existing) {
    if (order.commissionStatus !== 'earned') {
      order.commissionStatus = 'earned';
      await order.save();
    }
    return { credited: false, reason: 'duplicate_order_record' };
  }

  try {
    await SellerCommission.create({
      storeId: order.storeId,
      storeOwnerId: order.userId,
      orderId: order._id,
      adminPlanPrice: adminPrice,
      sellerPrice,
      commissionEarned,
      status: 'earned',
    });
  } catch (createError) {
    // Guard against rare race conditions where another process inserts first.
    if (createError?.code === 11000) {
      order.commissionStatus = 'earned';
      await order.save();
      return { credited: false, reason: 'duplicate_order_record_race' };
    }
    throw createError;
  }

  const ledger = await getOrCreateLedger(order.storeId, order.userId);
  ledger.totalEarned += commissionEarned;
  ledger.totalCommissions += commissionEarned;
  await ledger.save();

  order.commissionStatus = 'earned';
  await order.save();

  return { credited: true, commissionEarned, ledger };
};

const moveToPending = async ({ storeId, amount }) => {
  const ledger = await CommissionLedger.findOne({ storeId });
  if (!ledger) {
    throw new Error('Commission ledger not found');
  }

  if (amount <= 0 || amount > ledger.totalEarned) {
    throw new Error('Invalid withdrawal amount against available earned balance');
  }

  ledger.totalEarned -= amount;
  ledger.totalPending += amount;
  await ledger.save();

  return ledger;
};

const markAsWithdrawn = async ({ storeId, amount }) => {
  const ledger = await CommissionLedger.findOne({ storeId });
  if (!ledger) {
    throw new Error('Commission ledger not found');
  }

  if (amount <= 0 || amount > ledger.totalPending) {
    throw new Error('Invalid paid amount against pending balance');
  }

  ledger.totalPending -= amount;
  ledger.totalWithdrawn += amount;
  await ledger.save();

  return ledger;
};

const returnPendingToEarned = async ({ storeId, amount }) => {
  const ledger = await CommissionLedger.findOne({ storeId });
  if (!ledger) {
    throw new Error('Commission ledger not found');
  }

  if (amount <= 0 || amount > ledger.totalPending) {
    throw new Error('Invalid rejected amount against pending balance');
  }

  ledger.totalPending -= amount;
  ledger.totalEarned += amount;
  await ledger.save();

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
