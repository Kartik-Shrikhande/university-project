const AssociateSolicitor = require('../models/associateModel');
const Students = require('../models/studentsModel');
const Application = require('../models/applicationModel');
const Solicitor = require("../models/solicitorModel");
const generator = require('generate-password');
const nodemailer = require('nodemailer');
const { encryptData,decryptData } = require('../services/encryption&decryptionKey');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const solicitorModel = require('../models/solicitorModel');


//ASSOCIATE PROFILE 
exports.updateAssociate = async (req, res) => {
  try {
    const id = req.user.id;
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


exports.associateUpdatePassword = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const associateId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
  
      // Validate request body
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
      }
  
      if (newPassword.length < 8 || newPassword.length > 14) {
        return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
      }
  
      // Fetch the Associate Solicitor
      const getAssociate = await AssociateSolicitor.findById(associateId).session(session);
      if (!getAssociate) {
        return res.status(404).json({ message: 'Associate Solicitor not found.' });
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
  

exports.getAssociateById = async (req, res) => {
    try {
      const  id = req.user.id;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid Associate ID" });
      }
  
      const associate = await AssociateSolicitor.findById(id);
  
      if (!associate) {
        return res.status(404).json({ success: false, message: "Associate not found" });
      }
  
      // Decrypt bank details before sending response
      if (associate.bankDetails && associate.bankDetails.accountNumber) {
        associate.bankDetails.accountNumber = decryptData(associate.bankDetails.accountNumber);
      }
  
      res.status(200).json({ success: true, data: associate });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };


  //ASSOCIATE - SOLICITORS

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
    
        if (existingSolicitor && !existingSolicitor.isDeleted) {
          return res.status(400).json({ success: false, message: "Email already in use" });
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
    });

    // Save the solicitor to the database
    await newSolicitor.save();

    // **Send credentials via email**
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Solicitor Account Credentials',
      text: `hi,${firstName} ${lastName},\n\nYour account has been successfully created.\n\nHere are your credentials:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and change your password immediately for security.\n\nThank you.`,
    };

    await transporter.sendMail(mailOptions);

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


// @desc Update Solicitor by ID
// @route PUT /api/solicitors/:id
// @access Private (Associate only)
exports.updateSolicitorById = async (req, res) => {
  try {
    const associateId = req.user.id; // Get Associate ID from token
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
      nameOfAssociate: associateId,
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
    res
      .status(500)
      .json({ success: false, message: "Error updating solicitor" });
  }
};


