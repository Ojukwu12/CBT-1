const StudyPlan = require('../models/StudyPlan');
const Course = require('../models/Course');
const Topic = require('../models/Topic');
const ApiError = require('../utils/ApiError');

class StudyPlanService {
  static async createPlan(userId, planData) {
    const { courseId, name, description, topicIds = [], endDate, durationDays, dailyGoal = 5 } = planData;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, 'Course not found');

    const topics = await Topic.find({ _id: { $in: topicIds } });
    if (topics.length !== topicIds.length) {
      throw new ApiError(400, 'Some topics not found');
    }

    const plan = new StudyPlan({
      userId,
      courseId,
      name,
      description,
      topicIds,
      topics: topics.map(t => ({
        topicId: t._id,
        topicName: t.name,
        status: 'not_started'
      })),
      endDate: endDate || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      durationDays,
      dailyGoal
    });

    plan.progress.totalTopics = topics.length;
    await plan.save();
    return plan;
  }

  static async getUserPlans(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const plans = await StudyPlan.find({ userId })
      .populate('courseId', 'name')
      .populate('topics.topicId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StudyPlan.countDocuments({ userId });

    return {
      plans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  static async getPlanDetails(planId, userId) {
    const plan = await StudyPlan.findById(planId)
      .populate('courseId', 'name description')
      .populate('topics.topicId', 'name description');

    if (!plan) throw new ApiError(404, 'Study plan not found');
    if (plan.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to view this plan');
    }

    return plan;
  }

  static async updatePlan(planId, userId, updateData) {
    const plan = await StudyPlan.findById(planId);
    if (!plan) throw new ApiError(404, 'Study plan not found');
    if (plan.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to update this plan');
    }

    const { name, description, status, endDate, dailyGoal } = updateData;
    
    if (name) plan.name = name;
    if (description) plan.description = description;
    if (status && ['active', 'paused', 'completed', 'archived'].includes(status)) {
      plan.status = status;
    }
    if (endDate) plan.endDate = endDate;
    if (dailyGoal) plan.dailyGoal = dailyGoal;

    await plan.save();
    return plan;
  }

  static async markTopicComplete(planId, topicId, userId) {
    const plan = await StudyPlan.findById(planId);
    if (!plan) throw new ApiError(404, 'Study plan not found');
    if (plan.userId.toString() !== userId) {
      throw new ApiError(403, 'Permission denied');
    }

    plan.markTopicComplete(topicId);
    await plan.save();

    return {
      planId: plan._id,
      topic: plan.topics.find(t => t.topicId.toString() === topicId),
      progress: plan.progress
    };
  }

  static async deletePlan(planId, userId) {
    const plan = await StudyPlan.findById(planId);
    if (!plan) throw new ApiError(404, 'Study plan not found');
    if (plan.userId.toString() !== userId) {
      throw new ApiError(403, 'Permission denied');
    }

    await StudyPlan.findByIdAndDelete(planId);
  }

  static async getActivePlan(userId, courseId) {
    const plan = await StudyPlan.findOne({
      userId,
      courseId,
      status: 'active'
    }).populate('courseId', 'name').populate('topics.topicId', 'name');

    return plan || null;
  }
}

module.exports = StudyPlanService;
