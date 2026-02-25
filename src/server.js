const { env, validateEnv } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { ensureIndexes } = require('./config/indexes');
const app = require('./app');
const cacheService = require('./services/cacheService');

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', error.name, error.message);
  console.error('Stack:', error.stack);
  process.exit(1); // Exit immediately for uncaught exceptions
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  // Don't exit immediately for unhandled rejections in production
  // Log the error and continue - most are non-fatal
});

const startServer = async () => {
  try {
    // Validate environment variables
    validateEnv();
    console.log('✅ Environment variables validated');

    // Connect to MongoDB
    await connectDatabase();

    // Create database indexes for optimal query performance
    await ensureIndexes();

    // Warm up cache layer and report mode
    const redisClient = await cacheService.getRedisClient();
    if (redisClient) {
      console.log('🧠 Cache mode: Redis connected');
    } else {
      console.log('🧠 Cache mode: In-memory fallback');
    }

    // Start Express server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      console.log(`${signal} signal received: closing HTTP server`);
      server.close(() => {
        console.log('HTTP server closed');
        console.log('Closing database connection...');
        // mongoose.connection.close() is handled by database.js
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Handle Ctrl+C

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
