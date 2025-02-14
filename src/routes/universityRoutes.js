
const express = require('express');
const router = express.Router();
const universityController= require('../controllers/universityControllers')
const CourseController = require('../controllers/coursesControllers');
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const upload = require('../middlewares/uploadMiddleware'); // Import upload middleware
const { authenticateUniversity, authorizeUniversityRole } = authenticationMiddleware;
const { validationResult } = require('express-validator');
const { validateCreateCourse, validateUpdateCourse, validateDeleteCourse, handleValidationErrors } = require('../validators/coursesValidations');

const {
  validateCreateUniversity,
  validateUniversityLogin,
  validateUniversityUpdate,
  validateDeleteUniversity,
  validateUniversityId, 
  validateCourseId, 
} = require('../validators/universityValidations');



// Routes
// router.use(authenticationMiddleware.authentication,authenticationMiddleware.authorization)

router.post('/login',validateUniversityLogin, universityController.universityLogin);
router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['University']))

router.get('/profile',universityController.seeUniversityProfile);
router.put('/update', upload.single('bannerImage'), validateUniversityUpdate, universityController.updateUniversity);
router.put('/update/password', universityController.universityUpdatePassword)
router.delete('/delete', validateDeleteUniversity,universityController.deleteUniversity);


//COURSES 

router.post('/api/course/create',
  validateCreateCourse,
 handleValidationErrors,
 universityController.createCourse);

//GET - ACTIVE/INACTIVE
//get all courses (Active)
router.get('/get/all-courses', universityController.getAllCourses);
// Get all inactive courses for a university
router.get('/get/active-courses', universityController.getAllactiveCourses);
// Get all inactive courses for a university
router.get('/get/inactive-courses', universityController.getAllInactiveCourses);
// Get an inactive course by ID
router.get('/get/course/:courseId', universityController.getCourseById);



//POST - ACTIVE/INACTIVE
// Inactivate an active course
router.patch('/courses/inactivate/:courseId', universityController.inactivateCourse);
// Activate an inactive course
router.patch('/courses/activate/:courseId', universityController.activateCourse);



router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;






////////////////////////////////////////////////////////
// const { authenticateUniversity, authorizeUniversityRole } = authenticationMiddleware;

// // Routes

// // Public routes (no authentication required)

// // Protected routes (requires authentication and authorization)
// router.use(authenticateUniversity, authorizeUniversityRole);




// // Get all courses for the authenticated university

// // Get a specific course by ID for the authenticated university


// // Get all inactive courses for the authenticated university
// router.get('/inactive-courses', universityController.getAllInactiveCourses);

// // Get an inactive course by ID for the authenticated university
// router.get('/inactive-course/:courseId', validateCourseId, universityController.getInactiveCourseById);

// // Inactivate an active course
// router.patch('/courses/:courseId/inactivate', validateCourseId, universityController.inactivateCourse);

// // Activate an inactive course
// router.patch('/courses/:courseId/activate', validateCourseId, universityController.activateCourse);

// // 404 handler for unmatched routes
// router.use('*', (req, res) => {
//   res.status(404).json({
//     error: 'Invalid URL path',
//     message: `The requested URL not found on this server.`,
//   });
// });

// module.exports = router;