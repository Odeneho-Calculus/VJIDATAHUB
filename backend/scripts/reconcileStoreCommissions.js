const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const connectDB = require('../src/config/database');
const Order = require('../src/models/Order');
const { creditCommissionForOrder } = require('../src/services/commissionService');

const run = async () => {
  try {
    await connectDB();

    const orders = await Order.find({
      source: 'store',
      paymentStatus: 'completed',
      commissionStatus: { $ne: 'earned' },
    }).sort({ createdAt: 1 });

    let credited = 0;
    let skipped = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const result = await creditCommissionForOrder(order);
        if (result.credited) {
          credited += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(`Failed order ${order.orderNumber}: ${error.message}`);
      }
    }

    console.log(`Processed ${orders.length} orders`);
    console.log(`Credited: ${credited}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Reconciliation failed:', error);
    process.exit(1);
  }
};

run();
