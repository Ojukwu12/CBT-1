const SearchService = require('../services/searchService');
const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class SearchController {
  static searchQuestions = asyncHandler(async (req, res) => {
    const { q, difficulty, topicId, courseId, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json(new ApiResponse(400, null, 'Search query required'));
    }

    const result = await SearchService.searchQuestions(
      q,
      { difficulty, topicId, courseId },
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json(new ApiResponse(200, result, 'Questions found successfully'));
  });

  static advancedFilter = asyncHandler(async (req, res) => {
    const { difficulty, topicId, courseId, minAccuracy, maxAttempts, question, sort, page = 1, limit = 20 } = req.query;

    const filters = {
      difficulty,
      topicId,
      courseId,
      minAccuracy: minAccuracy ? parseInt(minAccuracy) : undefined,
      maxAttempts: maxAttempts ? parseInt(maxAttempts) : undefined,
      question,
      sort: sort ? JSON.parse(sort) : undefined
    };

    const result = await SearchService.advancedFilterQuestions(
      filters,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json(new ApiResponse(200, result, 'Filtered results retrieved successfully'));
  });

  static searchTopics = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json(new ApiResponse(400, null, 'Search query required'));
    }

    const result = await SearchService.searchTopics(q, parseInt(page), parseInt(limit));

    res.status(200).json(new ApiResponse(200, result, 'Topics found successfully'));
  });

  static globalSearch = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json(new ApiResponse(400, null, 'Search query required'));
    }

    const result = await SearchService.globalSearch(q, parseInt(page), parseInt(limit));

    res.status(200).json(new ApiResponse(200, result, 'Global search completed successfully'));
  });
}

module.exports = SearchController;
