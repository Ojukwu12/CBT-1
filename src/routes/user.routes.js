const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/', userController.createUser);
router.get('/email/:email', userController.getUserByEmail);
router.get('/university/:universityId', userController.listUsersByUniversity);
router.get('/:id', userController.getUser);
router.post('/:userId/upgrade-plan', userController.upgradePlan);
router.post('/:userId/downgrade-plan', userController.downgradePlan);

module.exports = router;
