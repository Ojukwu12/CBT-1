const UserAnalytics = require('../models/UserAnalytics');
const ExamSession = require('../models/ExamSession');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');

class AnalyticsService {
  /**
   * Get user's analytics dashboard
   * @param {string} userId - User ID
   * @returns {Promise<object>} Dashboard data
   */
  static async getDashboard(userId) {
    let analytics = await UserAnalytics.findOne({ userId });
    
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    return analytics.getDashboard();
  }

  /**
   * Get analytics by topic
   * @param {string} userId - User ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<object>} Topic-specific analytics
   */
  static async getTopicAnalytics(userId, topicId) {
    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    const topicStat = analytics.topicStats?.find(
      t => t.topicId?.toString() === topicId
    );

    if (!topicStat) {
      return {
        topicId,
        questionsAttempted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracyRate: 0,
        averageTime: 0,
        message: 'No attempts yet for this topic'
      };
    }

    return {
      topicId,
      topicName: topicStat.topicName,
      questionsAttempted: topicStat.questionsAttempted,
      correctAnswers: topicStat.correctAnswers,
      incorrectAnswers: topicStat.incorrectAnswers,
      accuracyRate: topicStat.accuracyRate,
      averageTime: topicStat.averageTime,
      difficulty: topicStat.difficulty,
      lastAttemptedAt: topicStat.lastAttemptedAt
    };
  }

  /**
   * Get course-specific analytics
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<object>} Course analytics
   */
  static async getCourseAnalytics(userId, courseId) {
    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    const courseStat = analytics.courseStats?.find(
      c => c.courseId?.toString() === courseId
    );

    if (!courseStat) {
      return {
        courseId,
        examsTaken: 0,
        averageScore: 0,
        completionPercentage: 0,
        message: 'No attempts yet for this course'
      };
    }

    return courseStat;
  }

  /**
   * Get performance trends (last N days)
   * @param {string} userId - User ID
   * @param {number} days - Number of days to analyze (default 30)
   * @returns {Promise<object>} Performance trends
   */
  static async getPerformanceTrends(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const exams = await ExamSession.find({
      userId,
      status: { $in: ['submitted', 'graded'] },
      submittedAt: { $gte: startDate }
    }).sort({ submittedAt: 1 });

    // Group by date
    const trendsByDate = {};
    exams.forEach(exam => {
      const date = exam.submittedAt.toISOString().split('T')[0];
      if (!trendsByDate[date]) {
        trendsByDate[date] = {
          date,
          examsTaken: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          averageScore: 0,
          scores: []
        };
      }

      trendsByDate[date].examsTaken += 1;
      trendsByDate[date].totalQuestions += exam.totalQuestions;
      trendsByDate[date].correctAnswers += exam.correctAnswers;
      trendsByDate[date].scores.push(exam.score);
    });

    // Calculate average score per day
    const trends = Object.values(trendsByDate).map(day => ({
      ...day,
      averageScore: day.scores.length > 0
        ? Math.round(day.scores.reduce((a, b) => a + b) / day.scores.length)
        : 0,
      scores: undefined // Remove raw scores array
    }));

    // Calculate overall statistics
    const totalExams = exams.length;
    const totalQuestions = exams.reduce((sum, e) => sum + e.totalQuestions, 0);
    const totalCorrect = exams.reduce((sum, e) => sum + e.correctAnswers, 0);
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return {
      period: `Last ${days} days`,
      trends,
      summary: {
        totalExams,
        totalQuestions,
        totalCorrect,
        overallAccuracy,
        averageScore: totalExams > 0
          ? Math.round(exams.reduce((sum, e) => sum + e.score, 0) / totalExams)
          : 0
      }
    };
  }

  /**
   * Get weak areas (topics with low accuracy)
   * @param {string} userId - User ID
   * @returns {Promise<object>} Weak areas analysis
   */
  static async getWeakAreas(userId) {
    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    // Get all topic stats and sort by accuracy (lowest first)
    const weakTopics = (analytics.topicStats || [])
      .filter(t => t.questionsAttempted >= 3) // At least 3 attempts
      .sort((a, b) => a.accuracyRate - b.accuracyRate)
      .slice(0, 5);

    // Get difficulty stats
    const difficultyAnalysis = {
      easy: analytics.difficultyStats?.easy || { attempted: 0, correct: 0, accuracy: 0 },
      medium: analytics.difficultyStats?.medium || { attempted: 0, correct: 0, accuracy: 0 },
      hard: analytics.difficultyStats?.hard || { attempted: 0, correct: 0, accuracy: 0 }
    };

    return {
      weakTopics,
      difficultyAnalysis,
      recommendation: weakTopics.length > 0
        ? `Focus on improving: ${weakTopics.map(t => t.topicName).join(', ')}`
        : 'No weak areas identified. Keep practicing!'
    };
  }

