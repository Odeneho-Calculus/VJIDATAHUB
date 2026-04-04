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
const XpresDataOffer = require('../models/XpresDataOffer');
const DigimallOffer = require('../models/DigimallOffer');
const TopzaOffer = require('../models/TopzaOffer');
const Transaction = require('../models/Transaction');
const { creditCommissionForOrder, getOrCreateLedger, moveToPending } = require('../services/commissionService');
const { isPositivePrice, resolvePlanPrice } = require('../utils/planPricing');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

const DEFAULT_ORDER_DUPLICATE_COOLDOWN_MINUTES = 10;

const resolveDuplicateCooldownMinutes = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return DEFAULT_ORDER_DUPLICATE_COOLDOWN_MINUTES;
  return Math.min(1440, Math.max(1, Math.floor(parsed)));
};

const getOrderDuplicateCooldownMinutes = async () => {
  const settings = await SystemSettings.getSettings();
  return resolveDuplicateCooldownMinutes(settings?.orderSettings?.duplicateOrderCooldownMinutes);
};

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

  // For agent stores, check fee payment
  if (user.role === 'agent' && isStoreOwner) {
    if (user.agentFeeStatus === 'pending') {
      return { isAccessible: false, code: 'AGENT_FEE_UNPAID', message: 'Agent fee not paid' };
    }
  }

  // Check temporary ban
  if (store.isTemporarilyBanned) {
    return { isAccessible: false, code: 'STORE_TEMP_BANNED', message: 'Store is temporarily banned' };
  }

  return { isAccessible: true, code: null, message: null };
};

const normalizeSlug = (rawSlug = '') =>
  rawSlug
    .toString()
    .trim()
    .toLowerCase();

const phoneVariants = (phoneNumber) => {
  const raw = String(phoneNumber || '').trim();
  const digits = raw.replace(/\D/g, '');
  const variants = new Set([raw, digits]);

  if (digits.startsWith('0') && digits.length === 10) {
    variants.add(`233${digits.slice(1)}`);
  }
  if (digits.startsWith('233') && digits.length === 12) {
    variants.add(`0${digits.slice(3)}`);
  }
  if (digits.length === 9) {
    variants.add(`0${digits}`);
    variants.add(`233${digits}`);
  }

  return Array.from(variants).filter(Boolean);
};

