const cron = require('node-cron');
const topzaApi = require('../utils/topzaApi');
const { createNotification } = require('../controllers/notificationController');

let isChecking = false;
let lastNotificationTime = null;

const checkProviderBalance = async () => {
    try {
        if (isChecking) return;
        isChecking = true;

        const result = await topzaApi.getWalletBalance();

        if (!result.success) {
            console.warn(`[Provider Balance] Failed to fetch Topza balance:`, result.error);
            isChecking = false;
            return;
        }

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
                    title: `Low Topza Wallet Balance`,
                    message: `Your Topza wallet balance is low (${balance.toFixed(2)} GHS)`,
                    description: `Current balance is below the threshold of ${threshold} GHS. Please top up your provider wallet to ensure uninterrupted service.`,
                    severity: 'warning',
                    data: {
                        balance,
                        threshold,
                        provider: 'topza',
                        metadata: { timestamp: now, source: 'cron-job' },
                    },
                    actionUrl: '/admin/vtu-settings',
                });

                if (notificationResult.success) {
                    lastNotificationTime = now;
                    console.log(`[Provider Balance] Low balance notification sent for Topza`);
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
