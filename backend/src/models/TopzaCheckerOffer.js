const mongoose = require('mongoose');

const topzaCheckerOfferSchema = new mongoose.Schema(
  {
    checkerType: {
      type: String,
      required: true,
      unique: true,
      enum: ['WAEC', 'NECO', 'JAMB', 'BECE'],
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'secondary',
    },
    icon: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    agentPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendorPrice: {
      type: Number,
      default: 0,
      min: 0,
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
    available: {
      type: Boolean,
      default: false,
    },
    stockCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    rawProviderData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TopzaCheckerOffer', topzaCheckerOfferSchema);
