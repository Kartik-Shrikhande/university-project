const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Agent = require('../models/agentModel');
const Application = require('../models/applicationModel');
const Agency = require('../models/agencyModel');
const University = require('../models/universityModel');
const Students = require('../models/studentsModel');


//STUDENT 
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Students.findById(id)
      .select('firstName middleName lastName email countryCode telephoneNumber address documentType documentUpload mostRecentEducation collegeUniversity programType discipline countryName preferredUniversity courseStartTimeline englishLanguageRequirement score') // Selected fields
      .populate('agency', 'name contactEmail') // Populate agency name and email
      .populate('assignedAgent', 'name') // Populate assigned agent name
      .populate('applications.applicationId'); // Populate application details

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


//AGENT - PROFILE
exports.agentUpdatePassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const agentId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
    }

    // Password length check
    if (newPassword.length < 8 || newPassword.length > 14) {
      return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
    }

    // Fetch the Agent
    const agent = await Agent.findById(agentId).session(session);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, agent.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Check new and confirm passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }


  // Check that new password is not the same as the current one
    const isSameAsCurrent = await bcrypt.compare(newPassword, agent.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ message: 'New password must be different from current password.' });
    }

    // Hash and update password
    agent.password = await bcrypt.hash(newPassword, 10);
    await agent.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Password updated successfully.' });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating password:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.getAgentProfile = async (req, res) => {
  try {
    const agentId = req.user.id;

    const agent = await Agent.findById(agentId).select("-password -__v -isDeleted");
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    res.status(200).json({ success: true, data: agent });
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};


exports.updateAgentProfile = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { username, phoneNumber, address } = req.body;

    const agent = await Agent.findOne({ _id: agentId, isDeleted: false });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    if (username) agent.username = username;
    if (phoneNumber) agent.phoneNumber = phoneNumber;
    if (address) agent.address = address;

    await agent.save();

    res.status(200).json({ success: true, message: "Profile updated successfully.", data: agent });
  } catch (error) {
    console.error("Error updating agent profile:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};


//AGENT - APPLICATION

exports.getAgentAssignedApplications = async (req, res) => {
  try {
    const agentId = req.user.id;

    const agent = await Agent.findById(agentId).select('assignedApplications');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.status(200).json({
      message: 'Assigned application IDs list',
      total: agent.assignedApplications.length,
      assignedApplications: agent.assignedApplications,  // just array of ObjectIds
    });
  } catch (err) {
    console.error('Error fetching assigned application IDs:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAgentApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const agentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    // Fetch application with selected student and university fields
    const application = await Application.findById(applicationId)
      .populate({
        path: 'student',
        select: '_id name email'
      })
      .populate({
        path: 'university',
        select: '_id name email'
      })
      .lean(); // convert to plain JS object

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if agent is assigned to this application
    if (!application.assignedAgent.map(id => id.toString()).includes(agentId)) {
      return res.status(403).json({ message: 'Unauthorized. This application is not assigned to you.' });
    }

    res.status(200).json({
      message: 'Application details fetched successfully',
      application
    });
  } catch (err) {
    console.error('Error fetching application details:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// //APPLICATION

//latest but not tested 
exports.agentSendApplicationToUniversity = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const agentId = req.user.id;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    // Find agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Ensure application is assigned to this agent
    if (!agent.assignedApplications.includes(applicationId)) {
      return res.status(403).json({ message: 'Unauthorized. This application is not assigned to you.' });
    }

    // Find application
    const application = await Application.findById(applicationId).populate('student').exec();
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const universityId = application.university;
    if (!universityId) {
      return res.status(404).json({ message: 'University ID not found in application' });
    }

    // Get agency from agent
    const agency = await Agency.findById(agent.agency);
    if (!agency) {
      return res.status(404).json({ message: 'Associated agency not found' });
    }

    // Check if application exists in agency's pendingApplications
    if (!agency.pendingApplications.includes(applicationId)) {
      return res.status(400).json({ message: 'Application is not in pendingApplications of the agency' });
    }

    // Remove application from agency's pendingApplications using simple filter logic
    agency.pendingApplications = agency.pendingApplications.filter(id => id.toString() !== applicationId);

    // Add application to agency's sentAppliactionsToUniversities
    agency.sentAppliactionsToUniversities.push(applicationId);

    // Find university
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Add application to university.pendingApplications
    university.pendingApplications.push({
      student: application.student._id,
      applicationId: applicationId,
    });

    // Move application to agent's approvedApplications
    agent.approvedApplications.push(applicationId);

    // Remove from agent's assignedApplications
    agent.assignedApplications = agent.assignedApplications.filter(id => id.toString() !== applicationId);

    // Save everything
    await agency.save();
    await university.save();
    await agent.save();

    return res.status(200).json({
      message: 'Application sent to university successfully by agent',
      applicationId: applicationId,
      universityId: universityId,
    });

  } catch (error) {
    console.error('Error sending application to university:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};



// exports.rejectApplicationById = async (req, res) => {
//   try {
//     const { applicationId, rejectionReason } = req.body;
//     const agentId = req.agentId; // Retrieved from authentication middleware

//     // Validate IDs
//     if (!mongoose.Types.ObjectId.isValid(applicationId)) {
//       return res.status(400).json({ message: 'Invalid application ID provided.' });
//     }

//     // Fetch the agent
//     const agent = await Agent.findById(agentId);
//     if (!agent) {
//       return res.status(404).json({ message: 'Agent not found.' });
//     }

//     // Fetch the application
//     const application = await Application.findById(applicationId);
//     if (!application) {
//       return res.status(404).json({ message: 'Application not found.' });
//     }

//     // Check if the agent is assigned to the application
//     if (!application.assignedAgent || !application.assignedAgent.includes(agentId)) {
//       return res.status(403).json({ message: 'Unauthorized: You are not assigned to this application.' });
//     }

//     // Update the application status to "Rejected"
//     application.status = 'Rejected';

//     // Add the agent's name and rejection reason to the notes
//     const agentName = agent.name;
//     const rejectionNote = `Rejected by ${agentName}: ${rejectionReason || 'No reason provided.'}`;
//     application.notes = application.notes
//       ? `${application.notes}\n${rejectionNote}`
//       : rejectionNote;

//     // Save the updated application
//     await application.save();

//     return res.status(200).json({
//       message: 'Application rejected successfully.',
//       application: {
//         id: application._id,
//         status: application.status,
//         notes: application.notes,
//       },
//     });
//   } catch (error) {
//     console.error('Error rejecting application:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };

