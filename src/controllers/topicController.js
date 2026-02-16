const topicService = require('../services/topicService');
const courseService = require('../services/courseService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createTopicSchema, updateTopicSchema } = require('../validators/topic.validator');

const createTopic = [
  validate(createTopicSchema),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await courseService.getCourseById(courseId);

    const topic = await topicService.createTopic(courseId, {
      ...req.body,
      universityId: course.universityId,
    });
    res.status(201).json({
      success: true,
      data: topic,
    });
  })
];

const getTopic = asyncHandler(async (req, res) => {
  const topic = await topicService.getTopicById(req.params.id);
  res.status(200).json({
    success: true,
    data: topic,
  });
});

const listTopicsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  await courseService.getCourseById(courseId);

  const topics = await topicService.getTopicsByCourse(courseId, {
    isActive: true,
  });
  res.status(200).json({
    success: true,
    data: topics,
    count: topics.length,
  });
});

const updateTopic = [
  validate(updateTopicSchema),
  asyncHandler(async (req, res) => {
    const topic = await topicService.updateTopic(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: topic,
    });
  })
];

module.exports = {
  createTopic,
  getTopic,
  listTopicsByCourse,
  updateTopic,
};
