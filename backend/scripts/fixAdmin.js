require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

const email = 'vjidatahub@gmail.com';
const password = 'vji@datahub59#3';

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log('Fixing user:', user.email);
    
    // Manually hash to be absolutely sure
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update directly without triggering pre-save if possible, or just set password and save
    user.password = password; // This SHOULD trigger pre-save and hash it
    user.isEmailVerified = true;
    user.role = 'admin';
    user.status = 'active';
    await user.save();

    // Verify again
    const updatedUser = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const isMatch = await updatedUser.matchPassword(password);
    
    if (isMatch) {
      console.log('✓ Fix successful! Password now matches.');
    } else {
      console.log('✗ Fix failed! Password still mismatches.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixAdmin();
