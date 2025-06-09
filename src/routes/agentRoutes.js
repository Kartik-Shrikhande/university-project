const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')

// // Routes for Agent CRUD
router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['agent']))

//STUDENT
router.get('/students/:id', agentController.getStudentById); // Get student by ID


//PROFILE
router.put('/update/password', agentController.agentUpdatePassword)
router.get('/profile',  agentController.getAgentProfile);
router.put('/update-profile',agentController.updateAgentProfile);

//AGENT - APPLICATIONS
router.get('/applications', agentController.getAgentAssignedApplications);
router.get('/applications/:applicationId',agentController.getAgentApplicationById);
// Send Application to University by Agent
router.post('/send/application/:applicationId',agentController.agentSendApplicationToUniversity);


// router.post('/applications/:applicationId/accept', authenticateAgent, agentController.agentAcceptApplication);
// router.post('/applications/:applicationId/reject', authenticateAgent, agentController.agentRejectApplication);

module.exports = router;
