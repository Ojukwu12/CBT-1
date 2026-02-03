const Material = require('../models/Material');
const Question = require('../models/Question');
const AIGenerationLog = require('../models/AIGenerationLog');
const { generateQuestions } = require('../utils/gemini');
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

  let log = new AIGenerationLog({
    materialId,
    universityId: material.universityId,
    initiatedBy: adminId,
    status: 'pending',
  });

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
