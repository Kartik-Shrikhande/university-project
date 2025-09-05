// Fetch applications by status for agency
const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
// const associateController = require("../controllers/agencyController");
const upload = require('../middlewares/uploadMiddleware'); // Import upload middleware
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const receiptController = require('../controllers/receiptController');
const { body, validationResult } = require('express-validator');
const { validateCreateCourse, validateUpdateCourse, validateDeleteCourse, handleValidationErrors } = require('../validators/coursesValidations');
const {validateAssociateCreation,validateAssociateUpdate}=require('../validators/associateValidations')
const {validateCreateSolicitor,validateUpdateSolicitor}=require('../validators/solicitorValidations')
const statisticsControllers=require("../controllers/statisticsControllers")
const studentValidations = require('../validators/studentValidations');
const contactController = require("../controllers/contactControllers");

router.use(
  authenticationMiddleware.authenticateUser,
  authenticationMiddleware.authorizeRoles(['University']),
  authenticationMiddleware.resolveAgencyContext // <-- New middleware here
);


//UNIVERSITY STATS ROUTES
router.get('/applications', statisticsControllers.getUniversityApplicationStats);
router.get('/course/stats', statisticsControllers.getUniversityApplicationsByCourse);
router.get('/students/country/stats', statisticsControllers.getUniversityStudentsByCountry);
router.get('/receipt/stats', statisticsControllers.getUniversityReceiptStats);

module.exports = router;