require('dotenv').config();
const dataBossHubApi = require('../src/utils/dataBossHubApi');
const xpresDataApi = require('../src/utils/xpresDataApi');

async function testProviders() {
    console.log('--- VTU Provider Connectivity Test ---');

    console.log('\n[1] Testing DataBossHub...');
    try {
        const dbhResult = await dataBossHubApi.getWalletBalance();
        if (dbhResult.success) {
            console.log('✅ DataBossHub Balance:', dbhResult.balance);
        } else {
            console.log('❌ DataBossHub Error:', dbhResult.error);
            console.log('Check console above for detailed error response if any.');
        }
    } catch (err) {
        console.error('Fatal DataBossHub test error:', err.message);
    }

    console.log('\n[2] Testing XpresData...');
    try {
        const xpresResult = await xpresDataApi.getWalletBalance();
        if (xpresResult.success) {
            console.log('✅ XpresData Status: Connected (Fetched offers/placeholder)');
            if (!xpresResult.isPlaceholder) {
                console.log('XpresData Balance:', xpresResult.balance);
            }
        } else {
            console.log('❌ XpresData Error:', xpresResult.error);
        }
    } catch (err) {
        console.error('Fatal XpresData test error:', err.message);
    }

    console.log('\n--- Test Completed ---');
    process.exit(0);
}

testProviders();
