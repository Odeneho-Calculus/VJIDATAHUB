const TopzaOffer = require('../models/TopzaOffer');
const crypto = require('crypto');
const Order = require('../models/Order');
const TopzaWebhookLog = require('../models/TopzaWebhookLog');
const SystemSettings = require('../models/SystemSettings');
const topzaApi = require('../utils/topzaApi');
const { hasAnyConfiguredPrice, toPriceNumber } = require('../utils/planPricing');
const { processRefund } = require('../utils/refund');
const { createNotification } = require('./notificationController');
const User = require('../models/User');

const mapTopzaStatusToOrderStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'success' || normalized === 'delivered') return 'completed';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  if (normalized === 'processing' || normalized === 'in_progress' || normalized === 'in-progress') return 'processing';
  return 'pending';
};

const getRawBodyFromRequest = (req) => {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  return Buffer.from(JSON.stringify(req.body || {}), 'utf8');
};

// Topza computes the signature from JSON.stringify(payload) — NOT from raw HTTP bytes.
// Using raw bytes will always fail because axios re-serialises the object on delivery.
const verifyTopzaWebhookSignature = (parsedBody, incomingSignature, secret) => {
  if (!incomingSignature || !secret) return false;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(parsedBody))
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(String(incomingSignature).trim().toLowerCase(), 'hex')
    );
  } catch {
    return false; // buffers differ in length → definitely wrong
  }
};

const toSafeString = (value) => String(value || '').trim();

const createWebhookLog = async ({ req, payload, signatureValid, handled, reason, matchedOrder, orderStatusBefore, orderStatusAfter }) => {
  try {
    const data = payload?.data || {};
    const rawBodySnippet = (() => {
      try {
        const raw = getRawBodyFromRequest(req).toString('utf8');
        return raw.slice(0, 2000);
      } catch {
        return '';
      }
    })();

    await TopzaWebhookLog.create({
      event: toSafeString(payload?.event),
      signatureValid: !!signatureValid,
      handled: !!handled,
      reason: toSafeString(reason),
      providerStatus: toSafeString(data.status),
      matchedOrderId: matchedOrder?._id || null,
      matchedOrderNumber: toSafeString(matchedOrder?.orderNumber),
      orderStatusBefore: toSafeString(orderStatusBefore),
      orderStatusAfter: toSafeString(orderStatusAfter),
      requestMeta: {
        userAgent: toSafeString(req.headers['user-agent']),
        signature: toSafeString(req.headers['x-topza-signature']),
        contentType: toSafeString(req.headers['content-type']),
      },
      identifiers: {
        orderId: toSafeString(data.orderId),
        orderNumber: toSafeString(data.orderNumber),
        reference: toSafeString(data.reference),
      },
      payload: payload || null,
      rawBodySnippet,
      receivedAt: new Date(),
    });
  } catch (logError) {
    console.error('[Topza Webhook] Failed to persist webhook log:', logError.message);
  }
};

