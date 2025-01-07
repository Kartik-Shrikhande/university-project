const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

// Routes for Agent CRUD
router.post('/create/:agencyId', agentController.createAgent); // Create a new agent
router.get('/agents', agentController.getAllAgents); // Get all agents
router.get('/agents/:id', agentController.getAgentById); // Get an agent by ID
router.put('/agents/:id', agentController.updateAgent); // Update an agent
router.delete('/agents/:id', agentController.deleteAgent); // Delete an agent

router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});

module.exports = router;
