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
const studentValidations = require('../validators/studentValidations');
const contactController = require("../controllers/contactControllers");


const {
validateUniversity,
validateUniversityUpdate,
    validateUniversityLogin,
    validateUpdateUniversity,
    validateDeleteUniversity,
    validateUniversityId, 
    validateCourseId, 
  } = require('../validators/universityValidations');


  // Middleware to validate requests
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }
  next();
};

router.post("/contact/create", contactController.createContact);

// Create Agency
router.post('/create', agencyController.createAgency);
// Get All Agencies
router.use(
  authenticationMiddleware.authenticateUser,
  authenticationMiddleware.authorizeRoles(['admin', 'agent']),
  authenticationMiddleware.resolveAgencyContext // <-- New middleware here
);

//ENABLE /DISABLE PLATFORM PAYMENT
router.put('/platform-payment/:status',agencyController.togglePlatformPayment);
router.get('/get-platform-payment/status',agencyController.getPlatformPaymentStatus);


//RESET PASSWORD FOR ALL ROLES
router.post('/roles/reset-password', agencyController.resetUserPasswordByAdmin);


//CONTACT

router.get("/contacts", contactController.getAllContacts);
router.patch("/contacts/:contactId", contactController.markContactAsRead);
router.delete("/contact/delete/:contactId", contactController.deleteContact);


//SOLICITOR
router.post('/solicitor/create', validateCreateSolicitor,validate,agencyController.createSolicitor);
router.put('/solicitor/update/:id',validateUpdateSolicitor,validate,agencyController.updateSolicitorById);
router.get('/solicitors',agencyController.getAllSolicitors);
router.get('/solicitor/:id',agencyController.getSolicitorById);
router.delete('/solicitor/delete/:id',agencyController.deleteSolicitor);


//RECEIPT 
router.get('/receipts', receiptController.getAllReceipts);
router.get('/receipt/:id',receiptController.getReceiptById);


//NOTIFICATION 
router.get('/notifications', agencyController.getAllNotifications);
router.get('/notifications/:id', agencyController.getNotificationById);
router.delete('/notification/delete/:id', agencyController.deleteNotificationByIdAgency);


//SOLICITORS REQUEST
router.get('/solicitor-requests',agencyController.getAllSolicitorRequests);
router.get('/solicitor-requests/:applicationId',  agencyController.getSolicitorRequestByApplicationId);
router.post('/assign/solicitor-request',agencyController.assignSolicitorRequestToSolicitor);
router.get('/assigned/requests',agencyController.getAssignedSolicitorRequests);
router.get('/assigned/request/:id',agencyController.getAssignedSolicitorRequestByAssociateId);
// Get students who applied for solicitor services
router.get('/students/solicitor-requests',agencyController.getAllStudentsAppliedForSolicitorService);

//COURSES
//get all university courses for agency
router.get('/courses/:universityId',agencyController.getAllUniversityCoursesforAgency); //n
//get all courses and filters 
router.get('/filters/course',agencyController.getallCoursesWithFiltersforAgency); //n
//get course by Id
router.get('/course/:courseId',agencyController.getCourseByIdforAgency) //n


//UNIVERSITY
router.post('/create/university',upload.single('bannerImage'),validateUniversity , agencyController.createUniversity);
router.put('/university/update/:universityId',upload.single('bannerImage'),validateUniversityUpdate,agencyController.updateUniversityByAgency);
router.delete('/university/delete/:universityId',agencyController.deleteUniversityByAgency);
router.get('/get/universities',agencyController.getUniversities);
router.get('/universities/:id', agencyController.getUniversityById);
router.put('/promote/:universityId',agencyController.promoteUniversity);
router.put('/demote/:universityId',agencyController.demoteUniversity);


//AGENCY PROFILE 
// Get Agency by ID
router.get('/agencies/:id', agencyController.getAgencyById);
// Update Agency by ID
router.put('/update/:id', agencyController.updateAgencyById);
// Delete Agency by ID
router.delete('/delete/:id', agencyController.deleteAgencyById);
// router.post('/login', agencyController.loginAgency);
router.put("/update-password", agencyController.agencyUpdatePassword);





//AGENT RELATED APIS
router.post('/agent/create',  agencyController.createAgent); // Create a new agent
router.get('/agents',  agencyController.getAllAgents); // Get all agents 
router.put('/agents/:agentId', agencyController.updateAgent); // Update an agent
router.get('/agents/:agentId',  agencyController.getAgentById); // Get an agent by ID
router.delete('/agents/:agentId',  agencyController.deleteAgent); // Delete an agent 
router.delete('/agent/delete/:agentId',  agencyController.hardDeleteAgent); // Delete an agent 


//APPLICATION RELATED APIS 
//get the list of all pending applications
router.get('/pending-applications', agencyController.getPendingApplications);
router.get('/application/:applicationId',agencyController.getApplicationDetailsById);
router.get('/get/application/:applicationId',agencyController.getApplicationByIdForAgency);
//allocate an agent to application
// Send application to university (Only accessible to Admin/Agency)
router.post('/application/send/:applicationId',agencyController.sendApplicationToUniversity);
router.put('/reject-application/:applicationId',agencyController.rejectApplication);
// Fetch applications by status for agency
router.get('/applications/filter',agencyController.getApplicationsByStatus);
router.get('/applications/universities',agencyController.getApplicationsStatusByAllUniversities);
router.post('/acceptance-letter/:applicationId',upload.single('offerLetter'),agencyController.sendAcceptanceLetter);


router.post('/assign-agent', agencyController.assignAgentToApplication);



//STUDENTS 
// Routes for students
router.get('/students', agencyController.getAllStudents); // Get all students
router.get('/students/:id', agencyController.getStudentById); // Get student by ID

router.put('/update/student/:studentId',
  upload.fields([
    { name: 'document', maxCount: 5 },
    { name: 'documentUpload', maxCount: 5 },
  ]),
  studentValidations.validateUpdateStudent,
    validate,
  agencyController.updateStudentById
);

router.delete('/students/:studentId',agencyController.deleteStudentByAdmin);

//ASSOCIATE 
// Define routes
router.post('/associate/create',validateAssociateCreation,validate, agencyController.createAssociate);
router.get('/associate', agencyController.getAllAssociates);
router.get('/associate/:id', agencyController.getAssociateById);
router.put('/associate/:id',validateAssociateUpdate,validate, agencyController.updateAssociate);
router.delete('/associate/:id', agencyController.deleteAssociate);



//COURSES
// Create Course (Agency)
router.post('/course/create/:universityId',upload.array('courseImage',5),validateCreateCourse,handleValidationErrors,agencyController.createCourseByAgency);
router.put('/course/update/:universityId/:courseId',upload.array('courseImage',5),validateUpdateCourse,handleValidationErrors,agencyController.updateCourseByAgency);
router.delete('/course/delete/:universityId/:courseId',validateDeleteCourse,handleValidationErrors,agencyController.deleteCourseByAgency);


router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});

module.exports = router;

