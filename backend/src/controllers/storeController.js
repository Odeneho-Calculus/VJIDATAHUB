const axios = require('axios');
const Store = require('../models/Store');
const User = require('../models/User');
const Order = require('../models/Order');
const Guest = require('../models/Guest');
const AgentFeePayment = require('../models/AgentFeePayment');
const AgentCommissionPayout = require('../models/AgentCommissionPayout');
const SellerCommission = require('../models/SellerCommission');
const SystemSettings = require('../models/SystemSettings');
const DataPlan = require('../models/DataPlan');
const TopzaOffer = require('../models/TopzaOffer');
// const AfaOffer = require('../models/AfaOffer');
const Transaction = require('../models/Transaction');
const { getOrCreateLedger, moveToPending } = require('../services/commissionService');
const { isPositivePrice, resolvePlanPrice } = require('../utils/planPricing');
// const { calculateDataPurchaseCharge } = require('../utils/transactionCharges');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

// const DEFAULT_ORDER_DUPLICATE_COOLDOWN_MINUTES = 10;

// const resolveDuplicateCooldownMinutes = (value) => {
//   const parsed = Number(value);
//   if (Number.isNaN(parsed)) return DEFAULT_ORDER_DUPLICATE_COOLDOWN_MINUTES;
//   return Math.min(1440, Math.max(1, Math.floor(parsed)));
// };

// const getOrderDuplicateCooldownMinutes = async () => {
//   const settings = await SystemSettings.getSettings();
//   return resolveDuplicateCooldownMinutes(settings?.orderSettings?.duplicateOrderCooldownMinutes);
// };

// Helper: Resolve temporary ban status
const resolveTemporaryBanStatus = (store) => {
  if (store.isTemporarilyBanned && store.temporaryBanUntil) {
    if (new Date() >= store.temporaryBanUntil) {
      store.isTemporarilyBanned = false;
      store.temporaryBanReason = null;
      store.temporaryBanUntil = null;
      store.temporaryBanBy = null;
    }
  }
  return store;
};

// Helper: Compute access status for a store
const computeAccessStatus = (user, store) => {
  resolveTemporaryBanStatus(store);

  const storeOwnerId = store?.owner?._id
    ? store.owner._id.toString()
    : (store?.owner ? store.owner.toString() : null);
  const isStoreOwner = !!storeOwnerId && user?._id?.toString() === storeOwnerId;

  if (!store.isActive) {
    return { isAccessible: false, code: 'STORE_INACTIVE', message: 'Store is inactive' };
  }

  if (user.role === 'agent' && isStoreOwner) {
    if (user.agentFeeStatus === 'pending') {
      return { isAccessible: false, code: 'AGENT_FEE_UNPAID', message: 'Agent fee not paid' };
    }
  }

  if (store.isTemporarilyBanned) {
    return { isAccessible: false, code: 'STORE_TEMP_BANNED', message: 'Store is temporarily banned' };
  }

  return { isAccessible: true, code: null, message: null };
};

// const normalizeSlug = (rawSlug = '') =>
//   rawSlug
//     .toString()
//     .trim()
//     .toLowerCase();

// const phoneVariants = (phoneNumber) => {
//   const raw = String(phoneNumber || '').trim();
//   const digits = raw.replace(/\D/g, '');
//   const variants = new Set([raw, digits]);
//
//   if (digits.startsWith('0') && digits.length === 10) {
//     variants.add(`233${digits.slice(1)}`);
//   }
//   if (digits.startsWith('233') && digits.length === 12) {
//     variants.add(`0${digits.slice(3)}`);
//   }
//   if (digits.length === 9) {
//     variants.add(`0${digits}`);
//     variants.add(`233${digits}`);
//   }
//
//   return Array.from(variants).filter(Boolean);
// };

// const getActiveStorePlanType = async () => {
//   return { activeProvider: 'topza', activePlanType: 'TopzaOffer' };
// };

