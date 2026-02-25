const Faculty = require('../models/Faculty');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

const createFaculty = async (universityId, facultyData) => {
  const existingFaculty = await Faculty.findOne({
    universityId,
    code: facultyData.code,
  });

  if (existingFaculty) {
    throw new ApiError(
      409,
      'Faculty with this code already exists in this university'
    );
  }

  const faculty = new Faculty({
    ...facultyData,
    universityId,
  });

  const createdFaculty = await faculty.save();
  await cacheService.delByPrefix('faculties:');
  return createdFaculty;
};

const getFacultyById = async (id) => {
  const faculty = await Faculty.findById(id).populate('universityId');

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  return faculty;
};

const getFacultiesByUniversity = async (universityId, filters = {}) => {
  const query = { universityId, ...filters };
  const cacheKey = `faculties:university:${universityId}:${JSON.stringify(filters)}`;
  return cacheService.remember(
    cacheKey,
    async () => Faculty.find(query).select('-__v').lean(),
    900
  );
};

const updateFaculty = async (id, updateData) => {
  const faculty = await Faculty.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!faculty) {
    throw new ApiError(404, 'Faculty not found');
  }

  await cacheService.delByPrefix('faculties:');

  return faculty;
};

module.exports = {
  createFaculty,
  getFacultyById,
  getFacultiesByUniversity,
  updateFaculty,
};
