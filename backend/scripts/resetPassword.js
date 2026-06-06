require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/resetPassword.js <email> <password>');
  process.exit(1);
}

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    user.password = password;
    user.isEmailVerified = true;
    await user.save();

    console.log(`✓ Successfully reset password for ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
