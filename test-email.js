/**
 * Email Testing Script
 * Tests Brevo email functionality and business logic
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

async function testEmailService() {
  console.log('\n========================================');
  console.log('   EMAIL SERVICE TEST');
  console.log('========================================\n');

  const testEmail = 'obiefunaokechukwu98@gmail.com';
  
  try {
    // Test 1: Welcome Email
    log.info('Test 1: Sending Welcome Email...');
    const welcomeResult = await emailService.sendWelcomeEmail({
      firstName: 'Okechukwu',
      lastName: 'Obiefuna',
      email: testEmail,
    });
    log.success(`Welcome email sent! MessageID: ${welcomeResult.messageId}`);

    // Test 2: OTP Email
    log.info('\nTest 2: Sending OTP Email...');
    const otpResult = await emailService.sendOTPEmail(testEmail, '123456', 10);
    log.success(`OTP email sent! MessageID: ${otpResult.messageId}`);

    // Test 3: Plan Upgrade Email
    log.info('\nTest 3: Sending Plan Upgrade Email...');
    const upgradeResult = await emailService.sendPlanUpgradeEmail(
      { firstName: 'Okechukwu', email: testEmail },
      'free',
      'premium',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    log.success(`Plan upgrade email sent! MessageID: ${upgradeResult.messageId}`);

    // Test 4: Payment Receipt Email
    log.info('\nTest 4: Sending Payment Receipt Email...');
    const receiptResult = await emailService.sendPaymentReceiptEmail(
      { firstName: 'Okechukwu', email: testEmail },
      {
        transactionId: 'TXN-TEST-123456',
        amount: 5000,
        plan: 'premium',
        planExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    );
    log.success(`Payment receipt email sent! MessageID: ${receiptResult.messageId}`);

    // Test 5: Plan Expiry Warning
    log.info('\nTest 5: Sending Plan Expiry Warning...');
    const expiryWarningResult = await emailService.sendPlanExpiryWarningEmail(
      { firstName: 'Okechukwu', email: testEmail },
      7,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    log.success(`Plan expiry warning sent! MessageID: ${expiryWarningResult.messageId}`);

    // Summary
    console.log('\n========================================');
    console.log('   TEST SUMMARY');
    console.log('========================================');
    log.success('All 5 email tests passed!');
    log.info(`Recipient: ${testEmail}`);
    log.info(`Sender: ${process.env.EMAIL_FROM}`);
    log.info(`Brevo API Key: ${process.env.BREVO_API_KEY ? 'Configured ✓' : 'Missing ✗'}`);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.log('\n========================================');
    console.log('   TEST FAILED');
    console.log('========================================');
    log.error(`Error: ${error.message}`);
    if (error.response?.data) {
      console.log('\nBrevo API Error:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n');
    process.exit(1);
  }
}

// Run tests
testEmailService();
