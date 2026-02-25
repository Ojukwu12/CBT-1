const University = require('../models/University');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

const createUniversity = async (universityData) => {
  const existingUniversity = await University.findOne({
    code: universityData.code,
  });

  if (existingUniversity) {
    throw new ApiError(409, 'University with this code already exists');
  }

  const university = new University(universityData);
  const createdUniversity = await university.save();
  await cacheService.delByPrefix('universities:');
  return createdUniversity;
};

const getUniversityById = async (id) => {
  const university = await University.findById(id);

  if (!university) {
    throw new ApiError(404, 'University not found');
  }

  return university;
};

const getAllUniversities = async (filters = {}) => {
  const query = { ...filters };
  const cacheKey = `universities:all:${JSON.stringify(query)}`;
  return cacheService.remember(
    cacheKey,
    async () => University.find(query).select('-__v').lean(),
    900
  );
};

const updateUniversity = async (id, updateData) => {
  const university = await University.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!university) {
    throw new ApiError(404, 'University not found');
  }

  await cacheService.delByPrefix('universities:');

  return university;
};

module.exports = {
  createUniversity,
  getUniversityById,
  getAllUniversities,
  updateUniversity,
};
