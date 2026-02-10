const ExamService = require('../services/examService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/apiResponse');

class ExamController {
  /**
   * Start a new exam
   * POST /api/exams/start
   */
  static startExam = asyncHandler(async (req, res) => {
    const { examType = 'practice', courseId, topicIds = [], totalQuestions = 10, durationMinutes = 60 } = req.body;

    const result = await ExamService.startExam(req.user.id, {
      examType,
      courseId,
      topicIds,
      totalQuestions,
      durationMinutes
    });

    res.status(201).json(
      new ApiResponse(201, result, 'Exam started successfully')
    );
  });

  /**
   * Submit answer to a question
   * POST /api/exams/:examSessionId/answer
   */
  static submitAnswer = asyncHandler(async (req, res) => {
    const { examSessionId } = req.params;
    const { questionId, selectedAnswer, timeSpentSeconds = 0 } = req.body;

    const result = await ExamService.submitAnswer(
      examSessionId,
      req.user.id,
      questionId,
      selectedAnswer,
      timeSpentSeconds
    );

    res.status(200).json(
      new ApiResponse(200, result, 'Answer submitted successfully')
    );
  });

  /**
   * Get exam summary (progress)
   * GET /api/exams/:examSessionId/summary
   */
  static getExamSummary = asyncHandler(async (req, res) => {
    const { examSessionId } = req.params;

    const result = await ExamService.getExamSummary(examSessionId, req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Exam summary retrieved')
    );
  });

  /**
   * Submit exam (finalize and score)
   * POST /api/exams/:examSessionId/submit
   */
  static submitExam = asyncHandler(async (req, res) => {
    const { examSessionId } = req.params;

    const result = await ExamService.submitExam(examSessionId, req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Exam submitted successfully')
    );
  });

  /**
   * Get exam results with detailed breakdown
   * GET /api/exams/:examSessionId/results
   */
  static getExamResults = asyncHandler(async (req, res) => {
    const { examSessionId } = req.params;

    const result = await ExamService.getExamResults(examSessionId, req.user.id);

    res.status(200).json(
      new ApiResponse(200, result, 'Exam results retrieved')
    );
  });

  /**
   * Get user's exam history
   * GET /api/exams/history?page=1&limit=10
   */
  static getExamHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const result = await ExamService.getExamHistory(req.user.id, parseInt(page), parseInt(limit));

    res.status(200).json(
      new ApiResponse(200, result, 'Exam history retrieved')
    );
  });

  /**
   * Get or resume active exam
   * GET /api/exams/active
   */
  static getActiveExam = asyncHandler(async (req, res) => {
    const result = await ExamService.getActiveExam(req.user.id);

    if (!result) {
      return res.status(404).json(
        new ApiResponse(404, null, 'No active exam')
      );
    }

    res.status(200).json(
      new ApiResponse(200, result, 'Active exam retrieved')
    );
  });

  /**
   * Abandon an exam
   * POST /api/exams/:examSessionId/abandon
   */
  static abandonExam = asyncHandler(async (req, res) => {
    const { examSessionId } = req.params;

    await ExamService.abandonExam(examSessionId, req.user.id);

    res.status(200).json(
      new ApiResponse(200, null, 'Exam abandoned successfully')
    );
  });
}

module.exports = ExamController;