const getActiveStorePlanType = async () => {
  const settings = await SystemSettings.getSettings();
  const activeProvider = settings.vtuProvider || 'topza';
  let activePlanType = 'XpresDataOffer';
  if (activeProvider === 'digimall') activePlanType = 'DigimallOffer';
  if (activeProvider === 'topza') activePlanType = 'TopzaOffer';
  return { activeProvider, activePlanType };
};

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

    // Migrate legacy social links if needed
    if (store.socialLinks) {
      for (const key in store.socialLinks) {
        if (typeof store.socialLinks[key] === 'string') {
          store.socialLinks[key] = { value: store.socialLinks[key], label: key };
        }
      }
      // Calculate hasSocialLinks
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

    // Validate slug uniqueness if changed
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
      // Calculate hasSocialLinks
      const hasLinks = Object.values(socialLinks).some(link =>
        link && link.value && link.value.trim().length > 0
      );
      store.hasSocialLinks = hasLinks;
    }
    if (content) store.content = { ...store.content, ...content };

    await store.save();

    // Emit live update
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
    const settings = await SystemSettings.getSettings();
    const activeProvider = settings.vtuProvider || 'topza';

    let availablePlans = [];

    if (activeProvider === 'digimall') {
      // Only show plans that are in stock (respects both provider sync status and admin overrides)
      const digimallOffers = await DigimallOffer.find({
        status: 'active',
        inStock: true,
      }).sort({ isp: 1, volume: 1 });
      availablePlans = digimallOffers
        .map(p => {
          const agentBasePrice = resolvePlanPrice(p, { userRole: 'agent', agentFeeStatus: 'paid' });
          return agentBasePrice > 0 ? {
            _id: p._id,
            name: p.name,
            network: p.isp,
            sellingPrice: agentBasePrice,
            agentPrice: agentBasePrice,
            publicPrice: p.sellingPrice,
            validity: p.validity,
            provider: 'digimall',
            planType: 'DigimallOffer',
          } : null;
        })
        .filter(Boolean);
    } else if (activeProvider === 'topza') {
      const topzaOffers = await TopzaOffer.find({ status: 'active', inStock: true }).sort({ isp: 1, volume: 1 });
      availablePlans = topzaOffers
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
    } else {
      const xpdOffers = await XpresDataOffer.find({ status: 'active', inStock: true }).sort({ isp: 1, volume: 1 });
      availablePlans = xpdOffers
        .map(offer => {
          const agentBasePrice = resolvePlanPrice(offer, { userRole: 'agent', agentFeeStatus: 'paid' });
          return agentBasePrice > 0 ? {
            _id: offer._id,
            name: offer.name,
            network: offer.isp,
            sellingPrice: agentBasePrice,
            agentPrice: agentBasePrice,
            publicPrice: offer.sellingPrice,
            validity: offer.validity,
            provider: 'xpresdata',
            planType: 'XpresDataOffer',
          } : null;
        })
        .filter(Boolean);
    }

    res.status(200).json({
      success: true,
      plans: availablePlans,
      provider: activeProvider,
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

    // Verify plan exists based on type
    let planData;
    if (planType === 'XpresDataOffer') {
      planData = await XpresDataOffer.findById(planId);
    } else if (planType === 'DigimallOffer') {
      planData = await DigimallOffer.findById(planId);
    } else if (planType === 'TopzaOffer') {
      planData = await TopzaOffer.findById(planId);
    } else {
      planData = await DataPlan.findById(planId);
    }

    if (!planData) {
      return res.status(404).json({ success: false, message: `${planType} not found` });
    }

    // For agents, check price floor
    const minPrice = (planType === 'XpresDataOffer' || planType === 'DigimallOffer' || planType === 'TopzaOffer')
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

    // Remove existing plan with same ID and add new one
    store.plans = store.plans.filter(p => p.planId.toString() !== planId);
    store.plans.push({
      planId,
      planType,
      customPrice,
      isActive: true,
      network: (planType === 'XpresDataOffer' || planType === 'DigimallOffer' || planType === 'TopzaOffer') ? planData.isp : planData.network,
      dataSize: (planType === 'XpresDataOffer' || planType === 'DigimallOffer' || planType === 'TopzaOffer') ? `${planData.volume}GB` : planData.dataSize,
    });

    await store.save();
    await store.populate('plans.planId');

    // Emit live update
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

    // Verify plan exists based on actual store plan type
    let planData;
    if (effectivePlanType === 'XpresDataOffer') {
      planData = await XpresDataOffer.findById(effectivePlanId);
    } else if (effectivePlanType === 'DigimallOffer') {
      planData = await DigimallOffer.findById(effectivePlanId);
    } else if (effectivePlanType === 'TopzaOffer') {
      planData = await TopzaOffer.findById(effectivePlanId);
    } else {
      planData = await DataPlan.findById(effectivePlanId);
    }

    if (!planData) {
      return res.status(404).json({ success: false, message: `${effectivePlanType} not found` });
    }

    // Price floor check
    const minPrice = (effectivePlanType === 'XpresDataOffer' || effectivePlanType === 'DigimallOffer' || effectivePlanType === 'TopzaOffer') ? (planData.agentPrice || planData.sellingPrice) : planData.sellingPrice;
    if (customPrice < minPrice) {
      return res.status(400).json({
        success: false,
        message: `Custom price cannot be below base cost (${minPrice})`
      });
    }

    store.plans[planIndex].customPrice = customPrice;
    await store.save();
    await store.populate('plans.planId');

    // Emit live update
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

    // Emit live update
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

    // Validate method specifics
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

    // Calculate fee
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

    // Allocate earned commission rows to this payout. For partials, whole rows may be linked.
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
      // Instant activation
      user.agentFeeStatus = 'paid';
      user.agentFeePaidAt = new Date();
      user.agentFeePaidReference = 'FREE_TIER_' + user._id.toString();
      await user.save();

      const store = await Store.findOne({ owner: user._id });
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

    // Create pending payment and initialize Paystack

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
      type: 'wallet_topup', // Reusing wallet_topup pattern for simplicity or maybe create a new 'agent_fee' type?
      // Actually Transaction.js allows: enum: ['data_purchase', 'wallet_funding', 'refund', 'wallet_topup', 'purchase_refund', 'referral_bonus', 'admin_adjustment']
      // Let's use 'wallet_topup' for consistency with existing wallet funding logic if Transaction model doesn't have 'agent_fee'
      // Wait, Transaction model I saw: enum: ['data_purchase', 'wallet_funding', 'refund', 'wallet_topup', 'purchase_refund', 'referral_bonus', 'admin_adjustment']
      // Let's use 'wallet_topup' or 'wallet_funding'
      amount: registrationFee,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: 'Agent Store Registration Fee',
    });

    const paystackPayload = {
      email: user.email,
      amount: registrationFee * 100,
      reference,
      metadata: {
        userId: user._id.toString(),
        feePaymentId: feePayment._id.toString(),
        type: 'agent_fee',
      },
    };

    const response = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (!response.data.status) {
      feePayment.status = 'failed';
      transaction.status = 'failed';
      await Promise.all([feePayment.save(), transaction.save()]);

      return res.status(400).json({
        success: false,
        message: response.data.message,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        feePaymentId: feePayment._id,
      },
    });
  } catch (error) {
    console.error('Initialize agent fee error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

// 13. POST /my-store/agent-fee/verify - Verify fee payment
exports.verifyAgentFeePayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference required' });
    }

    const user = await User.findById(req.userId);
    if (user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    // Verify with Paystack
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (!response.data.status) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    const paystackData = response.data.data;

    if (paystackData.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment was not successful',
        status: paystackData.status,
      });
    }

    const feePayment = await AgentFeePayment.findOne({
      agentId: user._id,
      reference,
    });

    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment record not found' });
    }

    if (feePayment.status === 'paid' || feePayment.status === 'protocol') {
      return res.status(200).json({ success: true, message: 'Payment already processed', feePayment });
    }

    // Mark as paid
    feePayment.status = 'paid';
    feePayment.paidAt = new Date();
    feePayment.paystackResponse = paystackData;
    await feePayment.save();

    // Update linked transaction
    await Transaction.findOneAndUpdate(
      { reference },
      { status: 'completed', paymentStatus: 'completed', paystackReference: paystackData.reference }
    );

    // Fail competing pending fees
    await AgentFeePayment.updateMany(
      {
        agentId: user._id,
        _id: { $ne: feePayment._id },
        status: 'pending',
      },
      { status: 'failed' }
    );

    // Update user
    user.agentFeeStatus = 'paid';
    user.agentFeePaidAt = new Date();
    user.agentFeePaidReference = reference;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Agent fee payment verified',
      feePayment: feePayment.toObject(),
    });
  } catch (error) {
    console.error('Verify agent fee error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

// PUBLIC ENDPOINTS (no auth required)

// GET /public/:slug - Get public store
exports.getPublicStore = async (req, res) => {
  try {
    const { slug } = req.params;
    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Store slug is required' });
    }

    const store = await Store.findOne({ slug: normalizedSlug })
      .populate('owner', 'name')
      .populate('plans.planId');

    const { activePlanType } = await getActiveStorePlanType();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const owner = await User.findById(store.owner._id);
    resolveTemporaryBanStatus(store);

    const accessStatus = {
      isAccessible: store.isActive && !store.isTemporarilyBanned,
      code: null,
      message: null,
    };

    if (!store.isActive) {
      accessStatus.isAccessible = false;
      accessStatus.code = 'STORE_INACTIVE';
      accessStatus.message = 'This store is currently inactive.';
    }

    if (owner.role === 'agent' && owner.agentFeeStatus === 'pending') {
      accessStatus.isAccessible = false;
      accessStatus.code = 'AGENT_FEE_UNPAID';
      accessStatus.message = 'This agent store is locked until activation is completed by payment or admin protocol.';
    }

    if (store.isTemporarilyBanned) {
      accessStatus.isAccessible = false;
      accessStatus.code = 'STORE_TEMP_BANNED';
      accessStatus.message = 'This store is temporarily unavailable.';
    }

    const activePlans = (store.plans || []).filter((plan) => {
      if (!plan || !plan.isActive || !plan.planId) return false;
      if (plan.planType !== activePlanType) return false;
      const p = plan.planId;
      // Check global status (works for both DataPlan and XpresDataOffer)
      const isGlobalActive = p.status === 'active';
      // Check model-specific availability
      const isAvailable = (plan.planType === 'XpresDataOffer' || plan.planType === 'DigimallOffer' || plan.planType === 'TopzaOffer') ? p.inStock !== false : p.isActive !== false;
      return isGlobalActive && isAvailable;
    });
    const totalPlans = activePlans.length;
    const totalNetworks = new Set(
      activePlans
        .map((plan) => (plan.planType === 'XpresDataOffer' || plan.planType === 'DigimallOffer' || plan.planType === 'TopzaOffer') ? plan.planId?.isp : plan.planId?.network)
        .filter(Boolean)
    ).size;

    const publicPlans = activePlans.map((plan) => ({
      _id: plan._id,
      planId: plan.planId?._id,
      network: (plan.planType === 'XpresDataOffer' || plan.planType === 'DigimallOffer' || plan.planType === 'TopzaOffer') ? plan.planId?.isp : plan.planId?.network,
      planType: plan.planType,
      isActive: plan.isActive,
    }));

    res.status(200).json({
      success: true,
      store: {
        _id: store._id,
        name: store.name,
        logo: store.logo,
        description: store.description,
        slug: store.slug,
        theme: store.theme,
        socialLinks: store.socialLinks,
        hasSocialLinks: store.hasSocialLinks || (store.socialLinks && Object.values(store.socialLinks).some(link => link && link.value && link.value.trim().length > 0)),
        content: store.content,
        plans: publicPlans,
        totalPlans,
        totalNetworks,
        owner: store.owner,
      },
      accessStatus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /public/:slug/plans - Get store plans
exports.getPublicStorePlans = async (req, res) => {
  try {
    const { slug } = req.params;
    const { network } = req.query;

    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Store slug is required' });
    }

    const store = await Store.findOne({ slug: normalizedSlug })
      .populate('plans.planId');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Check store accessibility
    const owner = await User.findById(store.owner._id);
    resolveTemporaryBanStatus(store);

    if (!store.isActive) {
      return res.status(403).json({ success: false, code: 'STORE_INACTIVE', message: 'Store is not available' });
    }

    if (owner.role === 'agent' && owner.agentFeeStatus === 'pending') {
      return res.status(403).json({ success: false, code: 'AGENT_FEE_UNPAID', message: 'Agent store not yet activated' });
    }

    if (store.isTemporarilyBanned) {
      return res.status(403).json({ success: false, code: 'STORE_TEMP_BANNED', message: 'Store is temporarily unavailable' });
    }

    const settings = await SystemSettings.getSettings();
    const activeProvider = settings.vtuProvider || 'topza';
    const activePlanType = activeProvider === 'digimall'
      ? 'DigimallOffer'
      : (activeProvider === 'topza' ? 'TopzaOffer' : 'XpresDataOffer');
    const networkCatalog = Array.isArray(settings?.networkCatalog) ? settings.networkCatalog : [];
    const normalizeNetwork = (val = '') => val.toString().trim().toLowerCase().replace(/\s+/g, '');

    // Maps a normalised network string to a canonical family key so that
    // cross-provider name variants resolve to the same catalog entry.
    // e.g. XpresData "AIRTELTIGO" and DigiMall "AirtelTigo" both -> "at".
    const getNetworkFamily = (n) => {
      if (!n) return '';
      if (n.startsWith('mtn')) return 'mtn';
      if (n.startsWith('telecel') || n.startsWith('vodafone')) return 'telecel';
      if (
        n.startsWith('airtel') || n.startsWith('tigo') || n.startsWith('at') ||
        n.includes('airteltigo') || n.includes('ishare')
      ) return 'at';
      return n;
    };

    // Find a matching catalog entry for a given raw network name/isp.
    // Priority: 1) exact name  2) exact slug  3) catalog name starts-with target
    //           4) network-family match — handles cross-provider mismatches
    //              (e.g. XpresData "AIRTELTIGO" → catalog "AT - iSHare")
    const findCatalogEntry = (networkName = '') => {
      const target = normalizeNetwork(networkName);
      const active = networkCatalog.filter(e => e?.isActive !== false);
      // 1. Exact name
      let entry = active.find(e => normalizeNetwork(e?.name) === target);
      if (entry) return entry;
      // 2. Exact slug
      entry = active.find(e => normalizeNetwork(e?.slug) === target);
      if (entry) return entry;
      // 3. Catalog name starts with the raw value (e.g. "MTNUP2U" starts with "MTN")
      if (target.length >= 2) {
        entry = active.find(e => normalizeNetwork(e?.name).startsWith(target));
        if (entry) return entry;
      }
      // 4. Network-family fallback (last resort for totally different naming conventions)
      const targetFamily = getNetworkFamily(target);
      if (targetFamily) {
        entry = active.find(e => {
          const nameFam = getNetworkFamily(normalizeNetwork(e?.name));
          const slugFam = getNetworkFamily(normalizeNetwork(e?.slug || ''));
          return nameFam === targetFamily || slugFam === targetFamily;
        });
        if (entry) return entry;
      }
      return null;
    };

    const findNetworkLogo = (networkName = '') => {
      return findCatalogEntry(networkName)?.logoUrl || null;
    };

    let plans = store.plans.filter(p => {
      if (!p.isActive || !p.planId) return false;
      if (p.planType !== activePlanType) return false;
      const gp = p.planId;
      const isGlobalActive = gp.status === 'active';
      let isAvailable;
      if (p.planType === 'DigimallOffer') {
        // Hide if out of stock — respects both provider sync status and admin manual overrides
        isAvailable = gp.inStock === true;
      } else if (p.planType === 'XpresDataOffer' || p.planType === 'TopzaOffer') {
        isAvailable = gp.inStock !== false;
      } else {
        isAvailable = gp.isActive !== false;
      }
      return isGlobalActive && isAvailable;
    });

    if (network) {
      plans = plans.filter(p => {
        const planNetwork = (p.planType === 'XpresDataOffer' || p.planType === 'DigimallOffer' || p.planType === 'TopzaOffer') ? p.planId.isp : p.planId.network;
        const catalogName = findCatalogEntry(planNetwork)?.name || planNetwork;
        const planName = (p.planType === 'XpresDataOffer' || p.planType === 'TopzaOffer') ? p.planId.name : (p.planId.planName || p.planId.name);
        return planNetwork === network || catalogName === network ||
          normalizeNetwork(planNetwork) === normalizeNetwork(network) ||
          normalizeNetwork(catalogName) === normalizeNetwork(network) ||
          (planName && planName.toLowerCase().includes(network.toLowerCase()));
      });
    }

    const enrichedPlans = plans.map(p => {
      const isXPD = p.planType === 'XpresDataOffer';
      const isDigimall = p.planType === 'DigimallOffer';
      const isTopza = p.planType === 'TopzaOffer';
      const planNetwork = (isXPD || isDigimall || isTopza) ? p.planId.isp : p.planId.network;
      // Use the catalog display name so tabs in the public catalog always match
      // the network cards on the store page, regardless of provider naming conventions.
      const catalogEntry = findCatalogEntry(planNetwork);
      const displayNetwork = catalogEntry?.name || planNetwork;
      return {
        _id: p._id,
        planId: p.planId._id,
        package: isXPD ? p.planId.name : (p.planId.planName || p.planId.name),
        network: displayNetwork,
        networkLogo: catalogEntry?.logoUrl || findNetworkLogo(planNetwork),
        size: (isXPD || isDigimall || isTopza) ? `${p.planId.volume}GB` : p.planId.dataSize,
        sellingPrice: p.customPrice,
        planType: p.planType,
        provider: isXPD ? 'xpresdata' : (isDigimall ? 'digimall' : (isTopza ? 'topza' : 'xpresdata')),
      };
    });

    res.status(200).json({
      success: true,
      plans: enrichedPlans,
      provider: activeProvider,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /public/:slug/purchase - Initialize guest purchase
exports.purchasePublicStoreBundle = async (req, res) => {
  try {
    const { slug } = req.params;
    const { planId, email, phone, name } = req.body;

    if (!planId || !email || !phone || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Store slug is required' });
    }

    const store = await Store.findOne({ slug: normalizedSlug }).populate('owner');
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Check accessibility
    const owner = store.owner;
    resolveTemporaryBanStatus(store);

    if (!store.isActive || (owner.role === 'agent' && owner.agentFeeStatus === 'pending') || store.isTemporarilyBanned) {
      return res.status(403).json({ success: false, message: 'Store is currently unavailable' });
    }

    const storePlan = store.plans.find(p => p.planId && p.planId.toString() === planId.toString() && p.isActive);
    if (!storePlan) {
      return res.status(404).json({ success: false, message: 'Plan not found or inactive in this store' });
    }

    const { activeProvider, activePlanType } = await getActiveStorePlanType();
    if (storePlan.planType !== activePlanType) {
      return res.status(400).json({
        success: false,
        message: `Selected plan is not available because active VTU is ${activeProvider}`,
      });
    }

    let planData;
    if (storePlan.planType === 'XpresDataOffer') {
      planData = await XpresDataOffer.findById(planId);
    } else if (storePlan.planType === 'DigimallOffer') {
      planData = await DigimallOffer.findById(planId);
    } else if (storePlan.planType === 'TopzaOffer') {
      planData = await TopzaOffer.findById(planId);
    } else {
      planData = await DataPlan.findById(planId);
    }

    if (!planData || planData.status !== 'active') {
      return res.status(404).json({ success: false, message: 'This data plan is currently unavailable globally' });
    }

    if ((storePlan.planType === 'XpresDataOffer' || storePlan.planType === 'DigimallOffer' || storePlan.planType === 'TopzaOffer') && planData.inStock === false) {
      return res.status(400).json({ success: false, message: 'This data plan is currently out of stock' });
    }

    const planProvider = storePlan.planType === 'DigimallOffer'
      ? 'digimall'
      : (storePlan.planType === 'TopzaOffer' ? 'topza' : 'xpresdata');

    const baseCost = (storePlan.planType === 'XpresDataOffer' || storePlan.planType === 'DigimallOffer' || storePlan.planType === 'TopzaOffer')
      ? resolvePlanPrice(planData, { userRole: 'agent', agentFeeStatus: 'paid' })
      : planData.sellingPrice;
    if (!isPositivePrice(baseCost)) {
      return res.status(400).json({ success: false, message: 'This data plan does not have a valid admin price yet' });
    }

    if (!isPositivePrice(storePlan.customPrice)) {
      return res.status(400).json({ success: false, message: 'This store plan does not have a valid selling price' });
    }

    const planNetwork = (storePlan.planType === 'XpresDataOffer' || storePlan.planType === 'DigimallOffer' || storePlan.planType === 'TopzaOffer') ? planData.isp : planData.network;

    // Validate phone for network
    if (!isValidNetworkNumber(phone, planNetwork)) {
      return res.status(400).json({
        success: false,
        message: `Phone number does not match ${planNetwork} network`
      });
    }

    const cooldownMinutes = await getOrderDuplicateCooldownMinutes();
    const cooldownSince = new Date(Date.now() - cooldownMinutes * 60 * 1000);
    const existingInFlightOrder = await Order.findOne({
      provider: planProvider,
      phoneNumber: { $in: phoneVariants(phone) },
      status: { $in: ['pending', 'processing'] },
      paymentStatus: { $ne: 'failed' },
      createdAt: { $gte: cooldownSince },
    }).sort({ createdAt: -1 });

    if (existingInFlightOrder) {
      return res.status(409).json({
        success: false,
        message: `A recent order (${existingInFlightOrder.orderNumber}) for this number is still ${existingInFlightOrder.status}. Please wait ${cooldownMinutes} minutes before buying this number again.`,
        existingOrder: {
          id: existingInFlightOrder._id,
          orderNumber: existingInFlightOrder.orderNumber,
          status: existingInFlightOrder.status,
          phoneNumber: existingInFlightOrder.phoneNumber,
          createdAt: existingInFlightOrder.createdAt,
        },
      });
    }

    // Create/Update Guest
    let guest = await Guest.findOne({ email, store: store._id });
    if (!guest) {
      guest = await Guest.create({ email, phone, name, store: store._id });
    } else {
      guest.phone = phone;
      guest.name = name;
      await guest.save();
    }

    const reference = 'GSP' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    const orderNumber = 'ORD-G' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 4).toUpperCase();

    const agentCommission = storePlan.customPrice - baseCost;

    // Build provider-specific apiPlanId
    let apiPlanId;
    if (storePlan.planType === 'XpresDataOffer') {
      apiPlanId = `${planData.offerSlug}|${planData.volume}`;
    } else if (storePlan.planType === 'DigimallOffer') {
      apiPlanId = `${planData.offerSlug}|${planData.volume}`;
    } else if (storePlan.planType === 'TopzaOffer') {
      apiPlanId = planData.providerPlanId;
    } else {
      apiPlanId = planData.apiPlanId;
    }

    const order = await Order.create({
      userId: owner._id,
      dataPlanId: planId,
      planType: storePlan.planType,
      apiPlanId,
      orderNumber,
      network: planNetwork,
      phoneNumber: phone,
      dataAmount: (storePlan.planType === 'XpresDataOffer' || storePlan.planType === 'DigimallOffer' || storePlan.planType === 'TopzaOffer') ? `${planData.volume}GB` : planData.dataSize,
      planName: (storePlan.planType === 'XpresDataOffer' || storePlan.planType === 'TopzaOffer') ? planData.name : (planData.planName || planData.name),
      amount: storePlan.customPrice,
      paymentMethod: 'paystack',
      status: 'pending',
      paymentStatus: 'pending',
      source: 'store',
      isGuest: true,
      guestInfo: guest._id,
      storeId: store._id,
      adminBasePrice: baseCost,
      agentCommission: agentCommission > 0 ? agentCommission : 0,
      provider: planProvider,
    });

    const transaction = await Transaction.create({
      userId: owner._id,
      type: 'data_purchase',
      amount: storePlan.customPrice,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Guest Purchase: ${planData.name || planData.planName} for ${phone} (Store: ${store.name})`,
    });

    const paystackPayload = {
      email,
      amount: Math.round(storePlan.customPrice * 100),
      reference,
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        type: 'public_store_purchase',
        storeSlug: store.slug,
        guestId: guest._id.toString()
      },
    };

    const response = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (!response.data.status) {
      order.status = 'failed';
      transaction.status = 'failed';
      await Promise.all([order.save(), transaction.save()]);
      return res.status(400).json({ success: false, message: response.data.message });
    }

    // Link references to order
    order.paystackReference = reference;
    order.transactionReference = reference;
    order.transactionId = transaction._id;
    await order.save();

    // Link order to guest
    guest.orders.push(order._id);
    await guest.save();

    res.status(200).json({
      success: true,
      data: {
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        orderId: order._id,
      },
    });
  } catch (error) {
    console.error('Public store purchase init error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/store/verify-payment - Verify public payment
exports.verifyPublicStorePayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference required' });
    }

    const order = await Order.findOne({ transactionReference: reference }).populate('guestInfo storeId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'completed' || order.status === 'processing') {
      return res.status(200).json({ success: true, message: 'Order already processed', order });
    }

    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    if (!response.data.status || response.data.data.status !== 'success') {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const paystackData = response.data.data;
    order.paymentStatus = 'completed';
    order.paidAt = new Date();
    order.paystackReference = paystackData.reference;
    order.status = 'processing';
    await order.save();

    await creditCommissionForOrder(order);

    // Update Transaction
    await Transaction.findOneAndUpdate(
      { reference },
      { status: 'completed', paymentStatus: 'completed', paystackReference: paystackData.reference }
    );

    // Update Guest stats
    if (order.guestInfo) {
      const guest = await Guest.findById(order.guestInfo);
      if (guest) {
        guest.totalPurchases += 1;
        guest.lastPurchaseAt = new Date();
        await guest.save();
      }
    }

    // Dispatch purchase to correct provider
    let purchaseResult;
    if (order.provider === 'digimall') {
      const { purchaseDataBundle: digimallBuy } = require('../utils/digimallApi');
      const [offerSlug, volume] = typeof order.apiPlanId === 'string' ? order.apiPlanId.split('|') : [order.apiPlanId, ''];
      const idempotencyKey = 'DGM' + order.orderNumber;
      purchaseResult = await digimallBuy(offerSlug, order.phoneNumber, order.network, volume, idempotencyKey);
      if (purchaseResult.success) {
        order.externalOrderId = purchaseResult.data?.orderId || purchaseResult.data?.reference || 'UNTRACKED_' + Date.now();
        order.transactionReference = purchaseResult.data?.reference || purchaseResult.data?.orderId || order.transactionReference;
      }
    } else if (order.provider === 'topza') {
      const { purchaseDataBundle: topzaBuy } = require('../utils/topzaApi');
      const idempotencyKey = 'TPZ' + order.orderNumber;
      purchaseResult = await topzaBuy(order.apiPlanId, order.phoneNumber, order.network, null, idempotencyKey);
      if (purchaseResult.success) {
        order.externalOrderId = purchaseResult.data?.orderId || purchaseResult.data?.reference || 'UNTRACKED_' + Date.now();
        order.externalOrderNumber = purchaseResult.data?.orderNumber || purchaseResult.data?.raw?.data?.order?.orderNumber || order.externalOrderNumber;
        order.transactionReference = purchaseResult.data?.reference || purchaseResult.data?.orderId || order.transactionReference;
        order.providerMessage = purchaseResult.data?.message || order.providerMessage;
        order.providerStatus = purchaseResult.data?.status || 'Processing';
      }
    } else {
      const [offerSlug, volume] = typeof order.apiPlanId === 'string' ? order.apiPlanId.split('|') : [order.apiPlanId, ''];
      const { purchaseDataBundle } = require('../utils/xpresDataApi');
      purchaseResult = await purchaseDataBundle(offerSlug, order.phoneNumber, order.network, volume);
      if (purchaseResult.success) {
        order.externalOrderId = purchaseResult.data.orderId || purchaseResult.data.reference || purchaseResult.data.order?.id;
        if (!order.externalOrderId) {
          console.error(`[Store Verify] WARNING: externalOrderId not captured! Full response:`, purchaseResult.data);
          order.externalOrderId = 'UNTRACKED_' + Date.now();
        }
        order.providerMessage = purchaseResult.data.message;
      }
    }

    if (purchaseResult.success) {
      order.status = 'processing';
      order.syncAttempts = 0;
      await order.save();

      // Update Store stats
      await Store.findByIdAndUpdate(order.storeId, {
        $inc: { totalRevenue: order.amount, totalOrders: 1 }
      });
    } else {
      order.status = 'failed';
      order.errorMessage = purchaseResult.error || 'Provider purchase failed';
      await order.save();
    }

    res.status(200).json({ success: true, message: 'Payment verified and order processed', order });
  } catch (error) {
    console.error('Public store verify error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 14. GET /public/:slug/track/:phone - Track guest orders
exports.trackGuestOrders = async (req, res) => {
  try {
    const { slug, phone } = req.params;

    if (!slug || !phone) {
      return res.status(400).json({ success: false, message: 'Slug and phone number required' });
    }

    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Store slug is required' });
    }

    const store = await Store.findOne({ slug: normalizedSlug });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Find orders for this store matching the phone number
    // We check both the main phoneNumber field and the guestInfo phone field
    const orders = await Order.find({
      storeId: store._id,
      $or: [
        { phoneNumber: phone },
        { 'guestInfo.phone': phone }
      ]
    })
      .select('orderNumber network phoneNumber dataAmount planName amount status createdAt completedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
      store: {
        name: store.name,
        theme: store.theme,
        logo: store.logo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const isValidNetworkNumber = (_phone, _network) => {
  // Simple check for now, can be expanded based on utility patterns
  return true;
};

module.exports = exports;
