/**
 * Admin Features Test Script
 * Tests all new admin functionality:
 * - Admin user management (ban/unban, role changes)
 * - Bulk email sending
 * - Admin notifications
 * - Plan downgrades
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@test.com';
const TEST_USER_EMAIL = 'testuser@test.com';

let adminToken = null;
let testUserId = null;
let universityId = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}\n${msg}\n${colors.blue}${'='.repeat(50)}${colors.reset}\n`),
};

/**
 * Helper to make API calls
 */
const api = async (method, endpoint, data = null, token = adminToken) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

/**
 * Test 1: Setup - Create Admin and Test User
 */
async function testSetup() {
  log.section('TEST 1: Setup - Create Admin and Test Users');

  try {
    // Get first university
    const unis = await api('GET', '/universities');
    universityId = unis.data[0]._id;
    log.success(`University retrieved: ${unis.data[0].name}`);

    // Register admin
    const adminReg = await api('POST', '/auth/register', {
      firstName: 'Admin',
      lastName: 'User',
      email: ADMIN_EMAIL,
      password: 'AdminPass123!',
      universityId,
    });
    adminToken = adminReg.data.token;
    const adminId = adminReg.data.user.id;
    log.success(`Admin created and authenticated: ${ADMIN_EMAIL}`);

    // Manually upgrade admin to admin role (would normally be done via admin panel)
    // For testing purposes, we'll assume this is already done via direct DB or admin script

    // Register test user
    const userReg = await api('POST', '/auth/register', {
      firstName: 'Test',
      lastName: 'User',
      email: TEST_USER_EMAIL,
      password: 'TestPass123!',
      universityId,
    });
    testUserId = userReg.data.user.id;
    log.success(`Test user created: ${TEST_USER_EMAIL}`);

    // Log admin token for other tests
    log.info(`Admin Token: ${adminToken.substring(0, 20)}...`);

    return true;
  } catch (err) {
    log.error(`Setup failed: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 2: Admin User Management - Get All Users
 */
async function testGetAllUsers() {
  log.section('TEST 2: Admin User Management - Get All Users');

  try {
    const result = await api('GET', `/admin/users?page=1&limit=10`);
    log.success(`Retrieved ${result.data.users.length} users`);
    log.info(`Total users: ${result.data.pagination.total}`);
    return true;
  } catch (err) {
    log.error(`Failed to get users: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 3: Admin User Management - Get Single User
 */
async function testGetSingleUser() {
  log.section('TEST 3: Admin User Management - Get Single User');

  try {
    const result = await api('GET', `/admin/users/${testUserId}`);
    log.success(`Retrieved user: ${result.data.email}`);
    log.info(`User plan: ${result.data.plan}`);
    log.info(`User role: ${result.data.role}`);
    return true;
  } catch (err) {
    log.error(`Failed to get user: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 4: Admin User Management - Ban User
 */
async function testBanUser() {
  log.section('TEST 4: Admin User Management - Ban User');

  try {
    const result = await api('POST', `/admin/users/${testUserId}/ban`, {
      reason: 'Violation of terms of service - inappropriate content',
      duration: '7days',
    });
    log.success(`User banned successfully`);
    log.info(`Ban reason: ${result.data.banReason}`);
    log.info(`Ban duration: ${result.data.banDuration}`);
    log.info(`Account status: ${result.data.isActive ? 'Active' : 'Inactive'}`);
    return true;
  } catch (err) {
    log.error(`Failed to ban user: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 5: Admin User Management - Unban User
 */
async function testUnbanUser() {
  log.section('TEST 5: Admin User Management - Unban User');

  try {
    const result = await api('POST', `/admin/users/${testUserId}/unban`);
    log.success(`User unbanned successfully`);
    log.info(`Account status: ${result.data.isActive ? 'Active' : 'Inactive'}`);
    return true;
  } catch (err) {
    log.error(`Failed to unban user: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 6: Admin User Management - Change User Role
 */
async function testChangeUserRole() {
  log.section('TEST 6: Admin User Management - Change User Role');

  try {
    const result = await api('POST', `/admin/users/${testUserId}/role`, {
      newRole: 'student',
    });
    log.success(`User role changed successfully`);
    log.info(`New role: ${result.data.role}`);
    return true;
  } catch (err) {
    log.error(`Failed to change user role: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 7: Admin User Management - Downgrade Plan
 */
async function testDowngradePlan() {
  log.section('TEST 7: Admin User Management - Downgrade Plan');

  try {
    const result = await api('POST', `/admin/users/${testUserId}/downgrade-plan`, {
      reason: 'Admin decision for testing',
    });
    log.success(`User plan downgraded successfully`);
    log.info(`New plan: ${result.data.plan}`);
    return true;
  } catch (err) {
    log.error(`Failed to downgrade plan: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 8: Admin Notifications - Send Notification to User
 */
async function testSendNotificationToUser() {
  log.section('TEST 8: Send Notification to User');

  try {
    const result = await api('POST', `/admin/users/${testUserId}/send-notification`, {
      subject: 'Important Update',
      message: 'This is a test notification from the admin about an important update to the system.',
    });
    log.success(`Notification sent to user successfully`);
    log.info(`Notification status: ${result.data.sent ? 'Sent' : 'Failed'}`);
    return true;
  } catch (err) {
    log.error(`Failed to send notification: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 9: Bulk Email - Send Announcement
 */
async function testSendAnnouncement() {
  log.section('TEST 9: Bulk Email - Send Announcement');

  try {
    const result = await api(
      'POST',
      '/admin/analytics/notifications/announcement',
      {
        title: 'System Update Announcement',
        content: 'We are excited to announce new features coming to the platform next week. Stay tuned!',
      }
    );
    log.success(`Announcement sent to ${result.data.recipientCount} users`);
    log.info(`Message ID: ${result.data.messageId || 'N/A (Dev Mode)'}`);
    return true;
  } catch (err) {
    log.error(`Failed to send announcement: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 10: Bulk Email - Send Maintenance Notification
 */
async function testSendMaintenanceNotification() {
  log.section('TEST 10: Bulk Email - Send Maintenance Notification');

  try {
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(Date.now() + 25 * 60 * 60 * 1000);

    const result = await api(
      'POST',
      '/admin/analytics/notifications/maintenance',
      {
        title: 'Scheduled System Maintenance',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        impact: 'All services will be temporarily unavailable during the maintenance window.',
      }
    );
    log.success(`Maintenance notification sent to ${result.data.recipientCount} users`);
    log.info(`Message ID: ${result.data.messageId || 'N/A (Dev Mode)'}`);
    return true;
  } catch (err) {
    log.error(`Failed to send maintenance notification: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 11: Bulk Email - Send Plan Expiry Reminder
 */
async function testSendPlanExpiryReminder() {
  log.section('TEST 11: Bulk Email - Send Plan Expiry Reminder');

  try {
    const result = await api(
      'POST',
      '/admin/analytics/notifications/plan-expiry-reminder',
      {
        daysUntilExpiry: 7,
      }
    );
    log.success(`Plan expiry reminder sent to ${result.data.recipientCount} users`);
    log.info(`Message ID: ${result.data.messageId || 'N/A (Dev Mode)'}`);
    return true;
  } catch (err) {
    log.error(`Failed to send plan expiry reminder: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Test 12: Bulk Email - Send Bulk Email with Template
 */
async function testSendBulkEmail() {
  log.section('TEST 12: Bulk Email - Send Bulk Email');

  try {
    const result = await api(
      'POST',
      '/admin/analytics/notifications/send-bulk',
      {
        subject: 'Summer Promotion - Get Premium Access 50% Off!',
        template: 'announcement',
        variables: {
          content: 'This summer, enjoy 50% off on all premium plans. Upgrade now and get access to exclusive features!',
        },
        filters: {
          plan: 'free',
        },
      }
    );
    log.success(`Bulk email sent to ${result.data.recipientCount} free plan users`);
    log.info(`Message ID: ${result.data.messageId || 'N/A (Dev Mode)'}`);
    return true;
  } catch (err) {
    log.error(`Failed to send bulk email: ${JSON.stringify(err)}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(
    `\n${colors.blue}${'═'.repeat(60)}${colors.reset}\n` +
    `${colors.blue}       ADMIN FEATURES TEST SUITE${colors.reset}\n` +
    `${colors.blue}${'═'.repeat(60)}${colors.reset}\n`
  );

  const tests = [
    { name: 'Setup', fn: testSetup, critical: true },
    { name: 'Get All Users', fn: testGetAllUsers },
    { name: 'Get Single User', fn: testGetSingleUser },
    { name: 'Ban User', fn: testBanUser },
    { name: 'Unban User', fn: testUnbanUser },
    { name: 'Change User Role', fn: testChangeUserRole },
    { name: 'Downgrade Plan', fn: testDowngradePlan },
    { name: 'Send User Notification', fn: testSendNotificationToUser },
    { name: 'Send Announcement', fn: testSendAnnouncement },
    { name: 'Send Maintenance Notification', fn: testSendMaintenanceNotification },
    { name: 'Send Plan Expiry Reminder', fn: testSendPlanExpiryReminder },
    { name: 'Send Bulk Email', fn: testSendBulkEmail },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        if (test.critical) {
          log.error('Critical test failed. Stopping execution.');
          break;
        }
      }
    } catch (err) {
      log.error(`Test "${test.name}" threw an error: ${err}`);
      failed++;
      if (test.critical) {
        log.error('Critical test failed. Stopping execution.');
        break;
      }
    }
  }

  // Summary
  console.log(`\n${colors.blue}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(60)}${colors.reset}`);
  log.success(`Passed: ${passed}/${tests.length}`);
  if (failed > 0) {
    log.error(`Failed: ${failed}/${tests.length}`);
  }
  console.log(`${colors.blue}${'═'.repeat(60)}${colors.reset}\n`);

  return failed === 0 ? 0 : 1;
}

// Run tests
runAllTests().then(code => process.exit(code));
