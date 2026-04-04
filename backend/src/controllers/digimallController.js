const DigimallOffer = require('../models/DigimallOffer');
const digimallApi = require('../utils/digimallApi');
const { hasAnyConfiguredPrice, toPriceNumber } = require('../utils/planPricing');

/**
 * POST /api/digimall/sync
 * Fetches offers from DigiMall API and upserts them into our DB.
 */
exports.syncOffers = async (req, res) => {
  try {
    const result = await digimallApi.fetchOffers();

    if (!result.success || !Array.isArray(result.offers) || result.offers.length === 0) {
      return res.status(400).json({
        success: false,
        message: result.error || 'No offers returned from DigiMall API. Check API key or endpoint.',
      });
    }

    let synced = 0;
    let updated = 0;
    const syncTime = new Date();

    for (const offer of result.offers) {
      // DigiMall offer fields — be flexible with field names
      const offerSlug = offer.offerSlug || offer.slug || offer.offer_slug;
      const isp = offer.isp || offer.network || offer.provider || 'Unknown';
      const volumes = Array.isArray(offer.volumes) ? offer.volumes : (offer.volume ? [offer.volume] : []);
      const baseName = offer.name || offer.offerName || offer.offer_name || offerSlug || 'Data Bundle';
      const validity = offer.validity || offer.expiry || '30 Days';
      const costPrice = parseFloat(offer.price || offer.cost || offer.amount || 0);

      if (!offerSlug) {
        console.warn('[DigiMall Sync] Skipping offer without slug:', JSON.stringify(offer));
        continue;
      }

      // If there are no volumes, treat the offer itself as a single entry
      const volumeList = volumes.length > 0 ? volumes : [offer.volume || '1'];

      for (const volume of volumeList) {
        const uniqueSlug = volumes.length > 1 ? `${offerSlug}_${volume}` : offerSlug;
        const displayName = volumes.length > 1 ? `${baseName} (${volume}GB)` : baseName;

        const existing = await DigimallOffer.findOne({ offerSlug: uniqueSlug });

        if (existing) {
          existing.name = displayName;
          existing.offerName = baseName;
          existing.isp = isp;
          existing.volume = String(volume);
          existing.validity = validity;
          existing.inStock = true;
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
          updated++;
        } else {
          const hasConfiguredPrice = hasAnyConfiguredPrice({
            sellingPrice: 0,
            agentPrice: 0,
            vendorPrice: 0,
          });
          await DigimallOffer.create({
            name: displayName,
            offerName: baseName,
            offerSlug: uniqueSlug,
            isp,
            volume: String(volume),
            validity,
            costPrice,
            sellingPrice: 0,
            agentPrice: 0,
            vendorPrice: 0,
            status: hasConfiguredPrice ? 'active' : 'inactive',
            isActive: hasConfiguredPrice,
            lastSyncedAt: syncTime,
            rawProviderData: offer,
          });
          synced++;
        }
      }
    }

    // Mark offers not returned in this sync as out of stock (respects admin overrides)
    await DigimallOffer.updateMany(
      { lastSyncedAt: { $lt: syncTime }, stockOverriddenByAdmin: { $ne: true } },
      { inStock: false }
    );

    res.status(200).json({
      success: true,
      message: 'DigiMall offers synced successfully',
      stats: { synced, updated, total: synced + updated },
    });
  } catch (error) {
    console.error('[digimallController.syncOffers]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/digimall/offers
 * List DigiMall offers with optional filters.
 */
exports.getOffers = async (req, res) => {
  try {
    const { network, status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (network && network !== 'all') query.isp = { $regex: new RegExp(network, 'i') };
    if (status && status !== 'all') query.status = status;

    const total = await DigimallOffer.countDocuments(query);
    const offers = await DigimallOffer.find(query)
      .sort({ isp: 1, volume: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.status(200).json({
      success: true,
      plans: offers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/digimall/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { network } = req.query;
    const query = {};
    if (network && network !== 'all') query.isp = { $regex: new RegExp(network, 'i') };

    const [totalPlans, activePlans, outOfStockPlans] = await Promise.all([
      DigimallOffer.countDocuments(query),
      DigimallOffer.countDocuments({ ...query, status: 'active', inStock: true }),
      DigimallOffer.countDocuments({ ...query, inStock: false }),
    ]);

    const allOffers = await DigimallOffer.find(query);
    let totalMargin = 0;
    allOffers.forEach((o) => {
      const margin = o.costPrice > 0 ? ((o.sellingPrice - o.costPrice) / o.costPrice) * 100 : 0;
      totalMargin += margin;
    });
    const avgMargin = allOffers.length > 0 ? (totalMargin / allOffers.length).toFixed(2) : '0.00';

    res.status(200).json({
      success: true,
      stats: { totalPlans, activePlans, outOfStockPlans, avgMargin },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/digimall/networks
 * Returns distinct DigiMall networks from synced offers.
 */
exports.getNetworks = async (req, res) => {
  try {
    const rows = await DigimallOffer.aggregate([
      { $group: { _id: '$isp', name: { $first: '$isp' } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      networks: rows.map((r) => ({ networkId: r._id, name: r.name })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/digimall/:id/prices
 */
exports.updatePrices = async (req, res) => {
  try {
    const { costPrice, sellingPrice, agentPrice, vendorPrice } = req.body;
    const offer = await DigimallOffer.findById(req.params.id);

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
    res.status(200).json({
      success: true,
      message: hasAnyConfiguredPrice(offer)
        ? 'Prices updated'
        : 'Prices cleared. Offer has been deactivated until a valid price is set.',
      plan: offer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/digimall/:id/toggle-status
 */
exports.toggleStatus = async (req, res) => {
  try {
    const offer = await DigimallOffer.findById(req.params.id);
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
    res.status(200).json({ success: true, message: `Offer ${offer.status}`, plan: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/digimall/offers/stock
 * Single or bulk admin stock override.
 * Body: { ids?: string[], inStock: boolean, resetOverride?: boolean }
 */
exports.updateStock = async (req, res) => {
  try {
    const { ids, inStock, resetOverride } = req.body || {};
    const filter = Array.isArray(ids) && ids.length > 0 ? { _id: { $in: ids } } : {};

    if (resetOverride) {
      await DigimallOffer.updateMany(filter, { $set: { stockOverriddenByAdmin: false } });
    } else {
      await DigimallOffer.updateMany(filter, { inStock: Boolean(inStock), stockOverriddenByAdmin: true });
    }

    const updated = await DigimallOffer.countDocuments(filter);
    res.json({
      success: true,
      message: resetOverride ? 'Override cleared' : `Stock set to ${inStock}`,
      updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/digimall/offers
 * Bulk delete.
 */
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body || {};
    let result;
    if (Array.isArray(ids) && ids.length > 0) {
      result = await DigimallOffer.deleteMany({ _id: { $in: ids } });
    } else {
      result = await DigimallOffer.deleteMany({});
    }
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/digimall/:id
 */
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await DigimallOffer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.status(200).json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/digimall/wallet
 * DigiMall wallet balance for admin settings panel
 */
exports.getWalletSettings = async (req, res) => {
  try {
    const balanceResult = await digimallApi.getWalletBalance();
    const now = new Date();

    res.status(200).json({
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
    res.status(200).json({
      success: true,
      data: { lastSync: new Date(), balance: 0, syncStatus: 'Error', error: error.message },
    });
  }
};
