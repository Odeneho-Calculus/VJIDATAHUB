require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = 'vjidatahub@gmail.com';
const password = 'vji@datahub59#3';

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log('User found:', user.email);
    console.log('Stored hashed password:', user.password);
    
    console.log('Testing login with password:', password);
    console.log('Password length:', password.length);
    
    const isMatch = await user.matchPassword(password);
    if (isMatch) {
      console.log('✓ Password matches!');
    } else {
      console.log('✗ Password mismatch!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testLogin();