  /**
   * Get strong areas (topics with high accuracy)
   * @param {string} userId - User ID
   * @returns {Promise<object>} Strong areas analysis
   */
  static async getStrongAreas(userId) {
    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    // Get all topic stats and sort by accuracy (highest first)
    const strongTopics = (analytics.topicStats || [])
      .filter(t => t.questionsAttempted >= 3) // At least 3 attempts
      .sort((a, b) => b.accuracyRate - a.accuracyRate)
      .slice(0, 5);

    return {
      strongTopics,
      message: strongTopics.length > 0
        ? `You're doing great in: ${strongTopics.map(t => t.topicName).join(', ')}`
        : 'Keep attempting more questions to identify your strengths!'
    };
  }

  /**
   * Get study recommendations based on performance
   * @param {string} userId - User ID
   * @returns {Promise<object>} Personalized recommendations
   */
  static async getRecommendations(userId) {
    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    const recommendations = [];

    // Check if enough exams taken
    if (analytics.totalExamsCompleted < 3) {
      recommendations.push({
        type: 'practice',
        message: 'Take more practice exams to improve your accuracy',
        priority: 'high'
      });
    }

    // Check accuracy
    if (analytics.averageScore < 60) {
      recommendations.push({
        type: 'review',
        message: 'Your accuracy is below 60%. Review weak topics more carefully',
        priority: 'critical'
      });
    } else if (analytics.averageScore < 75) {
      recommendations.push({
        type: 'focus',
        message: 'Focus on challenging topics to improve your score',
        priority: 'high'
      });
    }

    // Check consistency
    const recentPerformance = analytics.performanceTrend?.slice(-5) || [];
    if (recentPerformance.length > 2) {
      const trend = recentPerformance[recentPerformance.length - 1]?.averageScore -
                   recentPerformance[0]?.averageScore;
      if (trend < -5) {
        recommendations.push({
          type: 'consistency',
          message: 'Your recent performance has declined. Review your study approach',
          priority: 'medium'
        });
      }
    }

    // Check weak topics
    const weakTopics = (analytics.weakTopics || []).slice(0, 2);
    if (weakTopics.length > 0) {
      recommendations.push({
        type: 'weak_areas',
        message: `Practice more on: ${weakTopics.map(t => t.topicName).join(', ')}`,
        priority: 'high'
      });
    }

    return {
      recommendations: recommendations.sort((a, b) => {
        const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      }),
      overallAdvice: analytics.averageScore >= 80
        ? 'Excellent performance! Keep up the good work.'
        : analytics.averageScore >= 60
        ? 'Good progress. Continue practicing to reach 80%+'
        : 'You have potential. Focus on fundamentals and weak areas.'
    };
  }

  /**
   * Get monthly statistics
   * @param {string} userId - User ID
   * @param {string} month - Month in YYYY-MM format (optional, defaults to current)
   * @returns {Promise<object>} Monthly stats
   */
  static async getMonthlyStats(userId, month = null) {
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    let analytics = await UserAnalytics.findOne({ userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId });
      await analytics.save();
    }

    const monthlyStat = analytics.monthlyStats?.find(m => m.month === month);

    if (!monthlyStat) {
      return {
        month,
        examsTaken: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        averageScore: 0,
        message: 'No activity in this month'
      };
    }

    return monthlyStat;
  }

  /**
   * Get leaderboard position
   * @param {string} userId - User ID
   * @returns {Promise<object>} User's leaderboard position
   */
  static async getLeaderboardPosition(userId) {
    const userAnalytics = await UserAnalytics.findOne({ userId });
    if (!userAnalytics) {
      return {
        userId,
        rank: null,
        score: 0,
        percentile: 0,
        message: 'No exams taken yet'
      };
    }

    // Count users with higher average score
    const betterUsers = await UserAnalytics.countDocuments({
      averageScore: { $gt: userAnalytics.averageScore }
    });

    const totalUsers = await UserAnalytics.countDocuments();
    const rank = betterUsers + 1;
    const percentile = Math.round((((totalUsers - betterUsers) / totalUsers) * 100));

    return {
      userId,
      rank,
      score: userAnalytics.averageScore,
      percentile,
      totalUsers,
      message: `You're in the top ${percentile}%`
    };
  }
}

module.exports = AnalyticsService;
