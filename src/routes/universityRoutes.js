
const express = require('express');
const router = express.Router();
const universityController= require('../controllers/universityControllers')
// const CourseController = require('../controllers/coursesControllers');
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const receiptController = require('../controllers/receiptController');
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


//NOTIFICATION 
router.get('/notifications', universityController.getAllNotifications);
router.get('/notifications/:id', universityController.getNotificationById);
router.delete('/notification/delete/:id', universityController.deleteStudentNotificationById);



//PROFILE
router.get('/profile',universityController.seeUniversityProfile);
router.put('/update', upload.single('bannerImage'), validateUniversityUpdate, universityController.updateUniversity);
router.put('/update/password', universityController.universityUpdatePassword)
router.delete('/delete', validateDeleteUniversity,universityController.deleteUniversity);




//RECEIPT 

// // Get all receipts for the university
router.get('/receipts', receiptController.getAllStudentReceipts);

// // Get a receipt by ID
router.get('/receipt/:id',receiptController.getstudentReceiptById);

// Accept a receipt
router.put('/receipts/accept/:id',receiptController.acceptReceipt);

// Reject a receipt with a remark
router.put('/receipts/reject/:id',receiptController.rejectReceipt);
router.delete('/delete/receipt/:id', receiptController.deleteReceipt);




//APPLICATION

// ✅ Get all pending applications
router.get('/pending-applications',  universityController.getPendingApplications);


router.get('/all/applications', universityController.getAllUniversityApplications);


// // ✅ Get application details by ID
router.get('/application/:applicationId', universityController.getApplicationDetails);


// ✅ Accept an application
// router.put('/application/accept/:applicationId', universityController.acceptApplication);
//NOTE IMP :- acceptance letter is stored in extraDocuments of application model (database) 
router.post('/application/accept/:applicationId', upload.single('acceptanceLetter'), universityController.acceptApplication);

// ✅ Reject an application
router.put('/application/reject/:applicationId', universityController.rejectApplication);




//COURSES 

router.post('/api/course/create',
  upload.array('courseImage', 5),
  validateCreateCourse,
 handleValidationErrors,
 universityController.createCourse);


// Update Course (Only University can update)
router.put('/update/:courseId', upload.array('courseImage', 5), 
validateUpdateCourse, 
handleValidationErrors, 
universityController.updateCourse);

// Delete Course (Only University can delete - Soft Delete)
router.delete('/delete/:courseId', 
  validateDeleteCourse,
   handleValidationErrors, 
   universityController.deleteCourse);



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