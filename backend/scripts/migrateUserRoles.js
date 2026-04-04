require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function migrateUserRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersWithoutRole = await User.find({ role: { $exists: false } });
    
    console.log(`\nFound ${usersWithoutRole.length} users without role field`);

    if (usersWithoutRole.length === 0) {
      console.log('All users already have role field!');
      process.exit(0);
    }

    const result = await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );

    console.log(`\n✓ Migration completed!`);
    console.log(`  Updated: ${result.modifiedCount} users`);
    console.log(`  Matched: ${result.matchedCount} documents`);

    const usersWithRole = await User.find().select('name email role');
    console.log(`\nTotal users in database: ${usersWithRole.length}`);
    
    const adminCount = usersWithRole.filter(u => u.role === 'admin').length;
    const userCount = usersWithRole.filter(u => u.role === 'user').length;
    
    console.log(`  Admins: ${adminCount}`);
    console.log(`  Regular Users: ${userCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
}

migrateUserRoles();
