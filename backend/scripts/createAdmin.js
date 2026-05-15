require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];
const password = process.argv[3];
const phone = process.argv[4];
const name = process.argv.slice(5).join(' ');

if (!email || !password || !phone || !name.trim()) {
  console.error('Usage: node scripts/createAdmin.js <email> <password> <phone> <name>');
  console.error('Example: node scripts/createAdmin.js admin@example.com password123 1234567890 "Admin User"');
  process.exit(1);
}

if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
  console.error('Phone number must be exactly 10 digits');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters');
  process.exit(1);
}

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error(`User with email ${email} already exists`);
      process.exit(1);
    }

    const admin = await User.create({
      email,
      password,
      name,
      phone,
      role: 'admin',
      isActive: true,
    });

    console.log(`✓ Successfully created admin account`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Phone: ${admin.phone}`);
    console.log(`  Role: admin`);
    console.log(`\nYou can now login with these credentials`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
