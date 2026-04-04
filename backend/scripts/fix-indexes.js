const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ag-grafix-data-hub';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('dataplans');
    
    try {
      await collection.dropIndex('network_1_apiPlanId_1');
      console.log('Successfully dropped index: network_1_apiPlanId_1');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Index network_1_apiPlanId_1 not found, it might have been already dropped.');
      } else {
        console.error('Error dropping index network_1_apiPlanId_1:', err.message);
      }
    }

    // List all indexes to be sure
    const indexes = await collection.indexes();
    console.log('Current indexes on dataplans:', JSON.stringify(indexes, null, 2));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixIndexes();
