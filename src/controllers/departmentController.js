const departmentService = require('../services/departmentService');
const facultyService = require('../services/facultyService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validators/department.validator');

const createDepartment = [
  validate(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const { facultyId } = req.params;
    const { universityId } = req.body;

    await facultyService.getFacultyById(facultyId);

    const department = await departmentService.createDepartment(facultyId, {
      ...req.body,
      universityId,
    });
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

const listDepartmentsByFaculty = asyncHandler(async (req, res) => {
  const { facultyId } = req.params;

  await facultyService.getFacultyById(facultyId);

  const departments = await departmentService.getDepartmentsByFaculty(
    facultyId,
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
  listDepartmentsByFaculty,
  updateDepartment,
};
