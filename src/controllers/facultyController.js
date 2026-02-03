const facultyService = require('../services/facultyService');
const universityService = require('../services/universityService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createFacultySchema, updateFacultySchema } = require('../validators/faculty.validator');

const createFaculty = [
  validate(createFacultySchema),
  asyncHandler(async (req, res) => {
    const { universityId } = req.params;
    await universityService.getUniversityById(universityId);

    const faculty = await facultyService.createFaculty(universityId, req.body);
    res.status(201).json({
      success: true,
      data: faculty,
    });
  })
];

const getFaculty = asyncHandler(async (req, res) => {
  const faculty = await facultyService.getFacultyById(req.params.id);
  res.status(200).json({
    success: true,
    data: faculty,
  });
});

const listFacultiesByUniversity = asyncHandler(async (req, res) => {
  const { universityId } = req.params;
  await universityService.getUniversityById(universityId);

  const faculties = await facultyService.getFacultiesByUniversity(universityId, {
    isActive: true,
  });
  res.status(200).json({
    success: true,
    data: faculties,
    count: faculties.length,
  });
});

const updateFaculty = [
  validate(updateFacultySchema),
  asyncHandler(async (req, res) => {
    const faculty = await facultyService.updateFaculty(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: faculty,
    });
  })
];

module.exports = {
  createFaculty,
  getFaculty,
  listFacultiesByUniversity,
  updateFaculty,
};
