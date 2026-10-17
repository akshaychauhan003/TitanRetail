require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { seedDatabase } = require('./utils/seedData');

const PORT = process.env.PORT || 48291;

async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('   TITAN RETAIL INVENTORY & SALES SYSTEM (API)      ');
    console.log('----------------------------------------------------');

    // Connect to database
    await connectDB();

    // Seed default admin, staff and catalog if database is empty
    await seedDatabase();

    const server = app.listen(PORT, () => {
      console.log(`[Server] API running on http://localhost:${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is currently in use. Please wait a moment or free the port.`);
      } else {
        console.error(`[Server] Server error:`, err);
      }
    });

    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Closed all connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
