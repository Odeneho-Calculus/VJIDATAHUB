const axios = require('axios');
const Guest = require('../models/Guest');
const Order = require('../models/Order');
const XpresDataOffer = require('../models/XpresDataOffer');
const DigimallOffer = require('../models/DigimallOffer');
const TopzaOffer = require('../models/TopzaOffer');
const Transaction = require('../models/Transaction');
const SystemSettings = require('../models/SystemSettings');
const xpresDataApi = require('../utils/xpresDataApi');
const digimallApi = require('../utils/digimallApi');
const topzaApi = require('../utils/topzaApi');
const { isValidNetworkNumber } = require('../utils/validation');
const { isPositivePrice } = require('../utils/planPricing');

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

const normalizeNetwork = (network) => {
  if (!network) return network;

  const normalized = String(network).toLowerCase();
  if (normalized.includes('mtn')) return 'MTN';
  if (normalized.includes('telecel')) return 'Telecel';
  if (normalized.includes('airteltigo') || normalized.includes('airtel')) return 'AirtelTigo';

  return network;
};

const normalizeTopzaProviderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'success' || normalized === 'delivered') return 'Completed';
  if (normalized === 'failed' || normalized === 'error') return 'Failed';
  if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'in-progress') return 'Processing';
  return 'Pending';
};

