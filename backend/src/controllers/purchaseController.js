const axios = require('axios');
const User = require('../models/User');
const Order = require('../models/Order');
const XpresDataOffer = require('../models/XpresDataOffer');
const DigimallOffer = require('../models/DigimallOffer');
const TopzaOffer = require('../models/TopzaOffer');
const Transaction = require('../models/Transaction');
const SystemSettings = require('../models/SystemSettings');
const xpresDataApi = require('../utils/xpresDataApi');
const digimallApi = require('../utils/digimallApi');
const topzaApi = require('../utils/topzaApi');
const { createNotification } = require('./notificationController');
const { isValidNetworkNumber } = require('../utils/validation');
const { processRefund } = require('../utils/refund');
const { resolvePlanPrice } = require('../utils/planPricing');

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

const findInFlightOrderByPhone = async ({ provider, phoneNumber, cooldownMinutes, excludeOrderId = null }) => {
  const cooldownMs = resolveDuplicateCooldownMinutes(cooldownMinutes) * 60 * 1000;
  const cooldownSince = new Date(Date.now() - cooldownMs);
  const query = {
    provider,
    phoneNumber: { $in: phoneVariants(phoneNumber) },
    status: { $in: ['pending', 'processing'] },
    paymentStatus: { $ne: 'failed' },
    createdAt: { $gte: cooldownSince },
  };

  if (excludeOrderId) {
    query._id = { $ne: excludeOrderId };
  }

  return Order.findOne(query).sort({ createdAt: -1 });
};

const resolveProviderApi = (provider) => {
  if (provider === 'digimall') return digimallApi;
  if (provider === 'topza') return topzaApi;
  return xpresDataApi;
};

const resolvePlanTypeForProvider = (provider) => {
  if (provider === 'digimall') return 'DigimallOffer';
  if (provider === 'topza') return 'TopzaOffer';
  return 'XpresDataOffer';
};

const normalizeTopzaProviderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'success' || normalized === 'delivered') return 'Completed';
  if (normalized === 'failed' || normalized === 'error') return 'Failed';
  if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'in-progress') return 'Processing';
  return 'Pending';
};

