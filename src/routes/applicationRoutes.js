const express = require('express');
const applicationController  = require('../controllers/applicationController'); // Assuming the API is in applicationController
const router = express.Router();

// POST route for applying to a university
router.post('/application', applicationController.applyForUniversity);

module.exports = router;
