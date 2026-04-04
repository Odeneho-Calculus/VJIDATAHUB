const mongoose = require('mongoose');

const topzaOfferSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    offerName: {
      type: String,
      default: null,
    },
    providerPlanId: {
      type: String,
      required: true,
      unique: true,
    },
    offerSlug: {
      type: String,
      default: null,
    },
    isp: {
      type: String,
      required: true,
    },
    volume: {
      type: String,
      default: '1',
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
      default: 'inactive',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    stockOverriddenByAdmin: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    rawProviderData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

topzaOfferSchema.index({ isp: 1, status: 1 });

module.exports = mongoose.model('TopzaOffer', topzaOfferSchema);