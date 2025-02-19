const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const applicationController = require('../controllers/applicationController')
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
// const authenticationMiddleware = require('../middlewares/authentication')
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
// const validate = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array()});
//   }
//   next();
// };


const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(err => ({
        type: err.type || "field",
        value: err.value,
        message: err.msg, // Rename "msg" to "message"
        path: err.param,  // Use "param" instead of "path"
        location: err.location
      }))
    });
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
  validate,
  studentController.registerStudent
);


router.get('/verify-status/:id', studentController.checkStudentVerificationStatus);


// Route to verify the email
router.get('/verify-email', studentController.verifyEmail);






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

    
// 🔹 Refresh Token Route (Generates new access token using refresh token)
router.post('/refresh-token', authenticationMiddleware.refreshToken);

// 🔹 Verify Token Route (Checks if access token is valid)
router.post('/verify-token', authenticationMiddleware.verifyToken);


router.use(authenticationMiddleware.authenticateUser, authenticationMiddleware.authorizeRoles(['student']))

router.get('/status',studentController.verifyStudentStatus);

 //PAYMENT 
router.post('/create-payment-intent', paymentController.createPaymentIntent);
router.post('/stripe-webhook', express.raw({ type: 'application/json' }),paymentController.handleStripeWebhook);

router.get('/profile',studentController.seeStudentProfile);

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
    // authenticationMiddleware1.authenticateUser, 
    // authenticationMiddleware1.authorizeRoles(['student']),
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
    userControllers.getUniversityById
  );
  

// Route to get universities (Only accessible to students)
router.get('/get/universities',
  paymentMiddleware.checkPaymentStatus,
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
  // authenticationMiddleware1.authenticateUser,  // Ensure user is authenticated
  // authenticationMiddleware1.authorizeRoles(['student']), // Only allow students
  userActivity.updateLastActivity,
    userControllers.createPayment)







   router.post('/enroll/:courseId',
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
     userControllers.enrollCourse)

     
//COURSES
// Get all courses by uni id (optionally filtered by university)
router.get('/courses/:universityId',
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
   userControllers.getAllUniversityCourses); //n


router.get('/filters/course',
   
  paymentMiddleware.checkPaymentStatus,
  // studentValidations.validateCourseFilters,
  // validate,
  userActivity.updateLastActivity,
   userControllers.getCoursesWithFilters); //n

//get course by Id
router.get('/course/:courseId',
paymentMiddleware.checkPaymentStatus,
userActivity.updateLastActivity,
 userControllers.getCourseById) //n

 

//APPLICATION

// POST route for applying to a university
router.post('/application/:courseId', applicationController.applyForCourse);
router.get('/students/applications',applicationController.getStudentApplications);
router.get('/get/application/:applicationId',applicationController.getApplicationById);
// Route to get application by ID


router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});



module.exports = router;
