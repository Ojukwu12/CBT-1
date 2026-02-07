const User = require('../models/User');
const ExamSession = require('../models/ExamSession');
const Question = require('../models/Question');
const UserAnalytics = require('../models/UserAnalytics');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');

class AdminAnalyticsService {
  static async getOverviewStats() {
    const totalUsers = await User.countDocuments();
    const totalExams = await ExamSession.countDocuments({ status: { $in: ['submitted', 'graded'] } });
    const totalQuestions = await Question.countDocuments({ status: 'approved' });
    const totalRevenue = await Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

    return {
      totalUsers,
      activeUsers,
      totalExams,
      totalQuestions,
      totalRevenue: totalRevenue[0]?.total || 0,
      timestamp: new Date()
    };
  }

  static async getUserMetrics() {
    const usersByTier = await User.aggregate([
      { $group: { _id: '$tier', count: { $sum: 1 } } }
    ]);

    const usersWithExams = await User.countDocuments({ examsCompleted: { $gt: 0 } });
    const averageExamsPerUser = await ExamSession.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $group: { _id: null, avgExams: { $avg: '$count' } } }
    ]);

    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    const totalUsers = await User.countDocuments();
    const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    return {
      usersByTier: Object.fromEntries(usersByTier.map(u => [u._id, u.count])),
      usersWithExams,
      averageExamsPerUser: averageExamsPerUser[0]?.avgExams || 0,
      retentionRate30Days: Math.round(retentionRate),
      timestamp: new Date()
    };
  }

  static async getQuestionPerformance() {
    const questionStats = await Question.aggregate([
      { $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        averageAttempts: { $avg: '$stats.timesAttempted' },
        averageAccuracy: { $avg: '$stats.accuracy' }
      }}
    ]);

    const topQuestions = await Question.find({ status: 'approved' })
      .sort({ 'stats.timesAttempted': -1 })
      .limit(10)
      .select('text stats difficulty');

    const difficultQuestions = await Question.find({ status: 'approved', 'stats.timesAttempted': { $gt: 5 } })
      .sort({ 'stats.accuracy': 1 })
      .limit(10)
      .select('text stats difficulty');

    return {
      totalApproved: questionStats[0]?.totalQuestions || 0,
      averageAttempts: Math.round(questionStats[0]?.averageAttempts || 0),
      averageAccuracy: Math.round(questionStats[0]?.averageAccuracy || 0),
      topPerforming: topQuestions,
      needsReview: difficultQuestions,
      timestamp: new Date()
    };
  }

  static async getExamStatistics() {
    const examStats = await ExamSession.aggregate([
      { $match: { status: { $in: ['submitted', 'graded'] } } },
      { $group: {
        _id: null,
        totalExams: { $sum: 1 },
        averageScore: { $avg: '$score' },
        passRate: { $avg: { $cond: [{ $gte: ['$isPassed', true] }, 1, 0] } },
        averageTime: { $avg: '$timeSpentSeconds' }
      }}
    ]);

    const examsByType = await ExamSession.aggregate([
      { $match: { status: { $in: ['submitted', 'graded'] } } },
      { $group: { _id: '$examType', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }
    ]);

    return {
      totalExams: examStats[0]?.totalExams || 0,
      averageScore: Math.round(examStats[0]?.averageScore || 0),
      passRate: Math.round((examStats[0]?.passRate || 0) * 100),
      averageTime: examStats[0]?.averageTime || 0,
      byType: Object.fromEntries(examsByType.map(e => [e._id, { count: e.count, avgScore: Math.round(e.avgScore) }])),
      timestamp: new Date()
    };
  }

  static async getRevenueData() {
    const totalRevenue = await Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const revenueByPlan = await Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$planType', revenue: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const monthlyRevenue = await Transaction.aggregate([
      { $match: { status: 'success' } },
      { $group: { 
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: -1 } },
      { $limit: 12 }
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      byPlan: Object.fromEntries(revenueByPlan.map(r => [r._id, { revenue: r.revenue, transactions: r.count }])),
      monthlyTrend: monthlyRevenue,
      timestamp: new Date()
    };
  }

  static async getUniversityStats(universityId) {
    const universityUsers = await User.countDocuments({ universityId });
    const userIds = (await User.find({ universityId }).select('_id')).map(u => u._id);
    const universityExams = await ExamSession.countDocuments({
      userId: { $in: userIds }
    });

    const avgScore = await ExamSession.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);

    return {
      universityId,
      totalUsers: universityUsers,
      totalExams: universityExams,
      averageScore: Math.round(avgScore[0]?.avgScore || 0),
      timestamp: new Date()
    };
  }

  static async exportAnalyticsData(format = 'json') {
    const data = {
      overview: await this.getOverviewStats(),
      users: await this.getUserMetrics(),
      questions: await this.getQuestionPerformance(),
      exams: await this.getExamStatistics(),
      revenue: await this.getRevenueData()
    };

    return {
      format,
      data,
      exportedAt: new Date()
    };
  }

  static async generateReport(reportType, options = {}) {
    switch (reportType) {
      case 'performance':
        return await this.getExamStatistics();
      case 'users':
        return await this.getUserMetrics();
      case 'revenue':
        return await this.getRevenueData();
      case 'questions':
        return await this.getQuestionPerformance();
      case 'overview':
        return await this.getOverviewStats();
      default:
        throw new ApiError(400, 'Invalid report type');
    }
  }
}

module.exports = AdminAnalyticsService;
