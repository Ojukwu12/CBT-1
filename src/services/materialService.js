const SourceMaterial = require('../models/SourceMaterial');
const Question = require('../models/Question');
const AIGenerationLog = require('../models/AIGenerationLog');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const { generateQuestions } = require('../utils/questionGenerator');
const { extractTextFromMaterial } = require('../utils/fileExtraction');
const { detectQuestionBank } = require('../utils/questionBankDetector');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const TARGET_QUESTION_COUNT = 20;
const MAX_AI_ATTEMPTS = 2;
const AI_GENERATION_ATTEMPT_TIMEOUT_MS = 30 * 1000;
const AI_GENERATION_TOTAL_TIMEOUT_MS = 55 * 1000;

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ApiError(504, timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeQuestionText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const filterUniqueQuestions = (questions, existingTextSet) => {
  const unique = [];

  for (const question of questions || []) {
    const normalizedText = normalizeQuestionText(question?.text);
    if (!normalizedText || existingTextSet.has(normalizedText)) {
      continue;
    }

    existingTextSet.add(normalizedText);
    unique.push(question);
  }

  return unique;
};

const getExistingQuestionTextSet = async ({ universityId, courseId, topicId }) => {
  const existingQuestions = await Question.find({
    universityId,
    courseId,
    topicId,
    isActive: true,
    status: { $in: ['pending', 'approved'] },
  })
    .select('text')
    .lean();

  return new Set(
    existingQuestions
      .map((question) => normalizeQuestionText(question.text))
      .filter(Boolean)
  );
};

const uploadMaterial = async (materialData) => {
  const { fileBuffer, mimeType, ...payload } = materialData;
  const material = new SourceMaterial(payload);

  if (!material.content) {
    const extracted = await extractTextFromMaterial({
      fileBuffer,
      fileUrl: material.fileUrl,
      fileType: material.fileType,
      mimeType,
    });

    material.content = extracted;
  }

  return await material.save();
};

const getMaterialById = async (id) => {
  const material = await SourceMaterial.findById(id)
    .populate('uploadedBy');

  if (!material) {
    throw new ApiError(404, 'Source material not found');
  }

  return material;
};

const getMaterialsByCourse = async (courseId, filters = {}) => {
  const query = { courseId, ...filters };
  return await SourceMaterial.find(query)
    .select('-content')
    .limit(100);
};

const generateQuestionsFromMaterial = async (
  materialId,
  adminId,
  difficulty = 'mixed',
  fresh = true
) => {
  const startTime = Date.now();

  const material = await SourceMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Source material not found');
  }

  await SourceMaterial.findByIdAndUpdate(materialId, {
    processingStatus: 'processing',
    processingStartedAt: new Date(),
    processingError: null,
  });

  if (!material.content) {
    const extracted = await extractTextFromMaterial({
      fileUrl: material.fileUrl,
      fileType: material.fileType,
    });
    if (!extracted) {
      throw new ApiError(400, 'Material has no content to generate questions from');
    }
    material.content = extracted;
    material.extractionMethod = 'ocr';
    await material.save();
  }

  let parsed = detectQuestionBank(material.content);

  if (!parsed.isQuestionBank && material.fileType === 'image' && material.fileUrl) {
    const ocrAttemptContent = await extractTextFromMaterial({
      fileUrl: material.fileUrl,
      fileType: material.fileType,
    });

    if (ocrAttemptContent) {
      const ocrParsed = detectQuestionBank(ocrAttemptContent);
      if (ocrParsed.isQuestionBank) {
        material.content = ocrAttemptContent;
        material.extractionMethod = 'ocr';
        await material.save();
        parsed = ocrParsed;
      }
    }
  }

  if (parsed.isQuestionBank) {
    if (parsed.missingAnswers > 0) {
      await SourceMaterial.findByIdAndUpdate(materialId, {
        processingStatus: 'completed',
        processingCompletedAt: new Date(),
        extractionMethod: 'ocr',
      });

      return {
        mode: 'question_bank',
        missingAnswers: parsed.missingAnswers,
        extractedQuestions: parsed.questions,
        questions: [],
      };
    }

    const course = await Course.findById(material.courseId);
    if (!course) {
      throw new ApiError(404, 'Course not found for material');
    }

    if (!material.topicId) {
      throw new ApiError(400, 'Material must be linked to a topic for question import');
    }

    const existingQuestionTextSet = await getExistingQuestionTextSet({
      universityId: material.universityId,
      courseId: material.courseId,
      topicId: material.topicId,
    });

    const uniqueQuestions = filterUniqueQuestions(parsed.questions, existingQuestionTextSet);

    const questionsToCreate = uniqueQuestions.map((q) => ({
      universityId: material.universityId,
      courseId: material.courseId,
      topicId: material.topicId,
      departmentId: course.departmentId,
      level: course.level,
      createdBy: adminId,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty || 'medium',
      source: 'Human',
      accessLevel: 'free',
      status: 'pending',
    }));

    const created = questionsToCreate.length ? await Question.insertMany(questionsToCreate) : [];

    await SourceMaterial.findByIdAndUpdate(materialId, {
      processingStatus: 'completed',
      processingCompletedAt: new Date(),
      extractionMethod: 'ocr',
      questionsGenerated: created.length,
      questionsIds: created.map((q) => q._id),
    });

    return {
      mode: 'question_bank',
      questions: created,
    };
  }

  if (!env.AI_ENABLED) {
    throw new ApiError(503, 'AI generation is disabled in this environment');
  }

  const cacheHours = env.AI_CACHE_HOURS || 24;
  const cacheThreshold = new Date(Date.now() - cacheHours * 60 * 60 * 1000);
  const cachedLog = !fresh ? await AIGenerationLog.findOne({
    materialId,
    difficulty,
    status: 'success',
    createdAt: { $gte: cacheThreshold },
  }).sort({ createdAt: -1 }) : null;

  if (cachedLog?.generatedQuestionIds?.length) {
    const cachedQuestions = await Question.find({
      _id: { $in: cachedLog.generatedQuestionIds },
      status: 'pending',
      isActive: true,
    });
    if (cachedQuestions.length) {
      await SourceMaterial.findByIdAndUpdate(materialId, {
        processingStatus: 'completed',
        processingCompletedAt: new Date(),
        extractionMethod: 'ai_generated',
        questionsGenerated: cachedQuestions.length,
        questionsIds: cachedQuestions.map((q) => q._id),
      });

      return {
        mode: 'ai',
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
    difficulty,
    status: 'pending',
  });
  log = await log.save();

  try {
    const course = await Course.findById(material.courseId);
    if (!course) {
      throw new ApiError(404, 'Course not found for material');
    }

    if (!material.topicId) {
      throw new ApiError(400, 'Material must be linked to a topic for AI generation');
    }

    const topic = await Topic.findById(material.topicId);
    if (!topic) {
      throw new ApiError(404, 'Topic not found for material');
    }

    const topicName = topic.name;
    const existingQuestionTextSet = await getExistingQuestionTextSet({
      universityId: material.universityId,
      courseId: material.courseId,
      topicId: material.topicId,
    });

    const generationDeadline = Date.now() + AI_GENERATION_TOTAL_TIMEOUT_MS;
    const deduplicatedQuestions = [];
    let lastGenerationError = null;
    for (let attempt = 0; attempt < MAX_AI_ATTEMPTS && deduplicatedQuestions.length < TARGET_QUESTION_COUNT; attempt += 1) {
      const remainingMs = generationDeadline - Date.now();
      if (remainingMs <= 0) {
        throw new ApiError(504, 'Question generation timed out before completion');
      }

      const remainingQuestionCount = TARGET_QUESTION_COUNT - deduplicatedQuestions.length;

      let generatedQuestions;
      try {
        generatedQuestions = await withTimeout(
          generateQuestions(
            material.content,
            course.code,
            topicName,
            difficulty,
            {
              questionCount: remainingQuestionCount,
              excludedQuestionTexts: Array.from(existingQuestionTextSet),
            }
          ),
          Math.min(AI_GENERATION_ATTEMPT_TIMEOUT_MS, remainingMs),
          'Question generation timed out while contacting AI provider'
        );
      } catch (error) {
        lastGenerationError = error;
        continue;
      }

      const uniqueBatch = filterUniqueQuestions(generatedQuestions, existingQuestionTextSet);
      if (!uniqueBatch.length) {
        continue;
      }

      deduplicatedQuestions.push(...uniqueBatch);
    }

    const selectedQuestions = deduplicatedQuestions.slice(0, TARGET_QUESTION_COUNT);
    if (!selectedQuestions.length) {
      if (lastGenerationError) {
        throw lastGenerationError;
      }

      throw new ApiError(
        409,
        'Unable to generate new unique questions for this material. Try a different material or topic.'
      );
    }

    const questionsToCreate = selectedQuestions.map((q) => ({
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

    await SourceMaterial.findByIdAndUpdate(materialId, {
      processingStatus: 'completed',
      processingCompletedAt: new Date(),
      extractionMethod: 'ai_generated',
      questionsGenerated: created.length,
      questionsIds: created.map((q) => q._id),
    });

    return {
      mode: 'ai',
      log,
      questions: created,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const upstreamStatus = error?.response?.status;
    const statusCode =
      error?.statusCode ||
      error?.status ||
      (Number.isInteger(upstreamStatus) ? upstreamStatus : null) ||
      500;
    const upstreamMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error.message;
    const finalMessage =
      statusCode === 429
        ? `Question generation rate-limited: ${upstreamMessage}`
        : `Question generation failed: ${upstreamMessage}`;

    log = await AIGenerationLog.findByIdAndUpdate(
      log._id,
      {
        status: 'failed',
        errorMessage: finalMessage,
        executionTime,
      },
      { new: true }
    );

    await SourceMaterial.findByIdAndUpdate(materialId, {
      processingStatus: 'failed',
      processingCompletedAt: new Date(),
      processingError: finalMessage,
    });

    throw new ApiError(statusCode, finalMessage);
  }
};

const importQuestionsFromMaterial = async (materialId, adminId, questions) => {
  const material = await SourceMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Source material not found');
  }

  if (!material.topicId) {
    throw new ApiError(400, 'Material must be linked to a topic for question import');
  }

  const course = await Course.findById(material.courseId);
  if (!course) {
    throw new ApiError(404, 'Course not found for material');
  }

  const toCreate = questions.map((q) => ({
    universityId: material.universityId,
    courseId: material.courseId,
    topicId: material.topicId,
    departmentId: course.departmentId,
    level: course.level,
    createdBy: adminId,
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    difficulty: q.difficulty || 'medium',
    source: 'Human',
    accessLevel: 'free',
    status: 'pending',
  }));

  const created = await Question.insertMany(toCreate);

  await SourceMaterial.findByIdAndUpdate(materialId, {
    processingStatus: 'completed',
    processingCompletedAt: new Date(),
    questionsGenerated: created.length,
    questionsIds: created.map((q) => q._id),
  });

  return { questions: created };
};

module.exports = {
  uploadMaterial,
  getMaterialById,
  getMaterialsByCourse,
  generateQuestionsFromMaterial,
  importQuestionsFromMaterial,
};
