const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CommissionLedger = require('../src/models/CommissionLedger');
const SellerCommission = require('../src/models/SellerCommission');
const AgentCommissionPayout = require('../src/models/AgentCommissionPayout');
const Store = require('../src/models/Store');

async function restoreLedgers(previewOnly = true) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log(previewOnly ? '\n=== PREVIEW MODE (no changes will be made) ===' : '\n=== APPLYING CHANGES ===');

    const stores = await Store.find({}).select('_id owner').lean();
    console.log(`Found ${stores.length} stores to process\n`);

    let changedCount = 0;
    let unchangedCount = 0;
    let createdCount = 0;
    let totalGlobalEarned = 0;
    let totalGlobalWithdrawn = 0;
    let totalGlobalPending = 0;
    let totalGlobalCommissions = 0;

    for (const store of stores) {
      const storeId = store._id.toString();

      // Ground truth 1: All SellerCommission records for this store
      const commissions = await SellerCommission.find({ storeId: store._id }).lean();
      const totalCommissions = commissions.reduce((sum, c) => sum + (c.commissionEarned || 0), 0);
      const totalEarned = commissions
        .filter(c => c.status === 'earned')
        .reduce((sum, c) => sum + (c.commissionEarned || 0), 0);
      const totalPending = commissions
        .filter(c => c.status === 'pending_withdrawal')
        .reduce((sum, c) => sum + (c.commissionEarned || 0), 0);

      // Ground truth 2: All PAID AgentCommissionPayout records for this store
      const payouts = await AgentCommissionPayout.find({
        storeId: store._id,
        status: 'paid',
      }).lean();
      const totalWithdrawn = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Current ledger (if exists)
      const currentLedger = await CommissionLedger.findOne({ storeId: store._id }).lean();

      const needsCreate = !currentLedger && (totalCommissions > 0 || totalWithdrawn > 0);
      const needsUpdate = currentLedger && (
        Math.abs((currentLedger.totalCommissions || 0) - totalCommissions) > 0.01 ||
        Math.abs((currentLedger.totalEarned || 0) - totalEarned) > 0.01 ||
        Math.abs((currentLedger.totalPending || 0) - totalPending) > 0.01 ||
        Math.abs((currentLedger.totalWithdrawn || 0) - totalWithdrawn) > 0.01
      );

      if (needsCreate || needsUpdate) {
        changedCount++;
        console.log(`\nStore ${storeId} (${commissions.length} commissions, ${payouts.length} payouts):`);

        if (currentLedger) {
          console.log(`  totalCommissions: ${currentLedger.totalCommissions?.toFixed(2) || 0} -> ${totalCommissions.toFixed(2)}`);
          console.log(`  totalEarned:      ${currentLedger.totalEarned?.toFixed(2) || 0} -> ${totalEarned.toFixed(2)}`);
          console.log(`  totalPending:     ${currentLedger.totalPending?.toFixed(2) || 0} -> ${totalPending.toFixed(2)}`);
          console.log(`  totalWithdrawn:   ${currentLedger.totalWithdrawn?.toFixed(2) || 0} -> ${totalWithdrawn.toFixed(2)}`);
        } else {
          console.log(`  [NEW LEDGER] totalCommissions: ${totalCommissions.toFixed(2)}, totalEarned: ${totalEarned.toFixed(2)}, totalPending: ${totalPending.toFixed(2)}, totalWithdrawn: ${totalWithdrawn.toFixed(2)}`);
        }

        if (!previewOnly) {
          await CommissionLedger.findOneAndUpdate(
            { storeId: store._id },
            {
              storeOwnerId: store.owner,
              totalCommissions,
              totalEarned,
              totalPending,
              totalWithdrawn,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          console.log('  [APPLIED]');
        }
      } else {
        unchangedCount++;
      }

      totalGlobalCommissions += totalCommissions;
      totalGlobalEarned += totalEarned;
      totalGlobalPending += totalPending;
      totalGlobalWithdrawn += totalWithdrawn;
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Stores processed: ${stores.length}`);
    console.log(`Ledgers changed: ${changedCount}`);
    console.log(`Ledgers unchanged: ${unchangedCount}`);
    if (previewOnly) {
      console.log(`Ledgers to be created: ${changedCount - (await CommissionLedger.countDocuments())}`);
    }
    console.log(`\nGlobal totals after restore:`);
    console.log(`  Total Commissions (lifetime): GHS ${totalGlobalCommissions.toFixed(2)}`);
    console.log(`  Total Available (earned):     GHS ${totalGlobalEarned.toFixed(2)}`);
    console.log(`  Total Pending:                GHS ${totalGlobalPending.toFixed(2)}`);
    console.log(`  Total Withdrawn:              GHS ${totalGlobalWithdrawn.toFixed(2)}`);

    await mongoose.disconnect();
    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

// Run in preview mode by default, pass --apply to execute
const previewOnly = !process.argv.includes('--apply');
restoreLedgers(previewOnly);
