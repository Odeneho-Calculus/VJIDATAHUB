require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/verifyAdminEmail.js <email>');
  console.error('Example: node scripts/verifyAdminEmail.js vji@admin.com');
  process.exit(1);
}

async function verifyAdminEmail() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    if (user.isEmailVerified) {
      console.log(`Email ${email} is already verified`);
      process.exit(0);
    }

    user.isEmailVerified = true;
    await user.save();

    console.log(`✓ Successfully verified email for admin account`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Email Verified: ${user.isEmailVerified}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyAdminEmail();