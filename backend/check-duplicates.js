const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const duplicatePhones = await User.aggregate([
      { $match: { phone: { $ne: null } } },
      { $group: { _id: "$phone", count: { $sum: 1 }, users: { $push: { email: "$email", id: "$_id" } } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicatePhones.length > 0) {
      console.log('Found duplicate phone numbers:');
      console.log(JSON.stringify(duplicatePhones, null, 2));
    } else {
      console.log('No duplicate phone numbers found.');
    }

    const duplicateEmails = await User.aggregate([
      { $group: { _id: "$email", count: { $sum: 1 }, users: { $push: { phone: "$phone", id: "$_id" } } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicateEmails.length > 0) {
      console.log('Found duplicate emails:');
      console.log(JSON.stringify(duplicateEmails, null, 2));
    } else {
      console.log('No duplicate emails found.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
