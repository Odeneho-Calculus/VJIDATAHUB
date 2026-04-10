const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');
const Guest = require('../models/Guest');
const TopzaCheckerOffer = require('../models/TopzaCheckerOffer');
const SystemSettings = require('../models/SystemSettings');
const topzaApi = require('../utils/topzaApi');
const { resolvePlanPrice, hasAnyConfiguredPrice, toPriceNumber } = require('../utils/planPricing');
const { creditCommissionForOrder } = require('../services/commissionService');
const { processRefund } = require('../utils/refund');
const { calculateDataPurchaseCharge } = require('../utils/transactionCharges');
const axios = require('axios');

const allowedCheckerTypes = ['WAEC', 'NECO', 'JAMB', 'BECE'];

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

const normalizeCheckerType = (value = '') => String(value || '').trim().toUpperCase();

const resolveRolePrice = (offer, user) => {
  const userRole = user?.role || 'user';
  const agentFeeStatus = user?.agentFeeStatus || 'pending';
  return resolvePlanPrice(offer, { userRole, agentFeeStatus });
};

const executeTopzaCheckerPurchase = async ({ order, offer, phoneNumber, skipSms }) => {
  const topzaResult = await topzaApi.buyChecker({
    checkerType: offer.checkerType,
    phoneNumber: String(phoneNumber).trim(),
    skipSms: Boolean(skipSms),
    idempotencyKey: `CHK${order.orderNumber}`,
  });

  if (!topzaResult.success) {
    return { success: false, error: topzaResult.error || 'Checker purchase failed' };
  }

  const txReference = topzaResult.data?.reference || `CHKW${Date.now()}`;

  order.status = 'processing';
  order.paymentStatus = 'completed';
  order.externalOrderId = topzaResult.data?.resultCheckerId || null;
  order.transactionReference = txReference;
  order.providerStatus = topzaResult.data?.status || 'pending';
  order.providerMessage = topzaResult.message || null;
  order.checkerDetails = {
    ...order.checkerDetails,
    resultCheckerId: topzaResult.data?.resultCheckerId || null,
    checkerType: offer.checkerType,
    skipSms: Boolean(skipSms),
  };
  await order.save();

  return {
    success: true,
    message: topzaResult.message || 'Checker purchase initiated',
    data: {
      resultCheckerId: topzaResult.data?.resultCheckerId || null,
      purchaseId: order.orderNumber,
      reference: txReference,
      status: order.status,
    },
  };
};

const mapOrderToCheckerResponse = (order) => {
  const details = order?.checkerDetails || {};
  return {
    _id: order._id,
    purchaseId: order.orderNumber,
    reference: order.transactionReference || order.paystackReference || order.externalOrderId,
    checkerType: details.checkerType || order.planName,
    serialNumber: details.serialNumber || null,
    pin: details.pin || null,
    phoneNumber: order.phoneNumber,
    price: order.amount,
    status: order.status,
    purchaseStatus: order.paymentStatus === 'completed' ? 'success' : order.paymentStatus,
    smsNotificationSent: details.smsNotificationSent || false,
    failureReason: order.errorMessage || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    metadata: {
      paymentMethod: order.paymentMethod,
      skipSms: Boolean(details.skipSms),
      providerStatus: order.providerStatus || null,
      providerMessage: order.providerMessage || null,
      resultCheckerId: details.resultCheckerId || null,
    },
  };
};

const normalizeSlug = (rawSlug = '') =>
  rawSlug
    .toString()
    .trim()
    .toLowerCase();

const isStoreAccessible = (store, owner) => {
  if (!store || !owner) return false;
  if (!store.isActive) return false;
  if (owner.role === 'agent' && owner.agentFeeStatus === 'pending') return false;
  if (store.isTemporarilyBanned) return false;
  return true;
};

