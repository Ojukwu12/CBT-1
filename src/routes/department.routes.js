const express = require('express');
const departmentController = require('../controllers/departmentController');

const router = express.Router({ mergeParams: true });

router.post('/', departmentController.createDepartment);
router.get('/', departmentController.listDepartmentsByFaculty);
router.get('/:id', departmentController.getDepartment);
router.put('/:id', departmentController.updateDepartment);

module.exports = router;
