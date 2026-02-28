#!/usr/bin/env node

/**
 * One-time migration for auth-expiry cleanup.
 * - Adds cleanup indexes for auth expiry fields
 * - Removes already expired auth artifacts from users
 *
 * Usage:
 *   node scripts/migrate-auth-expiry-cleanup.js
 *   node scripts/migrate-auth-expiry-cleanup.js --dry-run
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

const ensureCleanupIndexes = async () => {
  const collection = User.collection;
  const existingIndexes = await collection.indexes();

  const indexes = [
    { key: { emailVerificationTokenExpiresAt: 1 }, options: { sparse: true } },
    { key: { passwordResetTokenExpiresAt: 1 }, options: { sparse: true } },
    { key: { passwordResetOtpExpiresAt: 1 }, options: { sparse: true } },
    { key: { previousRefreshTokenValidUntil: 1 }, options: { sparse: true } },
    { key: { 'refreshSessions.expiresAt': 1 }, options: { sparse: true } },
  ];

  for (const index of indexes) {
    const alreadyExists = existingIndexes.some((existing) => {
      return JSON.stringify(existing.key) === JSON.stringify(index.key);
    });

    if (alreadyExists) {
      continue;
    }

    await collection.createIndex(index.key, index.options);
  }
};

const run = async () => {
  const now = new Date();

  if (isDryRun) {
    const candidates = await User.countDocuments({
      $or: [
        { emailVerificationTokenExpiresAt: { $type: 'date', $lte: now } },
        { passwordResetTokenExpiresAt: { $type: 'date', $lte: now } },
        { passwordResetOtpExpiresAt: { $type: 'date', $lte: now } },
        { previousRefreshTokenValidUntil: { $type: 'date', $lte: now } },
        { refreshSessions: { $elemMatch: { expiresAt: { $type: 'date', $lte: now } } } },
        { refreshSessions: { $elemMatch: { revokedAt: { $type: 'date' } } } },
      ],
    });

    console.log(`Dry run: ${candidates} users would be cleaned.`);
    return;
  }

  await ensureCleanupIndexes();
  console.log('Cleanup indexes ensured.');

  const result = await User.clearExpiredAuthArtifacts(now);
  console.log(`Cleanup complete. Matched: ${result.matchedCount || 0}, Modified: ${result.modifiedCount || 0}`);
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
