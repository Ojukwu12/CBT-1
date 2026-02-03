const express = require('express');
const materialController = require('../controllers/materialController');

const router = express.Router({ mergeParams: true });

router.post('/', materialController.uploadMaterial);
router.get('/', materialController.listMaterialsByCourse);
router.get('/:id', materialController.getMaterial);
router.post('/:materialId/generate-questions', materialController.generateQuestionsFromMaterial);

module.exports = router;