// 1. GET /my-store - Get or auto-create owner store
exports.getMyStore = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    let store = await Store.findOne({ owner: user._id })
      .populate('plans.planId')
      .populate('owner', 'name email agentFeeStatus agentFeePaidAt agentFeePaidReference protocolActivatedAt');

    if (!store) {
      const slug = user.name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
      store = await Store.create({
        owner: user._id,
        slug,
        name: user.name + "'s Store",
        description: '',
      });
      await store.populate('owner', 'name email agentFeeStatus agentFeePaidAt agentFeePaidReference protocolActivatedAt');
    }

    if (store.socialLinks) {
      for (const key in store.socialLinks) {
        if (typeof store.socialLinks[key] === 'string') {
          store.socialLinks[key] = { value: store.socialLinks[key], label: key };
        }
      }
      store.hasSocialLinks = Object.values(store.socialLinks).some(link =>
        link && link.value && link.value.trim().length > 0
      );
      await store.save();
    }

    const accessStatus = computeAccessStatus(user, store);
    const adminContact = await User.findOne({ role: 'admin' })
      .select('name email phone')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      store: store.toObject(),
      accessStatus,
      adminContact: adminContact
        ? {
          name: adminContact.name,
          email: adminContact.email,
          phone: adminContact.phone,
        }
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. PATCH /my-store - Update store
exports.updateMyStore = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    let store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const { name, slug, logo, description, theme, socialLinks, content } = req.body;

    if (slug && slug !== store.slug) {
      const slugExists = await Store.findOne({ slug });
      if (slugExists) {
        return res.status(400).json({ success: false, message: 'Slug already in use' });
      }
      store.slug = slug;
    }

    if (name) store.name = name;
    if (logo !== undefined) store.logo = logo;
    if (description !== undefined) store.description = description;
    if (theme) store.theme = { ...store.theme, ...theme };
    if (socialLinks) {
      store.socialLinks = socialLinks;
      const hasLinks = Object.values(socialLinks).some(link =>
        link && link.value && link.value.trim().length > 0
      );
      store.hasSocialLinks = hasLinks;
    }
    if (content) store.content = { ...store.content, ...content };

    await store.save();

    if (global.io) {
      global.io.to(`store:${store.slug}`).emit('store_updated', { type: 'branding', store });
    }

    res.status(200).json({
      success: true,
      store: store.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /my-store/available-plans - Get unified plans based on active provider
exports.getAvailablePlans = async (req, res) => {
  try {
    const topzaOffers = await TopzaOffer.find({ status: 'active', inStock: true }).sort({ isp: 1, volume: 1 });
    const availablePlans = topzaOffers
      .map((p) => {
        const agentBasePrice = resolvePlanPrice(p, { userRole: 'agent', agentFeeStatus: 'paid' });
        return agentBasePrice > 0
          ? {
            _id: p._id,
            name: p.name,
            network: p.isp,
            sellingPrice: agentBasePrice,
            agentPrice: agentBasePrice,
            publicPrice: p.sellingPrice,
            validity: p.validity,
            provider: 'topza',
            planType: 'TopzaOffer',
          }
          : null;
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      plans: availablePlans,
      provider: 'topza',
    });
  } catch (error) {
    console.error('getAvailablePlans error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. POST /my-store/plans - Add plan
exports.addPlanToStore = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { planId, customPrice, planType = 'DataPlan' } = req.body;

    if (!planId || customPrice === undefined) {
      return res.status(400).json({ success: false, message: 'planId and customPrice required' });
    }

    if (typeof customPrice !== 'number' || customPrice < 0) {
      return res.status(400).json({ success: false, message: 'customPrice must be a non-negative number' });
    }

    let planData;
    if (planType === 'TopzaOffer') {
      planData = await TopzaOffer.findById(planId);
    } else {
      planData = await DataPlan.findById(planId);
    }

    if (!planData) {
      return res.status(404).json({ success: false, message: `${planType} not found` });
    }

    const minPrice = (planType === 'TopzaOffer')
      ? resolvePlanPrice(planData, { userRole: 'agent', agentFeeStatus: 'paid' })
      : planData.sellingPrice;
    if (!isPositivePrice(minPrice)) {
      return res.status(400).json({ success: false, message: 'This plan cannot be added because admin pricing is not set yet' });
    }
    if (user.role === 'agent') {
      if (customPrice < minPrice) {
        return res.status(400).json({
          success: false,
          message: `Custom price cannot be below base cost (${minPrice})`
        });
      }
    }

    let store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    store.plans = store.plans.filter(p => p.planId.toString() !== planId);
    store.plans.push({
      planId,
      planType,
      customPrice,
      isActive: true,
      network: (planType === 'TopzaOffer') ? planData.isp : planData.network,
      dataSize: (planType === 'TopzaOffer') ? `${planData.volume}GB` : planData.dataSize,
    });

    await store.save();
    await store.populate('plans.planId');

    if (global.io) {
      global.io.to(`store:${store.slug}`).emit('store_updated', { type: 'inventory', store });
    }

    res.status(201).json({
      success: true,
      store: store.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. PATCH /my-store/plans/:planId - Update plan price
exports.updateStorePlan = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { customPrice, planType = 'DataPlan' } = req.body;
    const { planId } = req.params;

    if (customPrice === undefined) {
      return res.status(400).json({ success: false, message: 'customPrice required' });
    }

    let store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const planIndex = store.plans.findIndex(p =>
      p.planId.toString() === planId || p._id.toString() === planId
    );

    if (planIndex === -1) {
      return res.status(404).json({ success: false, message: 'Plan not in store' });
    }

    const targetStorePlan = store.plans[planIndex];
    const effectivePlanType = targetStorePlan.planType || planType;
    const effectivePlanId = targetStorePlan.planId;

    let planData;
    if (effectivePlanType === 'TopzaOffer') {
      planData = await TopzaOffer.findById(effectivePlanId);
    } else {
      planData = await DataPlan.findById(effectivePlanId);
    }

    if (!planData) {
      return res.status(404).json({ success: false, message: `${effectivePlanType} not found` });
    }

    const minPrice = (effectivePlanType === 'TopzaOffer') ? (planData.agentPrice || planData.sellingPrice) : planData.sellingPrice;
    if (customPrice < minPrice) {
      return res.status(400).json({
        success: false,
        message: `Custom price cannot be below base cost (${minPrice})`
      });
    }

    store.plans[planIndex].customPrice = customPrice;
    await store.save();
    await store.populate('plans.planId');

    if (global.io) {
      global.io.to(`store:${store.slug}`).emit('store_updated', { type: 'inventory', store });
    }

    res.status(200).json({
      success: true,
      store: store.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. DELETE /my-store/plans/:planId - Remove plan
exports.removePlanFromStore = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { planId } = req.params;

    let store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const initialLength = store.plans.length;
    store.plans = store.plans.filter(p =>
      p.planId.toString() !== planId && p._id.toString() !== planId
    );

    if (store.plans.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Plan not in store' });
    }

    await store.save();

    if (global.io) {
      global.io.to(`store:${store.slug}`).emit('store_updated', { type: 'inventory', store });
    }

    res.status(200).json({
      success: true,
      message: 'Plan removed from store',
      store: store.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. GET /my-store/orders/stats - Get order stats
exports.getStoreOrderStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const orders = await Order.find({ storeId: store._id });
    const paidOrders = orders.filter(o => ['completed', 'processing', 'pending'].includes(o.status));
    const completedOrders = orders.filter(o => o.status === 'completed');

    const stats = {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalRevenue: paidOrders.reduce((sum, o) => sum + o.amount, 0),
      totalCommission: paidOrders.reduce((sum, o) => sum + (o.agentCommission || 0), 0),
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      processingOrders: orders.filter(o => o.status === 'processing').length,
      failedOrders: orders.filter(o => o.status === 'failed').length,
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. GET /my-store/orders - Get store orders
exports.getStoreOrders = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const { page = 1, limit = 20, status, search, network } = req.query;
    const skip = (page - 1) * limit;

    const normalizeNetwork = (val = '') => val.toString().trim().toLowerCase().replace(/\s+/g, '');
    const getNetworkFamily = (n = '') => {
      if (!n) return '';
      if (n.startsWith('mtn')) return 'mtn';
      if (n.startsWith('telecel') || n.startsWith('vodafone')) return 'telecel';
      if (
        n.startsWith('airtel') || n.startsWith('tigo') || n.startsWith('at') ||
        n.includes('airteltigo') || n.includes('ishare')
      ) return 'at';
      return n;
    };
    const buildNetworkVariants = (value = '') => {
      const normalized = normalizeNetwork(value);
      const variants = new Set();
      if (!normalized) return variants;

      variants.add(normalized);

      const family = getNetworkFamily(normalized);
      if (family === 'mtn') {
        variants.add('mtn');
        variants.add('express(mtn)');
        variants.add('mtnup2u');
      } else if (family === 'telecel') {
        variants.add('telecel');
        variants.add('vodafone');
      } else if (family === 'at') {
        variants.add('airteltigo');
        variants.add('at-ishare');
        variants.add('atishare');
        variants.add('tigo');
        variants.add('airtel');
      }

      return variants;
    };

    let query = { storeId: store._id };

    if (status) query.status = status;

    if (network) {
      const variants = Array.from(buildNetworkVariants(network));
      if (variants.length > 0) {
        const pattern = variants
          .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        query.network = { $regex: pattern, $options: 'i' };
      } else {
        query.network = network;
      }
    }

    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { phoneNumber: new RegExp(search, 'i') },
        { planName: new RegExp(search, 'i') },
        { network: new RegExp(search, 'i') },
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('guestInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. GET /my-store/commissions/summary - Commission summary
exports.getCommissionSummary = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const settings = await SystemSettings.getSettings();

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const ledger = await getOrCreateLedger(store._id, user._id);
    const availableForWithdrawal = Number(ledger.totalEarned || 0);

    res.status(200).json({
      success: true,
      summary: {
        totalEarned: Number(ledger.totalCommissions || 0),
        withdrawable: availableForWithdrawal,
        totalWithdrawn: Number(ledger.totalWithdrawn || 0),
        pendingWithdrawal: Number(ledger.totalPending || 0),
        inReviewEarnings: 0,
        availableForWithdrawal,
        minWithdrawal: settings.commissionSettings.minWithdrawal,
        maxWithdrawal: settings.commissionSettings.maxWithdrawal,
        withdrawalFeeType: settings.commissionSettings.withdrawalFeeType,
        withdrawalFeeValue: settings.commissionSettings.withdrawalFeeValue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. GET /my-store/commissions/payouts - Get payouts history
exports.getCommissionPayouts = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { agentId: user._id };
    if (status) query.status = status;

    const total = await AgentCommissionPayout.countDocuments(query);
    const payouts = await AgentCommissionPayout.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      payouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. POST /my-store/commissions/payouts - Create payout request
exports.createCommissionPayout = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { amount, method, details } = req.body;
    const parsedAmount = Number(amount);
    const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    if (!parsedAmount || !method || !details) {
      return res.status(400).json({ success: false, message: 'amount, method, and details required' });
    }

    if (method === 'mobile_money') {
      if (!details.phone || !details.network) {
        return res.status(400).json({ success: false, message: 'Phone and network required for Mobile Money' });
      }
    } else if (method === 'bank') {
      if (!details.accountNumber || !details.bankCode || !details.accountName) {
        return res.status(400).json({ success: false, message: 'Account details required for Bank transfer' });
      }
    }

    const settings = await SystemSettings.getSettings();

    if (parsedAmount < settings.commissionSettings.minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${settings.commissionSettings.minWithdrawal}`
      });
    }

    if (parsedAmount > settings.commissionSettings.maxWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Maximum withdrawal is ${settings.commissionSettings.maxWithdrawal}`
      });
    }

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const ledger = await getOrCreateLedger(store._id, user._id);
    const availableForWithdrawal = Number(ledger.totalEarned || 0);

    if (parsedAmount > availableForWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient commission. Available: ${availableForWithdrawal}`
      });
    }

    const feeAmountRaw = settings.commissionSettings.withdrawalFeeType === 'fixed'
      ? settings.commissionSettings.withdrawalFeeValue
      : (parsedAmount * settings.commissionSettings.withdrawalFeeValue) / 100;

    const feeAmount = round2(feeAmountRaw);
    const netAmount = round2(parsedAmount - feeAmount);

    if (netAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Net withdrawal amount must be greater than 0 after fees',
      });
    }

    const payout = await AgentCommissionPayout.create({
      agentId: user._id,
      storeId: store._id,
      amount: parsedAmount,
      requestedAmount: parsedAmount,
      withdrawalFeeType: settings.commissionSettings.withdrawalFeeType,
      withdrawalFeeValue: settings.commissionSettings.withdrawalFeeValue,
      withdrawalFeeAmount: feeAmount,
      netAmount,
      method,
      details,
      status: 'pending',
    });

    await moveToPending({ storeId: store._id, amount: parsedAmount });

    let remaining = parsedAmount;
    const earnedRows = await SellerCommission.find({
      storeId: store._id,
      storeOwnerId: user._id,
      status: 'earned',
    }).sort({ createdAt: 1 });

    for (const row of earnedRows) {
      if (remaining <= 0) break;
      row.status = 'pending_withdrawal';
      row.withdrawalRequestId = payout._id;
      await row.save();
      remaining -= Number(row.commissionEarned || 0);
    }

    res.status(201).json({
      success: true,
      payout: payout.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. GET /my-store/agent-fee/status - Get fee payment status
exports.getAgentFeeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const feePayment = await AgentFeePayment.findOne({ agentId: user._id })
      .sort({ createdAt: -1 });

    const settings = await SystemSettings.getSettings();
    const accessStatus = computeAccessStatus(user, store);

    res.status(200).json({
      success: true,
      feeStatus: {
        status: user.agentFeeStatus,
        isPaid: ['paid', 'protocol'].includes(user.agentFeeStatus),
        paidAt: user.agentFeePaidAt,
        reference: user.agentFeePaidReference,
        registrationFee: settings.agentFeeSettings.registrationFee,
        accessStatus,
      },
      lastPayment: feePayment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 12. POST /my-store/agent-fee/initialize - Initialize fee payment
exports.initializeAgentFeePayment = async (req, res) => {
  try {
    const { paymentMethod = 'paystack' } = req.body || {};

    if (!['paystack', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method. Use paystack or wallet' });
    }

    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    if (['paid', 'protocol'].includes(user.agentFeeStatus)) {
      return res.status(200).json({
        success: true,
        message: 'Agent account already active',
        feePayment: {
          status: user.agentFeeStatus,
          reference: user.agentFeePaidReference,
          paidAt: user.agentFeePaidAt,
        },
      });
    }

    const settings = await SystemSettings.getSettings();
    const registrationFee = settings.agentFeeSettings.registrationFee;
    const store = await Store.findOne({ owner: user._id });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (registrationFee === 0) {
      user.agentFeeStatus = 'paid';
      user.agentFeePaidAt = new Date();
      user.agentFeePaidReference = 'FREE_TIER_' + user._id.toString();
      await user.save();

      const feePayment = await AgentFeePayment.create({
        agentId: user._id,
        storeId: store._id,
        amount: 0,
        reference: 'FREE_TIER_' + user._id.toString(),
        status: 'paid',
        paidAt: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: 'Agent activated with free tier',
        feePayment: feePayment.toObject(),
      });
    }

    if (paymentMethod === 'wallet') {
      if ((user.balance || 0) < registrationFee) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Required: ${registrationFee}, Available: ${user.balance || 0}`,
        });
      }

      const reference = 'AFEW' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
      const paidAt = new Date();

      const feePayment = await AgentFeePayment.create({
        agentId: user._id,
        storeId: store._id,
        amount: registrationFee,
        reference,
        status: 'paid',
        paidAt,
      });

      const transaction = await Transaction.create({
        userId: user._id,
        type: 'admin_adjustment',
        amount: -registrationFee,
        reference,
        status: 'completed',
        paymentStatus: 'completed',
        description: 'Agent Store Registration Fee (Wallet)',
      });

      await AgentFeePayment.updateMany(
        {
          agentId: user._id,
          _id: { $ne: feePayment._id },
          status: 'pending',
        },
        { status: 'failed' }
      );

      user.balance = (user.balance || 0) - registrationFee;
      user.agentFeeStatus = 'paid';
      user.agentFeePaidAt = paidAt;
      user.agentFeePaidReference = reference;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Agent fee paid successfully with wallet',
        feePayment: feePayment.toObject(),
        transaction: transaction.toObject(),
        balance: user.balance,
      });
    }

    const reference = 'AFE' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    const feePayment = await AgentFeePayment.create({
      agentId: user._id,
      storeId: store._id,
      amount: registrationFee,
      reference,
      status: 'pending',
    });

    const transaction = await Transaction.create({
      userId: user._id,
      type: 'wallet_topup',
      amount: registrationFee,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: 'Agent Store Registration Fee',
    });

    const paystackPayload = {
      email: user.email,
      amount: Math.round(registrationFee * 100),
      reference,
      metadata: {
        userId: user._id.toString(),
        transactionId: transaction._id.toString(),
        type: 'agent_fee',
      },
    };

    const paystackResponse = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (paystackResponse.data.status) {
      res.status(200).json({
        success: true,
        message: 'Paystack payment initialized',
        data: {
          authorizationUrl: paystackResponse.data.data.authorization_url,
          reference,
        },
        feePayment: feePayment.toObject(),
      });
    } else {
      throw new Error('Failed to initialize Paystack payment');
    }
  } catch (error) {
    console.error('initializeAgentFeePayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 13. POST /my-store/agent-fee/verify - Verify agent fee payment
exports.verifyAgentFeePayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const feePayment = await AgentFeePayment.findOne({ reference });

    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found' });
    }

    if (feePayment.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        feePayment: feePayment.toObject(),
      });
    }

    const verifyResponse = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (verifyResponse.data.data.status !== 'success') {
      feePayment.status = 'failed';
      await feePayment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    feePayment.status = 'paid';
    feePayment.paidAt = new Date();
    await feePayment.save();

    const user = await User.findById(feePayment.agentId);
    if (user) {
      user.agentFeeStatus = 'paid';
      user.agentFeePaidAt = feePayment.paidAt;
      user.agentFeePaidReference = reference;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Agent fee payment verified successfully',
      feePayment: feePayment.toObject(),
    });
  } catch (error) {
    console.error('verifyAgentFeePayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public store APIs
exports.getPublicStore = async (req, res) => {
  try {
    const { slug } = req.params;

    const store = await Store.findOne({ slug })
      .populate('owner', 'name email');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (!store.isActive) {
      return res.status(403).json({ success: false, message: 'Store is inactive' });
    }

    res.status(200).json({
      success: true,
      store: store.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicPlans = async (req, res) => {
  try {
    const { slug } = req.params;
    const { network } = req.query;

    const store = await Store.findOne({ slug })
      .populate('plans.planId');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    let plans = store.plans.filter(p => p.isActive);

    if (network) {
      plans = plans.filter(p => p.network && p.network.toLowerCase() === network.toLowerCase());
    }

    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.purchasePublicBundle = async (req, res) => {
  try {
    const { slug } = req.params;
    const { planId, phoneNumber, email } = req.body;

    if (!planId || !phoneNumber || !email) {
      return res.status(400).json({ success: false, message: 'planId, phoneNumber, and email are required' });
    }

    const store = await Store.findOne({ slug });

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const storePlan = store.plans.find(p => p.planId.toString() === planId);

    if (!storePlan || !storePlan.isActive) {
      return res.status(404).json({ success: false, message: 'Plan not found or inactive' });
    }

    const phoneValidation = { isValid: true, normalized: phoneNumber.replace(/\D/g, '') };
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.error });
    }

    const normalizedPhone = phoneValidation.normalized;

    let planData;
    if (storePlan.planType === 'TopzaOffer') {
      planData = await TopzaOffer.findById(storePlan.planId);
    } else {
      planData = await DataPlan.findById(storePlan.planId);
    }

    if (!planData) {
      return res.status(404).json({ success: false, message: 'Plan data not found' });
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const order = await Order.create({
      userId: null,
      isGuest: true,
      storeId: store._id,
      dataPlanId: storePlan.planId,
      planType: storePlan.planType,
      orderNumber,
      network: storePlan.network,
      phoneNumber: normalizedPhone,
      dataAmount: storePlan.dataSize,
      planName: planData.name,
      amount: storePlan.customPrice,
      paymentMethod: 'paystack',
      status: 'pending',
      paymentStatus: 'pending',
      provider: 'topza',
      source: 'store',
    });

    const txReference = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const transaction = await Transaction.create({
      userId: null,
      guestId: null,
      isGuest: true,
      type: 'data_purchase',
      amount: storePlan.customPrice,
      currency: 'GHS',
      reference: txReference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Store purchase - ${planData.name} for ${normalizedPhone}`,
    });

    order.transactionId = transaction._id;
    order.transactionReference = txReference;
    await order.save();

    const paystackPayload = {
      email,
      amount: Math.round(storePlan.customPrice * 100),
      reference: txReference,
      metadata: {
        orderId: order._id.toString(),
        storeSlug: slug,
        phoneNumber: normalizedPhone,
        isGuest: true,
      },
    };

    const paystackResponse = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (paystackResponse.data.status) {
      order.paystackReference = paystackResponse.data.data.reference;
      transaction.paystackReference = paystackResponse.data.data.reference;
      await order.save();
      await transaction.save();

      res.status(200).json({
        success: true,
        data: {
          authorizationUrl: paystackResponse.data.data.authorization_url,
          reference: paystackResponse.data.data.reference,
          orderNumber,
          orderId: order._id,
        },
      });
    } else {
      throw new Error('Failed to initialize Paystack payment');
    }
  } catch (error) {
    console.error('purchasePublicBundle error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyPublicPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.paymentStatus === 'completed') {
      const order = await Order.findOne({ transactionReference: transaction.reference });
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: { order, transaction },
      });
    }

    const verifyResponse = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (verifyResponse.data.data.status !== 'success') {
      transaction.status = 'failed';
      transaction.paymentStatus = 'failed';
      await transaction.save();

      await Order.updateOne(
        { transactionReference: transaction.reference },
        {
          $set: {
            paymentStatus: 'failed',
            status: 'failed',
            errorMessage: 'Payment verification failed',
          },
        }
      );

      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    transaction.status = 'completed';
    transaction.paymentStatus = 'completed';
    transaction.paystackReference = verifyResponse.data.data.reference;
    await transaction.save();

    const order = await Order.findOne({ transactionReference: transaction.reference });
    if (order) {
      order.paymentStatus = 'completed';
      order.status = 'processing';
      await order.save();
    }

    res.json({
      success: true,
      message: 'Payment verified and order is being processed',
      data: { order, transaction },
    });
  } catch (error) {
    console.error('verifyPublicPayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackGuestOrdersByStore = async (req, res) => {
  try {
    const { slug, phone } = req.params;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const store = await Store.findOne({ slug });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const guest = await Guest.findOne({
      phone: phone,
      store: store._id,
    })
      .populate({
        path: 'orders',
        match: { storeId: store._id },
        options: { sort: { createdAt: -1 } },
      });

    if (!guest || guest.orders.length === 0) {
      return res.json({
        success: true,
        data: {
          orders: [],
          totalOrders: 0,
        },
        message: 'No orders found for this phone number',
      });
    }

    const orders = guest.orders.map((order) => ({
      orderNumber: order.orderNumber,
      network: order.network,
      phoneNumber: order.phoneNumber,
      dataAmount: order.dataAmount,
      planName: order.planName,
      amount: order.amount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      errorMessage: order.errorMessage,
      providerMessage: order.providerMessage,
    }));

    res.json({
      success: true,
      data: {
        orders: orders,
        totalOrders: orders.length,
        guestInfo: {
          email: guest.email,
          name: guest.name,
          phone: guest.phone,
          totalPurchases: guest.totalPurchases,
          lastPurchaseAt: guest.lastPurchaseAt,
        },
      },
    });
  } catch (error) {
    console.error('Error tracking guest orders by store:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track orders',
    });
  }
};
