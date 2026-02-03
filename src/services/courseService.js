const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');

const createCourse = async (departmentId, courseData) => {
  const existingCourse = await Course.findOne({
    departmentId,
    code: courseData.code,
  });

  if (existingCourse) {
    throw new ApiError(
      409,
      'Course with this code already exists in this department'
    );
  }

  const course = new Course({
    ...courseData,
    departmentId,
    universityId: courseData.universityId,
  });

  return await course.save();
};

const getCourseById = async (id) => {
  const course = await Course.findById(id)
    .populate('universityId')
    .populate('departmentId');

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  return course;
};

const getCoursesByDepartment = async (departmentId, filters = {}) => {
  const query = { departmentId, ...filters };
  return await Course.find(query).select('-__v');
};

const getCoursesByUniversityAndLevel = async (universityId, level) => {
  return await Course.find({ universityId, level, isActive: true }).select(
    '-__v'
  );
};

const updateCourse = async (id, updateData) => {
  const course = await Course.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  return course;
};

module.exports = {
  createCourse,
  getCourseById,
  getCoursesByDepartment,
  getCoursesByUniversityAndLevel,
  updateCourse,
};
