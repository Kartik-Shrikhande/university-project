const express = require('express');
const router = express.Router();
const {
  createSolicitor,
  updateSolicitor,
  deleteSolicitor,
  getAllSolicitors,
  getSolicitorById,
} = require('../controllers/solicitorController');

const {
  validateCreateSolicitor,
  validateUpdateSolicitor,
  validateDeleteSolicitor,
  validateGetSolicitorById,
  handleValidationErrors,
} = require('../validations/solicitorValidation');


// Route to update a solicitor by ID
router.put(
  '/update/:solicitorId',
  validateUpdateSolicitor,
  handleValidationErrors,
  updateSolicitor
);

// Route to delete a solicitor by ID
router.delete(
  '/delete/:solicitorId',
  validateDeleteSolicitor,
  handleValidationErrors,
  deleteSolicitor
);

// Route to get all solicitors
router.get('/all', getAllSolicitors);

// Route to get a solicitor by ID
router.get(
  '/:solicitorId',
  validateGetSolicitorById,
  handleValidationErrors,
  getSolicitorById
);

module.exports = router;
