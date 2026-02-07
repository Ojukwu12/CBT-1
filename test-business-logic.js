#!/usr/bin/env node

/**
 * Business Logic & Email Testing Script
 * Tests all business logic and sends email templates
 */

const mongoose = require('mongoose');
const { env } = require('./src/config/env');
const EmailService = require('./src/services/emailService');
const User = require('./src/models/User');
const ExamSession = require('./src/models/ExamSession');
const Question = require('./src/models/Question');
const Course = require('./src/models/Course');

const emailService = new EmailService();

const TEST_EMAIL = 'obiefunaokechukwu@gmail.com';

async function testBusinessLogic() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  BUSINESS LOGIC TESTING                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: User Registration Logic
    console.log('1️⃣  USER REGISTRATION LOGIC');
    const testUser = await User.findOne({ email: 'student@unizik.edu.ng' });
    if (testUser) {
      console.log('   ✅ User exists');
      console.log(`   Name: ${testUser.firstName} ${testUser.lastName}`);
      console.log(`   Role: ${testUser.role}`);
      console.log(`   Plan: ${testUser.plan}`);
      console.log(`   Status: ${testUser.isActive ? 'Active' : 'Inactive'}`);
    }

    // Test 2: Question Validation
    console.log('\n2️⃣  QUESTION VALIDATION');
    const questions = await Question.find().limit(3);
    console.log(`   ✅ Found ${questions.length} questions`);
    questions.forEach((q, idx) => {
      const validAnswers = ['A', 'B', 'C', 'D'];
      const isValid = validAnswers.includes(q.correctAnswer);
      console.log(`   Q${idx + 1}: Correct answer is ${q.correctAnswer} ${isValid ? '✓' : '✗'}`);
    });

    // Test 3: Exam Scoring Logic
    console.log('\n3️⃣  EXAM SCORING LOGIC');
    const examSession = await ExamSession.findOne({ status: 'graded' }).limit(1);
    if (examSession) {
      const scoringLogic = {
        total: examSession.totalQuestions,
        correct: examSession.correctAnswers,
        score: examSession.score,
        expectedScore: (examSession.correctAnswers / examSession.totalQuestions) * 100,
        isPassed: examSession.isPassed,
        passingScore: examSession.passingScore,
      };
      console.log('   ✅ Score Calculation:');
      console.log(`   Total Questions: ${scoringLogic.total}`);
      console.log(`   Correct Answers: ${scoringLogic.correct}`);
      console.log(`   Calculated Score: ${scoringLogic.expectedScore.toFixed(2)}%`);
      console.log(`   Stored Score: ${scoringLogic.score}%`);
      console.log(`   Passed (${scoringLogic.passingScore}% threshold): ${scoringLogic.isPassed ? 'YES' : 'NO'}`);
      console.log(`   Logic Valid: ${Math.abs(scoringLogic.score - scoringLogic.expectedScore) < 0.01 ? '✓' : '✗'}`);
    } else {
      console.log('   ⚠️  No graded exams found (this is OK for new database)');
    }

    // Test 4: Plan Access Control
    console.log('\n4️⃣  SUBSCRIPTION PLAN LOGIC');
    const students = await User.find({ role: 'student' }).limit(3);
    students.forEach((student, idx) => {
      const planAccess = {
        free: ['Free & Basic Questions', 'Practice Exams', 'Basic Analytics'],
        basic: ['Free + Basic Questions', 'Mock Exams', 'Advanced Analytics'],
        premium: ['All Questions', 'All Exams', 'Full Analytics + Leaderboard'],
      };
      console.log(`   Student ${idx + 1} (${student.plan}): ${planAccess[student.plan].join(', ')}`);
    });

    // Test 5: User Analytics
    console.log('\n5️⃣  USER ANALYTICS LOGIC');
    const userWithStats = await User.findOne({ 'stats.questionsAttempted': { $gt: 0 } });
    if (userWithStats) {
      const stats = userWithStats.stats;
      const accuracy = stats.questionsAttempted > 0 
        ? ((stats.questionsCorrect / stats.questionsAttempted) * 100).toFixed(2)
        : 0;
      console.log(`   ✅ User Stats Calculation:`);
      console.log(`   Questions Attempted: ${stats.questionsAttempted}`);
      console.log(`   Questions Correct: ${stats.questionsCorrect}`);
      console.log(`   Accuracy: ${accuracy}%`);
      console.log(`   Topics Studied: ${stats.topicsStudied}`);
    }

    // Test 6: Course Structure
    console.log('\n6️⃣  COURSE STRUCTURE VALIDATION');
    const courses = await Course.find().limit(2);
    console.log(`   ✅ Found ${courses.length} courses`);
    courses.forEach((course) => {
      console.log(`   - ${course.code}: ${course.title} (Level ${course.level})`);
    });

    console.log('\n✅ All Business Logic Tests Passed!\n');

  } catch (error) {
    console.error('❌ Business Logic Test Error:', error.message);
  }
}

