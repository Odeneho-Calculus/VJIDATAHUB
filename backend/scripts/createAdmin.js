require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];
let password = process.argv[3];
const phone = process.argv[4];
const name = process.argv.slice(5).join(' ');

if (password && password.startsWith('"') && password.endsWith('"')) {
  password = password.slice(1, -1);
}

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

    console.log('Attempting to create admin with email:', email);
    console.log('Password length:', password.length);
    console.log('Password starts with:', password.substring(0, 3));
    console.log('Password Hex:', Buffer.from(password).toString('hex'));
    
    const admin = new User({
      email,
      password,
      name,
      phone,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });

    await admin.save();

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
