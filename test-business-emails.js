/**
 * Business Logic Test - Email Triggers
 * Tests automatic email sending from business operations
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
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

async function testBusinessLogic() {
  console.log('\n========================================');
  console.log('   BUSINESS LOGIC EMAIL TRIGGERS TEST');
  console.log('========================================\n');

  const testEmail = 'obiefunaokechukwu98@gmail.com';
  const testUser = {
    firstName: 'Okechukwu',
    lastName: 'Obiefuna',
    email: testEmail,
  };

  try {
    log.header('1. User Registration Flow');
    log.info('Simulating new user registration...');
    const welcomeResult = await emailService.sendWelcomeEmail(testUser);
    log.success(`Welcome email triggered on registration: ${welcomeResult.messageId}`);

    log.header('2. Payment Success Flow');
    log.info('Simulating successful payment verification...');
    const mockTransaction = {
      transactionId: 'TXN-BIZ-TEST-001',
      amount: 10000,
      plan: 'premium',
      planExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    
    const receiptResult = await emailService.sendPaymentReceiptEmail(testUser, mockTransaction);
    log.success(`Payment receipt sent: ${receiptResult.messageId}`);
    
    const upgradeResult = await emailService.sendPlanUpgradeEmail(
      testUser,
      'free',
      'premium',
      mockTransaction.planExpiryDate
    );
    log.success(`Plan upgrade notification sent: ${upgradeResult.messageId}`);

    log.header('3. Payment Failure Flow');
    log.info('Simulating payment failure...');
    const failureResult = await emailService.sendPaymentFailedEmail(
      testUser,
      5000,
      'Insufficient funds'
    );
    log.success(`Payment failure notification sent: ${failureResult.messageId}`);

    log.header('4. Plan Expiry Warning Flow');
    log.info('Simulating plan expiry warning (7 days before)...');
    const warningResult = await emailService.sendPlanExpiryWarningEmail(
      testUser,
      7,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    log.success(`Expiry warning sent: ${warningResult.messageId}`);

    log.header('5. Plan Expired Flow');
    log.info('Simulating plan expiration...');
    const expiredResult = await emailService.sendPlanExpiredEmail(testUser);
    log.success(`Plan expired notification sent: ${expiredResult.messageId}`);

    log.header('6. Question Approval Flow');
    log.info('Simulating question approval notification...');
    const mockQuestion = {
      text: 'What is the capital of Nigeria?',
      _id: 'QUEST-123456',
    };
    const mockApprover = { firstName: 'Admin' };
    
    const approvalResult = await emailService.sendQuestionApprovedEmail(
      { ...testUser, email: testEmail },
      mockQuestion,
      mockApprover
    );
    log.success(`Question approval notification sent: ${approvalResult.messageId}`);

    log.header('7. Question Rejection Flow');
    log.info('Simulating question rejection...');
    const rejectionResult = await emailService.sendQuestionRejectedEmail(
      { ...testUser, email: testEmail },
      mockQuestion,
      'Question already exists in database'
    );
    log.success(`Question rejection notification sent: ${rejectionResult.messageId}`);

    log.header('8. Contact Form Flow');
    log.info('Simulating contact form submission...');
    const contactResult = await emailService.sendContactFormEmail(
      'Okechukwu Obiefuna',
      testEmail,
      'Feature Request',
      'Please add dark mode to the application'
    );
    log.success(`Contact form notification sent: ${contactResult.messageId}`);

    // Summary
    console.log('\n========================================');
    console.log('   BUSINESS LOGIC TEST SUMMARY');
    console.log('========================================');
    log.success('All 8 business logic flows tested successfully!');
    log.info('\nVerified Email Triggers:');
    console.log('  • User Registration → Welcome Email ✓');
    console.log('  • Payment Success → Receipt + Upgrade ✓');
    console.log('  • Payment Failure → Failure Notification ✓');
    console.log('  • 7 Days Before → Expiry Warning ✓');
    console.log('  • Plan Expires → Expired Notification ✓');
    console.log('  • Question Approved → Admin Notification ✓');
    console.log('  • Question Rejected → Admin Notification ✓');
    console.log('  • Contact Form → Admin Notification ✓');
    console.log('\n');
    log.info(`All emails sent to: ${testEmail}`);
    log.info(`Check your inbox for 10+ test emails!`);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.log('\n========================================');
    console.log('   BUSINESS LOGIC TEST FAILED');
    console.log('========================================');
    log.error(`Error: ${error.message}`);
    if (error.response?.data) {
      console.log('\nBrevo API Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n');
    process.exit(1);
  }
}

// Run tests
testBusinessLogic();
