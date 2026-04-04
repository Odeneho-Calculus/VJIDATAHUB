const mongoose = require('mongoose');
require('dotenv').config();

const Store = require('../src/models/Store');
const SystemSettings = require('../src/models/SystemSettings');

const connectDb = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ag-grafix-data-hub';
  await mongoose.connect(mongoUri);
};

const run = async () => {
  const isApply = process.argv.includes('--apply');

  try {
    await connectDb();
    console.log('[cleanup-store-plans] Connected to MongoDB');

    const settings = await SystemSettings.getSettings();
    const activeProvider = settings.vtuProvider || 'xpresdata';
    const allowedPlanType = activeProvider === 'myzta' ? 'MyztaDataPlan' : 'XpresDataOffer';

    const stores = await Store.find({ 'plans.0': { $exists: true } }).select('name slug plans');

    let impactedStores = 0;
    let plansToRemove = 0;

    const updates = [];

    for (const store of stores) {
      const currentPlans = Array.isArray(store.plans) ? store.plans : [];
      const filteredPlans = currentPlans.filter((p) => p && p.planType === allowedPlanType);
      const removedCount = currentPlans.length - filteredPlans.length;

      if (removedCount > 0) {
        impactedStores += 1;
        plansToRemove += removedCount;

        updates.push({
          storeId: store._id,
          storeName: store.name,
          storeSlug: store.slug,
          before: currentPlans.length,
          after: filteredPlans.length,
          removed: removedCount,
          filteredPlans,
        });
      }
    }

    console.log(`[cleanup-store-plans] Active provider: ${activeProvider}`);
    console.log(`[cleanup-store-plans] Allowed plan type: ${allowedPlanType}`);
    console.log(`[cleanup-store-plans] Stores scanned: ${stores.length}`);
    console.log(`[cleanup-store-plans] Stores impacted: ${impactedStores}`);
    console.log(`[cleanup-store-plans] Plans to remove: ${plansToRemove}`);

    if (updates.length > 0) {
      console.log('[cleanup-store-plans] Sample impacted stores:');
      updates.slice(0, 10).forEach((u, idx) => {
        console.log(`  ${idx + 1}. ${u.storeName || '(no name)'} (${u.storeSlug || 'no-slug'}) -> remove ${u.removed}`);
      });
      if (updates.length > 10) {
        console.log(`  ...and ${updates.length - 10} more store(s)`);
      }
    }

    if (!isApply) {
      console.log('[cleanup-store-plans] Dry run complete. Re-run with --apply to persist changes.');
      await mongoose.disconnect();
      return;
    }

    for (const update of updates) {
      await Store.findByIdAndUpdate(update.storeId, { plans: update.filteredPlans });
    }

    console.log(`[cleanup-store-plans] Applied successfully. Updated ${updates.length} store(s).`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('[cleanup-store-plans] Failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors when original failure is more relevant.
    }
    process.exit(1);
  }
};

run();
