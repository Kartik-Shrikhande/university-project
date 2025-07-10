const Agency = require('../models/agencyModel');
const mongoose = require('mongoose');
const Application = require('../models/applicationModel');
const { uploadFilesToS3 } = require('../utils/s3Upload'); 
const Students = require('../models/studentsModel');
const University = require('../models/universityModel');
const Agent = require('../models/agentModel');
const bcrypt = require('bcrypt');
const generator = require('generate-password');
const nodemailer = require('nodemailer');
const Course = require('../models/coursesModel');
const university = require('../models/universityModel');
const Notification = require('../models/notificationModel');
const AssociateSolicitor = require('../models/associateModel');
const Solicitor = require("../models/solicitorModel");
const checkEmailExists = require('../utils/checkEmailExists');
const crypto = require("crypto");
const { encryptData,decryptData } = require('../services/encryption&decryptionKey');
const { sendRejectionEmail,sendSolicitorRequestApprovedEmail,sendOfferLetterEmailByAgency,sendPasswordResetByAdminEmail,generateEmailTemplate,sendEmailWithLogo} = require('../services/emailService');
const { sendNotification } = require('../services/socketNotification');
const { isValidObjectId } = require('mongoose');
require('dotenv').config()


//reset password of all the roles 
exports.resetUserPasswordByAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // List of models to check, order doesn't matter if emails are globally unique
    const models = [
      { name: "agent", model: Agent },
      { name: "solicitor", model: Solicitor },
      { name: "university", model: University },
      { name: "agency", model: Agency },
    ];

    let user = null;
    let role = null;

    // Find user by email in any model
    for (const item of models) {
      const found = await item.model.findOne({ email });
      if (found) {
        user = found;
        role = item.name;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({ message: "No user found with the provided email." });
    }

    // Generate new password
    const newPassword = crypto.randomBytes(5).toString("hex");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Send email with new password
    await sendPasswordResetByAdminEmail(user, newPassword);

    res.status(200).json({
      message: `Password reset successfully for ${role}. New password sent on email: ${email}`,
    });

  } catch (error) {
    console.error("Error resetting password by admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


//AGENT APIS

exports.createAgent = async (req, res) => {
  try {
    const {
      username,
      email,
      phoneNumber,
      address
    } = req.body;

    const agencyId = req.user.id; // Assuming agencyId is in req.user via your auth middleware

    if (!agencyId) {
      return res.status(400).json({ success: false, message: "Agency ID not provided." });
    }

    // Check if the email is already in use
    const existingAgent = await Agent.findOne({ email });

  const existingRole = await checkEmailExists(email, null);
if (existingRole) {
  return res.status(400).json({ message: `This email is already registered as a ${existingRole}.` });
}

    // Remove old deleted agent if exists
    if (existingAgent && existingAgent.isDeleted) {
      await Agent.deleteOne({ email });
    }

    // Auto-generate password
    const password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
      exclude: `"'\\\``
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new agent
    const newAgent = new Agent({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      address,
      agency: agencyId
    });

    await newAgent.save();


    // ✅ Add agent ID to agency.agents array
    await Agency.findByIdAndUpdate(agencyId, {
      $push: { agents: newAgent._id }
    });

     // ✅ Prepare HTML email using your styled template
    const html = generateEmailTemplate(
      "Your Agent Account is Ready!",
      "#004AAC",
      `
      <p style="font-size:16px;color:#333;">Hi <strong>${username}</strong>,</p>
      <p style="font-size:16px;color:#555;">Your agent account has been successfully created. Here are your login credentials:</p>
      <ul style="font-size:16px;color:#555;">
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p style="font-size:16px;color:#555;">Please log in and change your password immediately for security reasons.</p>
      `,
      {
        text: "Log In Now",
        link: `${process.env.CLIENT_BASE_URL}/agent/login`
      }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Agent Account Credentials",
      html,
    };

    // ✅ Send using your common mailer utility
    await sendEmailWithLogo(mailOptions);

    res.status(201).json({
      success: true,
      message: "Agent created successfully. Credentials sent via email."
    });

  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ isDeleted: false })
      .select('-password')  // Exclude password from result
      .sort({ createdAt: -1 }); // Optional: latest first

    res.status(200).json({
      success: true,
      total:agents.length,
      message: "Agents fetched successfully.",
      data: agents
    });

  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
 
exports.getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;

       if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }


    const agent = await Agent.findOne({ _id: agentId, isDeleted: false })
      .select('-password');

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    res.status(200).json({
      success: true,
      message: "Agent fetched successfully.",
      data: agent
    });

  } catch (error) {
    console.error("Error fetching agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.updateAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    // Validate agentId
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    // Destructure fields from body
    const { username, phoneNumber, address} = req.body;

    // Prevent updating email and password
    // if (email || password) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Email and password cannot be updated via this API."
    //   });
    // }

    // Ensure at least one updatable field is provided
    if (
      username === undefined &&
      phoneNumber === undefined &&
      address === undefined 
      //&& isActive === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update."
      });
    }

    // Find the agent under the same agency
    const agent = await Agent.findOne({
      _id: agentId,
      isDeleted: false
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    // Update permitted fields
    if (username) agent.username = username;
    if (phoneNumber) agent.phoneNumber = phoneNumber;
    if (address) agent.address = address;

    // if (isActive !== undefined) {
    //   agent.isActive = isActive;
    // }

    // Save updates
    await agent.save();

    res.status(200).json({
      success: true,
      message: "Agent updated successfully.",
      data: {
        id: agent._id,
        username: agent.username,
        phoneNumber: agent.phoneNumber,
        address: agent.address,
        // isActive: agent.isActive,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }
    });

  } catch (error) {
    console.error("Error updating agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

//Done
// Soft Delete agent
exports.deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }


    const agent = await Agent.findOne({ _id: agentId, isDeleted: false });

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    agent.isDeleted = true;
    await agent.save();

    
    // ✅ Remove agent ID from agency.agents array
    await Agency.findByIdAndUpdate(req.user.id, {
      $pull: { agents: agentId }
    });

    res.status(200).json({ success: true, message: "Agent deleted successfully." });

  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.hardDeleteAgent = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    const agent = await Agent.findOne({ _id: agentId, agency: req.user.id });

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found." });
    }

    // Remove agent from Agency.agents array
    await Agency.findByIdAndUpdate(req.user.id, {
      $pull: { agents: agentId }
    });

    // Hard delete agent record
    await Agent.findByIdAndDelete(agentId);

    res.status(200).json({ success: true, message: "Agent permanently deleted." });

  } catch (error) {
    console.error("Error hard deleting agent:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};



//SOLICITOR 


exports.createSolicitor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      address,
      // countryCode,
      phoneNumber,
    } = req.body;

    // Get associate ID from authenticated user
    const nameOfAssociate = req.user.id;

    // Check if the email is already registered
    const existingSolicitor = await Solicitor.findOne({ email });
    
     const existingRole = await checkEmailExists(email, null);
    if (existingRole) {
  return res.status(400).json({ message: `This email is already registered as a ${existingRole}.` });
}
    
        // If the associate exists but isDeleted: true, remove the old record
        if (existingSolicitor && existingSolicitor.isDeleted) {
          await solicitorModel.deleteOne({ email });
        }
    
    
    // **Auto-generate a password**
    const password = generator.generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
      exclude: `"'\\\``  // excludes ", ', \, and `
    });

    // **Hash the generated password**
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new solicitor
    const newSolicitor = new Solicitor({
      firstName,
      lastName,
      email,
      password: hashedPassword, // Store hashed password
      address,
      // countryCode,
      phoneNumber,
      nameOfAssociate,
       agency: process.env.DEFAULT_AGENCY_ID
    });

    // Save the solicitor to the database
    await newSolicitor.save();

    // ✅ Styled HTML credentials email
    const html = generateEmailTemplate(
      "Your Solicitor Account is Ready!",
      "#004AAC",
      `
      <p style="font-size:16px;color:#333;">Hi <strong>${firstName} ${lastName}</strong>,</p>
      <p style="font-size:16px;color:#555;">Your solicitor account has been created. Here are your login credentials:</p>
      <ul style="font-size:16px;color:#555;">
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p style="font-size:16px;color:#555;">Please log in and change your password immediately.</p>
      `,
      {
        text: "Log In Now",
        link: `${process.env.CLIENT_BASE_URL}/solicitor/login`
      }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Solicitor Account Credentials",
      html
    };

    await sendEmailWithLogo(mailOptions);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Solicitor created successfully. Check your email for credentials.',
    });
  } catch (error) {
    console.error('Error creating solicitor:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateSolicitorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if ID format is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Solicitor ID" });
    }

    // Find the solicitor and ensure it belongs to the logged-in associate
    const solicitor = await Solicitor.findOne({
      _id: id,
      isDeleted: false,
    });

    // Check if solicitor exists and belongs to the associate
    if (!solicitor) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Solicitor not found",
        });
    }

    // Define restricted fields that cannot be updated
    const restrictedFields = [
      "email",
      "password",
      "nameOfAssociate",
      "completedVisa",
      "isActive",
      "visaRequestStatus",
      "reason",
      "role",
      "isDeleted",
    ];

    // Check if any restricted field is present in the request body
    const invalidFields = Object.keys(req.body).filter((field) =>
      restrictedFields.includes(field)
    );

    // Return error if restricted fields are found in the request
    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following fields cannot be updated: ${invalidFields.join(
          ", "
        )}`,
      });
    }

    // Extract allowed fields from request body
    const { firstName, lastName, address, countryCode, phoneNumber } = req.body;

    // Update only the allowed fields
    solicitor.firstName = firstName || solicitor.firstName;
    solicitor.lastName = lastName || solicitor.lastName;
    solicitor.address = address || solicitor.address;
    // solicitor.countryCode = countryCode || solicitor.countryCode;
    solicitor.phoneNumber = phoneNumber || solicitor.phoneNumber;

    // Save the updated solicitor
    await solicitor.save();

    res.status(200).json({
      success: true,
      message: "Solicitor updated successfully",
      solicitor,
    });
  } catch (error) {
    console.error("Error updating solicitor:", error);
    res.status(500).json({ success: false, message: "Error updating solicitor" });
  }
};

exports.getAllSolicitors = async (req, res) => {
  try {
    // Get Associate ID from toke

    // Find all solicitors created by this associate and not deleted
    const solicitors = await Solicitor.find({
      isDeleted: false,
    }).select("firstName lastName email countryCode phoneNumber studentAssigned isActive");

    res.status(200).json({
      total: solicitors.length,
      data: solicitors,
    });
  } catch (error) {
    console.error("Error fetching solicitors:", error);
    res.status(500).json({ error: "Error fetching solicitors" });
  }
};

// @desc Get Solicitor by ID
// @route GET /api/solicitors/:id
exports.getSolicitorById = async (req, res) => {
  try {
   
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Solicitor ID" });
    }

    // Find the solicitor by ID and ensure it belongs to the logged-in associate
    const solicitor = await Solicitor.findOne({
      _id: id,
      isDeleted: false,
    }).select('-currentToken -password');

    if (!solicitor) {
      return res.status(404).json({ error: "Solicitor not found" });
    }
    
    res.status(200).json(solicitor);
  } catch (error) {
    console.error("Error fetching solicitor:", error);
    res.status(500).json({ error: "Error fetching solicitor" });
  }
};
// @desc Update Solicitor
// @route PUT /api/solicitors/:id



// @desc Delete Solicitor
// @route DELETE /api/solicitors/:id
exports.deleteSolicitor = async (req, res) => {
  try {
   
    const { id } = req.params;

    // Validate if ID format is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Solicitor ID" });
    }

    // Find the solicitor by ID
    const solicitor = await Solicitor.findById(id);

    
    // Check if solicitor exists or is already deleted
    if (!solicitor || solicitor.isDeleted) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }


    // Mark solicitor as deleted (Soft delete)
    solicitor.isDeleted = true;
    await solicitor.save();

    res
      .status(200)
      .json({ success: true, message: "Solicitor deleted successfully" });
  } catch (error) {
    console.error("Error deleting solicitor:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting solicitor" });
  }
};



//SOLICITORS REQUEST

exports.getAllSolicitorRequests = async (req, res) => {
  try {
    const agencyId = req.user.id;

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agency not found" });
    }

    const applications = await Application.find({
      _id: { $in: agency.solicitorRequests },
      agency: agencyId,
      status: 'Accepted'
    })
      .populate('student', 'firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline')
      .populate('course', 'name')
      .sort({ createdAt: -1 })

    if (!applications.length) {
      return res.status(200).json({
        success: true,
        message: "No solicitor requests found",
        total: 0,
        requests: []
      });
    }

    const results = applications.map(app => {
      const student = app.student ? {
        id: app.student._id,
        firstName: app.student.firstName,
        lastName: app.student.lastName,
        email: app.student.email,
        telephoneNumber: app.student.telephoneNumber,
        countryApplyingFrom: app.student.countryApplyingFrom,
        courseStartTimeline: app.student.courseStartTimeline
      } : null;

      return {
        applicationId: app._id,
        course: app.course ? app.course.name : null,
        student
      };
    });

    res.status(200).json({
      success: true,
      message: "Solicitor requests fetched successfully",
      total: results.length,
      requests: results
    });
  } catch (err) {
    console.error("Error fetching solicitor requests:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getSolicitorRequestByApplicationId = async (req, res) => {
  try {
    const agencyId = req.user.id;
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Application ID" });
    }

    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.solicitorRequests.includes(applicationId)) {
      return res.status(403).json({ success: false, message: "This solicitor service request is not associated with your agency" });
    }

    const application = await Application.findOne({
      _id: applicationId,
      agency: agencyId,
      status: 'Accepted'
    })
    .populate('student', 'firstName lastName email telephoneNumber presentAddress countryApplyingFrom mostRecentEducation yearOfGraduation')
    .populate('university')
    .populate('course');

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({
      success: true,
      message: "Solicitor request details",
      application
    });
  } catch (err) {
    console.error("Error getting solicitor request details:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.assignSolicitorRequestToSolicitor = async (req, res) => {
  try {
    const { solicitorId, applicationId } = req.body;

    // Validate input
    if (!solicitorId || !applicationId) {
      return res.status(400).json({ success: false, message: "solicitorId and applicationId are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(solicitorId)) {
      return res.status(400).json({ success: false, message: "Invalid solicitor ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    // Verify application exists
    const application = await Application.findById(applicationId).populate('student');
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // ✅ Find solicitor and their agency
    const solicitor = await Solicitor.findById(solicitorId).populate('agency');
    if (!solicitor) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }

    const agency = solicitor.agency;
    if (!agency) {
      return res.status(404).json({ success: false, message: "Solicitor's agency not found" });
    }

    // Verify agency owns this solicitor request
    if (!agency.solicitorRequests.includes(applicationId)) {
      return res.status(403).json({ success: false, message: "This solicitor request is not associated with this agency" });
    }

    // Prevent duplicate assignments
    if (solicitor.assignedSolicitorRequests.includes(applicationId)) {
      return res.status(400).json({ success: false, message: "This application is already assigned to this solicitor" });
    }

    // Check if this application was already assigned to any solicitor
    const alreadyAssignedToAnySolicitor = await Solicitor.findOne({
      assignedSolicitorRequests: applicationId
    });

if (alreadyAssignedToAnySolicitor) {
  return res.status(400).json({ 
    success: false, 
    message: "This solicitor request is already assigned to another solicitor." 
  });
}

solicitor.assignedSolicitorRequests.push(applicationId);
// Prevent duplicate student assignment
if (!solicitor.studentAssigned.includes(application.student._id)) {
  solicitor.studentAssigned.push(application.student._id);
}

await solicitor.save();

    // Remove application from agency's pending solicitor requests list
    await Agency.findByIdAndUpdate(
      agency._id,
      { $pull: { solicitorRequests: applicationId } }
    );

    // ✅ Only send notification/email if this is the first assignment
    if (!alreadyAssignedToAnySolicitor) {
      await Notification.create({
        user: application.student._id,
        message: `🎉 Congratulations! Your solicitor request has been approved. A solicitor will be assigned to you shortly.`,
        type: 'General',
      });

      await sendSolicitorRequestApprovedEmail(application.student);
    }

    res.status(200).json({
      success: true,
      message: "Solicitor request successfully assigned to solicitor",
      data: solicitor
    });

  } catch (error) {
    console.error("Error assigning solicitor request:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getAssignedSolicitorRequests = async (req, res) => {
  try {
    const agencyId = req.user.id;

    // Fetch associates who have assigned solicitor requests (by application IDs)
    const associates = await AssociateSolicitor.find({
      assignedSolicitorRequests: { $exists: true, $not: { $size: 0 } }
    }).populate({
      path: 'assignedSolicitorRequests',
      populate: {
        path: 'student',
        select: 'firstName lastName email'
      }
    });

    // Map the response
    const result = associates.map(associate => {
      const assignedApplications = associate.assignedSolicitorRequests.map(application => ({
        applicationId: application._id,
        studentId: application.student._id,
        studentName: `${application.student.firstName} ${application.student.lastName}`,
        studentEmail: application.student.email
      }));

      return {
        associateId: associate._id,
        associateName: associate.nameOfAssociate,
        associateEmail: associate.email,
        numberOfAssignedRequests: assignedApplications.length,  // 👈 count per associate
        applications: assignedApplications
      };
    });

    // Grand total of all assigned applications
    const grandTotal = result.reduce((acc, associate) => acc + associate.numberOfAssignedRequests, 0);

    res.status(200).json({
      success: true,
      totalAssignedRequests: grandTotal,
      message: "Assigned solicitor requests fetched successfully",
      data: result
    });
  } catch (error) {
    console.error("Error fetching assigned solicitor requests:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.getAssignedSolicitorRequestByAssociateId = async (req, res) => {
  try {
    const associateId = req.params.id;

    
     // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(associateId)) {
      return res.status(400).json({ success: false, message: "Invalid associateId ID" });
    }

    // Check if associate exists
    const associate = await AssociateSolicitor.findById(associateId)
      .populate({
        path: 'assignedSolicitorRequests',
        select: '_id',
        populate: {
          path: 'student',
          select: 'firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline'
        }
      })
      .select('nameOfAssociate email'); // Include associate info

    if (!associate) {
      return res.status(404).json({ success: false, message: 'Associate not found' });
    }

    // Check if no assigned solicitor requests
    if (!associate.assignedSolicitorRequests || associate.assignedSolicitorRequests.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No solicitor requests assigned to this associate yet.',
        associateId: associate._id,
        associateName: associate.nameOfAssociate,
        associateEmail: associate.email,
        applications: []
      });
    }

    // Format response data
    const applications = associate.assignedSolicitorRequests.map(app => ({
      applicationId: app._id,
      studentId: app.student._id,
      studentName: `${app.student.firstName} ${app.student.lastName}`,
      studentEmail: app.student.email,
      telephoneNumber: app.student.telephoneNumber,
      countryApplyingFrom: app.student.countryApplyingFrom,
      courseStartTimeline: app.student.courseStartTimeline
    }));

    res.status(200).json({
      success: true,
      message: 'Assigned solicitor request fetched successfully',
      totalAssignedRequests: applications.length,
      associateId: associate._id,
      associateName: associate.nameOfAssociate,
      associateEmail: associate.email,
      applications
    });
  } catch (err) {
    console.error('Error fetching assigned solicitor request by ID:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


exports.getAllStudentsAppliedForSolicitorService = async (req, res) => {
  try {
    const agencyId = req.user.id;

    const students = await Students.find({
      solicitorService: true
    }).select('_id firstName lastName email');

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: "No students have applied for solicitor services"
      });
    }

    res.status(200).json({
      success: true,
      total:students.length,
      message: "Students who applied for solicitor services fetched successfully",
      students
    });
  } catch (error) {
    console.error("Error fetching solicitor applicants:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




//NOTIFICATION

exports.getAllNotifications = async (req, res) => {
  try {
    const Id = req.user.id;

    const notifications = await Notification.find({ user: Id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const Id = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: Id
    });
  
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Mark as read if it's not already
    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error('Error fetching notification by ID:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteNotificationByIdAgency = async (req, res) => {
  try {
    const studentId = req.user.id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Ensure the notification belongs to the student
    if (notification.user.toString() !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: This notification does not belong to you' });
    }

    await Notification.findByIdAndDelete(notificationId);
    res.status(200).json({ success: true, message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Error deleting student notification:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




//STUDENT

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Students.find({isDeleted: false})
      .select('firstName middleName lastName email countryCode telephoneNumber address documentType documentUpload countryApplyingFrom preferredUniversity courseStartTimeline mostRecentEducation') // Select fields to be shown
      .populate('agency', 'name') // Assuming you want to populate agency name
      .populate('assignedAgent', 'name'); // Assuming you want to populate assigned agent name

    return res.status(200).json({
      totalStudents: students.length,
      data: students,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Students.findById(id)
      .select('firstName middleName lastName email countryCode telephoneNumber address documentType documentUpload mostRecentEducation collegeUniversity programType discipline countryName preferredUniversity courseStartTimeline englishLanguageRequirement document score') // Selected fields
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

exports.updateStudentById = async (req, res) => {
  let session;
  try {
    const { studentId } = req.params;

   if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }


    let updates = req.body;


    // Remove empty fields from updates
    updates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== '')
    );

    // Restricted fields that cannot be updated
    const restrictedFields = [
      'email',
      'password',
      'visitedUniversities',
      'visitedCourses',
      'enrolledCourses',
    ];

    // Check for restricted fields in updates
    const invalidFields = Object.keys(updates).filter((field) =>
      restrictedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      return res.status(400).json({
        message: `Fields ${invalidFields.join(', ')} cannot be updated directly.`,
      });
    }

    // Check if there are valid fields to update or files to upload
    if (
      Object.keys(updates).length === 0 &&
      (!req.files || (!req.files['document'] && !req.files['documentUpload']))
    ) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    // Start session for transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Handle document uploads
    let uploadedDocuments = [];
    let uploadedDocumentUploads = [];

    if (req.files) {
      if (req.files['document']) {
        uploadedDocuments = await uploadFilesToS3(req.files['document']);
      }

      if (req.files['documentUpload']) {
        uploadedDocumentUploads = await uploadFilesToS3(req.files['documentUpload']);
      }
    }

    // Append uploaded documents if any
    if (uploadedDocuments.length > 0) {
      updates.document = [
        ...(Array.isArray(updates.document) ? updates.document : []),
        ...uploadedDocuments,
      ];
    }

    if (uploadedDocumentUploads.length > 0) {
      updates.documentUpload = [
        ...(Array.isArray(updates.documentUpload)
          ? updates.documentUpload
          : []),
        ...uploadedDocumentUploads,
      ];
    }

    // Update student document
    const updatedStudent = await Students.findByIdAndUpdate(
      studentId,
      { $set: updates },
      { new: true, runValidators: true, session }
    );

    if (!updatedStudent) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Commit transaction
    await session.commitTransaction();

    return res.status(200).json({
      message: 'Student updated successfully.',
      student: updatedStudent,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    if (session) {
      await session.abortTransaction();
    }
    return res
      .status(500)
      .json({ message: 'Internal server error.', error: error.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.deleteStudentByAdmin = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    // Check if student exists
    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // If already deleted
    if (student.isDeleted) {
      return res.status(400).json({ success: false, message: 'Student already deleted' });
    }

    // Mark student as deleted
    student.isDeleted = true;
    await student.save();

    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


//COURSES 

// Get all courses for a specific university
exports.getAllUniversityCoursesforAgency = async (req, res) => {
  try {
    const { universityId } = req.params; // University ID is required

    // Validate universityId
    if (!isValidObjectId(universityId)) return res.status(400).json({ message: 'Enter a valid universityId' });
    

    // Fetch the university and check if it exists
    const finduniversity = await university.findById(universityId).populate('courses', '_id');
    if (!finduniversity) return res.status(404).json({ message: 'University not found' })

    // Check if the university has any courses
    if (!finduniversity.courses || finduniversity.courses.length === 0) {
      return res.status(404).json({ message: 'This university does not have any courses' });
    }

    // Fetch courses for the specified university
    const courses = await Course.find({ university: universityId }).populate('university', 'name');

    // Check if any courses are found
    if (!courses.length) {
      return res.status(404).json({ message: 'No courses found for the given university' });
    }

    // Send response
    return res.status(200).json({university_name:finduniversity.name,total: courses.length,coursesList: courses});
  } 
  catch (error) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all courses 
exports.getallCoursesWithFiltersforAgency = async (req, res) => {
  try {
    const {
      minPrice,
      maxPrice,
      country,
      courseName,
      universityName,
      courseType,
      minDuration,
      maxDuration,
      expiryDate,
      level
    } = req.query;

    // Build the filter object dynamically
    const filter = {};

    // Price filter
    if (minPrice || maxPrice) {
      const min = Number(minPrice);
      const max = Number(maxPrice);

      if (minPrice && isNaN(min)) {
        return res.status(400).json({ message: 'minPrice must be a valid number.' });
      }
      if (maxPrice && isNaN(max)) {
        return res.status(400).json({ message: 'maxPrice must be a valid number.' });
      }
      if ((minPrice && min < 0) || (maxPrice && max < 0)) {
        return res.status(400).json({ message: 'Price values cannot be negative.' });
      }
      if (minPrice && maxPrice && min > max) {
        return res.status(400).json({ message: 'Invalid price range. minPrice cannot be greater than maxPrice.' });
      }

      filter.fees = {};
      if (minPrice) filter.fees.$gte = min;
      if (maxPrice) filter.fees.$lte = max;
    }

    // Country filter (fetch university IDs first)
    if (country) {
      const universitiesInCountry = await University.find({
        'address.country': new RegExp(country, 'i'),
        isDeleted: false,
      }).select('_id');

      if (!universitiesInCountry.length) {
        return res.status(404).json({ message: 'No universities found in the specified country.' });
      }

      filter.university = { $in: universitiesInCountry.map((uni) => uni._id) };
    }

    // University name filter (also fetch university IDs)
    if (universityName) {
      const universitiesWithName = await University.find({
        name: new RegExp(universityName, 'i'),
        isDeleted: false,
      }).select('_id');

      if (!universitiesWithName.length) {
        return res.status(404).json({ message: 'No universities found with the specified name.' });
      }

      if (filter.university && filter.university.$in) {
        // Intersect university IDs if both country and university name are present
        filter.university.$in = filter.university.$in.filter((id) =>
          universitiesWithName.map((uni) => uni._id.toString()).includes(id.toString())
        );

        if (!filter.university.$in.length) {
          return res.status(404).json({ message: 'No universities found matching both country and name criteria.' });
        }
      } else {
        filter.university = { $in: universitiesWithName.map((uni) => uni._id) };
      }
    }

    // Course name filter
    if (courseName) {
      filter.name = new RegExp(courseName, 'i');
    }

    // Course type filter
    if (courseType) {
      filter.courseType = new RegExp(courseType, 'i');
    }

    // Level filter
    if (level) {
      filter.level = new RegExp(level, 'i');
    }

    // Course duration filter
    if (minDuration || maxDuration) {
      const minDur = Number(minDuration);
      const maxDur = Number(maxDuration);

      if (minDuration && isNaN(minDur)) {
        return res.status(400).json({ message: 'minDuration must be a valid number.' });
      }
      if (maxDuration && isNaN(maxDur)) {
        return res.status(400).json({ message: 'maxDuration must be a valid number.' });
      }
      if ((minDuration && minDur < 0) || (maxDuration && maxDur < 0)) {
        return res.status(400).json({ message: 'Duration values cannot be negative.' });
      }
      if (minDuration && maxDuration && minDur > maxDur) {
        return res.status(400).json({ message: 'Invalid duration range. minDuration cannot be greater than maxDuration.' });
      }

      filter.courseDuration = {};
      if (minDuration) filter.courseDuration.$gte = minDur;
      if (maxDuration) filter.courseDuration.$lte = maxDur;
    }

    // Expiry date filter
    if (expiryDate) {
      const parsedExpiryDate = new Date(expiryDate);
      if (isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date format. Use YYYY-MM-DD.' });
      }
      filter.expiryDate = { $gte: parsedExpiryDate };
    }

    // Fetch the filtered courses
    const courses = await Course.find(filter)
      .populate({
        path: 'university',
        select: 'name address.country',
      })
      .sort({ applicationDate: -1 });

    if (!courses.length) {
      return res.status(404).json({ message: 'No courses found matching the criteria.' });
    }

    // Send response
    return res.status(200).json({
      total: courses.length,
      coursesList: courses,
    });
  } catch (error) {
    console.error('Error fetching courses with filters:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get course by id
exports.getCourseByIdforAgency = async (req, res) => {
  try {
    const { courseId } = req.params;
 
    if (!isValidObjectId(courseId)) return res.status(400).json({ message: 'Enter a valid courseId' });
    // Fetch the course and its associated university
    const course = await Course.findOne({ _id: courseId }).populate('university', 'name');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }


    return res.status(200).json({ Course_Details:course });
  } 
  catch (error) {
    console.error('Error fetching course:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};








//AGENCY PROFILE APIs
exports.createAgency = async (req, res) => {
  try {
    const { name, email, password, contactPhone, address } = req.body;

  const existingRole = await checkEmailExists(email, null);
if (existingRole) {
  return res.status(400).json({ message: `This email is already registered as a ${existingRole}.` });
}

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new agency
    const newAgency = new Agency({
      name,
      email,
      password: hashedPassword,
      contactPhone,
      address,
    });

    const savedAgency = await newAgency.save();
    return res.status(201).json({ message: 'Agency created successfully.', data: savedAgency });
  } catch (error) {
    console.error('Error creating agency:', error);
    return res.status(500).json({ error: 'Error creating agency.' });
  }
};


exports.loginAgency = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find agency by email
    const agency = await Agency.findOne({ email });
    if (!agency) {
      return res.status(404).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, agency.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    return res.status(200).json({ message: 'Login successful.', agencyId: agency._id });
  } 
  catch (error) {
    console.error('Error logging in agency:', error);
    return res.status(500).json({ error: 'Error logging in agency.' });
  }
};


exports.getAgencyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the agency ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid agency ID provided.' });
    }

    // Fetch the agency details
    const agency = await Agency.findById(id).populate('agents', 'name email');

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    return res.status(200).json({
      message: 'Agency fetched successfully.',
      data: agency,
    });
  } catch (error) {
    console.error('Error fetching agency by ID:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};


// Update Agency by ID
exports.updateAgencyById = async (req, res) => {
  try {
    const { name, email, contactPhone, address } = req.body;

    // Update agency by ID
    const updatedAgency = await Agency.findByIdAndUpdate(
      req.params.id,
      { name, email, contactPhone, address },
      { new: true }
    );

    if (!updatedAgency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    return res.status(200).json({ message: 'Agency updated successfully.', data: updatedAgency });
  } catch (error) {
    console.error('Error updating agency:', error);
    return res.status(500).json({ error: 'Error updating agency.' });
  }
};

exports.deleteAgencyById = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // Validate the agency ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid agency ID provided.' });
    }

    // Find the agency
    const agency = await Agency.findById(id).session(session);
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    // Handle associated agents (if any)
    if (agency.agents && agency.agents.length > 0) {
      await Agent.updateMany(
        { _id: { $in: agency.agents } },
        { $unset: { agency: "" } }, // Unlink agents from this agency
        { session }
      );
    }

    // Delete the agency
    await Agency.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Agency deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting agency:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.agencyUpdatePassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const agencyId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
    }

    if (newPassword.length < 8 || newPassword.length > 14) {
      return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
    }

    // Fetch the agency by ID
    const agency = await Agency.findById(agencyId).session(session);
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found.' });
    }

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(currentPassword, agency.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }

    // Hash and update the password
    agency.password = await bcrypt.hash(newPassword, 10);
    await agency.save({ session });

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

 
//Application 
//see pending applications //get
exports.getPendingApplications = async (req, res) => {
  try {
    const defaultAgencyId =process.env.DEFAULT_AGENCY_ID
    // Validate DEFAULT_AGENCY_ID
    if (!mongoose.Types.ObjectId.isValid(defaultAgencyId)) {
      console.error('Invalid agency ID in environment variable:', defaultAgencyId);
      return res.status(400).json({ message: 'Invalid agency ID in environment variable.' });
    }

  
    // Fetch the default agency
    const agency = await Agency.findById(new mongoose.Types.ObjectId(defaultAgencyId));
    if (!agency) {
      console.error('Agency not found in database:', defaultAgencyId);
      return res.status(404).json({ message: 'Agency not found.' });
    }

    // Check if there are any pending applications
    if (!agency.pendingApplications || agency.pendingApplications.length === 0) {
      return res.status(404).json({ message: 'No pending applications found in agency.' });
    }

    // Populate pending applications
    await agency.populate({
      path: 'pendingApplications',
       options: { sort: { createdAt: -1 } }, 
      select: 'student university course status submissionDate',
      populate: [
        { path: 'student', select: 'firstName lastName email' },
        { path: 'university', select: 'name country' },
        { path: 'course', select: 'name fees' },
      ],
    });

    const pendingApplications = agency.pendingApplications.map((app) => ({
      applicationId: app._id,
      student: app.student
        ? { name: `${app.student.firstName} ${app.student.lastName}`, email: app.student.email }
        : 'Unknown',
      university: app.university ? app.university.name : 'Unknown',
      course: app.course ? app.course.name : 'Unknown',
      status: app.status,
      submissionDate: app.submissionDate,
    }));

    return res.status(200).json({
      message: 'Successfully fetched pending applications.',
      total: pendingApplications.length,
      agency: {
        id: agency._id,
        name: agency.name,
      },
      pendingApplications,
    });
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.getApplicationDetailsById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Validate `applicationId`
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID);
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the application exists in the agency's pending or sent applications
    const isPending = defaultAgency.pendingApplications.includes(applicationId);
    const isSent = defaultAgency.sentAppliactionsToUniversities.includes(applicationId);

    if (!isPending && !isSent) {
      return res.status(404).json({
        message: 'Application not found in agency\'s records.',
      });
    }

    // Fetch the application with populated fields
    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Prepare the response
    const response = {
      applicationId: application._id,
      status: application.status,
      submissionDate: application.submissionDate,
      reviewDate: application.reviewDate || 'Not reviewed yet',
      notes: application.notes || 'No notes provided',
      documents: application.documents || [],
      financialAid: application.financialAid,
      student: application.student,
        
        // {
        //     name: `${application.student.firstName} ${application.student.lastName}`,
        //     email: application.student.email,
        //   }
        // : 'Unknown',
      university: application.university
        ? {
            name: application.university.name,
            country: application.university.country,
          }
        : 'Unknown',
      course: application.course
        ? {
            name: application.course.name,
            fees: application.course.fees,
          }
        : 'Unknown',
      assignedAgent: application.assignedAgent
        ? { name: application.assignedAgent.name, email: application.assignedAgent.email }
        : 'Not assigned',
    };

    return res.status(200).json({
      message: 'Application details fetched successfully.',
      application: response,
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.getApplicationByIdForAgency = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID.' });
    }

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('university', 'name country')
      .populate('course', 'name fees')
      .populate('assignedAgent', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const response = {
      applicationId: application._id,
      status: application.status,
      submissionDate: application.submissionDate,
      reviewDate: application.reviewDate || 'Not reviewed yet',
      notes: application.notes || 'No notes provided',
      financialAid: application.financialAid,
      reason: application.reason || '',
      grades: application.grades || '',
      marks: application.marks || '',
      extraDocuments: application.extraDocuments || [],
      universityDocuments: application.universityDocuments || [],
      latestdegreeCertificates: application.latestdegreeCertificates || [],
      englishTest: application.englishTest || [],
      proofOfAddress: application.proofOfAddress || [],
      student: application.student || 'Not found',
      university: application.university || 'Not found',
      course: application.course || 'Not found',
      assignedAgent: application.assignedAgent || 'Not assigned',
    };

    return res.status(200).json({
      message: 'Application details retrieved successfully.',
      application: response,
    });
  } catch (error) {
    console.error('Error retrieving application:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




exports.getApplicationsByStatus = async (req, res) => {
  try {
    const agencyId = req.user.id;  // Authenticated user’s ID as agencyId
    const { status } = req.query;

    // ✅ Updated valid statuses — including 'Accepted' back
    const validStatuses = ['Processing', 'Sent to University', 'Accepted', 'Rejected', 'Withdrawn'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status query parameter.' });
    }

    const agency = await Agency.findById(agencyId).lean();
    if (!agency) {
      return res.status(404).json({ error: 'Agency not found.' });
    }

    let applicationIds = [];

    // Fetch application IDs based on agency collections for statuses
    if (status === 'Processing') {
      applicationIds = agency.pendingApplications.map(id => id.toString());
    } else if (status === 'Sent to University') {
      applicationIds = agency.sentAppliactionsToUniversities.map(id => id.toString());
    } else if (status === 'Accepted') {
      // ✅ For 'Accepted' — fetch applications with status 'Accepted' assigned to this agency
      const acceptedApps = await Application.find({
        agency: agencyId,
        status: 'Accepted',
        isDeleted: false
      }).select('_id');
      applicationIds = acceptedApps.map(app => app._id.toString());
    } else {
      // For Rejected / Withdrawn
      const apps = await Application.find({
        agency: agencyId,
        status: status,
        isDeleted: false
      }).select('_id');
      applicationIds = apps.map(app => app._id.toString());
    }

    // Fetch Applications based on these IDs
    const applications = await Application.find({
      _id: { $in: applicationIds },
      isDeleted: false
    })
      .populate('student', 'firstName lastName email')
      .populate('university', 'name')
      .populate('course', 'name')
      .populate('assignedAgent', 'name email')
      .populate('assignedSolicitor', 'name email')
      .sort({ submissionDate: -1 });

    // Prepare response
    const formattedApplications = applications.map(app => {
      let appStatus = status;

      // ✅ if status === 'Accepted', get from actual application status
      if (status === 'Accepted') {
        appStatus = app.status;
      }

      return {
        _id: app._id,
        student: app.student,
        university: app.university,
        course: app.course,
        assignedAgent: app.assignedAgent,
        assignedSolicitor: app.assignedSolicitor,
        status: appStatus,
        submissionDate: app.submissionDate
      };
    });

    res.status(200).json({
      message: `Applications with status '${status}' fetched successfully.`,
      count: formattedApplications.length,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching applications by status:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};




// exports.getApplicationsByStatus = async (req, res) => {
//   try {
//     const agencyId = req.user.id;  // Authenticated user’s ID as agencyId
//     const { status } = req.query;

//     // ✅ Update: Valid statuses — replacing 'Accepted' with 'Sent to University'
//     const validStatuses = ['Processing', 'Sent to University', 'Rejected', 'Withdrawn'];
//     if (!status || !validStatuses.includes(status)) {
//       return res.status(400).json({ error: 'Invalid or missing status query parameter.' });
//     }

//     const agency = await Agency.findById(agencyId).lean();
//     if (!agency) {
//       return res.status(404).json({ error: 'Agency not found.' });
//     }

//     let applicationIds = [];

//     // Fetch application IDs based on agency collections
//     if (status === 'Processing') {
//       applicationIds = agency.pendingApplications.map(id => id.toString());
//     } else if (status === 'Sent to University') {
//       applicationIds = agency.sentAppliactionsToUniversities.map(id => id.toString());
//     } else {
//       // For Rejected / Withdrawn — query Application model by status field
//       const apps = await Application.find({
//         agency: agencyId,
//         status: status,
//         isDeleted: false
//       }).select('_id');
//       applicationIds = apps.map(app => app._id.toString());
//     }

//     // Fetch Applications based on these IDs
//     const applications = await Application.find({
//       _id: { $in: applicationIds },
//       isDeleted: false
//     })
//       .populate('student', 'firstName lastName email')
//       .populate('university', 'name')
//       .populate('course', 'name')
//       .populate('assignedAgent', 'name email')
//       .populate('assignedSolicitor', 'name email')
//       .sort({ submissionDate: -1 });

//     // Prepare response
//     const formattedApplications = applications.map(app => ({
//       _id: app._id,
//       student: app.student,
//       university: app.university,
//       course: app.course,
//       assignedAgent: app.assignedAgent,
//       assignedSolicitor: app.assignedSolicitor,
//       status: status,  // status as per query param — either Processing / Sent to University / Rejected / Withdrawn
//       submissionDate: app.submissionDate
//     }));

//     res.status(200).json({
//       message: `Applications with status '${status}' fetched successfully.`,
//       count: formattedApplications.length,
//       applications: formattedApplications
//     });

//   } catch (error) {
//     console.error('Error fetching applications by status:', error);
//     res.status(500).json({ error: 'Internal server error.' });
//   }
// };



//previouse 
// Get Applications by Status for an Agency
// exports.getApplicationsByStatus = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const userRole = req.user.role;
//     const { status } = req.query;

//     // Validate status input
//     const validStatuses = ['Processing', 'Accepted', 'Rejected', 'Withdrawn'];
//     if (!status || !validStatuses.includes(status)) {
//       return res.status(400).json({ error: 'Invalid or missing status query parameter.' });
//     }

//     let agencyId;

//     if (userRole === 'admin') {
//       agencyId = userId;
//     } else if (userRole === 'agent') {
//       const agent = await Agent.findById(userId);
//       if (!agent) {
//         return res.status(404).json({ error: 'Agent not found.' });
//       }
//       agencyId = agent.agency;
//     } else {
//       return res.status(403).json({ error: 'Unauthorized role.' });
//     }

//     const agency = await Agency.findById(agencyId).lean();
//     if (!agency) {
//       return res.status(404).json({ error: 'Agency not found.' });
//     }

//     let applicationIds = [];

//     // Get application IDs based on agency record fields
//     if (status === 'Processing') {
//       applicationIds = agency.pendingApplications.map(id => id.toString());
//     } else if (status === 'Accepted') {
//       applicationIds = agency.sentAppliactionsToUniversities.map(id => id.toString());
//     } else {
//       // For Rejected / Withdrawn — query Application model by status field
//       const apps = await Application.find({
//         agency: agencyId,
//         status: status,
//         isDeleted: false
//       }).select('_id');

//       applicationIds = apps.map(app => app._id.toString());
//     }

//     // Fetch Applications based on these IDs
//     const applications = await Application.find({
//       _id: { $in: applicationIds },
//       isDeleted: false
//     })
//       .populate('student', 'firstName lastName email')
//       .populate('university', 'name')
//       .populate('course', 'name')
//       .populate('assignedAgent', 'name email')
//       .populate('assignedSolicitor', 'name email');

//     res.status(200).json({
//       message: `Applications with status '${status}' fetched successfully.`,
//       count: applications.length,
//       applications
//     });

//   } catch (error) {
//     console.error('Error fetching applications by status:', error);
//     res.status(500).json({ error: 'Internal server error.' });
//   }
// };


exports.getApplicationsStatusByAllUniversities = async (req, res) => {
  try {
    const { status } = req.query;

    // Validate status if provided
    const validStatuses = ['Accepted', 'Rejected', 'Processing'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status value. Allowed: ${validStatuses.join(', ')}.` });
    }

    // Fetch all universities
    const universities = await University.find({ isDeleted: false }).lean();

    const result = [];

    for (const university of universities) {
      let applicationIds = [];

      // Pick application IDs based on requested status
      if (status === 'Processing') {
        applicationIds = university.pendingApplications.map(item => item.applicationId.toString());
      } else if (status === 'Accepted') {
        applicationIds = university.approvedApplications.map(id => id.toString());
      } else if (status === 'Rejected') {
        applicationIds = university.rejectedApplications.map(id => id.toString());
      }

      // If status is given and no application IDs, skip this university
      if (status && !applicationIds.length) continue;

      let query = {
        university: university._id
      };

      // Status-specific conditions
      if (status === 'Rejected') {
        // For Rejected — include deleted applications
        query._id = { $in: applicationIds };
      } else if (status) {
        // For Processing / Accepted — only non-deleted applications
        query._id = { $in: applicationIds };
        query.isDeleted = false;
      } else {
        // If no status filter — get non-deleted applications
        query.isDeleted = false;
      }

      // Fetch matching applications
      const applications = await Application.find(query)
        .populate('student', 'firstName lastName email')
        .populate('course', 'name')
        .populate('assignedAgent', 'username email')
        .populate('assignedSolicitor', 'username email')
        .select('student course status assignedAgent assignedSolicitor submissionDate')
.sort({ submissionDate: -1 });  
      // If no applications found, skip this university
      if (!applications.length) continue;

      // Push result for this university
      result.push({
        universityId: university._id,
        universityName: university.name,
        count: applications.length,
        applications: applications.map(app => ({
          _id: app._id,
          student: app.student,
          course: app.course,
          status: status ? status : app.status,  // Override if filtered by status
          assignedAgent: app.assignedAgent,
          assignedSolicitor: app.assignedSolicitor,
          submissionDate: app.submissionDate
        }))
      });
    }

    if (!result.length) {
      return res.status(404).json({ message: `No ${status || ''} applications found across universities.` });
    }

    res.status(200).json({
      total: result.length,
      message: `Applications fetched successfully${status ? ` with status '${status}'` : ''}.`,
      universities: result
    });

  } catch (error) {
    console.error('Error fetching applications by universities:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


exports.sendAcceptanceLetter = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID' });
    }

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('course')
      .populate('university');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'Accepted') {
      return res.status(400).json({ success: false, message: 'Application is not accepted yet.' });
    }

    const student = application.student;
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // 📤 Upload offer letter file to S3 if uploaded
    let uploadedFileUrl = null;
    if (req.file) {
      const [url] = await uploadFilesToS3([req.file]);
      uploadedFileUrl = url;

      // Optionally: push this to application.extraDocuments
      application.extraDocuments.push(uploadedFileUrl);
      await application.save();
    }

    // 📧 Send acceptance offer letter email
    await sendOfferLetterEmailByAgency(
      student.email,
      student.firstName,
      application.course.name,
      application.university.name,
      uploadedFileUrl
    );

    // 🛎️ Save in-app notification
    await new Notification({
      user: student._id,
      message: `Congratulations! Your official acceptance letter for ${application.course.name} at ${application.university.name} has been sent to your email.`,
      type: 'Application',
      additionalData: {
        fileUrl: uploadedFileUrl || null
      }
    }).save();

    return res.status(200).json({
      success: true,
      message: 'Acceptance letter sent successfully.',
      uploadedFileUrl
    });

  } catch (error) {
    console.error('Error sending acceptance letter:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


//agent will move forward the application to university
exports.assignAgentToApplication = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { applicationId, agentId } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid ApplicationId ID provided.' });
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid AgentId provided.' });
    }

    // Fetch the default agency
    const defaultAgency = await Agency.findById(process.env.DEFAULT_AGENCY_ID).session(session);
    if (!defaultAgency) {
      return res.status(404).json({ message: 'Default agency not found.' });
    }

    // Check if the application exists in the agency's pendingApplications
    const isPendingInAgency = defaultAgency.pendingApplications.includes(applicationId);
    if (!isPendingInAgency) {
      return res.status(404).json({
        message: 'Application not found in the agency\'s pending applications.',
      });
    }

    // Fetch the application
    const application = await Application.findById(applicationId).session(session);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Fetch the agent
    const agent = await Agent.findById(agentId).session(session);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    // Check if the agent belongs to the default agency
    if (agent.agency.toString() !== defaultAgency._id.toString()) {
      return res.status(400).json({ message: 'Agent does not belong to the default agency.' });
    }

    // Assign the agent to the application
    application.assignedAgent.push(agent._id);
    await application.save({ session });

    // Add the application to the agent's assigned students
    agent.assignedStudents.push(application.student);
    await agent.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Agent successfully assigned to the application.',
      application: {
        id: application._id,
        assignedAgent: application.assignedAgent,
        status: application.status,
        university: application.university,
        course: application.course,
      },
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();
    console.error('Error assigning agent to application:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.sendApplicationToUniversity = async (req, res) => {
  try {
    const { applicationId } = req.params;

      // Validate IDs
       if (!mongoose.Types.ObjectId.isValid(applicationId)) {
         return res.status(400).json({ message: 'Invalid application ID provided.' });
       }
    

    // Get default agency ID from .env
    const defaultAgencyId = process.env.DEFAULT_AGENCY_ID;

    if (!defaultAgencyId) {
      return res.status(500).json({ message: 'Default agency ID is not set in environment variables' });
    }

    // Check if the application exists
    const application = await Application.findById(applicationId)
      .populate('student')
      .exec();

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Get the universityId from application
    const universityId = application.university;
    if (!universityId) {
      return res.status(404).json({ message: 'University ID not found in application' });
    }

    // Check if the agency exists using defaultAgencyId
    const agency = await Agency.findById(defaultAgencyId);
    if (!agency) {
      return res.status(404).json({ message: 'Default agency not found' });
    }

    // Check if the university exists
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Check if application exists in agency.pendingApplications
    const pendingIndex = agency.pendingApplications.indexOf(applicationId);
    if (pendingIndex === -1) {
      return res.status(400).json({ message: 'Application is not in pendingApplications of the agency' });
    }

    // Remove application from pendingApplications
    agency.pendingApplications.splice(pendingIndex, 1);

    // Add application to sentApplicationsToUniversities
    agency.sentAppliactionsToUniversities.push(applicationId);

    // Add application to university.pendingApplications
    university.pendingApplications.push({
      student: application.student._id,
      applicationId: applicationId,
    });

    // Save updated agency and university
    await agency.save();
    await university.save();

    return res.status(200).json({
      message: 'Application sent to university successfully',
      applicationId: applicationId,
      universityId: universityId,
      updatedAgency: {
        pendingApplications: agency.pendingApplications,
        sentApplicationsToUniversities: agency.sentAppliactionsToUniversities,
      },
      updatedUniversity: {
        pendingApplications: university.pendingApplications,
      },
    });
  } catch (error) {
    console.error('Error sending application to university:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const agencyId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID provided.' });
    }

    const application = await Application.findById(applicationId).populate('student').exec();
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // ✅ Check if application is already rejected
    if (application.status === 'Rejected') {
      return res.status(400).json({ success: false, message: 'Application has already been rejected.' });
    }

    // ✅ Check if application exists in agency.pendingApplications
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }

    const isPending = agency.pendingApplications.some(id => id.toString() === applicationId);
    if (!isPending) {
      return res.status(400).json({ message: 'Application is not in the agencys pending applications and cannot be rejected.' });
    }

    // ✅ Proceed to reject
    application.status = 'Rejected';
    application.reason = reason;
    await application.save();

    // ✅ Remove from agency.pendingApplications
    await Agency.findByIdAndUpdate(agencyId, {
      $pull: { pendingApplications: applicationId },
    });

    const studentId = application.student._id;
    const studentEmail = application.student.email;

    // ✅ Save Notification in DB
    const notification = await new Notification({
      user: studentId,
      message: `Your application has been rejected. Reason: ${reason}`,
      type: "Application",
    }).save();

    // ✅ Send Rejection Email
    await sendRejectionEmail(studentEmail, reason);

    // ✅ Send Real-time Notification
    sendNotification(studentId.toString(), notification.message, "Application");

    res.status(200).json({
      success: true,
      message: 'Application rejected, student notified via email & notification.'
    });

  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



