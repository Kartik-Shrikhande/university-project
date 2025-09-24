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
  authenticationMiddleware.authorizeRoles(['admin', 'agent']),
  authenticationMiddleware.resolveAgencyContext // <-- New middleware here
);

//AGENCY STATS ROUTES
router.get('/applications/filter',statisticsControllers.getApplicationStats);
router.get('/applications/stats/universities', statisticsControllers.getApplicationsStatsByAllUniversities);
router.get('/students/stats/country', statisticsControllers.getAllStudentsCountryStats);
router.get('/stats/receipt', statisticsControllers.getAllReceiptStats);


//special API
router.get('/dashboard-stats',statisticsControllers.getAgencyDashboardStats);

module.exports = router;