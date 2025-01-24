const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');

// Create Agency
router.post('/create', agencyController.createAgency);
// Get All Agencies
// router.get('/agencies', agencyController.getAllAgencies);

// Get Agency by ID
router.get('/agencies/:id', agencyController.getAgencyById);
// Update Agency by ID
router.put('/update/:id', agencyController.updateAgencyById);

// Delete Agency by ID
router.delete('/delete/:id', agencyController.deleteAgencyById);
router.post('/login', agencyController.loginAgency);



//AGENT RELATED APIS
router.post('/agent/create',  agencyController.createAgent); // Create a new agent
router.put('/agents/:id', agencyController.updateAgent); // Update an agent
router.get('/agents',  agencyController.getAllAgents); // Get all agents 
router.get('/agents/:id',  agencyController.getAgentById); // Get an agent by ID
router.delete('/agents/:id',  agencyController.deleteAgent); // Delete an agent 




//APPLICATION RELATED APIS 

//get the list of all pending applications
router.get('/pending-applications', agencyController.getPendingApplications);
router.get('/application/:applicationId',agencyController.getApplicationDetailsById);
//allocate an agent to application
router.post('/assign-agent', agencyController.assignAgentToApplication);




//STUDENTS 
// Routes for students
router.get('/students', agencyController.getAllStudents); // Get all students
router.get('/students/:id', agencyController.getStudentById); // Get student by ID



router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});

module.exports = router;
