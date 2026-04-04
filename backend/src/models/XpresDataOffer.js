const mongoose = require('mongoose');

const xpresDataOfferSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    offerName: {
      type: String,
      required: true,
    },
    isp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    offerSlug: {
      type: String,
      required: true,
    },
    volume: {
      type: Number,
      required: true,
    },
    validity: {
      type: String,
      default: '30 Days',
    },
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
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique index for slug and volume
xpresDataOfferSchema.index({ offerSlug: 1, volume: 1 }, { unique: true });

module.exports = mongoose.model('XpresDataOffer', xpresDataOfferSchema);
