const mongoose = require('mongoose');

const sellerCommissionSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    storeOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    adminPlanPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellerPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionEarned: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['earned', 'pending_withdrawal', 'withdrawn', 'reversed'],
      default: 'earned',
      index: true,
    },
    withdrawalAllocatedAmount: { type: Number, default: null, min: 0 },
    refundReversedAmount: { type: Number, default: 0, min: 0 },
    refundRecoveredAmount: { type: Number, default: 0, min: 0 },
    refundSettled: { type: Boolean, default: false },
    withdrawalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentCommissionPayout',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

sellerCommissionSchema.index({ storeOwnerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SellerCommission', sellerCommissionSchema);
