const Agent = require('../models/agentModel');
const Agency = require('../models/agencyModel'); // Import the Agency model
const bcrypt = require('bcrypt');

// Create a new agent
// Create a new agent
exports.createAgent = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { agencyId } = req.params; // Take agency ID from the URL parameters

    // Check if the agency exists
    const agencyExists = await Agency.findById(agencyId);
    if (!agencyExists) {
      return res.status(404).json({ message: 'Agency not found' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new agent
    const newAgent = new Agent({
      name,
      email,
      password: hashedPassword,
      agency: agencyId,
    });

    await newAgent.save();

    // Add the new agent to the `agents` array of the agency
    agencyExists.agents.push(newAgent._id);
    await agencyExists.save();

    return res.status(201).json({
      message: 'Agent created successfully',
      agent: newAgent,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Get all agents
exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find().populate('agency', 'name').populate('assignedStudents', 'name');
    return res.status(200).json({ totalAgents:agents.length,data: agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Get a single agent by ID
exports.getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await Agent.findById(id).populate('agency', 'name').populate('assignedStudents', 'name');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.status(200).json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// Update an agent
exports.updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedAgent = await Agent.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.status(200).json({ message: 'Agent updated successfully', agent: updatedAgent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Delete an agent
exports.deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAgent = await Agent.findByIdAndDelete(id);
    if (!deletedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    return res.status(200).json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
