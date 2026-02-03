const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');

const createDepartment = async (facultyId, departmentData) => {
  const existingDepartment = await Department.findOne({
    facultyId,
    code: departmentData.code,
  });

  if (existingDepartment) {
    throw new ApiError(
      409,
      'Department with this code already exists in this faculty'
    );
  }

  const department = new Department({
    ...departmentData,
    facultyId,
    universityId: departmentData.universityId,
  });

  return await department.save();
};

const getDepartmentById = async (id) => {
  const department = await Department.findById(id)
    .populate('universityId')
    .populate('facultyId');

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  return department;
};

const getDepartmentsByFaculty = async (facultyId, filters = {}) => {
  const query = { facultyId, ...filters };
  return await Department.find(query).select('-__v');
};

const updateDepartment = async (id, updateData) => {
  const department = await Department.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!department) {
    throw new ApiError(404, 'Department not found');
  }

  return department;
};

module.exports = {
  createDepartment,
  getDepartmentById,
  getDepartmentsByFaculty,
  updateDepartment,
};