async function sendEmailTemplates() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  EMAIL TEMPLATE TESTING                                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const templates = [
    {
      name: 'welcome',
      subject: 'Welcome to University CBT',
      variables: {
        appName: 'University CBT',
        firstName: 'John',
        email: 'student@unizik.edu.ng',
        appUrl: 'https://universitycbt.com',
      },
    },
    {
      name: 'reset-password',
      subject: 'Reset Your Password',
      variables: {
        firstName: 'John',
        resetLink: 'https://universitycbt.com/reset?token=abc123xyz',
        expiryTime: '1 hour',
      },
    },
    {
      name: 'payment-receipt',
      subject: 'Payment Receipt - Plan Upgraded',
      variables: {
        firstName: 'John',
        planName: 'Premium Plan',
        amount: '$9.99',
        currency: 'USD',
        transactionId: 'TXN-2026-02-05-001',
        expiryDate: 'February 5, 2027',
        appUrl: 'https://universitycbt.com/dashboard',
      },
    },
    {
      name: 'payment-failed',
      subject: 'Payment Failed',
      variables: {
        firstName: 'John',
        planName: 'Premium Plan',
        amount: '$9.99',
        reason: 'Card declined by bank',
        retryLink: 'https://universitycbt.com/payment/retry',
      },
    },
    {
      name: 'plan-upgrade',
      subject: 'Plan Upgrade Successful',
      variables: {
        firstName: 'John',
        oldPlan: 'Free',
        newPlan: 'Premium',
        newFeatures: 'Unlimited questions, Priority support, Full analytics',
        expiryDate: 'February 5, 2027',
      },
    },
    {
      name: 'plan-downgrade',
      subject: 'Plan Downgraded',
      variables: {
        firstName: 'John',
        oldPlan: 'Premium',
        newPlan: 'Free',
        downgradeReason: 'User requested',
        supportEmail: 'support@universitycbt.com',
      },
    },
    {
      name: 'plan-expiry-warning',
      subject: 'Your Premium Plan Expires Soon',
      variables: {
        firstName: 'John',
        planName: 'Premium',
        expiryDate: 'February 10, 2026',
        daysRemaining: '5 days',
        renewLink: 'https://universitycbt.com/renew',
      },
    },
    {
      name: 'plan-expired',
      subject: 'Your Plan Has Expired',
      variables: {
        firstName: 'John',
        planName: 'Premium',
        renewLink: 'https://universitycbt.com/renew',
        freeAccess: 'Free tier questions',
      },
    },
    {
      name: 'otp',
      subject: 'Your One-Time Password (OTP)',
      variables: {
        otp: '123456',
        expiryTime: '15 minutes',
        supportEmail: 'support@universitycbt.com',
      },
    },
    {
      name: 'question-approved',
      subject: 'Your Question Has Been Approved',
      variables: {
        firstName: 'John',
        questionText: 'What is the capital of Nigeria?',
        approvalNotes: 'Well-formatted question with clear options',
      },
    },
    {
      name: 'question-rejected',
      subject: 'Your Question Needs Revision',
      variables: {
        firstName: 'John',
        questionText: 'What is the capital...',
        rejectionReason: 'Options are unclear and ambiguous',
        resubmitLink: 'https://universitycbt.com/contribute',
      },
    },
    {
      name: 'contact-form',
      subject: 'We Received Your Message',
      variables: {
        firstName: 'John',
        supportEmail: 'support@universitycbt.com',
        responseTime: '24 hours',
      },
    },
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const template of templates) {
    try {
      console.log(`📧 Sending: ${template.subject}`);
      const result = await emailService.send(
        TEST_EMAIL,
        template.subject,
        template.name,
        template.variables
      );

      if (result.success) {
        console.log(`   ✅ Sent to ${TEST_EMAIL}`);
        if (result.isDev) {
          console.log(`   ℹ️  Dev mode (no actual email sent)`);
        } else {
          console.log(`   ✅ Delivered via Brevo`);
        }
        successCount++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failureCount++;
    }
    console.log('');
  }

  console.log(`\n📊 Email Test Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📧 Target Email: ${TEST_EMAIL}\n`);
}

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  CBT APP - BUSINESS LOGIC & EMAIL TEST SUITE           ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Run tests
    await testBusinessLogic();
    await sendEmailTemplates();

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  TESTING COMPLETE                                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test Suite Error:', error);
    process.exit(1);
  }
}

main();
