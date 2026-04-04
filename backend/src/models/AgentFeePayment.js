const mongoose = require('mongoose');

const agentFeePaymentSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'protocol'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paystackResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient lookups
agentFeePaymentSchema.index({ agentId: 1, storeId: 1 });
agentFeePaymentSchema.index({ status: 1 });

module.exports = mongoose.model('AgentFeePayment', agentFeePaymentSchema);
