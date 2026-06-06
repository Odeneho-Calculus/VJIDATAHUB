require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/deleteUser.js <email>');
  process.exit(1);
}

async function deleteUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await User.deleteOne({ email: email.toLowerCase() });
    
    if (result.deletedCount === 0) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✓ Successfully deleted user ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteUser();
