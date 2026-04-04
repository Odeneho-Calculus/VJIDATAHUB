const cron = require('node-cron');
const xpresDataApi = require('../utils/xpresDataApi');
const digimallApi = require('../utils/digimallApi');
const topzaApi = require('../utils/topzaApi');
const { createNotification } = require('../controllers/notificationController');

let isChecking = false;
let lastNotificationTime = null;

const checkProviderBalance = async () => {
    try {
        if (isChecking) return;
        isChecking = true;

        const SystemSettings = require('../models/SystemSettings');
        const settings = await SystemSettings.getSettings();
        const activeProvider = settings.vtuProvider || 'topza';

        let activeApi = xpresDataApi;
        let providerLabel = 'XpresData';
        if (activeProvider === 'digimall') {
            activeApi = digimallApi;
            providerLabel = 'DigiMall';
        } else if (activeProvider === 'topza') {
            activeApi = topzaApi;
            providerLabel = 'Topza';
        }

        const result = await activeApi.getWalletBalance();

        if (!result.success) {
            console.warn(`[Provider Balance] Failed to fetch ${providerLabel} balance:`, result.error);
            isChecking = false;
            return;
        }

        // Skip notification if it's a placeholder (provider doesn't support balance API)
        if (result.isPlaceholder) {
            isChecking = false;
            return;
        }

        const balance = result.balance || 0;
        const threshold = parseFloat(process.env.LOW_BALANCE_THRESHOLD || 10);

        if (balance < threshold) {
            const now = new Date();
            const timeSinceLastNotification = lastNotificationTime
                ? now - lastNotificationTime
                : Infinity;

            const notificationInterval = 60 * 60 * 1000; // 1 hour cooldown

            if (timeSinceLastNotification >= notificationInterval) {
                const notificationResult = await createNotification({
                    type: 'low_balance',
                    title: `Low ${providerLabel} Wallet Balance`,
                    message: `Your ${providerLabel} wallet balance is low (${balance.toFixed(2)} GHS)`,
                    description: `Current balance is below the threshold of ${threshold} GHS. Please top up your provider wallet to ensure uninterrupted service.`,
                    severity: 'warning',
                    data: {
                        balance,
                        threshold,
                        provider: activeProvider,
                        metadata: { timestamp: now, source: 'cron-job' },
                    },
                    actionUrl: '/admin/vtu-settings',
                });

                if (notificationResult.success) {
                    lastNotificationTime = now;
                    console.log(`[Provider Balance] Low balance notification sent for ${providerLabel}`);
                } else {
                    console.error('[Provider Balance] Failed to create notification:', notificationResult.error);
                }
            }
        }

        isChecking = false;
    } catch (error) {
        console.error('[Provider Balance] Error checking balance:', error.message);
        isChecking = false;
    }
};

const startProviderBalanceCheckJob = () => {
    const cronExpression = process.env.BALANCE_CHECK_CRON || '*/5 * * * *';
    const timezone = process.env.TZ || 'UTC';

    cron.schedule(cronExpression, async () => {
        try {
            await checkProviderBalance();
        } catch (error) {
            console.error('[Provider Balance] Cron job error:', error.message);
        }
    }, { timezone });

    console.log(`[Provider Balance] Balance check job started (${cronExpression})`);
};

module.exports = {
    checkProviderBalance,
    startProviderBalanceCheckJob,
};
