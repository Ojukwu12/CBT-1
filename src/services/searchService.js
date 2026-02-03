const Question = require('../models/Question');
const Topic = require('../models/Topic');
const ApiError = require('../utils/ApiError');

class SearchService {
  static async searchQuestions(query, filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const searchQuery = {
      status: 'approved',
      $text: { $search: query }
    };

    // Apply optional filters
    if (filters.difficulty) {
      searchQuery.difficulty = filters.difficulty;
    }
    if (filters.topicId) {
      searchQuery.topicId = filters.topicId;
    }
    if (filters.courseId) {
      searchQuery.courseId = filters.courseId;
    }

    const [questions, total] = await Promise.all([
      Question.find(searchQuery)
        .select('-answers')
        .skip(skip)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } }),
      Question.countDocuments(searchQuery)
    ]);

    return {
      questions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async advancedFilterQuestions(filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { status: 'approved' };

    // Build dynamic query
    if (filters.difficulty) {
      query.difficulty = Array.isArray(filters.difficulty) ? { $in: filters.difficulty } : filters.difficulty;
    }
    if (filters.topicId) {
      query.topicId = filters.topicId;
    }
    if (filters.courseId) {
      query.courseId = filters.courseId;
    }
    if (filters.minAccuracy !== undefined) {
      query['stats.accuracy'] = { $gte: filters.minAccuracy };
    }
    if (filters.maxAttempts !== undefined) {
      query['stats.timesAttempted'] = { $lte: filters.maxAttempts };
    }
    if (filters.question) {
      query.text = { $regex: filters.question, $options: 'i' };
    }

    const [questions, total] = await Promise.all([
      Question.find(query)
        .select('-answers')
        .skip(skip)
        .limit(limit)
        .sort(filters.sort || { createdAt: -1 }),
      Question.countDocuments(query)
    ]);

    return {
      questions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async searchTopics(query, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const searchQuery = {
      status: 'active',
      $text: { $search: query }
    };

    const [topics, total] = await Promise.all([
      Topic.find(searchQuery)
        .skip(skip)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } }),
      Topic.countDocuments(searchQuery)
    ]);

    return {
      topics,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async globalSearch(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [questions, topics] = await Promise.all([
      Question.find({ status: 'approved', $text: { $search: query } })
        .select('-answers')
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } }),
      Topic.find({ status: 'active', $text: { $search: query } })
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } })
    ]);

    return {
      questions,
      topics,
      query,
      totalResults: questions.length + topics.length
    };
  }
}

module.exports = SearchService;
