const express = require('express');
const router = express.Router();
const CourseController = require('../controllers/coursesControllers');
const authenticationMiddleware = require('../middlewares/authentication')

//router.use(authenticationMiddleware.authentication,authenticationMiddleware.authorization)
router.post('/:universityId/create', CourseController.createCourse);
router.put('/course/:courseId', CourseController.updateCourse);
router.delete('/course/:courseId', CourseController.deleteCourse);

router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;