//university 
exports.promoteUniversity = async (req, res) => {
  try {
    const {universityId} = req.params; // Retrieve university ID from middleware

    // Find the university by ID
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the university is already promoted
    if (university.isPromoted === 'YES') {
      return res.status(400).json({
        message: `University "${university.name}" is already promoted.`,
      });
    }

    // Update the `isPromoted` field
    university.isPromoted = 'YES';
    await university.save();

    return res.status(200).json({
      message: `University "${university.name}" has been promoted successfully.` });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.demoteUniversity = async (req, res) => {
  try {
    const {universityId} = req.params; // Retrieve university ID from middleware

    // Find the university by ID
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    // Check if the university is already promoted
    if (university.isPromoted === 'NO') {
      return res.status(400).json({
        message: `University "${university.name}" is already demoted.`,
      });
    }

    // Update the `isPromoted` field
    university.isPromoted = 'NO';
    await university.save();

    return res.status(200).json({
      message: `University "${university.name}" has been demoted successfully.` });
  } catch (error) {
    console.error('Error promoting university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.createUniversity = async (req, res) => {
  try {
    const {
      name,
      email,
      description,
      website,
      phoneNumber,
      address,
      ratings,
    } = req.body;

    // Check if the email is already in use
 const existingRole = await checkEmailExists(email, null);
if (existingRole) {
  return res.status(400).json({ message: `This email is already registered as a ${existingRole}.` });
}

    // Auto-generate a password
    const password = generator.generate({
      length: 10, // Password length
      numbers: true, // Include numbers
      symbols: true, // Include symbols
      uppercase: true, // Include uppercase letters
      excludeSimilarCharacters: true, // Exclude similar characters like 'i' and 'l'
      exclude: `"'\\\``  // excludes ", ', \, and `
    });

    // Hash the auto-generated password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle Image Upload (if provided)
    let bannerImage = null;
    if (req.file) {
      const uploadedFiles = await uploadFilesToS3([req.file]); // Upload file to S3
      bannerImage = uploadedFiles[0]; // Get the S3 URL
    }

    // Create a new university instance
    const newUniversity = new University({
      name,
      email,
      password: hashedPassword,  //hashedPassword,
      description,
      bannerImage, // Save the uploaded image URL
      website,
      phoneNumber,
      address: {
        addressline: address.addressline,
        country: address.country,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      },
      isPromoted: req.body.isPromoted || 'NO', // Default to 'NO' if not provided
      ratings: ratings || [], // Default to an empty array if not provided
    });

    // Save the new university to the database
    await newUniversity.save();

  // ✅ Styled HTML credentials email
    const html = generateEmailTemplate(
      "Your University Account is Ready!",
      "#004AAC",
      `
      <p style="font-size:16px;color:#333;">Hi <strong>${name}</strong>,</p>
      <p style="font-size:16px;color:#555;">Your university account has been created successfully. Here are your login credentials:</p>
      <ul style="font-size:16px;color:#555;">
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p style="font-size:16px;color:#555;">Please log in and change your password immediately for security.</p>
      `,
      {
        text: "Log In Now",
        link: `${process.env.CLIENT_BASE_URL}/university/login`
      }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "University Account Credentials",
      html
    };

    await sendEmailWithLogo(mailOptions);




    // Return the response with the auto-generated password (for testing purposes)
    return res.status(201).json({
      message: 'University created successfully.',
      university: {
        id: newUniversity._id,
        name: newUniversity.name,
        email: newUniversity.email,
        website: newUniversity.website,
        phoneNumber: newUniversity.phoneNumber,
        address: newUniversity.address,
        role: newUniversity.role,
        isPromoted: newUniversity.isPromoted,
        ratings: newUniversity.ratings,
        bannerImage: newUniversity.bannerImage,
      },
      autoGeneratedPassword: hashedPassword, // Return the auto-generated password (optional)
    });
  } catch (error) {
    console.error('Error creating university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update any university (by agency)
exports.updateUniversityByAgency = async (req, res) => {
  try {
    const { universityId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID provided.' });
    }
    // Check if the university exists
    let university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found' });
    }

    // Prevent updating email & password
    if (req.body.email || req.body.password) {
      return res.status(400).json({
        message: 'Email and password cannot be updated.',
      });
    }

    // Handle Image Upload
    let bannerImage = null;
    if (req.file) {
      const uploadedFiles = await uploadFilesToS3([req.file]);
      bannerImage = uploadedFiles[0];
    }

    // Update fields
    const { name, description, website, phoneNumber, address, isPromoted } = req.body;

    university.name = name || university.name;
    university.description = description || university.description;
    university.bannerImage = bannerImage || university.bannerImage;
    university.website = website || university.website;
    university.phoneNumber = phoneNumber || university.phoneNumber;
    university.isPromoted = isPromoted || university.isPromoted;

    university.address = address
      ? {
         addressline: address.addressline || university.address.addressline, 
          country: address.country || university.address.country,
          city: address.city || university.address.city,
          state: address.state || university.address.state,
          zipCode: address.zipCode || university.address.zipCode,
        }
      : university.address;

    await university.save();

    return res.status(200).json({
      message: 'University updated successfully.',
      university,
    });
  } catch (error) {
    console.error('Error updating university by agency:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get All Universities
exports.getUniversities = async (req, res) => {
  try {
  
  const universities = await University.find({ isDeleted: false }).select('-password').sort({ isPromoted: -1 });
    if (universities.length === 0) {
      return res.status(404).json({ message: 'No universities found.' });
    }
    return res.status(200).json({ Total: universities.length, universities });
  } catch (error) {
    console.error('Error fetching universities:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get University by ID (For Agency/Admin)
exports.getUniversityById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find university by ID
    const university = await University.findById(id).populate({
        path: 'courses',
        select: 'name fees description'  // 👈 Only fetch these fields from each course
      });
    
    // Check if university exists
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    return res.status(200).json({ university });
  } catch (error) {
    console.error('Error fetching university:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Soft delete a university (by agency)
exports.deleteUniversityByAgency = async (req, res) => {
  try {
    const { universityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID provided.' });
    }

    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: 'University not found.' });
    }

    if (university.isDeleted) {
      return res.status(400).json({ message: 'University is already deleted.' });
    }

    university.isDeleted = true;
    await university.save();

    return res.status(200).json({ message: 'University deleted successfully.' });
  } catch (error) {
    console.error('Error deleting university by agency:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




//COURSE
// Create Course (Agency)
exports.createCourseByAgency = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { universityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    const {
      name,
      description,
      description2,
      description3,
      fees,
      ratings,
      expiryDate,
      courseType,
      courseDuration,
      level,
      UCSA   // ✅ newly added
    } = req.body;

    const university = await University.findById(universityId).session(session);
    if (!university) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'University not found.' });
    }

    const existingCourse = await Course.findOne({ name, university: universityId }).session(session);
    if (existingCourse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Course with the same name already exists in this university.' });
    }

    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime()) || expiry <= new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid expiry date. It must be a future date.' });
    }

    let courseImages = [];
    if (req.files && req.files.length > 0) {
      courseImages = await uploadFilesToS3(req.files);
    }

    const validCourseTypes = ['fulltime', 'parttime', 'online'];
    if (!validCourseTypes.includes(courseType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Invalid course type. Allowed: ${validCourseTypes.join(', ')}` });
    }


    const course = new Course({
      name,
      description,
      description2,
      description3,
      university: universityId,
      fees,
      ratings,
      expiryDate: expiry,
      courseType,
      courseDuration,
      level,    // ✅ set level
      UCSA,     // ✅ set UCSA
      courseImage: courseImages,
    });

    await course.save({ session });

    university.courses.push(course._id);
    await university.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ message: 'Course created successfully.', course });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating course by agency:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// Update Course (Agency)
exports.updateCourseByAgency = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { universityId, courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }

    const {
      name,
      description,
      description2,
      description3,
      fees,
      ratings,
      expiryDate,
      courseType,
      courseDuration,
      level,
      UCSA
    } = req.body;

    const university = await University.findById(universityId).session(session);
    if (!university) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'University not found.' });
    }

    const course = await Course.findOne({ _id: courseId, university: universityId }).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found in university.' });
    }

    if (course.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot update a deleted course.' });
    }

    if (course.expiryDate && new Date(course.expiryDate) < new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot update an expired course.' });
    }

    // Validate and apply expiryDate
    if (expiryDate) {
      const newExpiry = new Date(expiryDate);
      if (isNaN(newExpiry.getTime()) || newExpiry <= new Date()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Expiry date must be a valid future date.' });
      }
      course.expiryDate = newExpiry;
    }

    // Validate and apply fees
    if (fees !== undefined) {
      if (isNaN(fees) || fees <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Fees must be a positive number.' });
      }
      course.fees = fees;
    }

    // Validate and apply courseType
    if (courseType) {
      const validCourseTypes = ['fulltime', 'parttime', 'online'];
      if (!validCourseTypes.includes(courseType)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: `Invalid course type. Allowed: ${validCourseTypes.join(', ')}` });
      }
      course.courseType = courseType;
    }

    // // Validate and apply courseDuration
    // if (courseDuration !== undefined) {
    //   if (!/^\d+$/.test(courseDuration)) {
    //     await session.abortTransaction();
    //     session.endSession();
    //     return res.status(400).json({ message: 'Course duration must be a positive integer.' });
    //   }
    //   course.courseDuration = courseDuration;
    // }

    // Directly assign UCSA and level (since express-validator already validated)
    if (UCSA) course.UCSA = UCSA;
    if (level) course.level = level;

    // Update other fields if provided
    if (name) course.name = name;
    if (description) course.description = description;
    if (description2) course.description2 = description2;
    if (description3) course.description3 = description3;
    if (ratings) course.ratings = ratings;

    // Handle course images if files are sent
    if (req.files && req.files.length > 0) {
      course.courseImage = await uploadFilesToS3(req.files);
    }

    await course.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Course updated successfully.', course });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating course by agency:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Delete Course (Agency)
exports.deleteCourseByAgency = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { universityId, courseId } = req.params;


    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ message: 'Invalid university ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID.' });
    }



    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid course ID format.' });
    }

     const university = await University.findById(universityId).session(session);
    if (!university) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'University not found.' });
    }

    const course = await Course.findOne({ _id: courseId, university: universityId }).session(session);
    if (!course) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Course not found in university or unauthorized to delete.' });
    }

    if (course.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Course is already deleted.' });
    }

    course.isDeleted = true;
    await course.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'Course deleted successfully.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting course by agency:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


// ASSOCIATES 

// **CREATE Associate Solicitor**
//ASSOCIATE

exports.createAssociate = async (req, res) => {
  try {
    const {
      nameOfAssociate,
      email,
      phoneNumber,
      address,
      bankDetails,
    } = req.body;

    // Check if the email is already in use
    const existingAssociate = await AssociateSolicitor.findOne({ email });


 const existingRole = await checkEmailExists(email, null);
if (existingRole) {
  return res.status(400).json({ message: `This email is already registered as a ${existingRole}.` });
}

    // If the associate exists but isDeleted: true, remove the old record
    if (existingAssociate && existingAssociate.isDeleted) {
      await AssociateSolicitor.deleteOne({ email });
    }



    // **Auto-generate a password**
    const password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
      exclude: `"'\\\``  // excludes ", ', \, and `
    });

    // **Hash the generated password**
    const hashedPassword = await bcrypt.hash(password, 10);

    // **Encrypt the bank account number**
    bankDetails.accountNumber = encryptData(bankDetails.accountNumber);

    // Create a new Associate Solicitor
    const newAssociate = new AssociateSolicitor({
      nameOfAssociate,
      email,
      password: hashedPassword, // Store hashed password
      phoneNumber,
      address,
      bankDetails,
    });

    // Save the associate to the database
    await newAssociate.save();

    // **Send credentials via email**
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Associate Solicitor Account Credentials",
      text: `Your account has been successfully created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and change your password immediately.`,
    };

    await transporter.sendMail(mailOptions);

    // Return success response
    res.status(201).json({
      success: true,
      message:
        "Associate Solicitor created successfully. Check your email for credentials.",
      // data: {
      //   id: newAssociate._id,
      //   nameOfAssociate: newAssociate.nameOfAssociate,
      //   email: newAssociate.email,
      //   phoneNumber: newAssociate.phoneNumber,
      //   address: newAssociate.address,
      //   bankDetails: {
      //     bankName: bankDetails.bankName,
      //     accountHolderName: bankDetails.accountHolderName,
      //   }, // Exclude sensitive info
      // },
    });
  } catch (error) {
    console.error("Error creating associate:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// **GET ALL Associates (with optional soft-delete filter)**
exports.getAllAssociates = async (req, res) => {
  try {

    const associates = await AssociateSolicitor.find({ isDeleted: false }).select('_id email nameOfAssociate phoneNumber studentAssigned ');

    if (associates.length === 0) {
      return res.status(404).json({ success: false, message: "No associates found" });
    }

     return  res.status(200).json({ success: true,total:associates.length, data: associates });
  } 
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// **GET Associate By ID**
exports.getAssociateById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Associate ID" });
    }

    // Find associate by ID and check for isDeleted status
    const associate = await AssociateSolicitor.findOne({
      _id: id,
      isDeleted: false,
    });

    // Check if associate exists and is not deleted
    if (!associate) {
      return res
        .status(404)
        .json({ success: false, message: "Associate not found or has been deleted" });
    }

    // Decrypt bank details before sending the response
    if (associate.bankDetails && associate.bankDetails.accountNumber) {
      associate.bankDetails.accountNumber = decryptData(
        associate.bankDetails.accountNumber
      );
    }

    // Return associate data
    res.status(200).json({ success: true, data: associate });
  } catch (error) {
    console.error("Error fetching associate:", error);
    res.status(500).json({ success: false, message: "Error fetching associate" });
  }
};



// **UPDATE Associate**
exports.updateAssociate = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    // Check if the Associate exists and is not soft deleted
    const existingAssociate = await AssociateSolicitor.findById(id);
    if (!existingAssociate) {
      return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
    }

    if (existingAssociate.isDeleted) {
      return res.status(400).json({ success: false, message: "Cannot update a deleted Associate Solicitor" });
    }

    // Prevent email and password updates
    if (updates.email || updates.password) {
      return res.status(400).json({ success: false, message: "Email and password cannot be updated" });
    }

    // Encrypt account number if provided
    if (updates.bankDetails?.accountNumber) {
      updates.bankDetails.accountNumber = encryptData(updates.bankDetails.accountNumber);
    }

    // Merge updates while preserving existing nested objects
    const updatedData = {
      ...existingAssociate.toObject(),
      ...updates,
      bankDetails: {
        ...existingAssociate.bankDetails,
        ...updates.bankDetails,
      },
      address: {
        ...existingAssociate.address,
        ...updates.address,
      },
    };

    // Update Associate
    const updatedAssociate = await AssociateSolicitor.findByIdAndUpdate(id, updatedData, { new: true });

    res.status(200).json({
      success: true,
      message: "Associate Solicitor updated successfully",
      data: updatedAssociate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// **SOFT DELETE Associate**
exports.deleteAssociate = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Associate ID" });
    }

    // Find the associate
    const associate = await AssociateSolicitor.findById(id);

    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
    }

    // Check if the associate is already deleted
    if (associate.isDeleted) {
      return res.status(400).json({ success: false, message: "Associate Solicitor is already deleted" });
    }

    // Soft delete the associate
    associate.isDeleted = true;
    await associate.save();

    res.status(200).json({ success: true, message: "Associate Solicitor deleted successfully", data: associate.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