exports.handleWebhook = async (req, res) => {
  const secret = process.env.TOPZA_WEBHOOK_SECRET;
  const signature = req.headers['x-topza-signature'];

  try {
    const settings = await SystemSettings.getSettings();
    const statusUpdateMethod = settings?.orderSettings?.statusUpdateMethod || 'cron';

    if (statusUpdateMethod !== 'webhook') {
      await createWebhookLog({
        req,
        payload: req.body || null,
        signatureValid: false,
        handled: false,
        reason: 'webhook_disabled_status_mode_cron',
      });
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: 'webhook_disabled_status_mode_cron',
      });
    }

    // req.body is already parsed by express.json().
    // Topza signs JSON.stringify(payload) — not raw bytes — so we verify the same way.
    const payload = req.body;

    if (!secret) {
      console.warn('[Topza Webhook] TOPZA_WEBHOOK_SECRET is not configured; ignoring event');
      await createWebhookLog({ req, payload: null, signatureValid: false, handled: false, reason: 'missing_secret' });
      return res.status(200).json({ received: true, ignored: true, reason: 'missing_secret' });
    }

    const isValidSignature = verifyTopzaWebhookSignature(payload, signature, secret);
    if (!isValidSignature) {
      console.warn('[Topza Webhook] Invalid signature');
      await createWebhookLog({ req, payload: null, signatureValid: false, handled: false, reason: 'invalid_signature' });
      return res.status(200).json({ received: true, ignored: true, reason: 'invalid_signature' });
    }

    const event = payload?.event;
    if (event !== 'order.status_updated') {
      await createWebhookLog({ req, payload, signatureValid: true, handled: false, reason: 'unsupported_event' });
      return res.status(200).json({ received: true, ignored: true, reason: 'unsupported_event' });
    }

    const data = payload?.data || {};
    const topzaOrderId = data.orderId ? String(data.orderId).trim() : null;
    const topzaOrderNumber = data.orderNumber ? String(data.orderNumber).trim() : null;

    // data.reference is Topza's upstream VTU provider reference (DataMart/Dakazina).
    // It is NOT a Paystack reference — do not use it to match orders.
    // Match only by externalOrderId (Topza ObjectId) or orderNumber as fallback.
    const orConditions = [];
    if (topzaOrderId) {
      orConditions.push({ externalOrderId: topzaOrderId });
    }
    if (topzaOrderNumber) {
      orConditions.push({ externalOrderNumber: topzaOrderNumber });
      orConditions.push({ orderNumber: topzaOrderNumber });
    }

    if (orConditions.length === 0) {
      await createWebhookLog({ req, payload, signatureValid: true, handled: false, reason: 'missing_identifiers' });
      return res.status(200).json({ received: true, ignored: true, reason: 'missing_identifiers' });
    }

    // Do not filter by provider — the field may not be set on all orders.
    const order = await Order.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    if (!order) {
      await createWebhookLog({ req, payload, signatureValid: true, handled: false, reason: 'order_not_found' });
      return res.status(200).json({ received: true, ignored: true, reason: 'order_not_found' });
    }

    const orderStatusBefore = order.status;

    const mappedStatus = mapTopzaStatusToOrderStatus(data.status);
    const providerStatus = String(data.status || '').trim() || null;
    const updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    const hasValidUpdatedAt = !Number.isNaN(updatedAt.getTime());

    order.providerStatus = providerStatus;
    if (topzaOrderId) {
      order.externalOrderId = topzaOrderId;
    }
    if (topzaOrderNumber) {
      order.externalOrderNumber = topzaOrderNumber;
    }
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    const lastHistory = order.statusHistory[order.statusHistory.length - 1];
    const shouldAppendHistory = !lastHistory || lastHistory.status !== mappedStatus;

    order.status = mappedStatus;

    if (mappedStatus === 'completed') {
      order.completedAt = hasValidUpdatedAt ? updatedAt : new Date();
      order.completedBy = 'system';
      if (order.paymentStatus !== 'failed') {
        order.paymentStatus = 'completed';
      }
      order.errorMessage = null;
      order.providerMessage = `Topza webhook: order completed${topzaOrderNumber ? ` (${topzaOrderNumber})` : ''}`;
    } else if (mappedStatus === 'failed') {
      order.errorMessage = `Topza webhook reported failed status${topzaOrderNumber ? ` (${topzaOrderNumber})` : ''}`;
      order.providerMessage = `Topza webhook: order failed${topzaOrderNumber ? ` (${topzaOrderNumber})` : ''}`;
      order.completedBy = null;
      order.completedAt = null;
    } else {
      order.providerMessage = `Topza webhook: order ${mappedStatus}${topzaOrderNumber ? ` (${topzaOrderNumber})` : ''}`;
      order.completedBy = null;
      order.completedAt = null;
    }

    if (shouldAppendHistory) {
      order.statusHistory.push({
        status: mappedStatus,
        updatedAt: hasValidUpdatedAt ? updatedAt : new Date(),
        source: 'topza_webhook',
        notes: `Topza status: ${providerStatus || mappedStatus}`,
      });
    }

    // Trigger refund IF order failed AND was paid AND not already refunded
    if (mappedStatus === 'failed' && order.paymentStatus === 'completed' && !order.isRefunded) {
      // processRefund handles saving the order document internally
      const refundResult = await processRefund(order, providerStatus || 'Topza webhook failure');
      console.log(`[Topza Webhook] Auto-refund result for order ${order.orderNumber}:`, refundResult);

      if (refundResult.success) {
        // Notify user about refund
        await createNotification({
          type: 'refund',
          title: 'Order Failed - Refunded',
          message: `Your order ${order.orderNumber} failed and GHS ${(order.amount + (order.transactionCharge || 0)).toFixed(2)} has been refunded to your wallet.`,
          description: `The data purchase for ${order.phoneNumber} (${order.dataAmount}) failed. We have automatically refunded the full amount to your wallet.`,
          severity: 'warning',
          data: {
            userId: order.userId.toString(),
            amount: order.amount + (order.transactionCharge || 0),
            orderId: order._id.toString(),
          },
          actionUrl: `/orders/${order._id}`,
        });
      }
    } else {
      // Regular save if no refund was triggered
      await order.save();
    }

    await createWebhookLog({
      req,
      payload,
      signatureValid: true,
      handled: true,
      reason: 'updated',
      matchedOrder: order,
      orderStatusBefore,
      orderStatusAfter: order.status,
    });

    return res.status(200).json({
      received: true,
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        providerStatus: order.providerStatus,
      },
    });
  } catch (error) {
    console.error('[Topza Webhook] Error handling webhook:', error);
    await createWebhookLog({ req, payload: null, signatureValid: false, handled: false, reason: 'handler_error' });
    return res.status(200).json({ received: true, ignored: true, reason: 'handler_error' });
  }
};

