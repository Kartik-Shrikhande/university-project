const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');

// Create Agency
router.post('/create', agencyController.createAgency);

// Get All Agencies
router.get('/agencies', agencyController.getAllAgencies);

// Get Agency by ID
router.get('/agencies/:id', agencyController.getAgencyById);

// Update Agency by ID
router.put('/agencies/:id', agencyController.updateAgencyById);

// Delete Agency by ID
router.delete('/agencies/:id', agencyController.deleteAgencyById);


//Application

router.post('/send-application', agencyController.sendApplicationToUniversity);


router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});

module.exports = router;
