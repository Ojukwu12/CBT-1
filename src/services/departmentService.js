const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

const createDepartment = async (universityId, departmentData) => {
  const existingDepartment = await Department.findOne({
    universityId,
    code: departmentData.code,
  });

  if (existingDepartment) {
    throw new ApiError(
      409,
      'Department with this code already exists in this university'
    );
  }

  const department = new Department({
    ...departmentData,
    universityId,
  });

  const createdDepartment = await department.save();
  await cacheService.delByPrefix('departments:');
  return createdDepartment;
};

const getDepartmentById = async (id) => {
  const department = await Department.findById(id)
    .populate('universityId');

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  return department;
};

const getDepartmentsByUniversity = async (universityId, filters = {}) => {
  const query = { universityId, ...filters };
  const cacheKey = `departments:university:${universityId}:${JSON.stringify(filters)}`;
  return cacheService.remember(
    cacheKey,
    async () => Department.find(query).select('-__v').lean(),
    900
  );
};

const updateDepartment = async (id, updateData) => {
  const department = await Department.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  await cacheService.delByPrefix('departments:');

  return department;
};

module.exports = {
  createDepartment,
  getDepartmentById,
  getDepartmentsByUniversity,
  updateDepartment,
};
