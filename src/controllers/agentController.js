// const Agent = require('../models/agentModel');
// const Agency = require('../models/agencyModel'); // Import the Agency model
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const mongoose = require('mongoose');
// const Application = require('../models/applicationModel');
// const University = require('../models/universityModel');
// require('dotenv').config({ path: '.env' })

// // Create a new agent
// // Create a new agent

// exports.agentLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Validate input
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required.' });
//     }

//     // Find the agent by email
//     const agent = await Agent.findOne({ email });
//     if (!agent) {
//       return res.status(404).json({ message: 'Agent not found.' });
//     }

//     // Compare passwords
//     const isPasswordValid = await bcrypt.compare(password, agent.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: 'Invalid password.' });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: agent._id, email: agent.email, role: agent.role },
//       process.env.SECRET_KEY,
//       { expiresIn: '5h' } // Token expiration time
//     );

//     return res.status(200).json({
//       message: 'Login successful.',
//       token,
//       agent: {
//         id: agent._id,
//         name: agent.name,
//         email: agent.email,
//         role: agent.role,
//       },
//     });
//   } catch (error) {
//     console.error('Error during agent login:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };


// //send selected applicaiton to university
//  //this api remaaninig:-
//  //(before this agent shoul able to see the pending ag=siigned applicaiton to him // so assign agent is next api in line)
//  // 1) it should check if first agent is assigned or not 
//  //  1)api should only ht by agent 
// // 3) move this api to agent controller


// //APPLICATION

// exports.getAllAssignedApplications = async (req, res) => {
//   try {
//     const agentId = req.agentId; // Retrieved from authentication middleware

//     // Validate `agentId`
//     if (!mongoose.Types.ObjectId.isValid(agentId)) {
//       return res.status(400).json({ message: 'Invalid agent ID provided.' });
//     }

//     // Fetch applications assigned to the agent
//     const applications = await Application.find({ assignedAgent: agentId })
//       .populate('university', 'name country')
//       .select('student university status');

//     // Check if no applications are assigned
//     if (applications.length === 0) {
//       return res.status(404).json({ 
//         message: 'No applications assigned to this agent.' 
//       });
//     }

//     // Prepare response
//     const response = applications.map((app) => ({
//       applicationId: app._id,
//       studentId: app.student,
//       university: app.university ? app.university.name : 'Unknown',
//       country: app.university ? app.university.country : 'Unknown',
//       status: app.status,
//     }));

//     return res.status(200).json({
//       message: 'Assigned applications fetched successfully.',
//       total:applications.length,
//       applications: response,
//     });
//   } catch (error) {
//     console.error('Error fetching assigned applications:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



// exports.getAssignedApplicationById = async (req, res) => {
//   try {
//     const agentId = req.agentId; // Retrieved from authentication middleware
//     const { applicationId } = req.params;

//     // Validate IDs
//     if (!mongoose.Types.ObjectId.isValid(agentId) || !mongoose.Types.ObjectId.isValid(applicationId)) {
//       return res.status(400).json({ message: 'Invalid IDs provided.' });
//     }

//     // Fetch application by ID and ensure it's assigned to the agent
//     const application = await Application.findOne({
//       _id: applicationId,
//       assignedAgent: agentId,
//     })
//       .populate('student', 'firstName lastName email telephoneNumber documentType documentUpload') // Full student details
//       .populate('university', 'name country description') // Full university details
//       .populate('course', 'name fees duration') // Full course details
//       .select('-__v'); // Exclude unnecessary fields like `__v`

//     // Handle case where no application is found
//     if (!application) {
//       return res.status(404).json({
//         message: 'Application not found or not assigned to this agent.',
//       });
//     }

//     // Prepare response
//     const response = {
//       applicationId: application._id,
//       status: application.status,
//       submissionDate: application.submissionDate,
//       reviewDate: application.reviewDate || 'Not reviewed yet',
//       notes: application.notes || 'No notes provided',
//       financialAid: application.financialAid || 'Not specified',
//       documents: application.documents || [],
//       student: {
//         id: application.student._id,
//         firstName: application.student.firstName,
//         lastName: application.student.lastName,
//         email: application.student.email,
//         telephoneNumber: application.student.telephoneNumber,
//         documentType: application.student.documentType,
//         documentUpload: application.student.documentUpload,
//       },
//       university: {
//         id: application.university._id,
//         name: application.university.name,
//         country: application.university.country,
//         description: application.university.description,
//       },
//       course: {
//         id: application.course._id,
//         name: application.course.name,
//         fees: application.course.fees,
//         duration: application.course.duration,
//       },
//     };

//     return res.status(200).json({
//       message: 'Application details fetched successfully.',
//       application: response,
//     });
//   } catch (error) {
//     console.error('Error fetching application by ID:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };


// exports.sendApplicationToUniversity = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const { applicationId } = req.body;
//     const agentId = req.agentId; // Retrieved from the authentication middleware

//     // Validate IDs
//     if (!mongoose.Types.ObjectId.isValid(applicationId)) {
//       return res.status(400).json({ message: 'Invalid application ID provided.' });
//     }

//     // Fetch the default agency
//     const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
//     if (!defaultAgency) {
//       return res.status(404).json({ message: 'Default agency not found.' });
//     }

//     // Check if the agent belongs to the default agency
//     const isAgentOfAgency = defaultAgency.agents.includes(agentId);
//     if (!isAgentOfAgency) {
//       return res.status(403).json({ message: 'Unauthorized: You are not an agent of this agency.' });
//     }

//     // Check if the application exists in agency's pendingApplications
//     const isPendingInAgency = defaultAgency.pendingApplications.includes(applicationId);
//     if (!isPendingInAgency) {
//       return res.status(404).json({
//         message: 'Application not found in agency\'s pending applications.',
//       });
//     }

//     // Fetch application
//     const application = await Application.findById(applicationId).session(session);
//     if (!application) {
//       return res.status(404).json({ message: 'Application not found.' });
//     }

//     // Automatically fetch the university from the application
//     const universityId = application.university;

//     // Fetch university
//     const university = await University.findById(universityId).session(session);
//     if (!university) {
//       return res.status(404).json({ message: 'University not found.' });
//     }

//     // Add application to university's pending applications
//     university.pendingApplications.push({
//       student: application.student,
//       applicationId: application._id,
//     });

//     // Save updated university
//     await university.save({ session });

//     // Remove application from agency's pendingApplications
//     defaultAgency.pendingApplications = defaultAgency.pendingApplications.filter(
//       (id) => id.toString() !== applicationId
//     );

//     // Add application to agency's sentApplicationsToUniversities
//     defaultAgency.sentAppliactionsToUniversities.push(applicationId);

//     // Save updated agency
//     await defaultAgency.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       message: 'Application successfully sent to the university.',
//       application: {
//         id: application._id,
//         status: application.status,
//         submissionDate: application.submissionDate,
//         university: universityId,
//         course: application.course,
//       },
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error('Error sending application to university:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };




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

