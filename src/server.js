const { env, validateEnv } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { ensureIndexes } = require('./config/indexes');
const app = require('./app');

const startServer = async () => {
  try {
    // Validate environment variables
    validateEnv();
    console.log('✅ Environment variables validated');

    // Connect to MongoDB
    await connectDatabase();

    // Create database indexes for optimal query performance
    await ensureIndexes();

    // Start Express server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
