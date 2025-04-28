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
      path: "studentAssigned",
      select: "firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline"
    });

    if (!solicitor || solicitor.studentAssigned.length === 0) {
      return res.status(404).json({ success: false, message: "No assigned requests found" });
    }

    res.status(200).json({
      success: true,
      total:solicitor.studentAssigned.length,
      message: "Assigned solicitor requests fetched successfully",
      students: solicitor.studentAssigned
    });
  } catch (error) {
    console.error("Error fetching assigned solicitor requests:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.getSolicitorRequestByIdForSolicitor = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const { studentId } = req.params;

    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    // Find solicitor and check if this student is assigned
    const solicitor = await Solicitor.findById(solicitorId)
      .populate({
        path: 'studentAssigned',
        match: { _id: studentId },
        select: 'firstName lastName email telephoneNumber courseStartTimeline countryApplyingFrom'
      });

    const studentData = solicitor?.studentAssigned?.[0];

    if (!solicitor || !studentData) {
      return res.status(404).json({ success: false, message: "No such assigned solicitor request found" });
    }

    // Fetch accepted application for the student
    const application = await Application.findOne({
      student: studentId,
      status: 'Accepted'
    })
      .select('_id course university status submissionDate reviewDate') // adjust fields if needed
      .populate('university', 'name') // populate university name
      .populate('course', 'name');    // populate course name

    res.status(200).json({
      success: true,
      message: "Solicitor request fetched successfully",
      student: studentData,
      application: application || null
    });

  } catch (error) {
    console.error("Error fetching solicitor request by ID:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.approveSolicitorRequest = async (req, res) => {
  try {
    const solicitorId = req.user.id;
    const { studentId } = req.params;

    // Validate studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid student ID" });
    }

    // Find student
    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Find solicitor
    const solicitor = await Solicitor.findById(solicitorId);
    if (!solicitor) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }

    // Check if student is assigned to this solicitor
    if (!solicitor.studentAssigned.includes(studentId)) {
      return res.status(400).json({ success: false, message: "This student is not assigned to this solicitor" });
    }

    // Remove student from agency's students array
    await Agency.updateOne(
      { students: studentId },
      { $pull: { students: studentId } }
    );

    // Set assignedSolicitor in student model
    student.assignedSolicitor = solicitorId;
    await student.save();



   // Send confirmation email to student
   await sendSolicitorAssignedEmail(student, solicitor);

    // Create in-app notification
    await Notification.create({
      user: studentId,
      message: "Your solicitor service request has been approved.Your assigned solicitor will be reaching out to you shortly to assist with your visa application process",
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