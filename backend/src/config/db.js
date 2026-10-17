const mongoose = require('mongoose');

let mongodInstance = null;

/**
 * Connect to MongoDB with graceful fallback to MongoMemoryServer
 * Ensures application runs immediately without requiring external MongoDB setup.
 */
async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL;

  if (uri) {
    try {
      console.log(`[DB] Attempting connection to configured MONGODB_URI...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`[DB] Connected successfully to MongoDB at ${uri.split('@').pop()}`);
      return;
    } catch (err) {
      console.warn(`[DB] Could not connect to configured MONGODB_URI (${err.message}). Falling back to MongoMemoryServer...`);
    }
  }

  // Fallback to in-process MongoMemoryServer
  try {
    process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
    const { MongoMemoryServer } = require('mongodb-memory-server');
    console.log(`[DB] Starting embedded MongoMemoryServer instance...`);
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'retail_inventory',
        launchTimeout: 120000,
      },
    });
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[DB] Connected successfully to embedded MongoDB instance at ${memoryUri}`);
  } catch (err) {
    console.error(`[DB] Fatal error: Failed to start MongoDB connection:`, err);
    throw err;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('[DB] Disconnected from MongoDB');
  } catch (err) {
    console.error('[DB] Error disconnecting from MongoDB:', err);
  }
}

module.exports = { connectDB, disconnectDB };
