const StudyPlanService = require('../services/studyPlanService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class StudyPlanController {
  static createPlan = asyncHandler(async (req, res) => {
    const { courseId, name, description, topicIds, endDate, durationDays, dailyGoal } = req.body;

    const plan = await StudyPlanService.createPlan(req.user.id, {
      courseId,
      name,
      description,
      topicIds,
      endDate,
      durationDays,
      dailyGoal
    });

    res.status(201).json(new ApiResponse(201, plan, 'Study plan created successfully'));
  });

  static getUserPlans = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const result = await StudyPlanService.getUserPlans(req.user.id, parseInt(page), parseInt(limit));

    res.status(200).json(new ApiResponse(200, result, 'Study plans retrieved'));
  });

  static getPlanDetails = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    const plan = await StudyPlanService.getPlanDetails(planId, req.user.id);

    res.status(200).json(new ApiResponse(200, plan, 'Study plan details retrieved'));
  });

  static updatePlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;
    const { name, description, status, endDate, dailyGoal } = req.body;

    const plan = await StudyPlanService.updatePlan(planId, req.user.id, {
      name,
      description,
      status,
      endDate,
      dailyGoal
    });

    res.status(200).json(new ApiResponse(200, plan, 'Study plan updated successfully'));
  });

  static markTopicComplete = asyncHandler(async (req, res) => {
    const { planId, topicId } = req.params;

    const result = await StudyPlanService.markTopicComplete(planId, topicId, req.user.id);

    res.status(200).json(new ApiResponse(200, result, 'Topic marked as completed'));
  });

  static deletePlan = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    await StudyPlanService.deletePlan(planId, req.user.id);

    res.status(200).json(new ApiResponse(200, null, 'Study plan deleted successfully'));
  });
}

module.exports = StudyPlanController;
