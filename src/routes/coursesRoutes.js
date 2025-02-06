const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/coursesControllers');
const authenticationMiddleware = require('../middlewares/authentication')
const { validateCreateCourse, validateUpdateCourse, validateDeleteCourse, handleValidationErrors } = require('../validators/coursesValidations');


router.put('/course/:universityId/courses/:courseId', 
    validateUpdateCourse,
    handleValidationErrors,
    CourseController.updateCourse);


router.delete('/course/:courseId', 
    validateDeleteCourse,
    handleValidationErrors,
    CourseController.deleteCourse);

router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;
