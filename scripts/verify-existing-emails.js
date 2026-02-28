#!/usr/bin/env node

/**
 * Bulk-verify already created user emails.
 *
 * Usage:
 *   node scripts/verify-existing-emails.js
 *   node scripts/verify-existing-emails.js --dry-run
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

const run = async () => {
  const now = new Date();
  const filter = {
    $or: [
      { emailVerifiedAt: null },
      { emailVerifiedAt: { $exists: false } },
    ],
  };

  const count = await User.countDocuments(filter);
  console.log(`Found ${count} users without verified email.`);

  if (count === 0) {
    return;
  }

  if (isDryRun) {
    console.log('Dry run enabled. No changes written.');
    return;
  }

  const result = await User.updateMany(filter, {
    $set: {
      emailVerifiedAt: now,
    },
    $unset: {
      emailVerificationTokenHash: 1,
      emailVerificationTokenExpiresAt: 1,
    },
  });

  console.log(`Marked ${result.modifiedCount || 0} users as email-verified.`);
};

(async () => {
  try {
    await connect();
    await run();
    await mongoose.connection.close();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to verify existing emails:', error.message);
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // ignore close failure
    }
    process.exit(1);
  }
})();
