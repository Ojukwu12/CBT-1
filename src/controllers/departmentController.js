const departmentService = require('../services/departmentService');
const universityService = require('../services/universityService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validators/department.validator');

const createDepartment = [
  validate(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const { universityId } = req.params;

    await universityService.getUniversityById(universityId);

    const department = await departmentService.createDepartment(
      universityId,
      req.body
    );
    res.status(201).json({
      success: true,
      data: department,
    });
  })
];

const getDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartmentById(req.params.id);
  res.status(200).json({
    success: true,
    data: department,
  });
});

const listDepartmentsByUniversity = asyncHandler(async (req, res) => {
  const { universityId } = req.params;

  await universityService.getUniversityById(universityId);

  const departments = await departmentService.getDepartmentsByUniversity(
    universityId,
    { isActive: true }
  );
  res.status(200).json({
    success: true,
    data: departments,
    count: departments.length,
  });
});

const updateDepartment = [
  validate(updateDepartmentSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.updateDepartment(
      req.params.id,
      req.body
    );
    res.status(200).json({
      success: true,
      data: department,
    });
  })
];

module.exports = {
  createDepartment,
  getDepartment,
  listDepartmentsByUniversity,
  updateDepartment,
};
