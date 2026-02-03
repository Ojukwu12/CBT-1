const Topic = require('../models/Topic');
const ApiError = require('../utils/ApiError');

const createTopic = async (courseId, topicData) => {
  const existingTopic = await Topic.findOne({
    courseId,
    name: topicData.name,
  });

  if (existingTopic) {
    throw new ApiError(409, 'Topic with this name already exists in this course');
  }

  const topic = new Topic({
    ...topicData,
    courseId,
    universityId: topicData.universityId,
  });

  return await topic.save();
};

const getTopicById = async (id) => {
  const topic = await Topic.findById(id)
    .populate('universityId')
    .populate('courseId');

  if (!topic) {
    throw new ApiError(404, 'Topic not found');
  }

  return topic;
};

const getTopicsByCourse = async (courseId, filters = {}) => {
  const query = { courseId, ...filters };
  return await Topic.find(query).select('-__v');
};

const updateTopic = async (id, updateData) => {
  const topic = await Topic.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!topic) {
    throw new ApiError(404, 'Topic not found');
  }

  return topic;
};

module.exports = {
  createTopic,
  getTopicById,
  getTopicsByCourse,
  updateTopic,
};
