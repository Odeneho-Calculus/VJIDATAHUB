const mongoose = require('mongoose');

/**
 * DigimallOffer - Stores synced offers from the DigiMall API.
 * Offers are fetched from GET /offers and orders placed via POST /order/:network.
 *
 * Key fields for order placement:
 *  - offerSlug  → sent as offerSlug in POST /order/:network
 *  - isp        → maps to the :network path parameter (via mapNetworkToSlug)
 *  - volume     → sent as volume in POST /order/:network
 */
const digimallOfferSchema = new mongoose.Schema(
  {
    // Display name e.g. "MTN Data Bundle (2GB)"
    name: {
      type: String,
      required: true,
    },
    // Short offer/bundle name without volume suffix
    offerName: {
      type: String,
    },
    // DigiMall offer slug — used as offerSlug in /order/:network
    offerSlug: {
      type: String,
      required: true,
      unique: true,
    },
    // Network / ISP (MTN, Telecel, AirtelTigo)
    isp: {
      type: String,
      required: true,
    },
    // Data volume in GB as string e.g. "2", "5"
    volume: {
      type: String,
      required: true,
    },
    validity: {
      type: String,
      default: '30 Days',
    },
    // Prices
    costPrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    agentPrice: {
      type: Number,
      default: 0,
    },
    vendorPrice: {
      type: Number,
      default: 0,
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    // Track last sync from DigiMall API
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    // Preserve manual price edits across syncs
    isEdited: {
      type: Boolean,
      default: false,
    },
    // If true, inStock was manually set by admin and sync will NOT overwrite it
    stockOverriddenByAdmin: {
      type: Boolean,
      default: false,
    },
    // Raw offer data from provider for reference / debugging
    rawProviderData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

digimallOfferSchema.index({ isp: 1, status: 1 });
digimallOfferSchema.index({ offerSlug: 1 }, { unique: true });

module.exports = mongoose.model('DigimallOffer', digimallOfferSchema);
