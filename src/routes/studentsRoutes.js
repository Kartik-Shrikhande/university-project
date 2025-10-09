const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const applicationController = require('../controllers/applicationController')
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const receiptController = require('../controllers/receiptController');
const paymentMiddleware = require('../middlewares/payment')
const userControllers = require('../controllers/studentControllers');
const userActivity = require('../middlewares/updateActivity')
const multer = require('multer');
const { validationResult } = require('express-validator');
const studentController = require('../controllers/studentControllers');
const studentValidations = require('../validators/studentValidations');
// const upload = require('../middlewares/uploadMiddleware');
const uploadImage=require("../middlewares/uploadMiddleware")
const validateApplications = require('../validators/applicationValidations'); // ✅ Import validation middleware

const{ uploadFilesToS3} = require('../utils/s3Upload'); // Import updated upload middleware

// Multer setup for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


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


router.post('/check-email', studentController.checkMailStudent);

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


router.post('/login',
  //  loginValidator,
 studentValidations.validateLoginStudent,
   userActivity.updateLastActivity, 
   validate,
   userControllers.login);

//OTP FOR LOGIN
   router.post("/verify-login-otp", studentController.verifyLoginOtp);
//resend OTP FOR LOGIN 
    router.post("/resend-login-otp", studentController.resendLoginOtp); 


router.post('/logout', userControllers.logout);


// Route to resend verification email //IN USE
  router.post('/resend-verification-email',userControllers.resendVerificationEmail);



   router.post(
    '/resend/otp',
    studentValidations.validateResendOtpForLogin,
    validate,
    userControllers.resendOtpForLogin
  );


    
// 🔹 Refresh Token Route (Generates new access token using refresh token)
router.post('/refresh-token', authenticationMiddleware.refreshToken);

// 🔹 Verify Token Route (Checks if access token is valid)
router.post('/verify-token', authenticationMiddleware.verifyToken);

router.get('/unsubscribe/:studentId', studentController.unsubscribeStudent);

router.use(authenticationMiddleware.authenticateUser, authenticationMiddleware.authorizeRoles(['student']))


//PAYMENT 
router.post("/create-payment-intent",paymentController.createPaymentIntent);
router.post("/confirm-payment",paymentController.confirmPayment);
router.get("/payment-history",paymentController.getPaymentHistory);




//PAYMENT-RECEIPT 
router.post('/upload/receipt', upload.single('uploadPaymentReceipt'), receiptController.uploadReceipt);
router.get('/receipts', receiptController.getAllReceiptswithFilteration);
router.get('/receipt/:id',receiptController.getReceiptById);
router.put('/update/receipts/:id',upload.single('uploadPaymentReceipt'),receiptController.updateReceipt);




//SOLICITOR PAYMENT
// router.post('/dummy-solicitor-payment',paymentController.createDummySolicitorPayment)
router.post('/solicitor/create-payment-intent/:applicationId',paymentController.createSolicitorPaymentIntent);
router.post('/solicitor/confirm-payment',paymentController.confirmSolicitorPayment);


//NOTIFICATION 
router.get('/notifications', studentController.getAllNotifications);
// Get a specific notification and mark it as read
router.get('/notifications/:id', studentController.getNotificationById);
// Student-only delete notification
router.delete('/notification/delete/:id', studentController.deleteStudentNotificationById);



//SOLICITOR REQUEST
// routes/studentRoutes.js
router.post('/apply/solicitor/:applicationId', studentController.applyForSolicitor);
router.get("/solicitor/status/:applicationId", studentController.checkSolicitorStatus);



// Apply for a course (Authenticated User)

const uploadFields = uploadImage.fields([
  { name: 'latestdegreeCertificates', maxCount: 5 },
  { name: 'englishTest', maxCount: 5 },
  { name: 'proofOfAddress', maxCount: 5 },
]);



router.get('/status',studentController.verifyStudentStatus);

 //PAYMENT 

router.get('/profile',studentController.seeStudentProfile);

router.put('/update',
  upload.fields([
    { name: 'document', maxCount: 5 },   // Uploads up to 5 PDF files for `documents`
    { name: 'documentUpload', maxCount: 5 }, // Uploads up to 5 PDF files for `documentUpload`
  ]),// Accept up to 5 PDF files
  studentValidations.validateUpdateStudent,
  validate,
  userActivity.updateLastActivity,
   userControllers.updateStudent);


router.put('/update/password', 
 
  userActivity.updateLastActivity,
  userControllers.updatePassword)
   

// router.delete('/delete',
 
//   userActivity.updateLastActivity,
//   userControllers.deleteStudent);

// Request OTP for deletion


router.post('/send-delete-otp', userControllers.sendDeleteAccountOtp);
router.post('/resend-delete-otp', userControllers.resendDeleteAccountOtp);
router.post('/verify-delete-otp', userControllers.verifyDeleteAccountOtp);

  router.get(
    '/api/universities/:universityId',
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
  userActivity.updateLastActivity,
   userControllers.getCoursesWithFilters); //n

//get course by Id
router.get('/course/:courseId',
paymentMiddleware.checkPaymentStatus,
userActivity.updateLastActivity,
 userControllers.getCourseById) //n




// router.post('/application/:courseId', applicationController.applyForCourse);//previouse
router.get('/application/getStudentDetailsForApplication', applicationController.getStudentDetailsForApplication);
router.post('/application/:courseId',uploadFields,validateApplications.validateApplication,validate,applicationController.applyForCourse);
router.put('/application/update/:applicationId', uploadFields,validateApplications.validateUpdateApplication,validate,applicationController.updateApplication);
router.get('/students/applications',applicationController.getStudentApplications);
router.get('/get/application/:applicationId',applicationController.getApplicationById);
router.put('/application/withdraw/:applicationId',applicationController.withdrawApplication);//withdrawn
// Route to get application by ID


router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});



module.exports = router;
