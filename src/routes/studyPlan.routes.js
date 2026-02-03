const express = require('express');
const studyPlanController = require('../controllers/studyPlanController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createPlanSchema,
  updatePlanSchema,
  planParamsSchema,
  paginationSchema
} = require('../validators/studyPlan.validator');

const router = express.Router();

router.use(verifyToken);

/**
 * POST /api/study-plans
 * Create new study plan
 */
router.post('/', validate(createPlanSchema), studyPlanController.createPlan);

/**
 * GET /api/study-plans
 * Get user's study plans with pagination
 */
router.get('/', validate(paginationSchema, 'query'), studyPlanController.getUserPlans);

/**
 * GET /api/study-plans/:planId
 * Get study plan details
 */
router.get('/:planId', validate(planParamsSchema, 'params'), studyPlanController.getPlanDetails);

/**
 * PUT /api/study-plans/:planId
 * Update study plan
 */
router.put('/:planId', validate(planParamsSchema, 'params'), validate(updatePlanSchema), studyPlanController.updatePlan);

/**
 * POST /api/study-plans/:planId/topics/:topicId/complete
 * Mark topic as completed in plan
 */
router.post('/:planId/topics/:topicId/complete', validate(planParamsSchema, 'params'), studyPlanController.markTopicComplete);

/**
 * DELETE /api/study-plans/:planId
 * Delete study plan
 */
router.delete('/:planId', validate(planParamsSchema, 'params'), studyPlanController.deletePlan);

module.exports = router;
