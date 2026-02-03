const AnalyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class AnalyticsController {
  /**
   * Get user's analytics dashboard
   * GET /api/analytics/dashboard
   */
  static getDashboard = asyncHandler(async (req, res) => {
    const result = await AnalyticsService.getDashboard(req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Dashboard data retrieved')
    );
  });

  /**
   * Get analytics for a specific topic
   * GET /api/analytics/topic/:topicId
   */
  static getTopicAnalytics = asyncHandler(async (req, res) => {
    const { topicId } = req.params;

    const result = await AnalyticsService.getTopicAnalytics(req.user.id, topicId);

    res.status(200).json(
      new ApiResponse(200, result, 'Topic analytics retrieved')
    );
  });

  /**
   * Get analytics for a specific course
   * GET /api/analytics/course/:courseId
   */
  static getCourseAnalytics = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const result = await AnalyticsService.getCourseAnalytics(req.user.id, courseId);

    res.status(200).json(
      new ApiResponse(200, result, 'Course analytics retrieved')
    );
  });

  /**
   * Get performance trends
   * GET /api/analytics/trends?days=30
   */
  static getPerformanceTrends = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    const result = await AnalyticsService.getPerformanceTrends(req.user.id, parseInt(days));

    res.status(200).json(
      new ApiResponse(200, result, 'Performance trends retrieved')
    );
  });

  /**
   * Get weak areas analysis
   * GET /api/analytics/weak-areas
   */
  static getWeakAreas = asyncHandler(async (req, res) => {
    const result = await AnalyticsService.getWeakAreas(req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Weak areas analysis retrieved')
    );
  });

  /**
   * Get strong areas analysis
   * GET /api/analytics/strong-areas
   */
  static getStrongAreas = asyncHandler(async (req, res) => {
    const result = await AnalyticsService.getStrongAreas(req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Strong areas analysis retrieved')
    );
  });

  /**
   * Get personalized recommendations
   * GET /api/analytics/recommendations
   */
  static getRecommendations = asyncHandler(async (req, res) => {
    const result = await AnalyticsService.getRecommendations(req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Recommendations retrieved')
    );
  });

  /**
   * Get monthly statistics
   * GET /api/analytics/monthly?month=2024-02
   */
  static getMonthlyStats = asyncHandler(async (req, res) => {
    const { month } = req.query;

    const result = await AnalyticsService.getMonthlyStats(req.user.id, month);

    res.status(200).json(
      new ApiResponse(200, result, 'Monthly statistics retrieved')
    );
  });

  /**
   * Get user's leaderboard position
   * GET /api/analytics/leaderboard/position
   */
  static getLeaderboardPosition = asyncHandler(async (req, res) => {
    const result = await AnalyticsService.getLeaderboardPosition(req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Leaderboard position retrieved')
    );
  });
}

module.exports = AnalyticsController;
