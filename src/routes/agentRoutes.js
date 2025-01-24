const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const agentAuth = require('../middlewares/agentAuthentication');

// Routes for Agent CRUD


router.post('/login', agentController.agentLogin); // Create a new agent



//APPLICATION RELATED APIS 

//get all assigned application
router.get('/assigned/applications', agentAuth.authentication,agentController.getAllAssignedApplications);


// Route to get assigned application by ID // for review or to see application in details 
router.get('/applications/:applicationId', agentAuth.authentication,agentController.getAssignedApplicationById);


// send application to university 
router.post('/send-application', agentAuth.authentication,agentController.sendApplicationToUniversity);

router.post('/reject-application', agentAuth.authentication, agentController.rejectApplicationById);

router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;
