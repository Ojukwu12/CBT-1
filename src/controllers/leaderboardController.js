const LeaderboardService = require('../services/leaderboardService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class LeaderboardController {
  static getGlobalLeaderboard = asyncHandler(async (req, res) => {
    const { limit = 100, page = 1 } = req.query;

    const result = await LeaderboardService.getGlobalLeaderboard(parseInt(limit), parseInt(page));

    res.status(200).json(new ApiResponse(200, result, 'Global leaderboard retrieved'));
  });

  static getUniversityLeaderboard = asyncHandler(async (req, res) => {
    const { universityId } = req.params;
    const { limit = 100, page = 1 } = req.query;

    const result = await LeaderboardService.getUniversityLeaderboard(universityId, parseInt(limit), parseInt(page));

    res.status(200).json(new ApiResponse(200, result, 'University leaderboard retrieved'));
  });

  static getCourseLeaderboard = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { limit = 100, page = 1 } = req.query;

    const result = await LeaderboardService.getCourseLeaderboard(courseId, parseInt(limit), parseInt(page));

    res.status(200).json(new ApiResponse(200, result, 'Course leaderboard retrieved'));
  });

  static getMonthlyLeaderboard = asyncHandler(async (req, res) => {
    const { month } = req.params;
    const { limit = 100, page = 1 } = req.query;

    const result = await LeaderboardService.getMonthlyLeaderboard(month, parseInt(limit), parseInt(page));

    res.status(200).json(new ApiResponse(200, result, 'Monthly leaderboard retrieved'));
  });
}

module.exports = LeaderboardController;
