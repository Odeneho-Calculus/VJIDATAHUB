require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const users = await User.find().select('name email role isActive createdAt').sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('No users found');
      process.exit(0);
    }

    console.log('\n=== Users List ===\n');
    users.forEach((user, index) => {
      const status = user.isActive ? '✓' : '✗';
      const roleDisplay = user.role === 'admin' ? '👑 ADMIN' : 'user';
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${roleDisplay}`);
      console.log(`   Status: ${status} ${user.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log('');
    });

    console.log(`Total Users: ${users.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listUsers();
