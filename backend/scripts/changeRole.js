require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];
const newRole = process.argv[3];

if (!email || !newRole) {
  console.error('Usage: node scripts/changeRole.js <email> <role>');
  console.error('Roles: user, admin');
  process.exit(1);
}

if (!['user', 'admin'].includes(newRole)) {
  console.error('Invalid role. Must be "user" or "admin"');
  process.exit(1);
}

async function changeRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOneAndUpdate(
      { email },
      { role: newRole },
      { new: true }
    );

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✓ Successfully updated ${user.name} (${email}) role to ${newRole}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

changeRole();
