const mongoose = require('mongoose');
const ExamSession = require('../models/ExamSession');
const Question = require('../models/Question');
const UserAnalytics = require('../models/UserAnalytics');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

class ExamService {
  /**
   * Start a new exam session
   * @param {string} userId - User ID
   * @param {object} examData - Exam configuration
   * @returns {Promise<object>} Exam session with questions
   */
  static async startExam(userId, examData) {
    const { examType = 'practice', courseId, topicIds = [], totalQuestions = 10, durationMinutes = 60 } = examData;

    // Verify user exists and check tier access
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    // Build query for questions
    const query = {
      isActive: true,
      status: 'approved'
    };

    if (courseId) {
      query.courseId = new mongoose.Types.ObjectId(courseId);
    }

    if (topicIds.length > 0) {
      query.topicId = { $in: topicIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    // Apply tier-based access control
    if (user.plan === 'free') {
      query.accessLevel = 'free';
    } else if (user.plan === 'basic') {
      query.accessLevel = { $in: ['free', 'basic'] };
    }
    // Premium users get all questions

    // Get random questions
    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: Math.min(totalQuestions, 100) } },
      { $project: { correctAnswer: 0 } } // Don't send correct answers to client
    ]);

    if (questions.length === 0) {
      throw new ApiError(404, 'No questions available for this exam configuration');
    }

    // Create exam session
    const examSession = new ExamSession({
      userId,
      examType,
      courseId: courseId || null,
      topicIds,
      totalQuestions: questions.length,
      durationMinutes,
      questionsData: questions.map(q => ({
        questionId: q._id,
        selectedAnswer: null,
        isCorrect: null,
        timeSpentSeconds: 0,
        attemptedAt: null
      }))
    });

    await examSession.save();

    return {
      examSessionId: examSession._id,
      examType: examSession.examType,
      totalQuestions: examSession.totalQuestions,
      durationMinutes: examSession.durationMinutes,
      startedAt: examSession.startedAt,
      questions: questions.map(q => ({
        questionId: q._id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty
      }))
    };
  }

  /**
   * Submit answer for a question in exam
   * @param {string} examSessionId - Exam session ID
   * @param {string} questionId - Question ID
   * @param {string} selectedAnswer - User's selected answer
   * @param {number} timeSpentSeconds - Time spent on this question
   * @returns {Promise<object>} Answer submission response
   */
  static async submitAnswer(examSessionId, questionId, selectedAnswer, timeSpentSeconds = 0) {
    const examSession = await ExamSession.findById(examSessionId);
    if (!examSession) throw new ApiError(404, 'Exam session not found');

    if (examSession.status !== 'in_progress') {
      throw new ApiError(400, 'Exam is not in progress');
    }

    if (examSession.isExpired) {
      throw new ApiError(400, 'Exam time has expired');
    }

    // Get question and verify it exists
    const question = await Question.findById(questionId);
    if (!question) throw new ApiError(404, 'Question not found');

    // Find question in exam session
    const questionIndex = examSession.questionsData.findIndex(
      q => q.questionId.toString() === questionId
    );

    if (questionIndex === -1) {
      throw new ApiError(400, 'Question is not part of this exam');
    }

    // Check if answer is correct
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Update question attempt data
    const oldData = examSession.questionsData[questionIndex];
    const wasNotAnswered = !oldData.selectedAnswer;
    const wasNotCorrect = !oldData.isCorrect;

    examSession.questionsData[questionIndex] = {
      ...oldData,
      selectedAnswer,
      isCorrect,
      timeSpentSeconds: timeSpentSeconds || 0,
      attemptedAt: new Date()
    };

    // Use atomic operations to prevent race conditions
    const updateOps = {
      $set: {
        [`questionsData.${questionIndex}`]: examSession.questionsData[questionIndex],
      },
      $inc: {
        timeSpentSeconds: timeSpentSeconds || 0
      }
    };

    // Only increment counters if conditions are met
    if (wasNotAnswered) {
      updateOps.$inc.answeredQuestions = 1;
    }
    if (isCorrect && wasNotCorrect) {
      updateOps.$inc.correctAnswers = 1;
    }

    await ExamSession.findByIdAndUpdate(examSessionId, updateOps, { new: true });

    // Update question statistics atomically
    await Question.findByIdAndUpdate(
      questionId,
      {
        $inc: {
          'stats.timesAttempted': 1,
          'stats.correctAnswers': isCorrect ? 1 : 0,
          'stats.incorrectAnswers': isCorrect ? 0 : 1
        },
        $set: {
          'stats.lastAttemptedAt': new Date()
        }
      },
      { new: true }
    );

    // Reload exam session to get updated data
    const updatedExamSession = await ExamSession.findById(examSessionId);

    return {
      questionId,
      isCorrect,
      feedback: isCorrect ? 'Correct!' : `The correct answer is ${question.correctAnswer}`,
      answeredQuestions: examSession.answeredQuestions,
      correctAnswers: examSession.correctAnswers
    };
  }

  /**
   * Get exam session summary (before submitting)
   * @param {string} examSessionId - Exam session ID
   * @returns {Promise<object>} Exam summary
   */
  static async getExamSummary(examSessionId) {
    const examSession = await ExamSession.findById(examSessionId);
    if (!examSession) throw new ApiError(404, 'Exam session not found');

    return {
      examSessionId: examSession._id,
      status: examSession.status,
      totalQuestions: examSession.totalQuestions,
      answeredQuestions: examSession.answeredQuestions,
      correctAnswers: examSession.correctAnswers,
      remainingTimeSeconds: examSession.remainingTimeSeconds,
      isExpired: examSession.isExpired,
      startedAt: examSession.startedAt,
      submittedAt: examSession.submittedAt
    };
  }

  /**
   * Submit exam (finalize and calculate score)
   * @param {string} examSessionId - Exam session ID
   * @returns {Promise<object>} Final exam results
   */
  static async submitExam(examSessionId) {
    const examSession = await ExamSession.findById(examSessionId);
    if (!examSession) throw new ApiError(404, 'Exam session not found');

    if (examSession.status !== 'in_progress') {
      throw new ApiError(400, `Exam is ${examSession.status}. Cannot submit again.`);
    }

    // Calculate final score
    const score = examSession.calculateScore();
    const percentage = score;
    
    // Use atomic update to prevent race condition (double submission)
    const updatedExamSession = await ExamSession.findOneAndUpdate(
      { 
        _id: examSessionId,
        status: 'in_progress' // Only update if still in progress
      },
      {
        $set: {
          score,
          percentage,
          status: 'submitted',
          submittedAt: new Date(),
          isPassed: percentage >= (examSession.passingScore || 70)
        }
      },
      { new: true }
    );

    if (!updatedExamSession) {
      throw new ApiError(409, 'Exam was already submitted or status changed');
    }

    // Update user analytics
    let analytics = await UserAnalytics.findOne({ userId: updatedExamSession.userId });
    if (!analytics) {
      analytics = new UserAnalytics({ userId: updatedExamSession.userId });
    }

    await analytics.updateStats(updatedExamSession);

    return {
      examSessionId: updatedExamSession._id,
      score: updatedExamSession.score,
      percentage: updatedExamSession.percentage,
      isPassed: updatedExamSession.isPassed,
      summary: updatedExamSession.getPerformanceSummary()
    };
  }

  /**
   * Get exam results with detailed question review
   * @param {string} examSessionId - Exam session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<object>} Detailed exam results
   */
  static async getExamResults(examSessionId, userId) {
    const examSession = await ExamSession.findById(examSessionId);
    if (!examSession) throw new ApiError(404, 'Exam session not found');

    // Verify user owns this exam
    if (examSession.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to view this exam');
    }

    // Populate question details
    await examSession.populate('questionsData.questionId', 'text options correctAnswer difficulty');

    const questionResults = examSession.questionsData.map((attempt) => {
      const question = attempt.questionId;

      return {
        questionId: question?._id || attempt.questionId,
        text: question?.text || '[Question no longer available]',
        options: question?.options || {},
        difficulty: question?.difficulty || null,
        selectedAnswer: attempt.selectedAnswer,
        correctAnswer: question?.correctAnswer || null,
        isCorrect: attempt.isCorrect,
        timeSpentSeconds: attempt.timeSpentSeconds,
        feedbackColor: attempt.isCorrect ? 'green' : 'red'
      };
    });

    return {
      examSessionId: examSession._id,
      examType: examSession.examType,
      score: examSession.score,
      percentage: examSession.percentage,
      isPassed: examSession.isPassed,
      totalQuestions: examSession.totalQuestions,
      correctAnswers: examSession.correctAnswers,
      accuracy: `${examSession.percentage}%`,
      timeSpent: `${Math.floor(examSession.timeSpentSeconds / 60)}:${(examSession.timeSpentSeconds % 60).toString().padStart(2, '0')}`,
      startedAt: examSession.startedAt,
      submittedAt: examSession.submittedAt,
      questions: questionResults
    };
  }

  /**
   * Get user's exam history
   * @param {string} userId - User ID
   * @param {number} page - Page number (default 1)
   * @param {number} limit - Results per page (default 10)
   * @returns {Promise<object>} Paginated exam history
   */
  static async getExamHistory(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const exams = await ExamSession.find({
      userId,
      status: { $in: ['submitted', 'graded'] }
    })
      .select('examType score percentage isPassed startedAt submittedAt totalQuestions correctAnswers courseId')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ExamSession.countDocuments({
      userId,
      status: { $in: ['submitted', 'graded'] }
    });

    return {
      examHistory: exams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get in-progress exam (resume exam)
   * @param {string} userId - User ID
   * @returns {Promise<object>} In-progress exam or null
   */
  static async getActiveExam(userId) {
    const examSession = await ExamSession.findOne({
      userId,
      status: 'in_progress'
    });

    if (!examSession) return null;

    if (examSession.isExpired) {
      // Auto-submit expired exam
      examSession.status = 'submitted';
      examSession.submittedAt = new Date();
      examSession.score = examSession.calculateScore();
      examSession.percentage = examSession.score;
      examSession.markAsPassed();
      await examSession.save();
      return null;
    }

    return {
      examSessionId: examSession._id,
      examType: examSession.examType,
      totalQuestions: examSession.totalQuestions,
      answeredQuestions: examSession.answeredQuestions,
      remainingTimeSeconds: examSession.remainingTimeSeconds,
      startedAt: examSession.startedAt
    };
  }

  /**
   * Abandon exam
   * @param {string} examSessionId - Exam session ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<void>}
   */
  static async abandonExam(examSessionId, userId) {
    const examSession = await ExamSession.findById(examSessionId);
    if (!examSession) throw new ApiError(404, 'Exam session not found');

    if (examSession.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to abandon this exam');
    }

    if (examSession.status !== 'in_progress') {
      throw new ApiError(400, 'Only in-progress exams can be abandoned');
    }

    examSession.status = 'abandoned';
    await examSession.save();
  }
}

module.exports = ExamService;