exports.buyDataBundle = async (req, res) => {
  try {
    const { dataPlanId, phoneNumber, paymentMethod } = req.body;

    if (!dataPlanId || !phoneNumber || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: dataPlanId, phoneNumber, paymentMethod',
      });
    }

    if (!['wallet', 'paystack'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be "wallet" or "paystack"',
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Determine active provider
    const settings = await SystemSettings.getSettings();
    const activeProvider = settings.vtuProvider || 'topza';

    let plan;

    if (activeProvider === 'digimall') {
      const digimallOffer = await DigimallOffer.findById(dataPlanId);
      if (!digimallOffer) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }
      const digimallUnavailable =
        digimallOffer.status !== 'active' ||
        (digimallOffer.stockOverriddenByAdmin === true && digimallOffer.inStock === false);
      if (digimallUnavailable) {
        return res.status(400).json({ success: false, message: 'This data plan is currently unavailable' });
      }

      const price = resolvePlanPrice(digimallOffer, { userRole: user.role, agentFeeStatus: user.agentFeeStatus });
      if (price <= 0) {
        return res.status(400).json({ success: false, message: 'This data plan does not have a valid price yet' });
      }

      plan = {
        ...digimallOffer.toObject(),
        planName: digimallOffer.name,
        // apiPlanId: "offerSlug|volume"
        apiPlanId: `${digimallOffer.offerSlug}|${digimallOffer.volume}`,
        network: digimallOffer.isp,
        dataSize: `${digimallOffer.volume}GB`,
        provider: 'digimall',
        sellingPrice: price,
        costPrice: digimallOffer.costPrice || 0,
        planType: 'DigimallOffer',
      };
    } else if (activeProvider === 'topza') {
      const topzaOffer = await TopzaOffer.findById(dataPlanId);
      if (!topzaOffer) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      const topzaUnavailable =
        topzaOffer.status !== 'active' ||
        (topzaOffer.stockOverriddenByAdmin === true && topzaOffer.inStock === false);
      if (topzaUnavailable) {
        return res.status(400).json({ success: false, message: 'This data plan is currently unavailable' });
      }

      const price = resolvePlanPrice(topzaOffer, { userRole: user.role, agentFeeStatus: user.agentFeeStatus });
      if (price <= 0) {
        return res.status(400).json({ success: false, message: 'This data plan does not have a valid price yet' });
      }

      plan = {
        ...topzaOffer.toObject(),
        planName: topzaOffer.name,
        apiPlanId: topzaOffer.providerPlanId,
        network: topzaOffer.isp,
        dataSize: `${topzaOffer.volume}GB`,
        provider: 'topza',
        sellingPrice: price,
        costPrice: topzaOffer.costPrice || 0,
        planType: 'TopzaOffer',
      };
    } else {
      // xpresdata (default)
      const offer = await XpresDataOffer.findById(dataPlanId);
      if (!offer) {
        return res.status(404).json({ success: false, message: 'Plan not found or inactive in this store' });
      }

      if (offer.status !== 'active' || offer.isActive === false || !offer.inStock) {
        return res.status(400).json({ success: false, message: 'This data plan is currently unavailable' });
      }

      const price = resolvePlanPrice(offer, { userRole: user.role, agentFeeStatus: user.agentFeeStatus });
      if (price <= 0) {
        return res.status(400).json({ success: false, message: 'This data plan does not have a valid price yet' });
      }

      plan = {
        ...offer.toObject(),
        planName: offer.name,
        network: offer.isp,
        dataSize: `${offer.volume}GB`,
        apiPlanId: `${offer.offerSlug}|${offer.volume}`,
        provider: 'xpresdata',
        sellingPrice: price,
        costPrice: offer.costPrice || 0,
        planType: 'XpresDataOffer',
      };
    }

    // Validate phone number and network match
    if (!isValidNetworkNumber(phoneNumber, plan.network)) {
      return res.status(400).json({
        success: false,
        message: `The phone number ${phoneNumber} does not belong to the ${plan.network} network.`
      });
    }

    const cooldownMinutes = await getOrderDuplicateCooldownMinutes();
    const existingInFlightOrder = await findInFlightOrderByPhone({
      provider: activeProvider,
      phoneNumber,
      cooldownMinutes,
    });

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

    const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9);

    const order = await Order.create({
      userId: req.userId,
      dataPlanId: plan._id,
      planType: plan.planType || resolvePlanTypeForProvider(activeProvider),
      apiPlanId: plan.apiPlanId,
      orderNumber,
      network: plan.network,
      phoneNumber,
      dataAmount: plan.dataSize,
      planName: plan.planName,
      amount: plan.sellingPrice,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
      provider: activeProvider,
      adminBasePrice: plan.costPrice || plan.sellingPrice,
      agentCommission: ((user.agentFeeStatus === 'paid' || user.agentFeeStatus === 'protocol') && plan.sellingPrice && plan.costPrice) ? (plan.sellingPrice - plan.costPrice) : 0,
    });

    if (paymentMethod === 'wallet') {
      return handleWalletPayment(req, res, user, plan, order, activeProvider);
    } else if (paymentMethod === 'paystack') {
      return handlePaystackPayment(req, res, user, plan, order, activeProvider);
    }
  } catch (error) {
    console.error('[Buy Data Bundle] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const handleWalletPayment = async (req, res, user, plan, order, provider = 'xpresdata') => {
  try {
    const cooldownMinutes = await getOrderDuplicateCooldownMinutes();

    if (user.balance < plan.sellingPrice) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = 'Insufficient wallet balance';
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        required: plan.sellingPrice,
        available: user.balance,
      });
    }

    // Check provider balance
    const activeApi = resolveProviderApi(provider);
    const balanceCheck = await activeApi.getWalletBalance();

    if (!balanceCheck.success || (!balanceCheck.isPlaceholder && balanceCheck.balance < plan.costPrice)) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = 'Data purchase currently unavailable';
      await order.save();
      console.error(`[Wallet Payment] ${provider} balance check failed:`, balanceCheck);
      return res.status(503).json({
        success: false,
        message: 'Data purchase currently unavailable',
      });
    }

    order.status = 'processing';
    await order.save();

    const existingInFlightOrder = await findInFlightOrderByPhone({
      provider: order.provider,
      phoneNumber: order.phoneNumber,
      cooldownMinutes,
      excludeOrderId: order._id,
    });
    if (existingInFlightOrder) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = `Duplicate in-flight order detected (${existingInFlightOrder.orderNumber})`;
      await order.save();

      return res.status(409).json({
        success: false,
        message: `A similar order (${existingInFlightOrder.orderNumber}) was placed within the last ${cooldownMinutes} minutes. Please retry after the cooldown.`,
      });
    }

    let purchaseResponse;
    if (provider === 'digimall') {
      const [offerSlug, volume] = plan.apiPlanId.split('|');
      const idempotencyKey = 'DGM' + order.orderNumber;
      purchaseResponse = await digimallApi.purchaseDataBundle(offerSlug, order.phoneNumber, order.network, volume, idempotencyKey);
    } else if (provider === 'topza') {
      const idempotencyKey = 'TPZ' + order.orderNumber;
      purchaseResponse = await topzaApi.purchaseDataBundle(plan.apiPlanId, order.phoneNumber, order.network, null, idempotencyKey);
    } else {
      const [offerSlug, volume] = plan.apiPlanId.split('|');
      purchaseResponse = await xpresDataApi.purchaseDataBundle(offerSlug, order.phoneNumber, plan.network, volume);
    }

    if (!purchaseResponse.success) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = purchaseResponse.error;
      await order.save();

      return res.status(400).json({
        success: false,
        message: purchaseResponse.error || 'Failed to process purchase with provider',
        providerErrorType: purchaseResponse.providerErrorType,
        providerRequestId: purchaseResponse.providerRequestId,
      });
    }

    const responseData = purchaseResponse.data;

    // CRITICAL: Log response structure to debug externalOrderId capture
    console.log(`[Wallet Payment] Provider response structure:`, JSON.stringify(responseData, null, 2));

    const transaction = await Transaction.create({
      userId: req.userId,
      type: 'data_purchase',
      amount: -plan.sellingPrice,
      reference: responseData.reference || responseData.orderId || 'TXN' + Date.now(),
      paystackReference: null,
      status: 'completed',
      description: `Data purchase: ${plan.dataSize} ${plan.network} to ${order.phoneNumber}`,
    });

    await User.findByIdAndUpdate(
      req.userId,
      {
        $inc: {
          balance: -plan.sellingPrice,
          totalSpent: plan.sellingPrice,
          dataUsed: parseFloat(plan.dataSize) || 0
        }
      },
      { new: true }
    );

    order.status = 'processing';
    order.paymentStatus = 'completed';
    order.externalOrderId = responseData.orderId || responseData.reference || responseData.transaction_code || responseData.order?.id;

    if (provider === 'topza') {
      order.externalOrderNumber = responseData.orderNumber || responseData.raw?.data?.order?.orderNumber || order.externalOrderNumber;
      order.providerStatus = normalizeTopzaProviderStatus(responseData.status || 'Processing');
    }

    // Ensure externalOrderId is set before saving
    if (!order.externalOrderId) {
      console.error(`[Wallet Payment] WARNING: externalOrderId not captured! Full response:`, responseData);
      order.externalOrderId = 'UNTRACKED_' + Date.now();
    }

    if (provider === 'xpresdata' && responseData.reference) {
      order.transactionReference = responseData.reference || transaction.reference;
    }
    if (provider === 'digimall' && (responseData.reference || responseData.orderId)) {
      order.transactionReference = responseData.reference || responseData.orderId;
    }
    if (provider === 'topza' && (responseData.reference || responseData.orderId)) {
      order.transactionReference = responseData.reference || responseData.orderId;
    }
    order.transactionId = transaction._id;
    order.providerMessage = responseData.message || responseData.providerMessage;
    order.syncAttempts = 0; // Reset sync attempt counter after successful creation

    await order.save();

    const updatedUser = await User.findById(req.userId);

    await createNotification({
      type: 'data_purchase',
      title: 'Data Order Placed',
      message: `${plan.dataSize} ${plan.network} order placed for ${order.phoneNumber}`,
      description: `Payment received for ${plan.planName} (${plan.dataSize}). Your order is being processed by the provider and will update shortly.`,
      severity: 'info',
      data: {
        userId: req.userId,
        userName: user.name,
        userEmail: user.email,
        amount: plan.sellingPrice,
        purchaseType: plan.network,
        orderId: order._id.toString(),
      },
      actionUrl: `/admin/orders/${order._id}`,
    });

    res.status(200).json({
      success: true,
      message: 'Payment successful. Your data order is being processed.',
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          network: order.network,
          phoneNumber: order.phoneNumber,
          dataAmount: order.dataAmount,
          planName: order.planName,
          amount: order.amount,
          date: order.createdAt,
        },
        transaction: {
          id: transaction._id,
          reference: transaction.reference,
          amount: Math.abs(transaction.amount),
          status: transaction.status,
        },
        wallet: {
          balance: updatedUser.balance,
          previousBalance: updatedUser.balance + plan.sellingPrice,
        },
      },
    });
  } catch (error) {
    console.error('[Wallet Payment] Error:', error);
    order.status = 'failed';
    order.paymentStatus = 'failed';
    order.errorMessage = error.message;
    await order.save();

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const handlePaystackPayment = async (req, res, user, plan, order, provider = 'xpresdata') => {
  try {
    const cooldownMinutes = await getOrderDuplicateCooldownMinutes();

    const existingInFlightOrder = await findInFlightOrderByPhone({
      provider: order.provider,
      phoneNumber: order.phoneNumber,
      cooldownMinutes,
      excludeOrderId: order._id,
    });

    if (existingInFlightOrder) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = `Duplicate in-flight order detected (${existingInFlightOrder.orderNumber})`;
      await order.save();

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

    const activeApi = resolveProviderApi(provider);
    const balanceCheck = await activeApi.getWalletBalance();

    if (!balanceCheck.success || (!balanceCheck.isPlaceholder && balanceCheck.balance < plan.costPrice)) {
      order.status = 'failed';
      order.errorMessage = 'Data purchase currently unavailable';
      await order.save();

      return res.status(503).json({
        success: false,
        message: 'Data purchase currently unavailable',
      });
    }

    const reference = 'DT' + Date.now() + Math.random().toString(36).substr(2, 9);

    const transaction = await Transaction.create({
      userId: req.userId,
      type: 'data_purchase',
      amount: -plan.sellingPrice,
      reference,
      paystackReference: reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Data purchase: ${plan.dataSize} ${plan.network} to ${order.phoneNumber}`,
    });

    const paystackPayload = {
      email: user.email,
      amount: Math.round(plan.sellingPrice * 100),
      reference,
      metadata: {
        userId: req.userId.toString(),
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        type: 'data_purchase',
        dataPlanId: plan._id.toString(),
        phoneNumber: order.phoneNumber,
        provider: provider,
      },
    };

    const paystackResponse = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (!paystackResponse.data.status) {
      order.status = 'failed';
      order.errorMessage = paystackResponse.data.message;
      transaction.status = 'failed';
      await Promise.all([order.save(), transaction.save()]);

      return res.status(400).json({
        success: false,
        message: paystackResponse.data.message,
      });
    }

    order.paystackReference = reference;
    order.transactionReference = reference;
    order.transactionId = transaction._id;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Paystack payment initialization successful',
      data: {
        reference,
        authorizationUrl: paystackResponse.data.data.authorization_url,
        accessCode: paystackResponse.data.data.access_code,
        orderId: order._id,
      },
    });
  } catch (error) {
    console.error('[Paystack Payment] Initialization error:', error);
    order.status = 'failed';
    order.errorMessage = error.message;
    await order.save();

    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

exports.verifyDataPurchase = async (req, res) => {
  try {
    const cooldownMinutes = await getOrderDuplicateCooldownMinutes();
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference is required',
      });
    }

    const order = await Order.findOne({ transactionReference: reference })
      .populate('userId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status === 'completed' || order.status === 'processing') {
      return res.status(200).json({
        success: true,
        message: 'Purchase already processed',
        data: { order },
      });
    }

    // Verify with Paystack
    const paystackVerify = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (paystackVerify.data.data.status !== 'success') {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    order.paymentStatus = 'completed';
    await order.save();

    order.status = 'processing';
    await order.save();

    const existingInFlightOrder = await findInFlightOrderByPhone({
      provider: order.provider,
      phoneNumber: order.phoneNumber,
      cooldownMinutes,
      excludeOrderId: order._id,
    });
    if (existingInFlightOrder) {
      order.status = 'failed';
      order.paymentStatus = 'failed';
      order.errorMessage = `Duplicate in-flight order detected (${existingInFlightOrder.orderNumber})`;
      await order.save();

      const refundResult = await processRefund(order, `Duplicate in-flight order detected (${existingInFlightOrder.orderNumber})`);
      const updatedUser = await User.findById(order.userId);

      return res.status(409).json({
        success: false,
        message: `A similar order (${existingInFlightOrder.orderNumber}) was placed within the last ${cooldownMinutes} minutes. Payment has been refunded to your wallet.`,
        refunded: refundResult.success,
        wallet: updatedUser ? { balance: updatedUser.balance } : undefined,
      });
    }

    let purchaseResponse;
    if (order.provider === 'digimall') {
      const [offerSlug, volume] = order.apiPlanId.split('|');
      const idempotencyKey = 'DGM' + order.orderNumber;
      purchaseResponse = await digimallApi.purchaseDataBundle(offerSlug, order.phoneNumber, order.network, volume, idempotencyKey);
    } else if (order.provider === 'topza') {
      const idempotencyKey = 'TPZ' + order.orderNumber;
      purchaseResponse = await topzaApi.purchaseDataBundle(order.apiPlanId, order.phoneNumber, order.network, null, idempotencyKey);
    } else {
      const [offerSlug, volume] = order.apiPlanId.split('|');
      purchaseResponse = await xpresDataApi.purchaseDataBundle(offerSlug, order.phoneNumber, order.network, volume);
    }

    if (!purchaseResponse.success) {
      order.status = 'failed';
      order.errorMessage = purchaseResponse.error;
      await order.save();

      // Mark the pending transaction as failed (Paystack charged but provider rejected)
      const failedTxn = await Transaction.findById(order.transactionId);
      if (failedTxn && failedTxn.status === 'pending') {
        failedTxn.status = 'failed';
        failedTxn.paymentStatus = 'failed';
        await failedTxn.save();
      }

      // Auto-refund: credit user wallet since Paystack payment already went through
      const refundResult = await processRefund(order, purchaseResponse.error);
      console.log(`[Verify Purchase] Auto-refund result for order ${order.orderNumber}:`, refundResult);

      const updatedUser = await User.findById(order.userId);

      await createNotification({
        type: 'refund',
        title: 'Payment Refunded',
        message: `Your payment of GHS ${order.amount.toFixed(2)} has been refunded to your wallet`,
        description: `Payment was successful but the provider could not fulfil order ${order.orderNumber}: ${purchaseResponse.error}. GHS ${order.amount.toFixed(2)} has been credited back to your wallet.`,
        severity: 'warning',
        data: {
          userId: order.userId.toString(),
          amount: order.amount,
          orderId: order._id.toString(),
        },
        actionUrl: `/orders/${order._id}`,
      });

      return res.status(400).json({
        success: false,
        message: `Payment successful but provider order failed: ${purchaseResponse.error}`,
        providerErrorType: purchaseResponse.providerErrorType,
        providerRequestId: purchaseResponse.providerRequestId,
        refunded: refundResult.success,
        refundMessage: refundResult.success
          ? `GHS ${order.amount.toFixed(2)} has been credited back to your wallet.`
          : 'Auto-refund could not be processed. Please contact support.',
        wallet: updatedUser ? { balance: updatedUser.balance } : undefined,
      });
    }

    const responseData = purchaseResponse.data;

    order.status = 'processing';
    order.externalOrderId = responseData.orderId || responseData.reference || responseData.transaction_code || responseData.order?.id;

    if (order.provider === 'topza') {
      order.externalOrderNumber = responseData.orderNumber || responseData.raw?.data?.order?.orderNumber || order.externalOrderNumber;
      order.providerStatus = normalizeTopzaProviderStatus(responseData.status || 'Processing');
    }

    // Ensure externalOrderId is set before saving
    if (!order.externalOrderId) {
      console.error(`[Verify Purchase] WARNING: externalOrderId not captured! Full response:`, responseData);
      order.externalOrderId = 'UNTRACKED_' + Date.now();
    }

    if (order.provider === 'digimall' && (responseData.reference || responseData.orderId)) {
      order.transactionReference = responseData.reference || responseData.orderId;
    } else if (order.provider === 'topza' && (responseData.reference || responseData.orderId)) {
      order.transactionReference = responseData.reference || responseData.orderId;
    } else if (responseData.reference) {
      order.transactionReference = responseData.reference;
    }

    order.providerMessage = responseData.message || responseData.providerMessage;
    order.syncAttempts = 0; // Reset sync attempt counter after successful creation
    await order.save();

    const transaction = await Transaction.findById(order.transactionId);
    if (transaction) {
      transaction.status = 'completed';
      transaction.paymentStatus = 'completed';
      await transaction.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment successful. Your order is now processing and will be updated manually by admin.',
      data: { order },
    });
  } catch (error) {
    console.error('[Verify Purchase] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.userId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          providerStatus: order.providerStatus || null,
          network: order.network,
          phoneNumber: order.phoneNumber,
          dataAmount: order.dataAmount,
          planName: order.planName,
          amount: order.amount,
          date: order.createdAt,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          transactionReference: order.transactionReference,
          paystackReference: order.paystackReference,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          providerStatus: order.providerStatus || null,
          network: order.network,
          phoneNumber: order.phoneNumber,
          dataAmount: order.dataAmount,
          planName: order.planName,
          amount: order.amount,
          date: order.createdAt,
          transactionReference: order.transactionReference,
          errorMessage: order.errorMessage,
        }
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
