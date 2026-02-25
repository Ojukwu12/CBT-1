const University = require('../models/University');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const Material = require('../models/Material');
const User = require('../models/User');
const AIGenerationLog = require('../models/AIGenerationLog');
const Transaction = require('../models/Transaction');
const PlanPricing = require('../models/PlanPricing');
const PromoCode = require('../models/PromoCode');
const StudyMaterial = require('../models/StudyMaterial');
const ExamSession = require('../models/ExamSession');

const ensureIndexes = async () => {
  try {
    console.log('📊 Creating database indexes...');

    // University indexes
    await University.collection.createIndex({ code: 1 }, { unique: true });
    await University.collection.createIndex({ isActive: 1 });

    // Faculty indexes
    await Faculty.collection.createIndex({ universityId: 1, code: 1 }, { unique: true });
    await Faculty.collection.createIndex({ isActive: 1 });

    // Department indexes
    await Department.collection.createIndex({ facultyId: 1, code: 1 }, { unique: true });
    await Department.collection.createIndex({ universityId: 1 });

    // Course indexes
    await Course.collection.createIndex({ departmentId: 1, code: 1 }, { unique: true });
    await Course.collection.createIndex({ universityId: 1, level: 1 });
    await Course.collection.createIndex({ isActive: 1 });

    // Topic indexes
    await Topic.collection.createIndex({ courseId: 1, name: 1 }, { unique: true });
    await Topic.collection.createIndex({ universityId: 1 });

    // Question indexes - critical for performance
    await Question.collection.createIndex({ universityId: 1, courseId: 1, topicId: 1 });
    await Question.collection.createIndex({ universityId: 1, status: 1, accessLevel: 1 });
    await Question.collection.createIndex({ status: 1, isActive: 1 });
    await Question.collection.createIndex({ difficulty: 1 });
    await Question.collection.createIndex({ topicId: 1, status: 1 });

    // Material indexes
    await Material.collection.createIndex({ courseId: 1 });
    await Material.collection.createIndex({ status: 1 });
    await Material.collection.createIndex({ universityId: 1 });

    // User indexes - critical for authentication
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ lastSelectedUniversityId: 1 });
    await User.collection.createIndex({ lastSelectedDepartmentId: 1 });
    await User.collection.createIndex({ lastSelectedCourseId: 1 });
    await User.collection.createIndex({ isActive: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ refreshTokenHash: 1 }, { sparse: true });

    // AIGenerationLog indexes
    await AIGenerationLog.collection.createIndex({ universityId: 1 });
    await AIGenerationLog.collection.createIndex({ status: 1 });
    await AIGenerationLog.collection.createIndex({ createdAt: -1 });

    // Transaction indexes - critical for payment verification and history
    await Transaction.collection.createIndex({ paystackReference: 1 }, { unique: true });
    await Transaction.collection.createIndex({ userId: 1, createdAt: -1 });
    await Transaction.collection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    await Transaction.collection.createIndex({ status: 1, completedAt: -1 });
    await Transaction.collection.createIndex({ plan: 1, status: 1, completedAt: -1 });
    await Transaction.collection.createIndex({ promoCode: 1, status: 1, completedAt: -1 });

    // Plan pricing indexes
    await PlanPricing.collection.createIndex({ plan: 1 }, { unique: true });
    await PlanPricing.collection.createIndex({ isActive: 1, plan: 1 });

    // Promo code indexes
    await PromoCode.collection.createIndex({ code: 1 }, { unique: true });
    await PromoCode.collection.createIndex({ isActive: 1, validFrom: 1, validUntil: 1 });
    await PromoCode.collection.createIndex({ createdAt: -1 });

    // Study material indexes - critical for downloads/list endpoints
    await StudyMaterial.collection.createIndex({ courseId: 1, isActive: 1, createdAt: -1 });
    await StudyMaterial.collection.createIndex({ universityId: 1, departmentId: 1, isActive: 1 });
    await StudyMaterial.collection.createIndex({ uploadedBy: 1, createdAt: -1 });

    // Exam session indexes - critical for student exam history and status reads
    await ExamSession.collection.createIndex({ userId: 1, createdAt: -1 });
    await ExamSession.collection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    await ExamSession.collection.createIndex({ courseId: 1, createdAt: -1 });
    await ExamSession.collection.createIndex({ status: 1, createdAt: -1 });

    console.log('✅ All database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
};

module.exports = { ensureIndexes };
