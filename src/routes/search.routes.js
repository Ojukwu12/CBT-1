const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { 
  searchQuestionsSchema, 
  advancedFilterSchema, 
  searchTopicsSchema, 
  globalSearchSchema 
} = require('../validators/search.validator');

// Search Routes
router.get('/questions', verifyToken, validate(searchQuestionsSchema, 'query'), SearchController.searchQuestions);
router.get('/advanced', verifyToken, validate(advancedFilterSchema, 'query'), SearchController.advancedFilter);
router.get('/topics', verifyToken, validate(searchTopicsSchema, 'query'), SearchController.searchTopics);
router.get('/global', verifyToken, validate(globalSearchSchema, 'query'), SearchController.globalSearch);

module.exports = router;