exports.syncCheckerOffers = async (req, res) => {
  try {
    const [typesResult, productsResult, availabilityResult] = await Promise.all([
      topzaApi.getCheckerTypes(),
      topzaApi.getCheckerProducts(),
      topzaApi.getCheckerAvailability(),
    ]);

    if (!typesResult.success && !productsResult.success) {
      return res.status(400).json({
        success: false,
        message: typesResult.error || productsResult.error || 'Failed to sync checker offers from Topza',
      });
    }

    const now = new Date();

    const typeMap = new Map();
    for (const typeRow of typesResult.types || []) {
      const checkerType = normalizeCheckerType(typeRow?.name);
      if (!checkerType) continue;
      typeMap.set(checkerType, typeRow);
    }

    const productMap = new Map();
    for (const product of productsResult.products || []) {
      const checkerType = normalizeCheckerType(product?.name || product?.checkerType);
      if (!checkerType) continue;
      productMap.set(checkerType, product);
    }

    const availabilityMap = new Map();
    const availabilityData = availabilityResult.data || {};
    const availableList = Array.isArray(availabilityData.availableProductsList)
      ? availabilityData.availableProductsList
      : [];
    const unavailableList = Array.isArray(availabilityData.unavailableProductsList)
      ? availabilityData.unavailableProductsList
      : [];

    for (const row of [...availableList, ...unavailableList]) {
      const checkerType = normalizeCheckerType(row?.checkerType || row?.name);
      if (!checkerType) continue;
      availabilityMap.set(checkerType, row);
    }

    const candidateTypes = new Set([...allowedCheckerTypes, ...typeMap.keys(), ...productMap.keys(), ...availabilityMap.keys()]);

    let synced = 0;
    let updated = 0;

    for (const checkerType of candidateTypes) {
      const typeRow = typeMap.get(checkerType) || {};
      const productRow = productMap.get(checkerType) || {};
      const availabilityRow = availabilityMap.get(checkerType) || {};

      const displayName = productRow.displayName || typeRow.displayName || typeRow.name || checkerType;
      const description = productRow.description || typeRow.description || '';
      const category = productRow.category || typeRow.category || 'secondary';
      const icon = productRow.icon || typeRow.icon || null;
      const color = productRow.color || typeRow.color || null;
      const costPrice = Number(productRow.price || 0) || 0;
      const available = typeof productRow.available === 'boolean'
        ? productRow.available
        : (typeof availabilityRow.available === 'boolean' ? availabilityRow.available : false);
      const stockCount = Number(productRow.stockCount ?? availabilityRow.stockCount ?? 0) || 0;
      const lastCheckedAt = productRow.lastCheckedAt || availabilityRow.lastCheckedAt || null;

      const existing = await TopzaCheckerOffer.findOne({ checkerType });

      if (!existing) {
        await TopzaCheckerOffer.create({
          checkerType,
          displayName,
          description,
          category,
          icon,
          color,
          costPrice,
          sellingPrice: 0,
          agentPrice: 0,
          vendorPrice: 0,
          status: 'inactive',
          isActive: false,
          available,
          stockCount,
          lastCheckedAt: lastCheckedAt ? new Date(lastCheckedAt) : null,
          lastSyncedAt: now,
          rawProviderData: {
            type: typeRow,
            product: productRow,
            availability: availabilityRow,
          },
        });
        synced += 1;
      } else {
        existing.displayName = displayName;
        existing.description = description;
        existing.category = category;
        existing.icon = icon;
        existing.color = color;
        existing.available = available;
        existing.stockCount = stockCount;
        existing.lastCheckedAt = lastCheckedAt ? new Date(lastCheckedAt) : existing.lastCheckedAt;
        existing.lastSyncedAt = now;
        existing.rawProviderData = {
          type: typeRow,
          product: productRow,
          availability: availabilityRow,
        };

        if (!existing.isEdited && costPrice > 0) {
          existing.costPrice = costPrice;
        }

        if (!hasAnyConfiguredPrice(existing)) {
          existing.status = 'inactive';
          existing.isActive = false;
        }

        await existing.save();
        updated += 1;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Checker offers synced successfully',
      stats: {
        synced,
        updated,
        total: synced + updated,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to sync checker offers' });
  }
};

exports.getCheckerOffers = async (req, res) => {
  try {
    const { status = '', page = 1, limit = 50, search = '' } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const query = {};
    if (status && status !== 'all') {
      query.status = String(status).trim();
    }
    if (search) {
      query.$or = [
        { checkerType: { $regex: String(search).trim(), $options: 'i' } },
        { displayName: { $regex: String(search).trim(), $options: 'i' } },
      ];
    }

    const [total, offers] = await Promise.all([
      TopzaCheckerOffer.countDocuments(query),
      TopzaCheckerOffer.find(query)
        .sort({ checkerType: 1 })
        .skip(skip)
        .limit(Math.max(1, Number(limit))),
    ]);

    return res.status(200).json({
      success: true,
      offers,
      pagination: {
        total,
        page: Math.max(1, Number(page)),
        limit: Math.max(1, Number(limit)),
        pages: Math.max(1, Math.ceil(total / Math.max(1, Number(limit)))),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checker offers' });
  }
};

exports.updateCheckerPrices = async (req, res) => {
  try {
    const { sellingPrice, agentPrice, vendorPrice, costPrice } = req.body || {};
    const offer = await TopzaCheckerOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Checker offer not found' });
    }

    if (costPrice !== undefined) offer.costPrice = toPriceNumber(costPrice);
    if (sellingPrice !== undefined) offer.sellingPrice = toPriceNumber(sellingPrice);
    if (agentPrice !== undefined) offer.agentPrice = toPriceNumber(agentPrice);
    if (vendorPrice !== undefined) offer.vendorPrice = toPriceNumber(vendorPrice);

    if (!hasAnyConfiguredPrice(offer)) {
      offer.status = 'inactive';
      offer.isActive = false;
    }

    offer.isEdited = true;
    await offer.save();

    return res.status(200).json({
      success: true,
      message: hasAnyConfiguredPrice(offer)
        ? 'Checker prices updated'
        : 'Checker prices cleared. Offer deactivated until a valid price is set.',
      offer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update checker prices' });
  }
};

exports.toggleCheckerStatus = async (req, res) => {
  try {
    const offer = await TopzaCheckerOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Checker offer not found' });
    }

    if (offer.status !== 'active' && !hasAnyConfiguredPrice(offer)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate checker offer without a valid selling, agent, or vendor price.',
      });
    }

    offer.status = offer.status === 'active' ? 'inactive' : 'active';
    offer.isActive = offer.status === 'active';
    await offer.save();

    return res.status(200).json({ success: true, message: `Checker offer ${offer.status}`, offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to toggle checker status' });
  }
};

exports.getCheckerLockStatus = async (_req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const enabled = Boolean(settings?.orderSettings?.checkerSalesLocked);

    return res.status(200).json({
      success: true,
      data: {
        enabled,
        message: enabled ? 'Checker sales are currently locked' : '',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checker lock status' });
  }
};

exports.updateCheckerLockStatus = async (req, res) => {
  try {
    const { enabled } = req.body || {};

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
    }

    const settings = await SystemSettings.getSettings();
    if (!settings.orderSettings) {
      settings.orderSettings = {};
    }

    settings.orderSettings.checkerSalesLocked = enabled;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: enabled ? 'Checker sales locked successfully' : 'Checker sales unlocked successfully',
      data: {
        enabled,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update checker lock status' });
  }
};

exports.getCheckerAvailability = async (req, res) => {
  try {
    const { checkerType } = req.query;
    const result = await topzaApi.getCheckerAvailability(checkerType || '');

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || 'Failed to fetch checker availability' });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checker availability' });
  }
};

exports.getCheckerTypes = async (_req, res) => {
  try {
    const result = await topzaApi.getCheckerTypes();

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || 'Failed to fetch checker types' });
    }

    return res.status(200).json({ success: true, data: result.types || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checker types' });
  }
};

exports.getCheckerProductsList = async (req, res) => {
  try {
    const user = req.userId ? await User.findById(req.userId).select('role agentFeeStatus') : null;
    const offers = await TopzaCheckerOffer.find({ status: 'active' }).sort({ checkerType: 1 });

    const data = offers
      .map((offer) => {
        const finalPrice = user ? resolveRolePrice(offer, user) : Number(offer.sellingPrice || 0);
        return {
          _id: offer._id,
          name: offer.checkerType,
          checkerType: offer.checkerType,
          displayName: offer.displayName,
          description: offer.description,
          category: offer.category,
          icon: offer.icon,
          color: offer.color,
          price: offer.sellingPrice,
          discount: 0,
          finalPrice,
          sellingPrice: offer.sellingPrice,
          agentPrice: offer.agentPrice,
          vendorPrice: offer.vendorPrice,
          available: Boolean(offer.available),
          stockCount: Number(offer.stockCount || 0),
          status: offer.status,
          inStock: Boolean(offer.available),
          lastCheckedAt: offer.lastCheckedAt,
        };
      })
      .filter((row) => Number(row.finalPrice || 0) > 0);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checker products' });
  }
};

exports.buyChecker = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { checkerType, phoneNumber, paymentMethod = 'wallet', skipSms = false } = req.body || {};
    const normalizedCheckerType = normalizeCheckerType(checkerType);

    if (!normalizedCheckerType || !allowedCheckerTypes.includes(normalizedCheckerType) || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'checkerType and phoneNumber are required' });
    }

    if (!['wallet', 'paystack'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method. Must be wallet or paystack' });
    }

    const settings = await SystemSettings.getSettings();
    if (settings?.orderSettings?.checkerSalesLocked) {
      return res.status(403).json({ success: false, message: 'Checker sales are currently locked by admin' });
    }

    const offer = await TopzaCheckerOffer.findOne({ checkerType: normalizedCheckerType, status: 'active' });
    if (!offer) {
      return res.status(404).json({ success: false, message: `${normalizedCheckerType} checker is unavailable` });
    }

    if (!offer.available || Number(offer.stockCount || 0) <= 0) {
      return res.status(400).json({ success: false, message: `${normalizedCheckerType} checker is currently unavailable` });
    }

    const price = resolveRolePrice(offer, user);
    if (price <= 0) {
      return res.status(400).json({ success: false, message: 'Checker does not have a valid price' });
    }

    const orderNumber = 'CHK' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase();

    const order = await Order.create({
      userId: user._id,
      dataPlanId: offer._id,
      planType: 'TopzaCheckerOffer',
      orderKind: 'checker',
      orderNumber,
      network: 'CHECKER',
      phoneNumber: String(phoneNumber).trim(),
      dataAmount: null,
      planName: offer.displayName || offer.checkerType,
      amount: price,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
      provider: 'topza',
      source: 'direct',
      adminBasePrice: Number(offer.costPrice || 0),
      checkerDetails: {
        checkerType: offer.checkerType,
        skipSms: Boolean(skipSms),
      },
    });

    if (paymentMethod === 'wallet') {
      if ((user.balance || 0) < price) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }

      const executeResult = await executeTopzaCheckerPurchase({
        order,
        offer,
        phoneNumber,
        skipSms,
      });

      if (!executeResult.success) {
        order.status = 'failed';
        order.paymentStatus = 'failed';
        order.errorMessage = executeResult.error;
        await order.save();
        return res.status(400).json({ success: false, message: executeResult.error });
      }

      await Transaction.create({
        userId: user._id,
        type: 'checker_purchase',
        amount: -price,
        reference: executeResult.data.reference,
        status: 'completed',
        paymentStatus: 'completed',
        description: `Result checker purchase: ${offer.checkerType}`,
      });

      user.balance = Number(user.balance || 0) - price;
      user.totalSpent = Number(user.totalSpent || 0) + price;
      await user.save();

      return res.status(200).json({
        success: true,
        message: executeResult.message,
        data: executeResult.data,
      });
    }

    const reference = 'CHKP' + Date.now() + Math.random().toString(36).slice(2, 9).toUpperCase();

    const dataPurchaseCharge = calculateDataPurchaseCharge({
      dataPurchaseChargeType: settings.transactionCharges?.dataPurchaseChargeType,
      dataPurchaseCharge: settings.transactionCharges?.dataPurchaseCharge,
      isRegisteredUser: true,
      paymentMethod: 'paystack',
      baseAmount: price,
    });
    const totalCheckerAmount = price + dataPurchaseCharge;

    const transaction = await Transaction.create({
      userId: user._id,
      type: 'checker_purchase',
      amount: -price,
      reference,
      paystackReference: reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Result checker purchase (Paystack): ${offer.checkerType}`,
    });

    const paystackPayload = {
      email: user.email,
      amount: Math.round(totalCheckerAmount * 100),
      reference,
      metadata: {
        userId: req.userId.toString(),
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        type: 'checker_purchase',
        checkerType: offer.checkerType,
        phoneNumber: String(phoneNumber).trim(),
        transactionCharge: dataPurchaseCharge,
      },
    };

    const paystackResponse = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (!paystackResponse.data?.status) {
      order.status = 'failed';
      order.errorMessage = paystackResponse.data?.message || 'Payment initialization failed';
      transaction.status = 'failed';
      transaction.paymentStatus = 'failed';
      await Promise.all([order.save(), transaction.save()]);

      return res.status(400).json({
        success: false,
        message: paystackResponse.data?.message || 'Payment initialization failed',
      });
    }

    order.paystackReference = reference;
    order.transactionReference = reference;
    order.transactionId = transaction._id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Paystack payment initialization successful',
      data: {
        reference,
        authorizationUrl: paystackResponse.data?.data?.authorization_url,
        accessCode: paystackResponse.data?.data?.access_code,
        orderId: order._id,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to buy checker' });
  }
};

exports.verifyCheckerPurchase = async (req, res) => {
  try {
    const { reference } = req.body || {};
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const order = await Order.findOne({ transactionReference: reference, userId: req.userId })
      .populate('userId');

    if (!order || order.planType !== 'TopzaCheckerOffer' || order.orderKind !== 'checker') {
      return res.status(404).json({ success: false, message: 'Checker order not found' });
    }

    if (order.status === 'completed' || order.status === 'processing') {
      return res.status(200).json({
        success: true,
        message: 'Purchase already processed',
        data: mapOrderToCheckerResponse(order),
      });
    }

    const paystackVerify = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (paystackVerify.data?.data?.status !== 'success') {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    order.paymentStatus = 'completed';
    order.status = 'processing';
    await order.save();

    const offer = await TopzaCheckerOffer.findById(order.dataPlanId);
    if (!offer) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = 'Checker offer not found';
      await order.save();

      await Transaction.findByIdAndUpdate(order.transactionId, {
        status: 'failed',
        paymentStatus: 'failed',
      });

      const refundResult = await processRefund(order, 'Checker offer not found');
      const updatedUser = await User.findById(order.userId).select('balance');

      return res.status(404).json({
        success: false,
        message: 'Checker offer not found. Payment refunded to wallet.',
        refunded: refundResult.success,
        refundMessage: refundResult.success
          ? `GHS ${Number(order.amount || 0).toFixed(2)} has been credited back to your wallet.`
          : 'Auto-refund could not be processed. Please contact support.',
        wallet: updatedUser ? { balance: updatedUser.balance } : undefined,
      });
    }

    const executeResult = await executeTopzaCheckerPurchase({
      order,
      offer,
      phoneNumber: order.phoneNumber,
      skipSms: Boolean(order.checkerDetails?.skipSms),
    });

    if (!executeResult.success) {
      order.status = 'failed';
      order.errorMessage = executeResult.error;
      await order.save();

      await Transaction.findByIdAndUpdate(order.transactionId, {
        status: 'failed',
        paymentStatus: 'failed',
      });

      const refundResult = await processRefund(order, executeResult.error);
      const updatedUser = await User.findById(order.userId).select('balance');

      return res.status(400).json({
        success: false,
        message: `Payment successful but checker purchase failed: ${executeResult.error}`,
        refunded: refundResult.success,
        refundMessage: refundResult.success
          ? `GHS ${Number(order.amount || 0).toFixed(2)} has been credited back to your wallet.`
          : 'Auto-refund could not be processed. Please contact support.',
        wallet: updatedUser ? { balance: updatedUser.balance } : undefined,
      });
    }

    await Transaction.findByIdAndUpdate(order.transactionId, {
      status: 'completed',
      paymentStatus: 'completed',
    });

    return res.status(200).json({
      success: true,
      message: 'Payment successful. Checker purchase is now processing.',
      data: mapOrderToCheckerResponse(order),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to verify checker purchase' });
  }
};

exports.listMyCheckers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const query = {
      userId: req.userId,
      planType: 'TopzaCheckerOffer',
      orderKind: 'checker',
    };

    if (req.query.checkerType) {
      query['checkerDetails.checkerType'] = normalizeCheckerType(req.query.checkerType);
    }

    if (req.query.status) {
      query.status = String(req.query.status).trim();
    }

    const [total, rows] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({
      success: true,
      count: rows.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      data: rows.map(mapOrderToCheckerResponse),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to list checkers' });
  }
};

exports.getCheckerById = async (req, res) => {
  try {
    const row = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
      planType: 'TopzaCheckerOffer',
      orderKind: 'checker',
    });

    if (!row) {
      return res.status(404).json({ success: false, message: 'Checker not found' });
    }

    if (row.checkerDetails?.resultCheckerId && (!row.checkerDetails?.serialNumber || !row.checkerDetails?.pin)) {
      const providerRow = await topzaApi.getCheckerById(row.checkerDetails.resultCheckerId);
      if (providerRow.success) {
        const checker = providerRow.checker || {};
        row.providerStatus = checker.purchaseStatus || row.providerStatus;
        row.status = checker.purchaseStatus === 'success' ? 'completed' : row.status;
        row.checkerDetails = {
          ...row.checkerDetails,
          serialNumber: checker.serialNumber || row.checkerDetails.serialNumber,
          pin: checker.pin || row.checkerDetails.pin,
          smsNotificationSent: Boolean(checker.smsNotificationSent || row.checkerDetails.smsNotificationSent),
        };
        await row.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: mapOrderToCheckerResponse(row),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to get checker' });
  }
};

exports.getMyStoreCheckerProducts = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const store = await Store.findOne({ owner: user._id }).populate('checkerProducts.checkerId');
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    return res.status(200).json({
      success: true,
      checkerProducts: store.checkerProducts || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch store checker products' });
  }
};

exports.getAvailableCheckerProductsForStore = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role agentFeeStatus');
    if (!user || user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const offers = await TopzaCheckerOffer.find({ status: 'active' }).sort({ checkerType: 1 });

    const data = offers
      .map((offer) => {
        const basePrice = resolveRolePrice(offer, user);
        if (basePrice <= 0) return null;
        return {
          _id: offer._id,
          checkerType: offer.checkerType,
          displayName: offer.displayName,
          description: offer.description,
          available: Boolean(offer.available),
          stockCount: Number(offer.stockCount || 0),
          basePrice,
          sellingPrice: offer.sellingPrice,
          agentPrice: offer.agentPrice,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, checkers: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checker offers for store' });
  }
};

exports.addCheckerToStore = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role agentFeeStatus');
    if (!user || user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { checkerId, customPrice } = req.body || {};
    if (!checkerId || customPrice === undefined) {
      return res.status(400).json({ success: false, message: 'checkerId and customPrice are required' });
    }

    const checker = await TopzaCheckerOffer.findById(checkerId);
    if (!checker || checker.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Checker offer not found or inactive' });
    }

    const basePrice = resolveRolePrice(checker, user);
    const parsedCustom = Number(customPrice);
    if (!Number.isFinite(parsedCustom) || parsedCustom < basePrice) {
      return res.status(400).json({
        success: false,
        message: `Custom price cannot be below base cost (${basePrice})`,
      });
    }

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    store.checkerProducts = (store.checkerProducts || []).filter((row) => String(row.checkerId) !== String(checkerId));
    store.checkerProducts.push({
      checkerId,
      customPrice: parsedCustom,
      isActive: true,
    });

    await store.save();
    await store.populate('checkerProducts.checkerId');

    return res.status(201).json({ success: true, checkerProducts: store.checkerProducts || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to add checker to store' });
  }
};

exports.updateStoreChecker = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role agentFeeStatus');
    if (!user || user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { checkerId } = req.params;
    const { customPrice, isActive } = req.body || {};

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const index = (store.checkerProducts || []).findIndex((row) =>
      String(row._id) === String(checkerId) || String(row.checkerId) === String(checkerId)
    );

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Checker not found in store' });
    }

    if (customPrice !== undefined) {
      const checker = await TopzaCheckerOffer.findById(store.checkerProducts[index].checkerId);
      if (!checker || checker.status !== 'active') {
        return res.status(404).json({ success: false, message: 'Checker offer not found or inactive' });
      }
      const basePrice = resolveRolePrice(checker, user);
      const parsedCustom = Number(customPrice);
      if (!Number.isFinite(parsedCustom) || parsedCustom < basePrice) {
        return res.status(400).json({ success: false, message: `Custom price cannot be below base cost (${basePrice})` });
      }
      store.checkerProducts[index].customPrice = parsedCustom;
    }

    if (typeof isActive === 'boolean') {
      store.checkerProducts[index].isActive = isActive;
    }

    await store.save();
    await store.populate('checkerProducts.checkerId');

    return res.status(200).json({ success: true, checkerProducts: store.checkerProducts || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update store checker' });
  }
};

exports.removeStoreChecker = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'agent') {
      return res.status(403).json({ success: false, message: 'Agents only' });
    }

    const { checkerId } = req.params;

    const store = await Store.findOne({ owner: user._id });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const before = (store.checkerProducts || []).length;
    store.checkerProducts = (store.checkerProducts || []).filter((row) =>
      String(row._id) !== String(checkerId) && String(row.checkerId) !== String(checkerId)
    );

    if ((store.checkerProducts || []).length === before) {
      return res.status(404).json({ success: false, message: 'Checker not found in store' });
    }

    await store.save();
    await store.populate('checkerProducts.checkerId');

    return res.status(200).json({ success: true, checkerProducts: store.checkerProducts || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to remove store checker' });
  }
};

exports.getPublicStoreCheckers = async (req, res) => {
  try {
    const { slug } = req.params;
    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Store slug is required' });
    }

    const store = await Store.findOne({ slug: normalizedSlug })
      .populate('owner')
      .populate('checkerProducts.checkerId');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (!isStoreAccessible(store, store.owner)) {
      return res.status(403).json({ success: false, message: 'Store is currently unavailable' });
    }

    const checkers = (store.checkerProducts || [])
      .filter((row) => row?.isActive && row?.checkerId && row.checkerId.status === 'active')
      .map((row) => ({
        _id: row._id,
        checkerId: row.checkerId._id,
        checkerType: row.checkerId.checkerType,
        displayName: row.checkerId.displayName,
        description: row.checkerId.description,
        stockCount: Number(row.checkerId.stockCount || 0),
        available: Boolean(row.checkerId.available),
        sellingPrice: Number(row.customPrice || 0),
        status: row.checkerId.status,
      }))
      .filter((row) => row.sellingPrice > 0)
      .sort((a, b) => String(a.checkerType || '').localeCompare(String(b.checkerType || '')));

    return res.status(200).json({ success: true, checkers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch public store checkers' });
  }
};

exports.initializePublicStoreCheckerPurchase = async (req, res) => {
  try {
    const { slug } = req.params;
    const { checkerId, email, phone, name, skipSms = false } = req.body || {};

    if (!checkerId || !email || !phone || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: 'Store slug is required' });
    }

    const settings = await SystemSettings.getSettings();
    if (settings?.orderSettings?.checkerSalesLocked) {
      return res.status(403).json({ success: false, message: 'Checker sales are currently locked by admin' });
    }

    const store = await Store.findOne({ slug: normalizedSlug }).populate('owner');
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (!isStoreAccessible(store, store.owner)) {
      return res.status(403).json({ success: false, message: 'Store is currently unavailable' });
    }

    const storeChecker = (store.checkerProducts || []).find((row) =>
      row?.isActive && String(row?.checkerId) === String(checkerId)
    );

    if (!storeChecker) {
      return res.status(404).json({ success: false, message: 'Checker not found or inactive in this store' });
    }

    const checker = await TopzaCheckerOffer.findById(checkerId);
    if (!checker || checker.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Checker is currently unavailable globally' });
    }

    if (!checker.available || Number(checker.stockCount || 0) <= 0) {
      return res.status(400).json({ success: false, message: `${checker.checkerType} checker is currently unavailable` });
    }

    const baseCost = resolvePlanPrice(checker, { userRole: 'agent', agentFeeStatus: 'paid' });
    if (baseCost <= 0) {
      return res.status(400).json({ success: false, message: 'Checker does not have a valid admin price yet' });
    }

    const customPrice = Number(storeChecker.customPrice || 0);
    if (customPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Store checker does not have a valid selling price' });
    }

    let guest = await Guest.findOne({ email, store: store._id });
    if (!guest) {
      guest = await Guest.create({ email, phone, name, store: store._id });
    } else {
      guest.phone = phone;
      guest.name = name;
      await guest.save();
    }

    const reference = 'GSC' + Date.now() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const orderNumber = 'CHK-G' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase();

    const order = await Order.create({
      userId: store.owner._id,
      dataPlanId: checker._id,
      planType: 'TopzaCheckerOffer',
      orderKind: 'checker',
      orderNumber,
      network: 'CHECKER',
      phoneNumber: String(phone).trim(),
      planName: checker.displayName || checker.checkerType,
      amount: customPrice,
      paymentMethod: 'paystack',
      status: 'pending',
      paymentStatus: 'pending',
      source: 'store',
      provider: 'topza',
      isGuest: true,
      guestInfo: guest._id,
      storeId: store._id,
      adminBasePrice: baseCost,
      agentCommission: Math.max(0, customPrice - baseCost),
      checkerDetails: {
        checkerType: checker.checkerType,
        skipSms: Boolean(skipSms),
      },
    });

    const transaction = await Transaction.create({
      userId: store.owner._id,
      type: 'checker_purchase',
      amount: customPrice,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Guest checker purchase: ${checker.checkerType} (Store: ${store.name})`,
    });

    const dataPurchaseCharge = calculateDataPurchaseCharge({
      dataPurchaseChargeType: settings.transactionCharges?.dataPurchaseChargeType,
      dataPurchaseCharge: settings.transactionCharges?.dataPurchaseCharge,
      isStoreBuyer: true,
      paymentMethod: 'paystack',
      baseAmount: customPrice,
    });
    const totalCheckerAmount = customPrice + dataPurchaseCharge;

    const paystackPayload = {
      email,
      amount: Math.round(totalCheckerAmount * 100),
      reference,
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        type: 'public_store_checker_purchase',
        storeSlug: store.slug,
        guestId: guest._id.toString(),
        transactionCharge: dataPurchaseCharge,
      },
    };

    const response = await paystackAPI.post('/transaction/initialize', paystackPayload);
    if (!response.data?.status) {
      order.status = 'failed';
      transaction.status = 'failed';
      await Promise.all([order.save(), transaction.save()]);
      return res.status(400).json({ success: false, message: response.data?.message || 'Payment initialization failed' });
    }

    order.paystackReference = reference;
    order.transactionReference = reference;
    order.transactionId = transaction._id;
    await order.save();

    guest.orders.push(order._id);
    await guest.save();

    return res.status(200).json({
      success: true,
      data: {
        reference,
        authorizationUrl: response.data?.data?.authorization_url,
        accessCode: response.data?.data?.access_code,
        orderId: order._id,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to initialize checker purchase' });
  }
};

exports.verifyPublicStoreCheckerPayment = async (req, res) => {
  try {
    const { reference } = req.body || {};
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference required' });
    }

    const order = await Order.findOne({ transactionReference: reference })
      .populate('guestInfo')
      .populate('storeId');

    if (!order || order.planType !== 'TopzaCheckerOffer' || order.orderKind !== 'checker') {
      return res.status(404).json({ success: false, message: 'Checker order not found' });
    }

    if (order.status === 'completed' || order.status === 'processing') {
      return res.status(200).json({ success: true, message: 'Checker order already processed', order });
    }

    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    if (!response.data?.status || response.data?.data?.status !== 'success') {
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

    await Transaction.findOneAndUpdate(
      { reference },
      { status: 'completed', paymentStatus: 'completed', paystackReference: paystackData.reference }
    );

    if (order.guestInfo) {
      const guest = await Guest.findById(order.guestInfo);
      if (guest) {
        guest.totalPurchases += 1;
        guest.lastPurchaseAt = new Date();
        await guest.save();
      }
    }

    const checkerResult = await topzaApi.buyChecker({
      checkerType: order.checkerDetails?.checkerType,
      phoneNumber: order.phoneNumber,
      skipSms: Boolean(order.checkerDetails?.skipSms),
      idempotencyKey: `CHK${order.orderNumber}`,
    });

    if (checkerResult.success) {
      order.status = 'processing';
      order.externalOrderId = checkerResult.data?.resultCheckerId || order.externalOrderId;
      order.providerStatus = checkerResult.data?.status || order.providerStatus;
      order.providerMessage = checkerResult.message || order.providerMessage;
      order.transactionReference = checkerResult.data?.reference || order.transactionReference;
      order.checkerDetails = {
        ...order.checkerDetails,
        resultCheckerId: checkerResult.data?.resultCheckerId || order.checkerDetails?.resultCheckerId,
      };
      await order.save();

      await Store.findByIdAndUpdate(order.storeId, {
        $inc: { totalRevenue: order.amount, totalOrders: 1 },
      });
    } else {
      order.status = 'failed';
      order.errorMessage = checkerResult.error || 'Checker purchase failed';
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and checker order processed',
      order,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to verify checker payment' });
  }
};
