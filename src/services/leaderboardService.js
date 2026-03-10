const Leaderboard = require('../models/Leaderboard');
const UserAnalytics = require('../models/UserAnalytics');
const ExamSession = require('../models/ExamSession');

class LeaderboardService {
  static getMinimumExamsRequired() {
    return 8;
  }

  static getBayesianPriorWeight() {
    return 12;
  }

  static calculateRankingScore(item, globalAverageScore) {
    const examsCompleted = item.totalExamsCompleted || 0;
    const averageScore = item.averageScore || 0;
    const priorWeight = this.getBayesianPriorWeight();

    const bayesianScore = ((averageScore * examsCompleted) + (globalAverageScore * priorWeight)) / (examsCompleted + priorWeight);
    const experienceBonus = Math.min(Math.log2(Math.max(examsCompleted, 1)), 6) * 0.35;
    const consistencySignal = Math.min(((item.totalQuestionsAttempted || 0) / 400), 1) * 1.5;

    return Number(Math.min(100, bayesianScore + experienceBonus + consistencySignal).toFixed(2));
  }

  static mapAnalyticsToRankings(analytics) {
    const globalAverageScore = analytics.length > 0
      ? analytics.reduce((sum, item) => sum + (item.averageScore || 0), 0) / analytics.length
      : 0;

    return analytics
      .filter((item) => item?.userId?._id)
      .map((item) => ({
        item,
        rankingScore: this.calculateRankingScore(item, globalAverageScore)
      }))
      .sort((a, b) => (
        b.rankingScore - a.rankingScore ||
        (b.item.averageScore || 0) - (a.item.averageScore || 0) ||
        (b.item.totalExamsCompleted || 0) - (a.item.totalExamsCompleted || 0) ||
        (b.item.totalQuestionsAttempted || 0) - (a.item.totalQuestionsAttempted || 0)
      ))
      .map((item, index) => ({
        rank: index + 1,
        userId: item.item.userId._id,
        firstName: item.item.userId.firstName,
        lastName: item.item.userId.lastName,
        score: item.rankingScore,
        examsCompleted: item.item.totalExamsCompleted,
        accuracy: item.item.accuracyRate,
        totalQuestions: item.item.totalQuestionsAttempted,
        correctAnswers: item.item.totalCorrectAnswers,
        streak: item.item.streaks?.currentStreak || 0
      }));
  }

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
    const analytics = await UserAnalytics.find({
      totalExamsCompleted: { $gte: this.getMinimumExamsRequired() }
    })
      .limit(1000)
      .populate('userId', 'firstName lastName');

    const rankings = this.mapAnalyticsToRankings(analytics);

    const board = await Leaderboard.findOneAndUpdate(
      { type: 'global' },
      { rankings, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    return board;
  }

  static async generateUniversityLeaderboard(universityId) {
    // Get users who have taken exams from this university
    const userIds = await ExamSession.distinct('userId', { 
      universityId,
      status: { $in: ['submitted', 'graded'] }
    });

    const analytics = await UserAnalytics.find({
      userId: { $in: userIds },
      totalExamsCompleted: { $gte: this.getMinimumExamsRequired() }
    })
      .limit(1000)
      .populate('userId', 'firstName lastName');

    const rankings = this.mapAnalyticsToRankings(analytics);

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
      totalExamsCompleted: { $gte: this.getMinimumExamsRequired() }
    })
      .limit(1000)
      .populate('userId', 'firstName lastName');

    const rankings = this.mapAnalyticsToRankings(analytics);

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
      totalExamsCompleted: { $gte: this.getMinimumExamsRequired() },
      'performanceTrend.date': { $gte: startDate, $lt: endDate }
    })
      .limit(1000)
      .populate('userId', 'firstName lastName');

    const rankings = this.mapAnalyticsToRankings(analytics);

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

  static async refreshLeaderboardsForExam(examSession) {
    if (!examSession) return;

    const jobs = [this.generateGlobalLeaderboard()];

    if (examSession.universityId) {
      jobs.push(this.generateUniversityLeaderboard(examSession.universityId));
    }

    if (examSession.courseId) {
      jobs.push(this.generateCourseLeaderboard(examSession.courseId));
    }

    const submittedAt = examSession.submittedAt || new Date();
    const month = `${submittedAt.getFullYear()}-${String(submittedAt.getMonth() + 1).padStart(2, '0')}`;
    jobs.push(this.generateMonthlyLeaderboard(month));

    await Promise.all(jobs);
  }

  static async getUserGlobalPosition(userId) {
    let board = await Leaderboard.findOne({ type: 'global' });

    if (!board || this.isStale(board)) {
      board = await this.generateGlobalLeaderboard();
    }

    const rankings = board?.rankings || [];
    const totalUsers = rankings.length;
    const userIndex = rankings.findIndex((entry) => entry.userId?.toString() === userId.toString());

    if (userIndex === -1) {
      return {
        eligible: false,
        rank: null,
        percentile: 0,
        score: 0,
        totalUsers,
        minimumExamsRequired: this.getMinimumExamsRequired()
      };
    }

    const rank = userIndex + 1;
    const percentile = totalUsers > 0
      ? Math.round(((totalUsers - userIndex) / totalUsers) * 100)
      : 0;

    return {
      eligible: true,
      rank,
      percentile,
      score: rankings[userIndex].score,
      examsCompleted: rankings[userIndex].examsCompleted,
      totalUsers,
      minimumExamsRequired: this.getMinimumExamsRequired()
    };
  }

  static async forceRecomputeAllLeaderboards() {
    await this.generateGlobalLeaderboard();

    const [universityIds, courseIds, monthlyBuckets] = await Promise.all([
      ExamSession.distinct('universityId', {
        status: { $in: ['submitted', 'graded'] },
        universityId: { $ne: null }
      }),
      ExamSession.distinct('courseId', {
        status: { $in: ['submitted', 'graded'] },
        courseId: { $ne: null }
      }),
      ExamSession.aggregate([
        {
          $addFields: {
            rankingDate: { $ifNull: ['$submittedAt', '$createdAt'] }
          }
        },
        {
          $match: {
            status: { $in: ['submitted', 'graded'] },
            rankingDate: { $ne: null }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$rankingDate' },
              month: { $month: '$rankingDate' }
            }
          }
        },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                {
                  $cond: [
                    { $lt: ['$_id.month', 10] },
                    { $concat: ['0', { $toString: '$_id.month' }] },
                    { $toString: '$_id.month' }
                  ]
                }
              ]
            }
          }
        },
        { $sort: { month: 1 } }
      ])
    ]);

    await Promise.all([
      Promise.all((universityIds || []).map((universityId) => this.generateUniversityLeaderboard(universityId))),
      Promise.all((courseIds || []).map((courseId) => this.generateCourseLeaderboard(courseId))),
      Promise.all((monthlyBuckets || []).map((bucket) => this.generateMonthlyLeaderboard(bucket.month)))
    ]);

    return {
      minimumExamsRequired: this.getMinimumExamsRequired(),
      global: 'recomputed',
      universitiesRecomputed: (universityIds || []).length,
      coursesRecomputed: (courseIds || []).length,
      monthlyBoardsRecomputed: (monthlyBuckets || []).length,
      recomputedAt: new Date().toISOString()
    };
  }
}

module.exports = LeaderboardService;
