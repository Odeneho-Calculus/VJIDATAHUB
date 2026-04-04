const mongoose = require('mongoose');

const agentCommissionPayoutSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    withdrawalFeeType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    withdrawalFeeValue: {
      type: Number,
      default: 0,
    },
    withdrawalFeeAmount: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ['bank', 'mobile_money'],
      required: true,
    },
    details: {
      // For bank: accountNumber, bankCode, accountName
      // For mobile_money: phone, network
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'rejected'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      default: null,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paystackTransfer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient lookups
agentCommissionPayoutSchema.index({ agentId: 1 });
agentCommissionPayoutSchema.index({ status: 1 });
agentCommissionPayoutSchema.index({ storeId: 1 });

module.exports = mongoose.model('AgentCommissionPayout', agentCommissionPayoutSchema);
