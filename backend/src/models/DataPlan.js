const mongoose = require('mongoose');

const dataPlanSchema = new mongoose.Schema(
  {
    network: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    dataSize: {
      type: String,
      required: true,
    },
    dataAmountInMB: {
      type: Number,
      default: null,
    },
    validity: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: null,
    },
    apiPlanId: {
      type: String,
      required: true,
    },
    costPrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    agentPrice: {
      type: Number,
      default: null,
    },
    originalCostPrice: {
      type: Number,
      required: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    provider: {
      type: String,
      enum: ['xpresdata', 'digimall', 'topza'],
      default: 'xpresdata',
      required: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

dataPlanSchema.index({ network: 1, apiPlanId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('DataPlan', dataPlanSchema);
