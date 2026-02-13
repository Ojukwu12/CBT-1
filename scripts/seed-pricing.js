/**
 * Seed default plan pricing
 * Run this script to initialize pricing in the database
 * Usage: node scripts/seed-pricing.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const PlanPricing = require('../src/models/PlanPricing');
const Logger = require('../src/utils/logger');

const logger = new Logger('SeedPricing');

const defaultPricing = [
  {
    plan: 'basic',
    name: 'Basic',
    price: 2999, // ₦2,999
    duration: 30,
    features: [
      '1-100 questions per exam',
      'All free questions',
      'Basic difficulty questions',
      'Question statistics',
      'Performance tracking',
    ],
    isActive: true,
  },
  {
    plan: 'premium',
    name: 'Premium',
    price: 9999, // ₦9,999
    duration: 30,
    features: [
      '1-100 questions per exam',
      'All questions access (free + basic + premium)',
      'All difficulty levels',
      'Advanced statistics',
      'Performance analytics',
      'Priority support',
      'Exclusive premium content',
    ],
    isActive: true,
  },
];

async function seedPricing() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    // Check if pricing already exists
    const existingPricing = await PlanPricing.find();
    if (existingPricing.length > 0) {
      logger.info('Pricing already exists. Skipping seed.');
      logger.info('Current pricing:');
      existingPricing.forEach((p) => {
        logger.info(`  ${p.plan}: ₦${p.price} (${p.duration} days)`);
      });
      process.exit(0);
    }

    // Insert default pricing
    await PlanPricing.insertMany(defaultPricing);
    logger.info('Default pricing seeded successfully:');
    defaultPricing.forEach((p) => {
      logger.info(`  ${p.plan}: ₦${p.price} (${p.duration} days)`);
    });

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding pricing:', error);
    process.exit(1);
  }
}

seedPricing();
