const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.isGuest;
      },
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['data_purchase', 'checker_purchase', 'wallet_funding', 'refund', 'wallet_topup', 'purchase_refund', 'referral_bonus', 'admin_adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    baseAmount: {
      type: Number,
      default: 0,
    },
    transactionCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'GHS',
    },
    reference: {
      type: String,
      unique: true,
      required: true,
    },
    paystackReference: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['successful', 'pending', 'failed', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    description: String,
    isAPI: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ isAPI: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
