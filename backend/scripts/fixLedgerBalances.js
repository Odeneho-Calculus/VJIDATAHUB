const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CommissionLedger = require('../src/models/CommissionLedger');
const AgentCommissionPayout = require('../src/models/AgentCommissionPayout');
const SellerCommission = require('../src/models/SellerCommission');

async function fixLedgers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const ledgers = await CommissionLedger.find({}).lean();
    console.log(`Found ${ledgers.length} commission ledgers to check`);

    let fixedCount = 0;

    for (const ledger of ledgers) {
      const storeId = ledger.storeId;

      // Get all payouts for this store
      const payouts = await AgentCommissionPayout.find({ storeId }).lean();

      const paidPayouts = payouts.filter(p => p.status === 'paid');
      const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'processing');
      const rejectedPayouts = payouts.filter(p => p.status === 'rejected');

      const correctTotalWithdrawn = paidPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const correctTotalPending = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

      // totalEarned should be: totalCommissions - totalWithdrawn - totalPending
      // (assuming totalCommissions is the lifetime total earned)
      const correctTotalEarned = Math.max(0, (ledger.totalCommissions || 0) - correctTotalWithdrawn - correctTotalPending);

      const needsFix =
        Math.abs((ledger.totalWithdrawn || 0) - correctTotalWithdrawn) > 0.01 ||
        Math.abs((ledger.totalPending || 0) - correctTotalPending) > 0.01 ||
        Math.abs((ledger.totalEarned || 0) - correctTotalEarned) > 0.01;

      if (needsFix) {
        console.log(`\nFixing ledger for store ${storeId}:`);
        console.log(`  totalEarned:   ${ledger.totalEarned} -> ${correctTotalEarned}`);
        console.log(`  totalPending:  ${ledger.totalPending} -> ${correctTotalPending}`);
        console.log(`  totalWithdrawn:${ledger.totalWithdrawn} -> ${correctTotalWithdrawn}`);
        console.log(`  Paid payouts: ${paidPayouts.length}, Pending: ${pendingPayouts.length}, Rejected: ${rejectedPayouts.length}`);

        await CommissionLedger.updateOne(
          { _id: ledger._id },
          {
            $set: {
              totalEarned: correctTotalEarned,
              totalPending: correctTotalPending,
              totalWithdrawn: correctTotalWithdrawn,
            },
          }
        );

        // Also fix SellerCommission statuses for paid payouts
        for (const payout of paidPayouts) {
          const result = await SellerCommission.updateMany(
            { withdrawalRequestId: payout._id, status: 'pending_withdrawal' },
            { $set: { status: 'withdrawn' } }
          );
          if (result.modifiedCount > 0) {
            console.log(`  Fixed ${result.modifiedCount} commission rows for paid payout ${payout._id}`);
          }
        }

        // Also fix SellerCommission statuses for rejected payouts
        for (const payout of rejectedPayouts) {
          const result = await SellerCommission.updateMany(
            { withdrawalRequestId: payout._id, status: 'pending_withdrawal' },
            { $set: { status: 'earned', withdrawalRequestId: null } }
          );
          if (result.modifiedCount > 0) {
            console.log(`  Fixed ${result.modifiedCount} commission rows for rejected payout ${payout._id}`);
          }
        }

        fixedCount++;
      }
    }

    console.log(`\nFixed ${fixedCount} ledgers`);

    // Show final totals
    const finalResult = await CommissionLedger.aggregate([
      {
        $group: {
          _id: null,
          availableBalance: { $sum: '$totalEarned' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          totalPending: { $sum: '$totalPending' },
          totalCommissions: { $sum: '$totalCommissions' },
        },
      },
    ]);

    const final = finalResult[0] || {};
    console.log('\nFinal dashboard totals:');
    console.log(`  Agent Earnings:   GHS ${final.totalCommissions || 0}`);
    console.log(`  Agent Withdrawn:  GHS ${final.totalWithdrawn || 0}`);
    console.log(`  Agent Pending:    GHS ${final.totalPending || 0}`);
    console.log(`  Agent Balance:    GHS ${final.availableBalance || 0}`);

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

fixLedgers();
