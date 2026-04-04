const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Order = require('./backend/src/models/Order');
const User = require('./backend/src/models/User');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const agent = await User.findOne({ role: 'agent' });
        if (!agent) {
            console.log('No agent found');
            process.exit(0);
        }
        console.log(`Checking orders for agent: ${agent.email} (${agent._id})`);

        const orders = await Order.find({ userId: agent._id });
        console.log(`Total orders for this agent: ${orders.length}`);

        if (orders.length > 0) {
            orders.forEach(o => {
                console.log(`Order ${o.orderNumber}: status=${o.status}, source=${o.source}, amount=${o.amount}, commission=${o.agentCommission}`);
            });
        }

        const storeOrders = await Order.find({ source: 'store', userId: agent._id });
        console.log(`Store orders: ${storeOrders.length}`);

        const completedStoreOrders = await Order.find({ source: 'store', userId: agent._id, status: 'completed' });
        console.log(`Completed store orders: ${completedStoreOrders.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
