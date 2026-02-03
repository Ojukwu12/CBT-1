const Leaderboard = require('../models/Leaderboard');
const UserAnalytics = require('../models/UserAnalytics');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

class LeaderboardService {
  static async getGlobalLeaderboard(limit = 100, page = 1) {
    const skip = (page - 1) * limit;

    let board = await Leaderboard.findOne({ type: 'global' });
    
    if (!board || this.isStale(board)) {
      board = await this.generateGlobalLeaderboard();
    }

    const rankings = board.rankings.slice(skip, skip + limit);
    return {
      type: 'global',
      rankings,
      total: board.rankings.length,
      page,
      limit,
      lastUpdated: board.lastUpdated
    };
  }

  static async getUniversityLeaderboard(universityId, limit = 100, page = 1) {
    const skip = (page - 1) * limit;

    let board = await Leaderboard.findOne({ type: 'university', universityId });
    
    if (!board || this.isStale(board)) {
      board = await this.generateUniversityLeaderboard(universityId);
    }

    const rankings = board.rankings.slice(skip, skip + limit);
    return {
      type: 'university',
      universityId,
      rankings,
      total: board.rankings.length,
      page,
      limit,
      lastUpdated: board.lastUpdated
    };
  }

  static async getCourseLeaderboard(courseId, limit = 100, page = 1) {
    const skip = (page - 1) * limit;

    let board = await Leaderboard.findOne({ type: 'course', courseId });
    
    if (!board || this.isStale(board)) {
      board = await this.generateCourseLeaderboard(courseId);
    }

    const rankings = board.rankings.slice(skip, skip + limit);
    return {
      type: 'course',
      courseId,
      rankings,
      total: board.rankings.length,
      page,
      limit,
      lastUpdated: board.lastUpdated
    };
  }

  static async getMonthlyLeaderboard(month, limit = 100, page = 1) {
    const skip = (page - 1) * limit;

    let board = await Leaderboard.findOne({ type: 'monthly', month });
    
    if (!board) {
      board = await this.generateMonthlyLeaderboard(month);
    }

    const rankings = board.rankings.slice(skip, skip + limit);
    return {
      type: 'monthly',
      month,
      rankings,
      total: board.rankings.length,
      page,
      limit,
      lastUpdated: board.lastUpdated
    };
  }

  static async generateGlobalLeaderboard() {
    const analytics = await UserAnalytics.find({ totalExamsCompleted: { $gt: 0 } })
      .sort({ averageScore: -1 })
      .limit(1000)
      .populate('userId', 'firstName lastName email');

    const rankings = analytics.map((a, index) => ({
      rank: index + 1,
      userId: a.userId._id,
      firstName: a.userId.firstName,
      lastName: a.userId.lastName,
      email: a.userId.email,
      score: a.averageScore,
      examsCompleted: a.totalExamsCompleted,
      accuracy: a.accuracyRate,
      totalQuestions: a.totalQuestionsAttempted,
      correctAnswers: a.totalCorrectAnswers,
      streak: a.streaks?.currentStreak || 0
    }));

    const board = await Leaderboard.findOneAndUpdate(
      { type: 'global' },
      { rankings, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    return board;
  }

  static async generateUniversityLeaderboard(universityId) {
    const users = await User.find({ universityId }).select('_id');
    const userIds = users.map(u => u._id);

    const analytics = await UserAnalytics.find({ userId: { $in: userIds }, totalExamsCompleted: { $gt: 0 } })
      .sort({ averageScore: -1 })
      .limit(1000)
      .populate('userId', 'firstName lastName email');

    const rankings = analytics.map((a, index) => ({
      rank: index + 1,
      userId: a.userId._id,
      firstName: a.userId.firstName,
      lastName: a.userId.lastName,
      email: a.userId.email,
      score: a.averageScore,
      examsCompleted: a.totalExamsCompleted,
      accuracy: a.accuracyRate,
      totalQuestions: a.totalQuestionsAttempted,
      correctAnswers: a.totalCorrectAnswers,
      streak: a.streaks?.currentStreak || 0
    }));

    const board = await Leaderboard.findOneAndUpdate(
      { type: 'university', universityId },
      { rankings, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    return board;
  }

  static async generateCourseLeaderboard(courseId) {
    const analytics = await UserAnalytics.find({
      'courseStats.courseId': courseId,
      totalExamsCompleted: { $gt: 0 }
    })
      .sort({ averageScore: -1 })
      .limit(1000)
      .populate('userId', 'firstName lastName email');

    const rankings = analytics.map((a, index) => ({
      rank: index + 1,
      userId: a.userId._id,
      firstName: a.userId.firstName,
      lastName: a.userId.lastName,
      email: a.userId.email,
      score: a.averageScore,
      examsCompleted: a.totalExamsCompleted,
      accuracy: a.accuracyRate,
      totalQuestions: a.totalQuestionsAttempted,
      correctAnswers: a.totalCorrectAnswers,
      streak: a.streaks?.currentStreak || 0
    }));

    const board = await Leaderboard.findOneAndUpdate(
      { type: 'course', courseId },
      { rankings, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    return board;
  }

  static async generateMonthlyLeaderboard(month) {
    const [year, monthNum] = month.split('-');
    const startDate = new Date(`${year}-${monthNum}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // This would need ExamSession data filtered by date
    const analytics = await UserAnalytics.find({
      totalExamsCompleted: { $gt: 0 },
      'performanceTrend.date': { $gte: startDate, $lt: endDate }
    })
      .sort({ averageScore: -1 })
      .limit(1000)
      .populate('userId', 'firstName lastName email');

    const rankings = analytics.map((a, index) => ({
      rank: index + 1,
      userId: a.userId._id,
      firstName: a.userId.firstName,
      lastName: a.userId.lastName,
      email: a.userId.email,
      score: a.averageScore,
      examsCompleted: a.totalExamsCompleted,
      accuracy: a.accuracyRate,
      totalQuestions: a.totalQuestionsAttempted,
      correctAnswers: a.totalCorrectAnswers,
      streak: a.streaks?.currentStreak || 0
    }));

    const board = await Leaderboard.findOneAndUpdate(
      { type: 'monthly', month },
      { rankings, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    return board;
  }

  static isStale(board, hours = 24) {
    const now = new Date();
    const diff = (now - board.lastUpdated) / (1000 * 60 * 60);
    return diff > hours;
  }
}

module.exports = LeaderboardService;
