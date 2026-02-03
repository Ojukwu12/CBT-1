const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');
const { verifyToken } = require('../middleware/auth.middleware');

// Search Routes
router.get('/questions', verifyToken, SearchController.searchQuestions);
router.get('/advanced', verifyToken, SearchController.advancedFilter);
router.get('/topics', verifyToken, SearchController.searchTopics);
router.get('/global', verifyToken, SearchController.globalSearch);

module.exports = router;