// @desc Get All Solicitors
// @route GET /api/solicitors
exports.getAllSolicitors = async (req, res) => {
  try {
    // Get Associate ID from token
    const associateId = req.user.id;

    // Find all solicitors created by this associate and not deleted
    const solicitors = await Solicitor.find({
      isDeleted: false,
      nameOfAssociate: associateId,
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
    const associateId = req.user.id; // Get Associate ID from token
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Solicitor ID" });
    }

    // Find the solicitor by ID and ensure it belongs to the logged-in associate
    const solicitor = await Solicitor.findOne({
      _id: id,
      isDeleted: false,
      nameOfAssociate: associateId,
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
// @desc Update Solicitor
// @route PUT /api/solicitors/:id



// @desc Delete Solicitor
// @route DELETE /api/solicitors/:id
exports.deleteSolicitor = async (req, res) => {
  try {
    const associateId = req.user.id; // Get Associate ID from token
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

  
    // Check if the solicitor belongs to the logged-in associate
    if (solicitor.nameOfAssociate.toString() !== associateId) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized: Solicitor does not belong to the logged-in associate" });
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



//ASSOCIATE - SOLICITORS REQUESTS 

exports.getAllAssignedSolicitorRequests = async (req, res) => {
  try {
    const associateId = req.user.id;

    const associate = await AssociateSolicitor.findById(associateId).populate({
      path: 'assignedSolicitorRequests',
      populate: {
        path: 'student',
        select: 'firstName lastName email telephoneNumber courseStartTimeline countryApplyingFrom'
      }
    });

    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate not found" });
    }

    const applications = associate.assignedSolicitorRequests;

    if (!applications.length) {
      return res.status(200).json({
        success: true,
        message: "No assigned solicitor requests",
        total: 0,
        applications: []
      });
    }

    // Format response
    const formattedRequests = applications.map(app => ({
      applicationId: app._id,
      studentId: app.student?._id,
      studentName: `${app.student?.firstName} ${app.student?.lastName}`,
      studentEmail: app.student?.email,
      telephoneNumber: app.student?.telephoneNumber,
      countryApplyingFrom: app.student?.countryApplyingFrom,
      courseStartTimeline: app.student?.courseStartTimeline
    }));

    res.status(200).json({
      success: true,
      total: applications.length,
      message: "Assigned solicitor requests fetched successfully",
      applications: formattedRequests
    });
  } catch (error) {
    console.error("Error fetching assigned solicitor requests:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.getSolicitorRequestById = async (req, res) => {
  try {
    const associateId = req.user.id;
    const { applicationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }

    // Find associate and check if this application is assigned
    const associate = await AssociateSolicitor.findById(associateId);

    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate not found" });
    }

    // Check if applicationId exists in associate's assignedSolicitorRequests array
    const isAssigned = associate.assignedSolicitorRequests.some(appId => appId.toString() === applicationId);

    if (!isAssigned) {
      return res.status(404).json({ success: false, message: "Solicitor request not assigned to this associate" });
    }

    // Fetch application details
    const application = await Application.findById(applicationId)
      .populate('student', 'firstName lastName email telephoneNumber countryApplyingFrom courseStartTimeline')
      .populate('university', 'name')
      .populate('course', 'name')
      .select('_id student university course status submissionDate reviewDate notes');

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({
      success: true,
      message: "Solicitor request fetched successfully",
      application
    });
  } catch (error) {
    console.error("Error fetching solicitor request by application ID:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.rejectSolicitorRequest = async (req, res) => {
  try {
    const associateId = req.user.id;
    const { applicationId } = req.params;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid Request ID" });
    }

    // Check if associate exists
    const associate = await AssociateSolicitor.findById(associateId);
    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate not found" });
    }

    // Check if application is assigned to this associate
    if (!associate.assignedSolicitorRequests.includes(applicationId)) {
      return res.status(400).json({ success: false, message: "This Request is not assigned to this associate" });
    }

    // Remove application from assigned list
    associate.assignedSolicitorRequests.pull(applicationId);
    await associate.save();

    res.status(200).json({ success: true, message: "Solicitor request rejected successfully" });

  } catch (error) {
    console.error("Error rejecting solicitor request:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



exports.assignRequestToSolicitor = async (req, res) => {
  try {
    const associateId = req.user.id; // from auth middleware
    const { solicitorId, applicationId } = req.body;

    if (!solicitorId || !applicationId) {
      return res.status(400).json({ success: false, message: "solicitorId and applicationId are required" });
    }

      if (!mongoose.Types.ObjectId.isValid(solicitorId)) {
      return res.status(400).json({ success: false, message: "Invalid Solicitor ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ success: false, message: "Invalid application ID" });
    }
    // Validate application
    const application = await Application.findById(applicationId).populate('student');
    if (!application) {
      return res.status(404).json({ success: false, message: "applicationId not found" });
    }

    // Validate associate
    const associate = await AssociateSolicitor.findById(associateId);
    if (!associate) {
      return res.status(404).json({ success: false, message: "Associate not found" });
    }

    // Check if application is assigned to this associate
    const isAssignedToAssociate = associate.assignedSolicitorRequests.includes(applicationId);
    if (!isAssignedToAssociate) {
      return res.status(400).json({ success: false, message: "This Request is not assigned to the current associate" });
    }

    // Validate solicitor
    const solicitor = await Solicitor.findById(solicitorId);
    if (!solicitor) {
      return res.status(404).json({ success: false, message: "Solicitor not found" });
    }

    // ✅ Ensure the solicitor was created by this associate
    if (String(solicitor.nameOfAssociate) !== String(associateId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: You can only assign Request to solicitors you created" });
    }

    // Prevent duplicate assignment
    if (solicitor.assignedSolicitorRequests.includes(applicationId)) {
      return res.status(400).json({ success: false, message: "This Request is already assigned to the solicitor" });
    }

    // Assign to solicitor
    solicitor.assignedSolicitorRequests.push(applicationId);
    await solicitor.save();

    // Remove application from all associates (not just the current one)
    await AssociateSolicitor.updateMany(
      { assignedSolicitorRequests: applicationId },
      { $pull: { assignedSolicitorRequests: applicationId } }
    );

    res.status(200).json({
      success: true,
      message: "Request assigned to solicitor successfully",
      data: {
        solicitorId: solicitor._id,
        applicationId: application._id,
        student: {
          studentId: application.student._id,
          name: `${application.student.firstName} ${application.student.lastName}`
        }
      }
    });
  } catch (error) {
    console.error("Error assigning application to solicitor:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
