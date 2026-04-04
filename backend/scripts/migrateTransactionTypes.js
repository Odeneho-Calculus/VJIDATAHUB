require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const Transaction = require('../src/models/Transaction');

const typeMapping = {
  'wallet_topup': 'wallet_funding',
  'purchase_refund': 'refund',
  'referral_bonus': 'refund',
};

const statusMapping = {
  'completed': 'successful',
};

async function migrate() {
  try {
    await connectDB();
    console.log('Connected to database');

    console.log('Starting transaction type migration...');

    for (const [oldType, newType] of Object.entries(typeMapping)) {
      const result = await Transaction.updateMany(
        { type: oldType },
        { type: newType }
      );
      console.log(`✓ Migrated ${result.modifiedCount} transactions from "${oldType}" to "${newType}"`);
    }

    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const result = await Transaction.updateMany(
        { status: oldStatus },
        { status: newStatus }
      );
      console.log(`✓ Migrated ${result.modifiedCount} transactions status from "${oldStatus}" to "${newStatus}"`);
    }

    const totalTransactions = await Transaction.countDocuments();
    console.log(`\nMigration complete! Total transactions: ${totalTransactions}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
