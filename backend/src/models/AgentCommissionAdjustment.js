const mongoose = require('mongoose');

const agentCommissionAdjustmentSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    beforeBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    afterBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

agentCommissionAdjustmentSchema.index({ storeId: 1, createdAt: -1 });

module.exports = mongoose.model('AgentCommissionAdjustment', agentCommissionAdjustmentSchema);
