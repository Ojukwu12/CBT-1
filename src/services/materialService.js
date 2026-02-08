const Material = require('../models/Material');
const Question = require('../models/Question');
const AIGenerationLog = require('../models/AIGenerationLog');
const { generateQuestions } = require('../utils/gemini');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const uploadMaterial = async (materialData) => {
  const material = new Material(materialData);
  return await material.save();
};

const getMaterialById = async (id) => {
  const material = await Material.findById(id)
    .populate('uploadedBy');

  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  return material;
};

const getMaterialsByCourse = async (courseId, filters = {}) => {
  const query = { courseId, ...filters };
  return await Material.find(query)
    .select('-content')
    .limit(100);
};

const generateQuestionsFromMaterial = async (
  materialId,
  adminId,
  difficulty = 'mixed'
) => {
  const startTime = Date.now();
  
  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Material not found');
  }

  if (!material.content) {
    throw new ApiError(400, 'Material has no content to generate questions from');
  }

  if (!env.AI_ENABLED) {
    throw new ApiError(503, 'AI generation is disabled in this environment');
  }

  if (!env.GEMINI_API_KEY) {
    throw new ApiError(503, 'AI generation unavailable: missing API key');
  }

  const cacheHours = env.AI_CACHE_HOURS || 24;
  const cacheThreshold = new Date(Date.now() - cacheHours * 60 * 60 * 1000);
  const cachedLog = await AIGenerationLog.findOne({
    materialId,
    status: 'success',
    createdAt: { $gte: cacheThreshold },
  }).sort({ createdAt: -1 });

  if (cachedLog?.generatedQuestionIds?.length) {
    const cachedQuestions = await Question.find({
      _id: { $in: cachedLog.generatedQuestionIds },
    });
    if (cachedQuestions.length) {
      return {
        log: cachedLog,
        questions: cachedQuestions,
      };
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dailyLimit = env.AI_DAILY_LIMIT || 50;
  const todayCount = await AIGenerationLog.countDocuments({
    universityId: material.universityId,
    createdAt: { $gte: startOfDay },
    status: { $in: ['pending', 'success'] },
  });
  if (dailyLimit > 0 && todayCount >= dailyLimit) {
    throw new ApiError(429, 'Daily AI generation limit reached');
  }

  let log = new AIGenerationLog({
    materialId,
    universityId: material.universityId,
    initiatedBy: adminId,
    status: 'pending',
  });
  log = await log.save();

  try {
    const course = await require('../models/Course').findById(material.courseId);
    const topic = material.topicId
      ? await require('../models/Topic').findById(material.topicId)
      : null;

    const topicName = topic?.name || 'General';
    const generatedQuestions = await generateQuestions(
      material.content,
      course.code,
      topicName,
      difficulty
    );

    const questionsToCreate = generatedQuestions.map((q) => ({
      universityId: material.universityId,
      courseId: material.courseId,
      topicId: material.topicId,
      departmentId: course.departmentId,
      level: course.level,
      createdBy: adminId,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      source: 'AI',
      accessLevel: 'free',
      status: 'pending',
    }));

    const created = await Question.insertMany(questionsToCreate);

    const executionTime = Date.now() - startTime;

    log = await AIGenerationLog.findByIdAndUpdate(
      log._id,
      {
        questionsGenerated: created.length,
        generatedQuestionIds: created.map((q) => q._id),
        status: 'success',
        executionTime,
      },
      { new: true }
    );

    await Material.findByIdAndUpdate(materialId, {
      status: 'processed',
      questionsGenerated: created.length,
    });

    return {
      log,
      questions: created,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    log = await AIGenerationLog.findByIdAndUpdate(
      log._id,
      {
        status: 'failed',
        errorMessage: error.message,
        executionTime,
      },
      { new: true }
    );

    await Material.findByIdAndUpdate(materialId, {
      status: 'failed',
    });

    throw new ApiError(500, `Question generation failed: ${error.message}`);
  }
};

module.exports = {
  uploadMaterial,
  getMaterialById,
  getMaterialsByCourse,
  generateQuestionsFromMaterial,
};
