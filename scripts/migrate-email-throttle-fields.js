#!/usr/bin/env node

/**
 * One-time migration for email throttle fields on users.
 * - Backfills missing fields introduced for verification/reset/welcome throttling
 *
 * Usage:
 *   node scripts/migrate-email-throttle-fields.js
 *   node scripts/migrate-email-throttle-fields.js --dry-run
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');

const isDryRun = process.argv.includes('--dry-run');

const connect = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

const missingFieldsFilter = {
  $or: [
    { lastVerificationEmailSentAt: { $exists: false } },
    { lastPasswordResetEmailSentAt: { $exists: false } },
    { welcomeEmailSentAt: { $exists: false } },
  ],
};

const run = async () => {
  const candidates = await User.countDocuments(missingFieldsFilter);

  if (isDryRun) {
    console.log(`Dry run: ${candidates} users would be backfilled.`);
    return;
  }

  const result = await User.updateMany(
    missingFieldsFilter,
    {
      $set: {
        lastVerificationEmailSentAt: null,
        lastPasswordResetEmailSentAt: null,
        welcomeEmailSentAt: null,
      },
    }
  );

  console.log(`Backfill complete. Matched: ${result.matchedCount || 0}, Modified: ${result.modifiedCount || 0}`);
};

(async () => {
  try {
    await connect();
    await run();
    await mongoose.connection.close();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // ignore close failure
    }
    process.exit(1);
  }
})();
