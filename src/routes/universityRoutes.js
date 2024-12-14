
const express = require('express');
const router = express.Router();

const universityController= require('../controllers/universityControllers');
const authenticationMiddleware = require('../middlewares/authentication')

const {
  createUniversityValidator,
  updateUniversityValidator,
} = require('../validators/universityValidations');

const { validationResult } = require('express-validator');

// Middleware to validate requests
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Routes

router.post('/create', createUniversityValidator, validate, universityController.createUniversity);
router.put('/update/:id', updateUniversityValidator, validate, universityController.updateUniversity);
router.delete('/delete/:id', universityController.deleteUniversity);
router.put('/promote/:universityId',universityController.promoteUniversity);

router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;






