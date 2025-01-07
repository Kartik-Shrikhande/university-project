const express = require('express');
const router = express.Router();

const authenticationMiddleware = require('../middlewares/authentication')
const paymentMiddleware = require('../middlewares/payment')
const userControllers = require('../controllers/studentControllers');
const userActivity = require('../middlewares/updateActivity')

const { registerValidator, loginValidator, updateValidator } = require('../validators/validations');
const { validationResult } = require('express-validator');

// Middleware to validate requests
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }
  next();
};

// Routes
router.post('/register', registerValidator,
  //  validate, 
   userControllers.registerStudent);

router.post('/login',
   loginValidator,
  //  validate,
   userActivity.updateLastActivity, 
   userControllers.loginStudent);

router.put('/update',
  authenticationMiddleware.authentication,
  updateValidator, 
  validate,
  userActivity.updateLastActivity,
   userControllers.updateStudent);

router.put('/update/password', 
  authenticationMiddleware.authentication,
  userActivity.updateLastActivity,
  userControllers.updatePassword)
   
router.delete('/delete',
  authenticationMiddleware.authentication,
  userActivity.updateLastActivity,
  userControllers.deleteStudent);



router.get('/universities',
  authenticationMiddleware.authentication,
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
  userControllers.getUniversities);


  //get unniversity by id
router.get('/university/:universityId',
  authenticationMiddleware.authentication, 
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
  userControllers.getUniversityById);

router.post('/create-payment',
  authenticationMiddleware.authentication,
  userActivity.updateLastActivity,
    userControllers.createPayment)

// Get all courses by uni id (optionally filtered by university)
router.get('/courses/:universityId',
  authenticationMiddleware.authentication,
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
   userControllers.getAllUniversityCourses);


   router.get('/filters/course',
    authenticationMiddleware.authentication,
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
     userControllers.getCoursesWithFilters);

//get course by Id
router.get('/course/:courseId',authenticationMiddleware.authentication,
  paymentMiddleware.checkPaymentStatus,
  userActivity.updateLastActivity,
   userControllers.getCourseById)


   router.post('/enroll/:courseId',authenticationMiddleware.authentication,
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
     userControllers.enrollCourse)
  

  router.post('/application/:universityId',authenticationMiddleware.authentication,
    paymentMiddleware.checkPaymentStatus,
    userActivity.updateLastActivity,
      userControllers.universityApplication)

//APPLICATION

// router.get('/students/:studentId/applications', userControllers.getStudentAppliedUniversities);


router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;
