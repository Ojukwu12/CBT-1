const courseService = require('../services/courseService');
const departmentService = require('../services/departmentService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createCourseSchema, updateCourseSchema } = require('../validators/course.validator');

const createCourse = [
  validate(createCourseSchema),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.params;
    const { universityId } = req.body;

    await departmentService.getDepartmentById(departmentId);

    const course = await courseService.createCourse(departmentId, {
      ...req.body,
      universityId,
    });
    res.status(201).json({
      success: true,
      data: course,
    });
  })
];

const getCourse = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseById(req.params.id);
  res.status(200).json({
    success: true,
    data: course,
  });
});

const listCoursesByDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;

  await departmentService.getDepartmentById(departmentId);

  const courses = await courseService.getCoursesByDepartment(departmentId, {
    isActive: true,
  });
  res.status(200).json({
    success: true,
    data: courses,
    count: courses.length,
  });
});

const listCoursesByLevel = asyncHandler(async (req, res) => {
  const { universityId, level } = req.params;

  const courses = await courseService.getCoursesByUniversityAndLevel(
    universityId,
    parseInt(level)
  );
  res.status(200).json({
    success: true,
    data: courses,
    count: courses.length,
  });
});

const updateCourse = [
  validate(updateCourseSchema),
  asyncHandler(async (req, res) => {
    const course = await courseService.updateCourse(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: course,
    });
  })
];

module.exports = {
  createCourse,
  getCourse,
  listCoursesByDepartment,
  listCoursesByLevel,
  updateCourse,
};
