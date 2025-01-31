const express = require('express');
const router = express.Router();

const authenticationMiddleware1 = require('../middlewares/authenticationRoleBased')
const authenticationMiddleware = require('../middlewares/authentication')
const paymentMiddleware = require('../middlewares/payment')
const userControllers = require('../controllers/studentControllers');
const userActivity = require('../middlewares/updateActivity')
const multer = require('multer');
const { validationResult } = require('express-validator');

const studentController = require('../controllers/studentControllers');

const studentValidations = require('../validators/studentValidations');
// const upload = require('../middlewares/uploadMiddleware');
const {uploadImage}=require("../middlewares/uploadMiddleware")

// Multer setup for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
/**
 * @swagger
 * /student/register:
 *   post:
 *     summary: Register a new student
 *     tags: [Student]
 *     description: Registers a new student and returns the created student object.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - name
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Bad request
 */



// Middleware to validate requests
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }
  next();
};

router.post(
  '/register',
  upload.fields([
    { name: 'document', maxCount: 5 },   // Uploads up to 5 PDF files for `documents`
    { name: 'documentUpload', maxCount: 5 }, // Uploads up to 5 PDF files for `documentUpload`
  ]),// Accept up to 5 PDF files
  studentValidations.validateRegisterStudent,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  studentController.registerStudent
);


router.post(
  '/verify/registration/otp',
  studentValidations.validateVerifyOtpForRegistration,
  validate,
  studentController.verifyOtpForRegistration
);

// // Routes
// router.post('/register', validateStudentRegistration,
//    validate, 
//    userControllers.registerStudent);

router.post('/login',
  //  loginValidator,
 studentValidations.validateLoginStudent,
   userActivity.updateLastActivity, 
   validate,
   userControllers.login);


  //  router.post('/verify/otp',
  //   //  loginValidator,
  //  studentValidations.validateVerifyOtpForLogin,
  //    validate,
  //    userActivity.updateLastActivity, 
  //    userControllers.verifyOtpforLogin);


   router.post(
    '/resend/otp',
    studentValidations.validateResendOtpForLogin,
    validate,
    userControllers.resendOtpForLogin
  );



  // router.get('/get/universitiesss',
  //   //authenticationMiddleware1.authenticateUser,
  //   //authenticationMiddleware1.authorizeRoles('student'),
  //   //paymentMiddleware.checkPaymentStatus,
  //   userActivity.updateLastActivity,
  //   userControllers.getUniversities);

    
router.put('/update',
 
  // updateValidator, 
  validate,
  userActivity.updateLastActivity,
   userControllers.updateStudent);

router.put('/update/password', 
 
  userActivity.updateLastActivity,
  userControllers.updatePassword)
   
router.delete('/delete',
 
  userActivity.updateLastActivity,
  userControllers.deleteStudent);



  router.get(
    '/api/universities/:universityId',
    authenticationMiddleware1.authenticateUser, 
    authenticationMiddleware1.authorizeRoles(['student']),
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
    userControllers.getUniversityById
  );
  

// Route to get universities (Only accessible to students)
router.get('/get/universities',
  authenticationMiddleware1.authenticateUser,  // Ensure user is authenticated
  authenticationMiddleware1.authorizeRoles(['student']), // Only allow students
  userActivity.updateLastActivity, // Update last activity
  userControllers.getUniversities
);



//   //get unniversity by id
// router.get('/get/university/:universityId',
//   authenticationMiddleware1.authenticateUser, 
//   authenticationMiddleware1.authorizeRoles(['student']),
//   paymentMiddleware.checkPaymentStatus,
//   userActivity.updateLastActivity,
//   userControllers.getUniversityById);

router.post('/create-payment',
  authenticationMiddleware1.authenticateUser,  // Ensure user is authenticated
  authenticationMiddleware1.authorizeRoles(['student']), // Only allow students
  userActivity.updateLastActivity,
    userControllers.createPayment)

// Get all courses by uni id (optionally filtered by university)
router.get('/courses/:universityId',
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
   userControllers.getAllUniversityCourses);


   router.get('/filters/course',
   
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
     userControllers.getCoursesWithFilters);

//get course by Id
router.get('/course/:courseId',
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
   userControllers.getCourseById)


   router.post('/enroll/:courseId',
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
     userControllers.enrollCourse)


//APPLICATION

// POST route for applying to a university
router.post('/application', 
 
  userControllers.applyForUniversity);


router.get('/students/applications',
   userControllers.getStudentApplications);

   router.get('/get/application/:applicationId',
    userControllers.getApplicationByIdForStudent);

router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});



module.exports = router;