const getFrontendBaseUrl = (req) => {
  const configured = process.env.FRONTEND_URL || process.env.SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const origin = req.headers.origin;
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  const referer = req.headers.referer;
  if (referer) {
    try {
      return new globalThis.URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
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

// Get all active data plans for guests (public endpoint)
exports.getGuestDataPlans = async (req, res) => {
  try {
    const { network } = req.query;

    // Get system settings to determine active provider
    const settings = await SystemSettings.getSettings();
    const activeProvider = settings.vtuProvider || 'topza';

    let plans;

    if (activeProvider === 'digimall') {
      const query = {
        status: 'active',
        isActive: true,
      };

      if (network) {
        query.isp = network;
      }

      plans = await DigimallOffer.find(query)
        .select('name isp volume validity sellingPrice costPrice offerSlug inStock status stockOverriddenByAdmin')
        .sort({ isp: 1, volume: 1 })
        .lean();

      // Filter out plans marked as out-of-stock by admin
      plans = plans.filter((plan) => {
        return !(plan.stockOverriddenByAdmin === true && plan.inStock === false)
          && isPositivePrice(plan.sellingPrice);
      });

      // Map to consistent format
      plans = plans.map((plan) => ({
        _id: plan._id,
        name: plan.name,
        network: normalizeNetwork(plan.isp),
        dataAmount: `${plan.volume}GB`,
        dataSize: `${plan.volume}GB`,
        validity: plan.validity,
        price: plan.sellingPrice,
        sellingPrice: plan.sellingPrice,
        costPrice: plan.costPrice,
        inStock: plan.inStock,
        provider: 'digimall',
      }));
    } else if (activeProvider === 'topza') {
      const query = {
        status: 'active',
        isActive: true,
      };

      if (network) {
        query.isp = network;
      }

      plans = await TopzaOffer.find(query)
        .select('name isp volume validity sellingPrice costPrice providerPlanId inStock status stockOverriddenByAdmin')
        .sort({ isp: 1, volume: 1 })
        .lean();

      plans = plans.filter((plan) => {
        return !(plan.stockOverriddenByAdmin === true && plan.inStock === false)
          && isPositivePrice(plan.sellingPrice);
      });

      plans = plans.map((plan) => ({
        _id: plan._id,
        name: plan.name,
        network: normalizeNetwork(plan.isp),
        dataAmount: `${plan.volume}GB`,
        dataSize: `${plan.volume}GB`,
        validity: plan.validity,
        price: plan.sellingPrice,
        sellingPrice: plan.sellingPrice,
        costPrice: plan.costPrice,
        inStock: plan.inStock,
        provider: 'topza',
      }));
    } else {
      // xpresdata (default)
      const query = {
        status: 'active',
        inStock: true,
      };

      if (network) {
        query.isp = network;
      }

      plans = await XpresDataOffer.find(query)
        .select('name offerName isp volume validity sellingPrice costPrice inStock')
        .sort({ isp: 1, volume: 1 })
        .lean();

      plans = plans.filter((plan) => isPositivePrice(plan.sellingPrice));

      plans = plans.map((plan) => ({
        _id: plan._id,
        name: plan.name,
        planName: plan.name,
        offerName: plan.offerName,
        network: normalizeNetwork(plan.isp),
        dataAmount: `${plan.volume}GB`,
        dataSize: `${plan.volume}GB`,
        validity: plan.validity,
        price: plan.sellingPrice,
        sellingPrice: plan.sellingPrice,
        costPrice: plan.costPrice,
        inStock: plan.inStock,
        provider: 'xpresdata',
      }));
    }

    res.json({
      success: true,
      data: plans,
      provider: activeProvider,
    });
  } catch (error) {
    console.error('Error fetching guest data plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load data plans',
    });
  }
};

// Initialize guest purchase (create Paystack checkout)
exports.initializeGuestPurchase = async (req, res) => {
  const debugId = `GST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const log = (stage, payload = {}) => {
    console.log(`[GuestInit:${debugId}] ${stage}`, payload);
  };

  try {
    const { dataPlanId, phoneNumber, email, name } = req.body;
    log('request_received', {
      dataPlanId,
      phoneNumber,
      email,
      hasName: Boolean(name),
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
    });

    if (!PAYSTACK_SECRET_KEY) {
      log('config_error', { missing: 'PAYSTACK_SECRET_KEY' });
      return res.status(500).json({
        success: false,
        message: 'Paystack is not configured on server (PAYSTACK_SECRET_KEY missing).',
        debugId,
        debugStage: 'config_error',
      });
    }

    // Validate required fields
    if (!dataPlanId || !phoneNumber || !email) {
      log('validation_error', { reason: 'missing_required_fields' });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: dataPlanId, phoneNumber, email',
        debugId,
        debugStage: 'validation_error',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      log('validation_error', { reason: 'invalid_email' });
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        debugId,
        debugStage: 'validation_error',
      });
    }

    // Get system settings
    const settings = await SystemSettings.getSettings();
    const activeProvider = settings.vtuProvider || 'topza';
    log('provider_resolved', { activeProvider });

    // Direct guest checkout is intentionally not tied to any store.

    // Fetch plan and determine price
    let plan;
    let planType;

    if (activeProvider === 'digimall') {
      const digimallOffer = await DigimallOffer.findById(dataPlanId);
      if (!digimallOffer || digimallOffer.status !== 'active' || !isPositivePrice(digimallOffer.sellingPrice)) {
        log('plan_error', { reason: 'digimall_offer_not_found_or_inactive', dataPlanId });
        return res.status(404).json({
          success: false,
          message: 'Data plan not found or inactive',
          debugId,
          debugStage: 'plan_error',
        });
      }

      // Check if plan is out of stock
      const digimallUnavailable =
        digimallOffer.stockOverriddenByAdmin === true && digimallOffer.inStock === false;
      if (digimallUnavailable) {
        log('plan_error', { reason: 'digimall_offer_unavailable', dataPlanId });
        return res.status(400).json({
          success: false,
          message: 'This data plan is currently unavailable',
          debugId,
          debugStage: 'plan_error',
        });
      }

      plan = {
        ...digimallOffer.toObject(),
        planName: digimallOffer.name,
        dataAmount: `${digimallOffer.volume}GB`,
        apiPlanId: `${digimallOffer.offerSlug}|${digimallOffer.volume}`,
        provider: 'digimall',
        sellingPrice: digimallOffer.sellingPrice,
        costPrice: digimallOffer.costPrice || 0,
        network: normalizeNetwork(digimallOffer.isp),
      };
      planType = 'DigimallOffer';
    } else if (activeProvider === 'topza') {
      const topzaOffer = await TopzaOffer.findById(dataPlanId);
      if (!topzaOffer || topzaOffer.status !== 'active' || !isPositivePrice(topzaOffer.sellingPrice)) {
        log('plan_error', { reason: 'topza_offer_not_found_or_inactive', dataPlanId });
        return res.status(404).json({
          success: false,
          message: 'Data plan not found or inactive',
          debugId,
          debugStage: 'plan_error',
        });
      }

      const topzaUnavailable =
        topzaOffer.stockOverriddenByAdmin === true && topzaOffer.inStock === false;
      if (topzaUnavailable) {
        log('plan_error', { reason: 'topza_offer_unavailable', dataPlanId });
        return res.status(400).json({
          success: false,
          message: 'This data plan is currently unavailable',
          debugId,
          debugStage: 'plan_error',
        });
      }

      plan = {
        ...topzaOffer.toObject(),
        planName: topzaOffer.name,
        dataAmount: `${topzaOffer.volume}GB`,
        apiPlanId: topzaOffer.providerPlanId,
        provider: 'topza',
        sellingPrice: topzaOffer.sellingPrice,
        costPrice: topzaOffer.costPrice || 0,
        network: normalizeNetwork(topzaOffer.isp),
      };
      planType = 'TopzaOffer';
    } else {
      const offer = await XpresDataOffer.findById(dataPlanId);
      if (!offer || offer.status !== 'active' || !offer.inStock || !isPositivePrice(offer.sellingPrice)) {
        log('plan_error', {
          reason: 'xpres_plan_not_found_or_inactive',
          dataPlanId,
          found: Boolean(offer),
          status: offer?.status,
          inStock: offer?.inStock,
        });
        return res.status(404).json({
          success: false,
          message: 'Data plan not found or inactive',
          debugId,
          debugStage: 'plan_error',
        });
      }

      plan = {
        ...offer.toObject(),
        planName: offer.name,
        dataAmount: `${offer.volume}GB`,
        apiPlanId: `${offer.offerSlug}|${offer.volume}`,
        provider: 'xpresdata',
        sellingPrice: offer.sellingPrice,
        costPrice: offer.costPrice || 0,
        network: normalizeNetwork(offer.isp),
      };
      planType = 'XpresDataOffer';
    }

    // Validate phone number
    const isNetworkNumberValid = isValidNetworkNumber(phoneNumber, plan.network);
    if (!isNetworkNumberValid) {
      log('validation_error', { reason: 'network_phone_mismatch', network: plan.network, phoneNumber });
      return res.status(400).json({
        success: false,
        message: `Phone number does not match ${plan.network} network`,
        debugId,
        debugStage: 'validation_error',
      });
    }

    const cooldownMinutes = await getOrderDuplicateCooldownMinutes();
    const cooldownSince = new Date(Date.now() - cooldownMinutes * 60 * 1000);
    const existingInFlightOrder = await Order.findOne({
      provider: plan.provider,
      phoneNumber: { $in: phoneVariants(phoneNumber) },
      status: { $in: ['pending', 'processing'] },
      paymentStatus: { $ne: 'failed' },
      createdAt: { $gte: cooldownSince },
    }).sort({ createdAt: -1 });

    if (existingInFlightOrder) {
      log('duplicate_guard', {
        orderNumber: existingInFlightOrder.orderNumber,
        status: existingInFlightOrder.status,
        phoneNumber,
      });
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
        debugId,
        debugStage: 'duplicate_guard',
      });
    }

    // Find or create guest
    let guest = await Guest.findOne({
      phone: phoneNumber,
      $or: [{ store: null }, { store: { $exists: false } }],
    });

    if (!guest) {
      guest = await Guest.create({
        email: email.toLowerCase(),
        phone: phoneNumber,
        name: name || null,
        store: null,
        orders: [],
        totalPurchases: 0,
      });
      log('guest_created', { guestId: guest._id.toString(), phone: guest.phone });
    } else {
      // Update email and name if provided
      guest.email = email.toLowerCase();
      if (name) guest.name = name;
      await guest.save();
      log('guest_updated', { guestId: guest._id.toString(), phone: guest.phone });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create order
    const order = await Order.create({
      userId: null,
      isGuest: true,
      guestInfo: guest._id,
      dataPlanId: dataPlanId,
      planType: planType,
      apiPlanId: plan.apiPlanId,
      orderNumber: orderNumber,
      network: plan.network,
      phoneNumber: phoneNumber,
      dataAmount: plan.dataAmount,
      planName: plan.planName,
      amount: plan.sellingPrice,
      paymentMethod: 'paystack',
      status: 'pending',
      paymentStatus: 'pending',
      provider: plan.provider,
      source: 'direct',
      statusHistory: [
        {
          status: 'pending',
          updatedAt: new Date(),
          source: 'guest_purchase',
          notes: 'Order created by guest',
        },
      ],
    });
    log('order_created', { orderId: order._id.toString(), orderNumber, amount: plan.sellingPrice });

    // Add order to guest's orders
    guest.orders.push(order._id);
    await guest.save();

    // Create transaction record
    const txReference = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const transaction = await Transaction.create({
      userId: null,
      guestId: guest._id,
      isGuest: true,
      type: 'data_purchase',
      amount: plan.sellingPrice,
      currency: 'GHS',
      reference: txReference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Guest data purchase - ${plan.planName} for ${phoneNumber}`,
    });
    log('transaction_created', { transactionId: transaction._id.toString(), txReference });

    order.transactionId = transaction._id;
    order.transactionReference = txReference;
    await order.save();

    // Initialize Paystack payment
    try {
      const paystackPayload = {
        email: email,
        amount: Math.round(plan.sellingPrice * 100), // Convert to pesewas
        reference: txReference,
        metadata: {
          orderId: order._id.toString(),
          orderNumber: orderNumber,
          phoneNumber: phoneNumber,
          dataPlan: plan.planName,
          network: plan.network,
          isGuest: true,
          guestId: guest._id.toString(),
        },
      };

      const frontendBaseUrl = getFrontendBaseUrl(req);
      log('paystack_payload_prepared', {
        frontendBaseUrl,
        hasCallback: Boolean(frontendBaseUrl),
        amount: paystackPayload.amount,
        reference: txReference,
      });
      if (frontendBaseUrl) {
        paystackPayload.callback_url = `${frontendBaseUrl}/guest/verify-payment?reference=${txReference}`;
      }

      const paystackResponse = await paystackAPI.post('/transaction/initialize', paystackPayload);
      log('paystack_initialize_response', {
        status: paystackResponse?.data?.status,
        message: paystackResponse?.data?.message,
        reference: paystackResponse?.data?.data?.reference,
      });

      if (paystackResponse.data.status) {
        order.paystackReference = paystackResponse.data.data.reference;
        transaction.paystackReference = paystackResponse.data.data.reference;
        await order.save();
        await transaction.save();

        res.json({
          success: true,
          data: {
            authorizationUrl: paystackResponse.data.data.authorization_url,
            reference: paystackResponse.data.data.reference,
            orderNumber: orderNumber,
            orderId: order._id,
          },
          debugId,
          debugStage: 'success',
        });
      } else {
        throw new Error('Failed to initialize Paystack payment');
      }
    } catch (paystackError) {
      console.error('Paystack initialization error:', paystackError.response?.data || paystackError.message);
      console.error(`[GuestInit:${debugId}] paystack_error`, {
        status: paystackError?.response?.status,
        data: paystackError?.response?.data,
        message: paystackError?.message,
      });

      const providerMessage =
        paystackError?.response?.data?.message ||
        paystackError?.response?.data?.error ||
        paystackError?.message ||
        'Failed to initialize payment with Paystack';

      // Clean up order and transaction
      await Order.findByIdAndDelete(order._id);
      await Transaction.findByIdAndDelete(transaction._id);
      guest.orders.pull(order._id);
      await guest.save();

      res.status(500).json({
        success: false,
        message: providerMessage,
        debugId,
        debugStage: 'paystack_initialize',
      });
    }
  } catch (error) {
    console.error('Error initializing guest purchase:', error);
    console.error(`[GuestInit:${debugId}] unhandled_error`, {
      message: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({
      success: false,
      message: error?.message || 'An error occurred while processing your request',
      debugId,
      debugStage: 'unhandled_error',
    });
  }
};

// Verify guest payment and process order
exports.verifyGuestPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required',
      });
    }

    // Find transaction
    const transaction = await Transaction.findOne({
      $or: [
        { reference: reference },
        { paystackReference: reference },
      ],
      isGuest: true,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Check if already verified
    if (transaction.paymentStatus === 'completed') {
      const order = await Order.findOne({ transactionReference: transaction.reference });
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          order: order,
          transaction: transaction,
        },
      });
    }

    // Verify with Paystack
    let paystackVerification;
    try {
      paystackVerification = await paystackAPI.get(`/transaction/verify/${reference}`);
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify payment with Paystack',
      });
    }

    const paystackData = paystackVerification.data.data;

    if (paystackData.status !== 'success') {
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
          $push: {
            statusHistory: {
              status: 'failed',
              updatedAt: new Date(),
              source: 'paystack_verification',
              notes: 'Payment verification failed',
            },
          },
        }
      );

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Idempotency lock: only one request can flip this transaction to completed.
    // Any subsequent verify call should return early and must not trigger another provider purchase.
    const lockedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        paymentStatus: { $ne: 'completed' },
      },
      {
        $set: {
          status: 'completed',
          paymentStatus: 'completed',
          paystackReference: paystackData.reference,
        },
      },
      { new: true }
    );

    if (!lockedTransaction) {
      const existingOrder = await Order.findOne({ transactionReference: transaction.reference });
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          order: existingOrder,
          transaction,
        },
      });
    }

    // Find and update order
    const order = await Order.findOne({ transactionReference: transaction.reference });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Guard against re-processing if order has already advanced.
    if (order.paymentStatus === 'completed' || ['processing', 'completed'].includes(order.status)) {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          order,
          transaction: lockedTransaction,
        },
      });
    }

    order.paymentStatus = 'completed';
    order.status = 'processing';
    order.statusHistory.push({
      status: 'processing',
      updatedAt: new Date(),
      source: 'paystack_verification',
      notes: 'Payment verified, processing order',
    });
    await order.save();

    // Process data purchase
    try {
      let providerResponse;

      if (order.provider === 'digimall') {
        const [offerSlug, volume] = typeof order.apiPlanId === 'string'
          ? order.apiPlanId.split('|')
          : [order.apiPlanId, ''];
        const idempotencyKey = 'DGM' + order.orderNumber;
        providerResponse = await digimallApi.purchaseDataBundle(
          offerSlug,
          order.phoneNumber,
          order.network,
          volume,
          idempotencyKey
        );

        if (providerResponse.success) {
          order.status = 'completed';
          order.paymentStatus = 'completed';
          order.completedAt = new Date();
          order.completedBy = 'system';
          order.externalOrderId = providerResponse?.data?.orderId || providerResponse?.data?.reference || null;
          order.providerMessage = providerResponse?.data?.message || 'Purchase successful';
          order.providerStatus = 'success';
          order.statusHistory.push({
            status: 'completed',
            updatedAt: new Date(),
            source: 'digimall_api',
            notes: providerResponse?.data?.message || 'Data delivered successfully',
          });
        } else {
          throw new Error(providerResponse?.error || providerResponse?.message || 'Provider purchase failed');
        }
      } else if (order.provider === 'topza') {
        const idempotencyKey = 'TPZ' + order.orderNumber;
        providerResponse = await topzaApi.purchaseDataBundle(
          order.apiPlanId,
          order.phoneNumber,
          order.network,
          null,
          idempotencyKey
        );

        if (providerResponse.success) {
          // For Topza, mark as processing and let webhook be the source of truth for final status.
          order.status = 'processing';
          order.paymentStatus = 'completed';
          order.completedAt = null;
          order.completedBy = null;
          order.externalOrderId = providerResponse?.data?.orderId || providerResponse?.data?.reference || null;
          order.externalOrderNumber = providerResponse?.data?.orderNumber || providerResponse?.data?.raw?.data?.order?.orderNumber || order.externalOrderNumber;
          order.providerMessage = providerResponse?.data?.message || 'Topza order accepted and awaiting webhook update';
          order.providerStatus = normalizeTopzaProviderStatus(providerResponse?.data?.status || 'Processing');
          order.statusHistory.push({
            status: 'processing',
            updatedAt: new Date(),
            source: 'topza_api',
            notes: providerResponse?.data?.message || 'Topza order accepted; waiting for webhook status update',
          });
        } else {
          throw new Error(providerResponse?.error || providerResponse?.message || 'Provider purchase failed');
        }
      } else {
        // xpresdata
        const [offerSlug, volume] = typeof order.apiPlanId === 'string'
          ? order.apiPlanId.split('|')
          : [order.apiPlanId, ''];
        providerResponse = await xpresDataApi.purchaseDataBundle(
          offerSlug,
          order.phoneNumber,
          order.network,
          volume
        );

        if (providerResponse.success) {
          order.status = 'completed';
          order.paymentStatus = 'completed';
          order.completedAt = new Date();
          order.completedBy = 'system';
          order.externalOrderId =
            providerResponse?.data?.orderId ||
            providerResponse?.data?.reference ||
            providerResponse?.data?.order?.id ||
            null;
          order.providerMessage = providerResponse?.data?.message || 'Purchase successful';
          order.providerStatus = 'success';
          order.statusHistory.push({
            status: 'completed',
            updatedAt: new Date(),
            source: 'xpresdata_api',
            notes: providerResponse?.data?.message || 'Data delivered successfully',
          });
        } else {
          throw new Error(providerResponse?.error || providerResponse?.message || 'Provider purchase failed');
        }
      }

      await order.save();

      // Update guest stats
      const guest = await Guest.findById(order.guestInfo);
      if (guest) {
        guest.totalPurchases += 1;
        guest.lastPurchaseAt = new Date();
        await guest.save();
      }

      res.json({
        success: true,
        message: 'Payment verified and data delivered successfully',
        data: {
          order: order,
          transaction: lockedTransaction,
        },
      });
    } catch (providerError) {
      console.error('Provider purchase error:', providerError);

      // Update order with error but keep payment as completed
      order.status = 'failed';
      order.errorMessage = providerError.message || 'Failed to deliver data';
      order.providerStatus = order.provider === 'topza' ? 'Failed' : 'failed';
      order.statusHistory.push({
        status: 'failed',
        updatedAt: new Date(),
        source: order.provider + '_api',
        notes: providerError.message || 'Failed to deliver data',
      });
      await order.save();

      res.status(500).json({
        success: false,
        message: 'Payment successful but data delivery failed. Please contact support with your order number: ' + order.orderNumber,
        data: {
          order: order,
          transaction: lockedTransaction,
        },
      });
    }
  } catch (error) {
    console.error('Error verifying guest payment:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying payment',
    });
  }
};

// Track guest orders by phone number
exports.trackGuestOrders = async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Find direct guest by phone number (exclude store-front guests)
    const guest = await Guest.findOne({
      phone: phoneNumber,
      $or: [{ store: null }, { store: { $exists: false } }],
    })
      .populate({
        path: 'orders',
        match: { source: 'direct' },
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

    // Format orders for response
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
    console.error('Error tracking guest orders:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while tracking orders',
    });
  }
};

// Get single guest order details
exports.getGuestOrderDetails = async (req, res) => {
  try {
    const { orderNumber, phoneNumber } = req.query;

    if (!orderNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number and phone number are required',
      });
    }

    // Find order
    const order = await Order.findOne({
      orderNumber: orderNumber,
      phoneNumber: phoneNumber,
      isGuest: true,
      source: 'direct',
    }).populate('guestInfo');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching guest order details:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching order details',
    });
  }
};

module.exports = exports;
