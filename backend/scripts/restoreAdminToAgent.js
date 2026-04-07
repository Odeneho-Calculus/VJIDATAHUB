/**
 * restoreAdminToAgent.js
 * Downgrades kalculus Guy's account from 'admin' back to 'agent'.
 *
 * Usage:
 *   node scripts/restoreAdminToAgent.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const TARGET_EMAIL = 'kalculusguy@gmail.com';
const RESTORE_ROLE = 'agent';

// Protected admin accounts — these will NEVER be downgraded by this script
const PROTECTED_ADMINS = ['vjidatahub@admin.com'];

async function restore() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.');

    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.error(`No account found with email: ${TARGET_EMAIL}`);
      process.exit(1);
    }

    console.log(`Found: ${user.name} (${user.email}) — current role: ${user.role}`);

    if (PROTECTED_ADMINS.includes(user.email)) {
      console.log(`✗ "${user.email}" is a protected admin account and cannot be downgraded.`);
      process.exit(1);
    }

    if (user.role !== 'admin') {
      console.log(`Role is already "${user.role}", no change needed.`);
      process.exit(0);
    }

    user.role = RESTORE_ROLE;
    await user.save();

    console.log(`✓ Successfully restored ${user.name} (${TARGET_EMAIL}) from 'admin' to '${RESTORE_ROLE}'.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

restore();