exports.getWebhookLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const { handled, signatureValid, event, reason } = req.query;

    const filter = {};
    if (handled === 'true' || handled === 'false') {
      filter.handled = handled === 'true';
    }
    if (signatureValid === 'true' || signatureValid === 'false') {
      filter.signatureValid = signatureValid === 'true';
    }
    if (event) {
      filter.event = String(event).trim();
    }
    if (reason) {
      filter.reason = String(reason).trim();
    }

    const [logs, total] = await Promise.all([
      TopzaWebhookLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('matchedOrderId', 'orderNumber status phoneNumber providerStatus createdAt'),
      TopzaWebhookLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      secretConfigured: Boolean(process.env.TOPZA_WEBHOOK_SECRET),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webhook logs',
    });
  }
};

exports.clearWebhookLogs = async (req, res) => {
  try {
    const result = await TopzaWebhookLog.deleteMany({});
    return res.status(200).json({
      success: true,
      message: 'Webhook logs cleared successfully',
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear webhook logs',
    });
  }
};

const toVolume = (plan = {}) => {
  const raw = String(plan.volume || plan.dataAmount || plan.size || '').trim();
  if (!raw) return '1';
  const match = raw.match(/([\d.]+)/);
  return match ? match[1] : '1';
};

const buildNetworkLookup = (networks = []) => {
  const map = new Map();
  for (const network of networks) {
    const code = String(network?.code || network?.networkCode || network?.id || '').trim();
    const name = String(network?.name || network?.network || network?.title || '').trim();
    if (!code && !name) continue;

    if (code) map.set(code.toLowerCase(), name || code);
    if (name) map.set(name.toLowerCase(), name);
  }
  return map;
};

const resolveOfferNetwork = (offer = {}, networkLookup = new Map()) => {
  const candidates = [offer.network, offer.isp, offer.provider, offer.networkCode, offer.code]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const resolved = networkLookup.get(candidate.toLowerCase());
    if (resolved) return resolved;
  }

  return candidates[0] || 'Unknown';
};

