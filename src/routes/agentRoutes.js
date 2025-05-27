const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')

// // Routes for Agent CRUD
router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['agent']))

router.put('/update/password', agentController.agentUpdatePassword)
router.get('/profile',  agentController.getAgentProfile);
router.put('/update-profile',agentController.updateAgentProfile);

module.exports = router;
