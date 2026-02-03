const University = require('../models/University');
const ApiError = require('../utils/ApiError');

const createUniversity = async (universityData) => {
  const existingUniversity = await University.findOne({
    code: universityData.code,
  });

  if (existingUniversity) {
    throw new ApiError(409, 'University with this code already exists');
  }

  const university = new University(universityData);
  return await university.save();
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
  return await University.find(query).select('-__v');
};

const updateUniversity = async (id, updateData) => {
  const university = await University.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!university) {
    throw new ApiError(404, 'University not found');
  }

  return university;
};

module.exports = {
  createUniversity,
  getUniversityById,
  getAllUniversities,
  updateUniversity,
};
