/**
 * Test Email Verification
 * Specifically test if verification email is sending
 */

require('dotenv').config();
const emailService = require('./src/services/emailService');

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

async function testVerificationEmail() {
  console.log('\n========================================');
  console.log('   VERIFICATION EMAIL TEST');
  console.log('========================================\n');

  const testEmail = 'obiefunaokechukwu98@gmail.com';
  
  try {
    log.info('Testing Email Verification...');
    
    // Check environment variables
    log.info('Checking environment variables...');
    console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '✗ Not set');
    console.log('BASE_URL:', process.env.BASE_URL || 'Not set (will use default)');
    console.log('');

    // Test verification email
    const verifyLink = `http://localhost:3000/api/auth/verify-email?token=test123&email=${encodeURIComponent(testEmail)}`;
    
    const result = await emailService.sendEmailVerificationLink(
      {
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
      },
      {
        verifyLink,
        expiresInMinutes: 60,
      }
    );

    if (result.success) {
      log.success(`Verification email sent successfully!`);
      if (result.isDev) {
        log.warn('Running in DEV MODE - email not actually sent via Brevo');
      } else {
        log.success(`MessageID: ${result.messageId}`);
        log.success(`Check your email at: ${testEmail}`);
      }
    } else {
      log.error('Failed to send verification email');
    }

    console.log('\n========================================');
    console.log('   TEST COMPLETE');
    console.log('========================================\n');

  } catch (err) {
    log.error('Test failed with error:');
    console.error(err);
    console.log('\nError details:');
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Data:', err.response.data);
    }
  }
}

// Run the test
testVerificationEmail()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
