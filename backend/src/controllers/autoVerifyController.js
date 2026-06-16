const SystemSettings = require('../models/SystemSettings');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const { autoVerifyPaystackPayments } = require('../jobs/autoVerifyPaystackPayments');

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const getVerificationConfig = (settings) => {
  const config = settings?.orderSettings?.autonomousPaystackVerification || {};
  return {
    enabled: Boolean(config.enabled),
    intervalMinutes: Number(config.intervalMinutes) || 2,
    minAgeMinutes: Number(config.minAgeMinutes) || 5,
    lastRunAt: config.lastRunAt || null,
    lastRunStats: config.lastRunStats || {
      transactionsProcessed: 0,
      ordersProcessed: 0,
      duplicateRefsSkipped: 0,
      skippedTooNew: 0,
      skippedMissingReference: 0,
      skippedDuplicateReference: 0,
      status: 'idle',
    },
  };
};

exports.getAutonomousVerificationSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const config = getVerificationConfig(settings);

    const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

    const [transactionCount, orderCount] = await Promise.all([
      Transaction.countDocuments({
        autoVerifiedAt: { $gte: since },
        autoVerifiedBy: 'system',
        paymentStatus: 'completed',
      }),
      Order.countDocuments({
        autoVerifiedAt: { $gte: since },
        autoVerifiedBy: 'system',
        paymentStatus: 'completed',
      }),
    ]);

    res.status(200).json({
      success: true,
      settings: config,
      stats24h: {
        transactions: transactionCount,
        orders: orderCount,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getAutonomousVerificationSettings error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateAutonomousVerificationSettings = async (req, res) => {
  try {
    const { enabled, intervalMinutes } = req.body;
    const settings = await SystemSettings.getSettings();

    if (!settings.orderSettings.autonomousPaystackVerification) {
      settings.orderSettings.autonomousPaystackVerification = {};
    }

    if (enabled !== undefined) {
      settings.orderSettings.autonomousPaystackVerification.enabled = Boolean(enabled);
    }

    if (intervalMinutes !== undefined) {
      const parsed = Number(intervalMinutes);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 60) {
        return res.status(400).json({
          success: false,
          message: 'Interval must be between 1 and 60 minutes',
        });
      }
      settings.orderSettings.autonomousPaystackVerification.intervalMinutes = parsed;
    }

    await settings.save();

    const config = getVerificationConfig(settings);

    res.status(200).json({
      success: true,
      message: 'Autonomous verification settings updated successfully',
      settings: config,
    });
  } catch (error) {
    console.error('updateAutonomousVerificationSettings error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.triggerAutonomousVerification = async (req, res) => {
  try {
    // Run in background; do not await the full job so the request responds quickly
    autoVerifyPaystackPayments().catch((error) => {
      console.error('[AutoVerify] Manual trigger error:', error);
    });

    res.status(200).json({
      success: true,
      message: 'Autonomous verification cycle triggered',
    });
  } catch (error) {
    console.error('triggerAutonomousVerification error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
