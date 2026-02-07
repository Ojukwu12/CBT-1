const AdminAnalyticsService = require('../services/adminAnalyticsService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');

class AdminAnalyticsController {
  static getOverviewStats = asyncHandler(async (req, res) => {
    const stats = await AdminAnalyticsService.getOverviewStats();
    res.status(200).json(new ApiResponse(200, stats, 'Overview statistics retrieved successfully'));
  });

  static getUserMetrics = asyncHandler(async (req, res) => {
    const metrics = await AdminAnalyticsService.getUserMetrics();
    res.status(200).json(new ApiResponse(200, metrics, 'User metrics retrieved successfully'));
  });

  static getQuestionPerformance = asyncHandler(async (req, res) => {
    const performance = await AdminAnalyticsService.getQuestionPerformance();
    res.status(200).json(new ApiResponse(200, performance, 'Question performance retrieved successfully'));
  });

  static getExamStatistics = asyncHandler(async (req, res) => {
    const stats = await AdminAnalyticsService.getExamStatistics();
    res.status(200).json(new ApiResponse(200, stats, 'Exam statistics retrieved successfully'));
  });

  static getRevenueData = asyncHandler(async (req, res) => {
    const revenue = await AdminAnalyticsService.getRevenueData();
    res.status(200).json(new ApiResponse(200, revenue, 'Revenue data retrieved successfully'));
  });

  static getUniversityStats = asyncHandler(async (req, res) => {
    const { universityId } = req.params;
    const stats = await AdminAnalyticsService.getUniversityStats(universityId);
    res.status(200).json(new ApiResponse(200, stats, 'University statistics retrieved successfully'));
  });

  static exportData = asyncHandler(async (req, res) => {
    const { format = 'json' } = req.query;
    const data = await AdminAnalyticsService.exportAnalyticsData(format);
    res.status(200).json(new ApiResponse(200, data, 'Analytics data exported successfully'));
  });

  static generateReport = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const report = await AdminAnalyticsService.generateReport(type);
    res.status(200).json(new ApiResponse(200, report, `${type} report generated successfully`));
  });
}

module.exports = AdminAnalyticsController;
