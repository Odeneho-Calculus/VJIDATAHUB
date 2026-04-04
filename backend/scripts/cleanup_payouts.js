const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const AgentCommissionPayout = require('../src/models/AgentCommissionPayout');

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await AgentCommissionPayout.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} payout records.`);

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

cleanup();
