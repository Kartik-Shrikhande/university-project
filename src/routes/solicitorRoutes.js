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




module.exports = router;
