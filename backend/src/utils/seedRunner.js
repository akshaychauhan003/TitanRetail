require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const { seedDatabase } = require('./seedData');

async function run() {
  try {
    await connectDB();
    await seedDatabase();
    console.log('[SeedRunner] Seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error('[SeedRunner] Seeding failed:', err);
    process.exit(1);
  }
}

run();
