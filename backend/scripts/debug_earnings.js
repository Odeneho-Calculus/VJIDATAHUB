const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Order = require('../src/models/Order');
const User = require('../src/models/User');
const AgentCommissionPayout = require('../src/models/AgentCommissionPayout');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const agent = await User.findOne({ role: 'agent' });
        if (!agent) {
            console.log('RESULT: NO_AGENT_FOUND');
            process.exit(0);
        }

        console.log(`---BEGIN_DEBUG_RESULT---`);
        console.log(`Agent: ${agent.email} (${agent._id})`);

        const payouts = await AgentCommissionPayout.find({ agentId: agent._id });
        console.log(`Payouts found: ${payouts.length}`);
        payouts.forEach(p => {
            console.log(` - Payout ${p._id}: status=${p.status}, amount=${p.amount}, createdAt=${p.createdAt}`);
        });

        // Search for ANY order where agentCommission is exactly 2 (the payout amount)
        const ordersWith2 = await Order.find({ agentCommission: 2 });
        console.log(`\nOrders with agentCommission === 2: ${ordersWith2.length}`);
        ordersWith2.forEach(o => {
            console.log(` - Order ${o.orderNumber}: userId=${o.userId}, status=${o.status}, source=${o.source}`);
        });

        // Search for ANY order for this agent, regardless of commission
        const agentOrders = await Order.find({ userId: agent._id });
        console.log(`\nAll orders for this Agent: ${agentOrders.length}`);
        agentOrders.forEach(o => {
            console.log(` - Order ${o.orderNumber}: status=${o.status}, source=${o.source}, commission=${o.agentCommission}`);
        });

        // Search for orders with ANY commission > 0
        const anyCommission = await Order.find({ agentCommission: { $gt: 0 } });
        console.log(`\nOrders with ANY commission > 0: ${anyCommission.length}`);

        // Check the field types
        const oneOrder = await Order.findOne({}).sort({ createdAt: -1 });
        if (oneOrder) {
            console.log(`\nSample order fields keys: ${Object.keys(oneOrder.toObject()).join(', ')}`);
            console.log(`agentCommission value: ${oneOrder.agentCommission} (type: ${typeof oneOrder.agentCommission})`);
        }

        console.log(`---END_DEBUG_RESULT---`);

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

debug();
