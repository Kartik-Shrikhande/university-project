const Agent = require('../models/agentModel');
const Agency = require('../models/agencyModel'); // Import the Agency model
const bcrypt = require('bcrypt');

// Create a new agent
// Create a new agent
exports.createAgent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Fetch the default agency
    const defaultAgency = await Agency.findById('677f6b7c701bc85481046b64');
    if (!defaultAgency) {
      return res.status(500).json({ message: 'Default agency not found.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new agent
    const newAgent = new Agent({
      name,
      email,
      password: hashedPassword,
      agency: defaultAgency._id, // Use default agency ID
    });

    await newAgent.save();

    // Add the new agent to the `agents` array of the default agency
    defaultAgency.agents.push(newAgent._id);
    await defaultAgency.save();

    return res.status(201).json({
      message: 'Agent created successfully',
      agent: newAgent,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find()
      .populate('agency', 'name contactEmail')
      .populate('assignedStudents', 'name email');

    return res.status(200).json({
      totalAgents: agents.length,
      data: agents,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAgentById = async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findById(id)
      .populate('agency', 'name contactEmail')
      .populate('assignedStudents', 'name email');

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

    return res.status(200).json({
      message: 'Agent updated successfully',
      agent: updatedAgent,
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Delete an agent
exports.deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the agent
    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Remove the agent from the agency's agent list
    const defaultAgency = await Agency.findById(agent.agency);
    if (defaultAgency) {
      defaultAgency.agents = defaultAgency.agents.filter((agentId) => agentId.toString() !== id);
      await defaultAgency.save();
    }

    // Delete the agent
    await agent.remove();

    return res.status(200).json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
