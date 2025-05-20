const mongoose = require("mongoose");
const Solicitor = require("../models/solicitorModel");
const Students = require('../models/studentsModel');
const generator = require('generate-password');
const Agency = require('../models/agencyModel');
const Application = require('../models/applicationModel');
const nodemailer = require('nodemailer');
const { encryptData,decryptData } = require('../services/encryption&decryptionKey');
const bcrypt = require('bcrypt');
const Notification = require('../models/notificationModel'); // Import Notification model
const { sendSolicitorAssignedEmail} = require('../services/emailService');
const { sendNotification } = require('../services/socketNotification');


//SOLICITOR REQUEST 
exports.getAllAssignedSolicitorRequestsForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;

    const solicitor = await Solicitor.findById(solicitorId).populate({
      path: "assignedSolicitorRequests",
      populate: {
        path: "student",
        select: "firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline"
      }
    });

    if (!solicitor || solicitor.assignedSolicitorRequests.length === 0) {
      return res.status(404).json({ success: false, message: "No assigned request found" });
    }

    res.status(200).json({
      success: true,
      total: solicitor.assignedSolicitorRequests.length,
      message: "Assigned solicitor request fetched successfully",
      applications: solicitor.assignedSolicitorRequests
    });
  } catch (error) {
    console.error("Error fetching assigned solicitor request:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.getSolicitorRequestByIdForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const { applicationId } = req.params;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    // Check if this application is assigned to this solicitor
    const solicitor = await Solicitor.findById(solicitorId);
    if (!solicitor || !solicitor.assignedSolicitorRequests.includes(applicationId)) {
      return res.status(404).json({ success: false, message: "No such assigned request found" });
    }

    // Fetch application details
    const application = await Application.findById(applicationId)
      .populate("student", "firstName lastName email telephoneNumber courseStartTimeline countryApplyingFrom")
      .populate("university", "name")
      .populate("course", "name");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({
      success: true,
      message: "Solicitor request fetched successfully",
      application
    });

  } catch (error) {
    console.error("Error fetching solicitor application by ID:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.approveSolicitorRequest = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const { applicationId } = req.params;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    // Find solicitor and verify this application is assigned to them
    const solicitor = await Solicitor.findById(solicitorId);
    if (!solicitor || !solicitor.assignedSolicitorRequests.includes(applicationId)) {
      return res.status(404).json({ success: false, message: "This request is not assigned to this solicitor" });
    }

    // Fetch application with student details
    const application = await Application.findById(applicationId).populate("student");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const student = application.student;

    // Assign solicitor to this application
    application.assignedSolicitor = solicitorId;
    application.status = "Accepted";
    await application.save();

    // Remove applicationId from solicitor's assignedSolicitorRequests (optional, if it should be cleared post approval)
    solicitor.assignedSolicitorRequests.pull(applicationId);
    await solicitor.save();

    // Send confirmation email to student
    await sendSolicitorAssignedEmail(student, solicitor);

    // Create in-app notification for student
    await Notification.create({
      user: student._id,
      message: "Your solicitor service request has been approved. Your assigned solicitor will be reaching out to you shortly to assist with your visa application process.",
      type: "General"
    });

    res.status(200).json({
      success: true,
      message: "Solicitor service request approved successfully"
    });

  } catch (error) {
    console.error("Error approving solicitor request:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};





//PROFILE 

exports.solicitorUpdatePassword = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const Id = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
  
      // Validate request body
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
      }
  
      if (newPassword.length < 8 || newPassword.length > 14) {
        return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
      }
  
      // Fetch the Associate Solicitor
      const getAssociate = await Solicitor.findById(Id).session(session);
      if (!getAssociate) {
        return res.status(404).json({ message: 'Solicitor not found.' });
      }
  
      // Verify current password
      const isPasswordMatch = await bcrypt.compare(currentPassword, getAssociate.password);
      if (!isPasswordMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
  
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirm password do not match.' });
      }
  
      // Hash and update the password
      getAssociate.password = await bcrypt.hash(newPassword, 10);
      await getAssociate.save({ session });
  
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


  exports.updateSolicitor = async (req, res) => {
    try {
      const solicitorId = req.user.id; // Get Solicitor ID from token
  
      // Validate if the ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(solicitorId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Solicitor ID" });
      }
  
      // Find the solicitor by ID and ensure it’s not deleted
      const solicitor = await Solicitor.findOne({
        _id: solicitorId,
        isDeleted: false,
      });
  
      // Check if solicitor exists
      if (!solicitor) {
        return res.status(404).json({
          success: false,
          message: "Solicitor not found or account has been deleted",
        });
      }
  
      // Define restricted fields that solicitors cannot update
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
  
      // Check if any restricted fields are present in the request body
      const invalidFields = Object.keys(req.body).filter((field) =>
        restrictedFields.includes(field)
      );
  
      // Return an error if restricted fields are found
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `The following fields cannot be updated: ${invalidFields.join(
            ", "
          )}`,
        });
      }
  
      // Extract allowed fields from the request body
      const { firstName, lastName, address, phoneNumber } = req.body;
  
      // Update only the allowed fields
      solicitor.firstName = firstName || solicitor.firstName;
      solicitor.lastName = lastName || solicitor.lastName;
      solicitor.address = address || solicitor.address;
      // solicitor.countryCode = countryCode || solicitor.countryCode;
      solicitor.phoneNumber = phoneNumber || solicitor.phoneNumber;
  
      // Save the updated solicitor details
      await solicitor.save();
  
      res.status(200).json({
        success: true,
        message: "Solicitor profile updated successfully",
        data: {
          _id: solicitor._id,
          firstName: solicitor.firstName,
          lastName: solicitor.lastName,
          address: solicitor.address,
          // countryCode: solicitor.countryCode,
          phoneNumber: solicitor.phoneNumber,
        },
      });
    } catch (error) {
      console.error("Error updating solicitor:", error);
      res.status(500).json({
        success: false,
        message: "Error updating solicitor profile",
      });
    }
  };
  

exports.seeProfileSolicitor = async (req, res) => {
  try {
    const id = req.user.id; // Get Associate ID from token

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Solicitor ID" });
    }

    // Find the solicitor by ID and ensure it belongs to the logged-in associate
    const solicitor = await Solicitor.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!solicitor) {
      return res.status(404).json({ error: "Solicitor not found" });
    }
    

    res.status(200).json(solicitor);
  } catch (error) {
    console.error("Error fetching solicitor:", error);
    res.status(500).json({ error: "Error fetching solicitor" });
  }
};