exports.syncOffers = async (req, res) => {
  try {
    const [offersResult, networksResult] = await Promise.all([
      topzaApi.fetchOffers(),
      topzaApi.fetchNetworks(),
    ]);

    if (!offersResult.success || !Array.isArray(offersResult.offers)) {
      return res.status(400).json({
        success: false,
        message: offersResult.error || 'No offers returned from Topza API.',
      });
    }

    const networkLookup = buildNetworkLookup(networksResult.success ? networksResult.networks : []);

    let synced = 0;
    let updated = 0;
    const syncTime = new Date();

    for (const offer of offersResult.offers) {
      const providerPlanId = String(
        offer._id || offer.id || offer.dataPlanId || offer.planId || ''
      ).trim();
      if (!providerPlanId) continue;

      const volume = toVolume(offer);
      const isp = resolveOfferNetwork(offer, networkLookup);
      const baseName = offer.planName || offer.name || `Topza Plan ${providerPlanId}`;
      const displayName = `${baseName} (${volume}GB)`;
      const validity = offer.validity || offer.duration || '30 Days';
      const costPrice = Number(offer.amount || offer.price || offer.costPrice || 0) || 0;

      const existing = await TopzaOffer.findOne({ providerPlanId });

      if (existing) {
        existing.name = displayName;
        existing.offerName = baseName;
        existing.offerSlug = offer.slug || offer.offerSlug || existing.offerSlug;
        existing.isp = isp;
        existing.volume = volume;
        existing.validity = validity;
        existing.inStock = offer.inStock !== false;
        existing.lastSyncedAt = syncTime;
        existing.rawProviderData = offer;
        if (!existing.isEdited && costPrice > 0) {
          existing.costPrice = costPrice;
        }
        if (!hasAnyConfiguredPrice(existing)) {
          existing.status = 'inactive';
          existing.isActive = false;
        }
        await existing.save();
        updated += 1;
      } else {
        const hasConfiguredPrice = hasAnyConfiguredPrice({
          sellingPrice: 0,
          agentPrice: 0,
          vendorPrice: 0,
        });

        await TopzaOffer.create({
          name: displayName,
          offerName: baseName,
          providerPlanId,
          offerSlug: offer.slug || offer.offerSlug || null,
          isp,
          volume,
          validity,
          costPrice,
          sellingPrice: 0,
          agentPrice: 0,
          vendorPrice: 0,
          status: hasConfiguredPrice ? 'active' : 'inactive',
          isActive: hasConfiguredPrice,
          inStock: offer.inStock !== false,
          lastSyncedAt: syncTime,
          rawProviderData: offer,
        });
        synced += 1;
      }
    }

    await TopzaOffer.updateMany(
      { lastSyncedAt: { $lt: syncTime }, stockOverriddenByAdmin: { $ne: true } },
      { inStock: false }
    );

    return res.status(200).json({
      success: true,
      message: 'Topza offers synced successfully',
      stats: { synced, updated, total: synced + updated },
    });
  } catch (error) {
    console.error('[topzaController.syncOffers]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const { network, status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = {};
    if (network && network !== 'all') query.isp = { $regex: new RegExp(network, 'i') };
    if (status && status !== 'all') query.status = status;

    const total = await TopzaOffer.countDocuments(query);
    const offers = await TopzaOffer.find(query)
      .sort({ isp: 1, volume: 1 })
      .limit(parseInt(limit, 10))
      .skip(skip);

    return res.status(200).json({
      success: true,
      plans: offers,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { network } = req.query;
    const query = {};
    if (network && network !== 'all') query.isp = { $regex: new RegExp(network, 'i') };

    const [totalPlans, activePlans, outOfStockPlans] = await Promise.all([
      TopzaOffer.countDocuments(query),
      TopzaOffer.countDocuments({ ...query, status: 'active', inStock: true }),
      TopzaOffer.countDocuments({ ...query, inStock: false }),
    ]);

    const allOffers = await TopzaOffer.find(query);
    let totalMargin = 0;
    allOffers.forEach((offer) => {
      const margin = offer.costPrice > 0 ? ((offer.sellingPrice - offer.costPrice) / offer.costPrice) * 100 : 0;
      totalMargin += margin;
    });
    const avgMargin = allOffers.length > 0 ? (totalMargin / allOffers.length).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      stats: { totalPlans, activePlans, outOfStockPlans, avgMargin },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNetworks = async (req, res) => {
  try {
    const result = await topzaApi.fetchNetworks();
    if (result.success && Array.isArray(result.networks) && result.networks.length > 0) {
      return res.json({
        success: true,
        networks: result.networks.map((network) => ({
          networkId: network.code || network.networkCode || network.id || network.name,
          code: network.code || network.networkCode || network.id || null,
          name: network.name || network.network || network.title || 'Unknown',
          raw: network,
        })),
      });
    }

    const rows = await TopzaOffer.aggregate([
      { $group: { _id: '$isp', name: { $first: '$isp' } } },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      success: true,
      networks: rows.map((row) => ({ networkId: row._id, code: null, name: row.name })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNetworkByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Network code is required' });
    }

    const result = await topzaApi.fetchNetworkByCode(code);
    if (!result.success) {
      if (result.isNotFound) {
        return res.status(404).json({ success: false, message: 'Network not found' });
      }
      return res.status(400).json({ success: false, message: result.error || 'Failed to fetch network details' });
    }

    return res.status(200).json({
      success: true,
      data: result.network,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePrices = async (req, res) => {
  try {
    const { costPrice, sellingPrice, agentPrice, vendorPrice } = req.body;
    const offer = await TopzaOffer.findById(req.params.id);

    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

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
        ? 'Prices updated'
        : 'Prices cleared. Offer has been deactivated until a valid price is set.',
      plan: offer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const offer = await TopzaOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    if (offer.status !== 'active' && !hasAnyConfiguredPrice(offer)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate an offer without a valid selling, agent, or vendor price.',
      });
    }

    offer.status = offer.status === 'active' ? 'inactive' : 'active';
    offer.isActive = offer.status === 'active';
    await offer.save();
    return res.status(200).json({ success: true, message: `Offer ${offer.status}`, plan: offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { ids, inStock, resetOverride } = req.body || {};
    const filter = Array.isArray(ids) && ids.length > 0 ? { _id: { $in: ids } } : {};

    if (resetOverride) {
      await TopzaOffer.updateMany(filter, { $set: { stockOverriddenByAdmin: false } });
    } else {
      await TopzaOffer.updateMany(filter, { inStock: Boolean(inStock), stockOverriddenByAdmin: true });
    }

    const updated = await TopzaOffer.countDocuments(filter);
    return res.json({
      success: true,
      message: resetOverride ? 'Override cleared' : `Stock set to ${inStock}`,
      updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body || {};
    let result;
    if (Array.isArray(ids) && ids.length > 0) {
      result = await TopzaOffer.deleteMany({ _id: { $in: ids } });
    } else {
      result = await TopzaOffer.deleteMany({});
    }
    return res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await TopzaOffer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    return res.status(200).json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWalletSettings = async (req, res) => {
  try {
    const balanceResult = await topzaApi.getWalletBalance();
    const now = new Date();

    return res.status(200).json({
      success: true,
      data: {
        lastSync: now,
        balance: balanceResult.success ? balanceResult.balance : 0,
        isPlaceholder: false,
        syncStatus: balanceResult.success ? 'Success' : 'Error',
        error: balanceResult.success ? null : balanceResult.error,
      },
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      data: { lastSync: new Date(), balance: 0, syncStatus: 'Error', error: error.message },
    });
  }
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const result = await topzaApi.getOrders({ page, limit });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch Topza transactions',
        transactions: [],
      });
    }

    return res.status(200).json({
      success: true,
      transactions: result.orders || [],
      pagination: result.pagination || null,
      fetchedAt: new Date(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, transactions: [] });
  }
};
