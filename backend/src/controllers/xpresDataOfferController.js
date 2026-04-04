const XpresDataOffer = require('../models/XpresDataOffer');
const SystemSettings = require('../models/SystemSettings');
const xpresDataApi = require('../utils/xpresDataApi');
const { hasAnyConfiguredPrice, toPriceNumber } = require('../utils/planPricing');

exports.syncOffers = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const isXpresActiveProvider = (settings?.vtuProvider || 'topza') === 'xpresdata';
    const plans = await xpresDataApi.fetchAllDataPlans();
    
    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch valid offers from XpresData API',
      });
    }

    let synced = 0;
    let updated = 0;
    const syncTime = new Date();

    for (const offer of plans) {
      const volumes = offer.volumes || [];
      const baseName = offer.name || offer.offerSlug || 'Unknown Offer';
      
      for (const volume of volumes) {
        const existingOffer = await XpresDataOffer.findOne({
          offerSlug: offer.offerSlug,
          volume: volume
        });

        if (existingOffer) {
          existingOffer.name = `${baseName} (${volume}GB)`;
          existingOffer.offerName = baseName;
          existingOffer.isp = offer.isp || 'Unknown';
          existingOffer.type = offer.type || 'Data';
          existingOffer.description = offer.description || '';
          existingOffer.validity = offer.validity || '30 Days';
          existingOffer.inStock = true;
          // XpresData API does not provide pricing, so synced plans should not be purchasable by default.
          if (isXpresActiveProvider || !hasAnyConfiguredPrice(existingOffer)) {
            existingOffer.status = 'inactive';
          }
          existingOffer.lastSyncedAt = syncTime;
          await existingOffer.save();
          updated++;
        } else {
          await XpresDataOffer.create({
            name: `${baseName} (${volume}GB)`,
            offerName: baseName,
            isp: offer.isp || 'Unknown',
            type: offer.type || 'Data',
            description: offer.description || '',
            offerSlug: offer.offerSlug,
            volume: volume,
            validity: offer.validity || '30 Days',
            costPrice: 0,
            sellingPrice: 0,
            agentPrice: 0,
            vendorPrice: 0,
            status: isXpresActiveProvider ? 'inactive' : 'active',
            lastSyncedAt: syncTime,
          });
          synced++;
        }
      }
    }

    // Mark offers not found in this sync as out of stock
    await XpresDataOffer.updateMany(
      { lastSyncedAt: { $lt: syncTime } },
      { inStock: false }
    );

    res.status(200).json({
      success: true,
      message: 'Xpresdata offers synced successfully',
      stats: { synced, updated, total: synced + updated },
      defaults: {
        status: isXpresActiveProvider ? 'inactive' : 'active',
        reason: isXpresActiveProvider
          ? 'XpresData is active VTU and pricing is not provided by API'
          : 'XpresData is not the active VTU provider',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const { network, status, type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {};
    if (network && network !== 'all') query.isp = network;
    if (status) query.status = status;
    if (type && type !== 'all') query.type = type;

    const total = await XpresDataOffer.countDocuments(query);
    const offers = await XpresDataOffer.find(query)
      .sort({ isp: 1, volume: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.status(200).json({
      success: true,
      plans: offers, // Keeping field name 'plans' for frontend compatibility if needed
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

exports.updateOfferPrices = async (req, res) => {
  try {
    const { sellingPrice, agentPrice, vendorPrice } = req.body;
    const offer = await XpresDataOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (sellingPrice !== undefined) offer.sellingPrice = toPriceNumber(sellingPrice);
    if (agentPrice !== undefined) offer.agentPrice = toPriceNumber(agentPrice);
    if (vendorPrice !== undefined) offer.vendorPrice = toPriceNumber(vendorPrice);

    if (!hasAnyConfiguredPrice(offer)) {
      offer.status = 'inactive';
    }

    await offer.save();

    res.status(200).json({
      success: true,
      message: hasAnyConfiguredPrice(offer)
        ? 'Offer prices updated successfully'
        : 'Offer prices cleared. Plan has been deactivated until a valid price is set.',
      plan: offer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleOfferStatus = async (req, res) => {
  try {
    const offer = await XpresDataOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    if (offer.status !== 'active' && !hasAnyConfiguredPrice(offer)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate an offer without a valid selling, agent, or vendor price.',
      });
    }

    offer.status = offer.status === 'active' ? 'inactive' : 'active';
    await offer.save();

    res.status(200).json({
      success: true,
      message: `Offer ${offer.status} successfully`,
      plan: offer,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await XpresDataOffer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.status(200).json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOfferStats = async (req, res) => {
  try {
    const { network } = req.query;
    const query = {};
    if (network && network !== 'all') query.isp = network;

    const totalPlans = await XpresDataOffer.countDocuments(query);
    const activePlans = await XpresDataOffer.countDocuments({ ...query, status: 'active' });
    const outOfStockPlans = await XpresDataOffer.countDocuments({ ...query, inStock: false });

    // Since we don't have costPrice from API, avgMargin might not be very meaningful 
    // unless we use some baseline or just return 0 for now as requested.
    
    res.status(200).json({
      success: true,
      stats: { totalPlans, activePlans, outOfStockPlans, avgMargin: 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
