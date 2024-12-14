const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/coursesControllers');


router.post('/:universityId/create', CourseController.createCourse);
router.put('/course/:courseId', CourseController.updateCourse);
router.delete('/course/:courseId', CourseController.deleteCourse);

module.exports = router;
