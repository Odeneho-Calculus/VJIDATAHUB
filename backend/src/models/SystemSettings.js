const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    vtuProvider: {
      type: String,
      enum: ['topza', 'skdataplug'],
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
    topzaNetworkCatalog: [
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
    skdataplugNetworkCatalog: [
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
    pricingDefaults: {
      userMarkupPercent: {
        type: Number,
        default: 15,
        min: 0,
      },
      agentMarkupPercent: {
        type: Number,
        default: 10,
        min: 0,
      },
      vendorMarkupPercent: {
        type: Number,
        default: 5,
        min: 0,
      },
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
      afaSalesLocked: {
        type: Boolean,
        default: false,
      },
      autonomousPaystackVerification: {
        enabled: {
          type: Boolean,
          default: false,
        },
        intervalMinutes: {
          type: Number,
          default: 2,
          min: 1,
          max: 60,
        },
        minAgeMinutes: {
          type: Number,
          default: 5,
          min: 1,
        },
        lastRunAt: {
          type: Date,
          default: null,
        },
        lastRunStats: {
          transactionsProcessed: { type: Number, default: 0 },
          ordersProcessed: { type: Number, default: 0 },
          duplicateRefsSkipped: { type: Number, default: 0 },
          skippedTooNew: { type: Number, default: 0 },
          skippedMissingReference: { type: Number, default: 0 },
          skippedDuplicateReference: { type: Number, default: 0 },
          status: { type: String, default: 'idle' },
        },
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
  if (!['topza', 'skdataplug'].includes(settings.vtuProvider)) {
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
  if (typeof settings.orderSettings.afaSalesLocked !== 'boolean') {
    settings.orderSettings.afaSalesLocked = false;
  }
  if (!settings.orderSettings.autonomousPaystackVerification) {
    settings.orderSettings.autonomousPaystackVerification = {};
  }
  const autoVerify = settings.orderSettings.autonomousPaystackVerification;
  if (typeof autoVerify.enabled !== 'boolean') autoVerify.enabled = false;
  const autoVerifyInterval = Number(autoVerify.intervalMinutes);
  if (Number.isNaN(autoVerifyInterval) || autoVerifyInterval < 1 || autoVerifyInterval > 60) {
    autoVerify.intervalMinutes = 2;
  }
  const minAge = Number(autoVerify.minAgeMinutes);
  if (Number.isNaN(minAge) || minAge < 1) {
    autoVerify.minAgeMinutes = 5;
  }
  if (!autoVerify.lastRunStats || typeof autoVerify.lastRunStats !== 'object') {
    autoVerify.lastRunStats = {
      transactionsProcessed: 0,
      ordersProcessed: 0,
      duplicateRefsSkipped: 0,
      skippedTooNew: 0,
      skippedMissingReference: 0,
      skippedDuplicateReference: 0,
      status: 'idle',
    };
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
