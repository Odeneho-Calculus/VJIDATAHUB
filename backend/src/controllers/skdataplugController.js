const SkdataplugOffer = require('../models/SkdataplugOffer');
const crypto = require('crypto');
const Order = require('../models/Order');
const SkdataplugWebhookLog = require('../models/SkdataplugWebhookLog');
const SystemSettings = require('../models/SystemSettings');
const skdataplugApi = require('../utils/skdataplugApi');
const { hasAnyConfiguredPrice, toPriceNumber } = require('../utils/planPricing');
const { processRefund, processStoreOrderRefund } = require('../utils/refund');
const { createNotification } = require('./notificationController');

const mapSkdataplugStatusToOrderStatus = (status = '') => {
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

const verifySkdataplugWebhookSignature = (parsedBody, incomingSignature, secret) => {
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
    return false;
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

    await SkdataplugWebhookLog.create({
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
        signature: toSafeString(req.headers['x-skplug-signature']),
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
    console.error('[SKDataPlug Webhook] Failed to persist webhook log:', logError.message);
  }
};

exports.handleWebhook = async (req, res) => {
  const secret = process.env.SKDATAPLUG_WEBHOOK_SECRET;
  const signature = req.headers['x-skplug-signature'];

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

    const payload = req.body;

    if (!secret) {
      console.warn('[SKDataPlug Webhook] SKDATAPLUG_WEBHOOK_SECRET is not configured; ignoring event');
      await createWebhookLog({ req, payload: null, signatureValid: false, handled: false, reason: 'missing_secret' });
      return res.status(200).json({ received: true, ignored: true, reason: 'missing_secret' });
    }

    const isValidSignature = verifySkdataplugWebhookSignature(payload, signature, secret);
    if (!isValidSignature) {
      console.warn('[SKDataPlug Webhook] Invalid signature');
      await createWebhookLog({ req, payload: null, signatureValid: false, handled: false, reason: 'invalid_signature' });
      return res.status(200).json({ received: true, ignored: true, reason: 'invalid_signature' });
    }

    // SKDataPlug webhooks are delivery notifications — no explicit event field
    const data = payload || {};
    const skpOrderId = data.order_id ? String(data.order_id).trim() : null;
    const skpOrderNumber = data.order_number ? String(data.order_number).trim() : null;

    const orConditions = [];
    if (skpOrderId) {
      orConditions.push({ externalOrderId: skpOrderId });
    }
    if (skpOrderNumber) {
      orConditions.push({ externalOrderNumber: skpOrderNumber });
      orConditions.push({ orderNumber: skpOrderNumber });
    }

    if (orConditions.length === 0) {
      await createWebhookLog({ req, payload, signatureValid: true, handled: false, reason: 'missing_identifiers' });
      return res.status(200).json({ received: true, ignored: true, reason: 'missing_identifiers' });
    }

    const order = await Order.findOne({ $or: orConditions }).sort({ createdAt: -1 });

    if (!order) {
      await createWebhookLog({ req, payload, signatureValid: true, handled: false, reason: 'order_not_found' });
      return res.status(200).json({ received: true, ignored: true, reason: 'order_not_found' });
    }

    const orderStatusBefore = order.status;

    const mappedStatus = mapSkdataplugStatusToOrderStatus(data.status);
    const providerStatus = String(data.status || '').trim() || null;
    const updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
    const hasValidUpdatedAt = !Number.isNaN(updatedAt.getTime());

    order.providerStatus = providerStatus;
    if (skpOrderId) {
      order.externalOrderId = skpOrderId;
    }
    if (skpOrderNumber) {
      order.externalOrderNumber = skpOrderNumber;
    }
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    if (!order.adminModified) {
      order.status = mappedStatus;

      const lastHistory = order.statusHistory[order.statusHistory.length - 1];
      const shouldAppendHistory = !lastHistory || lastHistory.status !== mappedStatus;

      if (mappedStatus === 'completed') {
        order.completedAt = hasValidUpdatedAt ? updatedAt : new Date();
        order.completedBy = 'system';
        if (order.paymentStatus !== 'failed') {
          order.paymentStatus = 'completed';
        }
        order.errorMessage = null;
        order.providerMessage = `Service update: order completed${skpOrderNumber ? ` (${skpOrderNumber})` : ''}`;
      } else if (mappedStatus === 'failed') {
        order.errorMessage = `Service update reported failed status${skpOrderNumber ? ` (${skpOrderNumber})` : ''}`;
        order.providerMessage = `Service update: order failed${skpOrderNumber ? ` (${skpOrderNumber})` : ''}`;
        order.completedBy = null;
        order.completedAt = null;
      } else {
        order.providerMessage = `Service update: order ${mappedStatus}${skpOrderNumber ? ` (${skpOrderNumber})` : ''}`;
        order.completedBy = null;
        order.completedAt = null;
      }

      if (shouldAppendHistory) {
        order.statusHistory.push({
          status: mappedStatus,
          updatedAt: hasValidUpdatedAt ? updatedAt : new Date(),
          source: 'service_update',
          notes: `Service status: ${providerStatus || mappedStatus}`,
        });
      }
    } else {
      order.providerMessage = `Service update: ${providerStatus || mappedStatus} (status locked by admin)`;
      order.statusHistory.push({
        status: order.status,
        updatedAt: new Date(),
        source: 'service_update',
        notes: `Provider reported ${providerStatus || mappedStatus}; admin status (${order.status}) preserved`,
      });
    }

    if (!order.adminModified && mappedStatus === 'failed' && order.paymentStatus === 'completed' && !order.isRefunded) {
      let refundResult;

      if (order.source === 'store' && order.storeId) {
        refundResult = await processStoreOrderRefund(order, providerStatus || 'Service update failure');
        console.log(`[SKDataPlug Webhook] Store order auto-refund result for order ${order.orderNumber}:`, refundResult);

        if (refundResult.success) {
          const Store = require('../models/Store');
          const store = await Store.findById(order.storeId).populate('owner', '_id name email');
          if (store && store.owner) {
            await createNotification({
              type: 'order_failed',
              title: 'Store Order Failed',
              message: `A customer order for ${order.dataAmount} (${order.phoneNumber}) failed after payment.`,
              description: `Order ${order.orderNumber} failed: ${providerStatus || 'Service update failure'}. Refund GHS ${refundResult.amountRefunded || 0}; commission recovery GHS ${refundResult.commissionRecovery || 0}; net wallet credit GHS ${refundResult.netWalletCredit || 0}. Please repurchase for the customer.`,
              severity: 'error',
              userId: store.owner._id,
              data: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                phoneNumber: order.phoneNumber,
                dataAmount: order.dataAmount,
                amount: order.amount,
                storeId: order.storeId?.toString(),
              },
              actionUrl: `/store/orders`,
            });
          }
        }
      } else {
        refundResult = await processRefund(order, providerStatus || 'Service update failure');
        console.log(`[SKDataPlug Webhook] Auto-refund result for order ${order.orderNumber}:`, refundResult);

        if (refundResult.success && order.userId) {
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
      }
    } else {
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
    console.error('[SKDataPlug Webhook] Error handling webhook:', error);
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
      SkdataplugWebhookLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('matchedOrderId', 'orderNumber status phoneNumber providerStatus createdAt'),
      SkdataplugWebhookLog.countDocuments(filter),
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
      secretConfigured: Boolean(process.env.SKDATAPLUG_WEBHOOK_SECRET),
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
    const result = await SkdataplugWebhookLog.deleteMany({});
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
  const raw = String(plan.gb_size || plan.volume || plan.dataAmount || plan.size || '').trim();
  if (!raw) return '1';
  const match = raw.match(/([\d.]+)/);
  return match ? match[1] : '1';
};

const buildDisplayName = (offer = {}, networkName = '') => {
  const planName = String(offer.planName || offer.name || offer.label || '').trim();
  const dataAmount = String(offer.gb_size || offer.volume || offer.size || '').trim();
  const network = String(networkName || offer.network || offer.isp || '').trim();

  // If the API provides a meaningful plan name, use it
  if (planName && planName.length > 1) {
    if (dataAmount && !planName.toLowerCase().includes(dataAmount.toLowerCase())) {
      return `${planName} (${dataAmount}GB)`;
    }
    return planName;
  }

  // Build a descriptive name: "Network XGB"
  if (network && dataAmount) {
    return `${network} ${dataAmount}GB`;
  }

  return dataAmount ? `${dataAmount}GB` : `Data Plan ${offer.id || ''}`;
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

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const applyMarkup = (costPrice, markupPercent) => {
  if (!costPrice || costPrice <= 0) return 0;
  if (!markupPercent || markupPercent <= 0) return costPrice;
  return round2(costPrice * (1 + markupPercent / 100));
};

exports.syncOffers = async (req, res) => {
  try {
    const [offersResult, networksResult] = await Promise.all([
      skdataplugApi.fetchOffers(),
      skdataplugApi.fetchNetworks(),
    ]);

    if (!offersResult.success || !Array.isArray(offersResult.offers)) {
      return res.status(400).json({
        success: false,
        message: offersResult.error || 'No offers returned from SKDataPlug API.',
      });
    }

    const networkLookup = buildNetworkLookup(networksResult.success ? networksResult.networks : []);

    let pricingDefaults = { userMarkupPercent: 15, agentMarkupPercent: 10, vendorMarkupPercent: 5 };
    try {
      const settings = await SystemSettings.getSettings();
      if (settings?.pricingDefaults) {
        pricingDefaults = {
          userMarkupPercent: Number(settings.pricingDefaults.userMarkupPercent) || 15,
          agentMarkupPercent: Number(settings.pricingDefaults.agentMarkupPercent) || 10,
          vendorMarkupPercent: Number(settings.pricingDefaults.vendorMarkupPercent) || 5,
        };
      }
    } catch {
      // Use defaults if settings fail to load
    }

    let synced = 0;
    let updated = 0;
    const syncTime = new Date();

    for (const offer of offersResult.offers) {
      const providerPlanId = String(
        offer._id || offer.id || offer.bundle_id || offer.planId || `${offer.network}-${offer.gb_size}`
      ).trim();
      if (!providerPlanId) continue;

      const volume = toVolume(offer);
      const volumeNum = Number(volume) || 0;
      const isp = resolveOfferNetwork(offer, networkLookup);
      const networkName = resolveOfferNetwork(offer, networkLookup);
      const baseName = offer.planName || offer.name || offer.label || `${networkName} ${volume}GB`;
      const displayName = buildDisplayName(offer, networkName);
      const validity = offer.validity || offer.duration || '30 Days';
      const costPrice = Number(offer.price || offer.finalPrice || offer.amount || offer.costPrice || 0) || 0;
      const finalPrice = Number(offer.finalPrice || offer.price || 0) || 0;
      const discount = Number(offer.discount || 0) || 0;
      const providerIsActive = offer.isActive !== false;
      const providerInStock = offer.inStock !== false;

      const existing = await SkdataplugOffer.findOne({ providerPlanId });

      if (existing) {
        existing.name = displayName;
        existing.offerName = baseName;
        existing.offerSlug = offer.slug || offer.offerSlug || existing.offerSlug;
        existing.isp = isp;
        existing.volume = volume;
        existing.volumeNum = volumeNum;
        existing.validity = validity;
        existing.inStock = providerInStock;
        existing.providerIsActive = providerIsActive;
        existing.finalPrice = finalPrice;
        existing.discount = discount;
        existing.lastSyncedAt = syncTime;
        existing.rawProviderData = offer;
        if (costPrice > 0) {
          existing.costPrice = costPrice;
        }
        if (costPrice > 0) {
          if (!existing.sellingPrice || existing.sellingPrice <= 0) {
            existing.sellingPrice = applyMarkup(costPrice, pricingDefaults.userMarkupPercent);
          }
          if (!existing.agentPrice || existing.agentPrice <= 0) {
            existing.agentPrice = applyMarkup(costPrice, pricingDefaults.agentMarkupPercent);
          }
          if (!existing.vendorPrice || existing.vendorPrice <= 0) {
            existing.vendorPrice = applyMarkup(costPrice, pricingDefaults.vendorMarkupPercent);
          }
        }
        // SKDataPlug doesn't provide costPrice — activation depends on manually-set prices
        if (hasAnyConfiguredPrice(existing) && providerIsActive) {
          existing.status = 'active';
          existing.isActive = true;
        } else {
          existing.status = 'inactive';
          existing.isActive = false;
        }
        await existing.save();
        updated += 1;
      } else {
        const sellingPrice = applyMarkup(costPrice, pricingDefaults.userMarkupPercent);
        const agentPrice = applyMarkup(costPrice, pricingDefaults.agentMarkupPercent);
        const vendorPrice = applyMarkup(costPrice, pricingDefaults.vendorMarkupPercent);
        const hasPrices = sellingPrice > 0 || agentPrice > 0 || vendorPrice > 0;

        await SkdataplugOffer.create({
          name: displayName,
          offerName: baseName,
          providerPlanId,
          offerSlug: offer.slug || offer.offerSlug || null,
          isp,
          volume,
          volumeNum,
          validity,
          costPrice,
          finalPrice,
          discount,
          sellingPrice,
          agentPrice,
          vendorPrice,
          status: hasPrices ? 'active' : 'inactive',
          isActive: hasPrices,
          inStock: providerInStock,
          providerIsActive,
          lastSyncedAt: syncTime,
          rawProviderData: offer,
        });
        synced += 1;
      }
    }

    await SkdataplugOffer.updateMany(
      { lastSyncedAt: { $lt: syncTime }, stockOverriddenByAdmin: { $ne: true } },
      { inStock: false }
    );

    return res.status(200).json({
      success: true,
      message: 'SKDataPlug offers synced successfully',
      stats: { synced, updated, total: synced + updated },
    });
  } catch (error) {
    console.error('[skdataplugController.syncOffers]', error);
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

    const total = await SkdataplugOffer.countDocuments(query);
    const offers = await SkdataplugOffer.find(query)
      .sort({ isp: 1, volumeNum: 1 })
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

    const [totalPlans, activePlans, outOfStockPlans, providerInactive] = await Promise.all([
      SkdataplugOffer.countDocuments(query),
      SkdataplugOffer.countDocuments({ ...query, status: 'active' }),
      SkdataplugOffer.countDocuments({ ...query, status: { $ne: 'active' } }),
      SkdataplugOffer.countDocuments({ ...query, providerIsActive: false }),
    ]);

    const allOffers = await SkdataplugOffer.find(query);
    let totalMargin = 0;
    allOffers.forEach((offer) => {
      const margin = offer.costPrice > 0 ? ((offer.sellingPrice - offer.costPrice) / offer.costPrice) * 100 : 0;
      totalMargin += margin;
    });
    const avgMargin = allOffers.length > 0 ? (totalMargin / allOffers.length).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      stats: { totalPlans, activePlans, outOfStockPlans, providerInactive, avgMargin },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNetworks = async (req, res) => {
  try {
    const result = await skdataplugApi.fetchNetworks();
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

    const rows = await SkdataplugOffer.aggregate([
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

    const result = await skdataplugApi.fetchNetworkByCode(code);
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
    const offer = await SkdataplugOffer.findById(req.params.id);

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
    const offer = await SkdataplugOffer.findById(req.params.id);
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
      await SkdataplugOffer.updateMany(filter, { $set: { stockOverriddenByAdmin: false } });
    } else {
      await SkdataplugOffer.updateMany(filter, { inStock: Boolean(inStock), stockOverriddenByAdmin: true });
    }

    const updated = await SkdataplugOffer.countDocuments(filter);
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
      result = await SkdataplugOffer.deleteMany({ _id: { $in: ids } });
    } else {
      result = await SkdataplugOffer.deleteMany({});
    }
    return res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await SkdataplugOffer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    return res.status(200).json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWalletSettings = async (req, res) => {
  try {
    const balanceResult = await skdataplugApi.getWalletBalance();
    const now = new Date();

    return res.status(200).json({
      success: true,
      data: {
        lastSync: now,
        balance: balanceResult.success ? balanceResult.balance : 0,
        isPlaceholder: true,
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
    const result = await skdataplugApi.getOrders({ page, limit });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch SKDataPlug transactions',
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
