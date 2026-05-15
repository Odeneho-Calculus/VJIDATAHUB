const mongoose = require('mongoose');
require('dotenv').config();

const fixPhoneIndex = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('users');

    try {
      await collection.dropIndex('phone_1');
      console.log('Successfully dropped index: phone_1');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Index phone_1 not found, it might have been already dropped.');
      } else {
        console.error('Error dropping index phone_1:', err.message);
      }
    }

    // Create sparse index for phone field
    await collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
    console.log('Successfully created sparse unique index on phone field');

    // List all indexes to verify
    const indexes = await collection.indexes();
    console.log('Current indexes on users:', JSON.stringify(indexes, null, 2));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixPhoneIndex();