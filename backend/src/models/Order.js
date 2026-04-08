const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.isGuest;
      },
    },
    dataPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'planType',
    },
    planType: {
      type: String,
      enum: ['DataPlan', 'XpresDataOffer', 'DigimallOffer', 'TopzaOffer', 'TopzaCheckerOffer'],
      default: 'DataPlan',
    },
    apiPlanId: {
      type: String,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    network: {
      type: String,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    dataAmount: {
      type: String,
    },
    orderKind: {
      type: String,
      enum: ['data', 'checker'],
      default: 'data',
    },
    planName: {
      type: String,
    },
    checkerDetails: {
      checkerType: {
        type: String,
        default: null,
      },
      resultCheckerId: {
        type: String,
        default: null,
      },
      serialNumber: {
        type: String,
        default: null,
      },
      pin: {
        type: String,
        default: null,
      },
      skipSms: {
        type: Boolean,
        default: false,
      },
      smsNotificationSent: {
        type: Boolean,
        default: false,
      },
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
    paymentMethod: {
      type: String,
      enum: ['wallet', 'paystack', 'store'],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    provider: {
      type: String,
      enum: ['xpresdata', 'digimall', 'topza'],
      default: 'xpresdata',
    },
    externalOrderId: {
      type: String,
      default: null,
    },
    externalOrderNumber: {
      type: String,
      default: null,
    },
    transactionReference: {
      type: String,
      default: null,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    paystackReference: {
      type: String,
      default: null,
    },
    providerMessage: {
      type: String,
      default: null,
    },
    providerStatus: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: String,
      enum: ['admin', 'system'],
      default: null,
    },
    adminModified: {
      type: Boolean,
      default: false,
    },
    adminModifiedAt: {
      type: Date,
      default: null,
    },
    adminModifiedFields: [String],
    adminNotes: {
      type: String,
      default: null,
    },
    statusHistory: [
      {
        status: String,
        updatedAt: Date,
        source: String,
        notes: String,
      },
    ],
    syncAttempts: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['direct', 'store', 'api'],
      default: 'direct',
    },
    apiPartnerName: {
      type: String,
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestInfo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      default: null,
    },
    dataBundle: {
      dataPlanId: String,
      network: String,
      planName: String,
      dataAmount: String,
      amount: Number,
      phoneNumber: String,
    },
    autoCompletedAt: {
      type: Date,
      default: null,
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
    },
    adminBasePrice: {
      type: Number,
      default: null,
    },
    agentCommission: {
      type: Number,
      default: 0,
    },
    commissionStatus: {
      type: String,
      enum: ['none', 'calculated', 'earned', 'credited', 'withdrawn'],
      default: 'none',
      index: true,
    },
    isAfaRegistration: {
      type: Boolean,
      default: false,
    },
    orderCategory: {
      type: String,
      enum: ['normal', 'afa'],
      default: 'normal',
    },
    afaRegistration: {
      age: Number,
      idType: String,
      idNumber: String,
      state: String,
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ network: 1 });
orderSchema.index({ externalOrderId: 1 });
orderSchema.index({ externalOrderNumber: 1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ guestInfo: 1 });

module.exports = mongoose.model('Order', orderSchema);
