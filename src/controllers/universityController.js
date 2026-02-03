const universityService = require('../services/universityService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createUniversitySchema, updateUniversitySchema } = require('../validators/university.validator');

const createUniversity = [
  validate(createUniversitySchema),
  asyncHandler(async (req, res) => {
    const university = await universityService.createUniversity(req.body);
    res.status(201).json({
      success: true,
      data: university,
    });
  })
];

const getUniversity = asyncHandler(async (req, res) => {
  const university = await universityService.getUniversityById(req.params.id);
  res.status(200).json({
    success: true,
    data: university,
  });
});

const listUniversities = asyncHandler(async (req, res) => {
  const universities = await universityService.getAllUniversities();
  res.status(200).json({
    success: true,
    data: universities,
    count: universities.length,
  });
});

const updateUniversity = [
  validate(updateUniversitySchema),
  asyncHandler(async (req, res) => {
    const university = await universityService.updateUniversity(
      req.params.id,
      req.body
    );
    res.status(200).json({
      success: true,
      data: university,
    });
  })
];

module.exports = {
  createUniversity,
  getUniversity,
  listUniversities,
  updateUniversity,
};
