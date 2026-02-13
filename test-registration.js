/**
 * Test Registration with Email Verification
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const authController = require('./src/controllers/authController');
const { env } = require('./src/config/env');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

async function testRegistration() {
  console.log('\n========================================');
  console.log('   REGISTRATION EMAIL TEST');
  console.log('========================================\n');

  try {
    // Connect to database
    log.info('Connecting to database...');
    await mongoose.connect(env.MONGODB_URI);
    log.success('Connected to database');

    // Check environment variables
    log.info('Checking environment variables...');
    console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '✗ Not set');
    console.log('BASE_URL:', process.env.BASE_URL || 'Not set (will use default)');
    console.log('');

    // Create test user
    const testEmail = `test${Date.now()}@test.com`;
    log.info(`Testing registration with email: ${testEmail}`);

    // Mock request and response
    const req = {
      body: {
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: 'TestPassword123!',
      },
    };

    let responseData = null;
    let statusCode = null;

    const res = {
      status: function (code) {
        statusCode = code;
        return this;
      },
      json: function (data) {
        responseData = data;
        return this;
      },
    };

    const next = (err) => {
      if (err) {
        throw err;
      }
    };

    // Call register controller
    log.info('Calling register controller...');
    await authController.register(req, res, next);

    if (statusCode === 201 && responseData) {
      log.success('User registered successfully!');
      console.log('Response:', JSON.stringify(responseData, null, 2));
      
      if (responseData.data?.verificationEmailSent) {
        log.success('✅ Verification email was sent!');
      } else {
        log.warn('⚠️  Verification email was NOT sent!');
      }
    } else {
      log.error('Registration failed');
      console.log('Status:', statusCode);
      console.log('Response:', responseData);
    }

    // Clean up - delete test user
    log.info('Cleaning up test user...');
    await User.deleteOne({ email: testEmail });
    log.success('Test user deleted');

    console.log('\n========================================');
    console.log('   TEST COMPLETE');
    console.log('========================================\n');

  } catch (err) {
    log.error('Test failed with error:');
    console.error(err);
  } finally {
    await mongoose.connection.close();
    log.info('Database connection closed');
  }
}

// Run the test
testRegistration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
