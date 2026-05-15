const mongoose = require('mongoose');
require('dotenv').config();

const checkPhoneNull = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const User = require('../src/models/User');

    const nullPhoneUsers = await User.find({ phone: null });
    console.log(`Users with phone: null: ${nullPhoneUsers.length}`);

    if (nullPhoneUsers.length > 1) {
      console.log('Multiple users with null phone found. This is causing the duplicate key error.');
      console.log('Users:');
      nullPhoneUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} - ${user.email} - ${user.role}`);
      });
    } else {
      console.log('Only one or zero users with null phone. The issue might be elsewhere.');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkPhoneNull();