const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    vtuProvider: {
      type: String,
      enum: ['xpresdata', 'digimall', 'topza'],
      default: 'topza',
    },
    recruitNewAgents: {
      type: Boolean,
      default: true,
    },
    agentFeeSettings: {
      registrationFee: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    commissionSettings: {
      minWithdrawal: {
        type: Number,
        default: 5000,
        min: 0,
      },
      maxWithdrawal: {
        type: Number,
        default: 1000000,
        min: 0,
      },
      withdrawalFeeType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      withdrawalFeeValue: {
        type: Number,
        default: 100,
        min: 0,
      },
    },
    transactionCharges: {
      dataPurchaseChargeType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      dataPurchaseCharge: {
        type: Number,
        default: 0,
        min: 0,
      },
      walletFundingChargeType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      walletFundingCharge: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    networkCatalog: [
      {
        name: String,
        slug: String,
        logoUrl: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    contactDetails: {
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      whatsappGroup: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    orderSettings: {
      duplicateOrderCooldownMinutes: {
        type: Number,
        default: 10,
        min: 1,
      },
      statusUpdateMethod: {
        type: String,
        enum: ['webhook', 'cron'],
        default: 'cron',
      },
      statusSyncIntervalMinutes: {
        type: Number,
        default: 5,
        min: 1,
        max: 60,
      },
      statusSyncBatchLimit: {
        type: Number,
        default: 100,
        min: 1,
        max: 500,
      },
      checkerSalesLocked: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ vtuProvider: 'topza' });
  }
  // Migrate old values if needed
  if (!['xpresdata', 'digimall', 'topza'].includes(settings.vtuProvider)) {
    settings.vtuProvider = 'topza';
  }
  if (!settings.orderSettings) {
    settings.orderSettings = {};
  }
  if (!settings.transactionCharges) {
    settings.transactionCharges = {};
  }
  if (!['fixed', 'percentage'].includes(settings.transactionCharges.dataPurchaseChargeType)) {
    settings.transactionCharges.dataPurchaseChargeType = 'fixed';
  }
  const dataPurchaseCharge = Number(settings.transactionCharges.dataPurchaseCharge);
  if (Number.isNaN(dataPurchaseCharge) || dataPurchaseCharge < 0) {
    settings.transactionCharges.dataPurchaseCharge = 0;
  }
  if (!['fixed', 'percentage'].includes(settings.transactionCharges.walletFundingChargeType)) {
    settings.transactionCharges.walletFundingChargeType = 'fixed';
  }
  const walletFundingCharge = Number(settings.transactionCharges.walletFundingCharge);
  if (Number.isNaN(walletFundingCharge) || walletFundingCharge < 0) {
    settings.transactionCharges.walletFundingCharge = 0;
  }
  if (!['webhook', 'cron'].includes(settings.orderSettings.statusUpdateMethod)) {
    settings.orderSettings.statusUpdateMethod = 'cron';
  }
  const interval = Number(settings.orderSettings.statusSyncIntervalMinutes);
  if (Number.isNaN(interval) || interval < 1 || interval > 60) {
    settings.orderSettings.statusSyncIntervalMinutes = 5;
  }
  const batchLimit = Number(settings.orderSettings.statusSyncBatchLimit);
  if (Number.isNaN(batchLimit) || batchLimit < 1 || batchLimit > 500) {
    settings.orderSettings.statusSyncBatchLimit = 100;
  }
  if (typeof settings.orderSettings.checkerSalesLocked !== 'boolean') {
    settings.orderSettings.checkerSalesLocked = false;
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
