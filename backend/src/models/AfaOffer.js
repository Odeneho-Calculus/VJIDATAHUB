const mongoose = require('mongoose');

const afaOfferSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      default: 'AFA Registration',
      unique: true,
    },
    description: {
      type: String,
      default: 'Account For All Registration Service',
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
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AfaOffer', afaOfferSchema);
