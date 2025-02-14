const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const upload = require('../middlewares/uploadMiddleware'); // Import upload middleware
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const {
validateUniversity,
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


// Create Agency
router.post('/create', agencyController.createAgency);
// Get All Agencies
// router.get('/agencies', agencyController.getAllAgencies);


router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['admin']))

//COURSES
//get all university courses for agency
router.get('/courses/:universityId',agencyController.getAllUniversityCoursesforAgency); //n
//get all courses and filters 
router.get('/filters/course',agencyController.getallCoursesWithFiltersforAgency); //n
//get course by Id
router.get('/course/:courseId',agencyController.getCourseByIdforAgency) //n


//UNIVERSITY
router.post('/create/university',upload.single('bannerImage'),validateUniversity , agencyController.createUniversity);
router.get('/get/universities',agencyController.getUniversities);
router.get('/universities/:id', agencyController.getUniversityById);
router.put('/promote/:universityId',agencyController.promoteUniversity);
router.put('/demote/:universityId',agencyController.demoteUniversity);


//AGENCY
// Get Agency by ID
router.get('/agencies/:id', agencyController.getAgencyById);
// Update Agency by ID
router.put('/update/:id', agencyController.updateAgencyById);
// Delete Agency by ID
router.delete('/delete/:id', agencyController.deleteAgencyById);
// router.post('/login', agencyController.loginAgency);



//AGENT RELATED APIS
router.post('/agent/create',  agencyController.createAgent); // Create a new agent
router.put('/agents/:id', agencyController.updateAgent); // Update an agent
router.get('/agents',  agencyController.getAllAgents); // Get all agents 
router.get('/agents/:id',  agencyController.getAgentById); // Get an agent by ID
router.delete('/agents/:id',  agencyController.deleteAgent); // Delete an agent 



//APPLICATION RELATED APIS 
//get the list of all pending applications
router.get('/pending-applications', agencyController.getPendingApplications);
router.get('/application/:applicationId',agencyController.getApplicationDetailsById);
//allocate an agent to application
router.post('/assign-agent', agencyController.assignAgentToApplication);



//STUDENTS 
// Routes for students
router.get('/students', agencyController.getAllStudents); // Get all students
router.get('/students/:id', agencyController.getStudentById); // Get student by ID



router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});

module.exports = router;
