const AssociateSolicitor = require('../models/associateModel');
const Solicitor = require("../models/solicitorModel");
const generator = require('generate-password');
const nodemailer = require('nodemailer');
const { encryptData,decryptData } = require('../services/encryption&decryptionKey');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');


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
      countryCode,
      phoneNumber,
    } = req.body;

    // Get associate ID from authenticated user
    const nameOfAssociate = req.user.id;

    // Check if the email is already registered
    const existingSolicitor = await Solicitor.findOne({ email });
    if (existingSolicitor) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // **Auto-generate a password**
    const password = generator.generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      excludeSimilarCharacters: true,
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
      countryCode,
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
      text: `Dear ${firstName} ${lastName},\n\nYour account has been successfully created.\n\nHere are your credentials:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and change your password immediately for security.\n\nThank you.`,
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


// @desc Get All Solicitors
// @route GET /api/solicitors
exports.getAllSolicitors = async (req, res) => {
  try {
    const solicitors = await Solicitor.find({ isDeleted: false }).populate("nameOfAssociate", "nameOfAssociate email");
    res.status(200).json(solicitors);
  } catch (error) {
    res.status(500).json({ error: "Error fetching solicitors" });
  }
};

// @desc Get Solicitor by ID
// @route GET /api/solicitors/:id
exports.getSolicitorById = async (req, res) => {
  try {
    const solicitor = await Solicitor.findById(req.params.id).populate("nameOfAssociate", "nameOfAssociate email");

    if (!solicitor || solicitor.isDeleted) {
      return res.status(404).json({ error: "Solicitor not found" });
    }

    res.status(200).json(solicitor);
  } catch (error) {
    res.status(500).json({ error: "Error fetching solicitor" });
  }
};

// @desc Update Solicitor
// @route PUT /api/solicitors/:id
exports.updateSolicitor = async (req, res) => {
  try {
    const { firstName, lastName, address, countryCode, phoneNumber, isActive, reason, visaRequestStatus } = req.body;
    const solicitor = await Solicitor.findById(req.params.id);

    if (!solicitor || solicitor.isDeleted) {
      return res.status(404).json({ error: "Solicitor not found" });
    }

    solicitor.firstName = firstName || solicitor.firstName;
    solicitor.lastName = lastName || solicitor.lastName;
    solicitor.address = address || solicitor.address;
    solicitor.countryCode = countryCode || solicitor.countryCode;
    solicitor.phoneNumber = phoneNumber || solicitor.phoneNumber;
    solicitor.isActive = isActive !== undefined ? isActive : solicitor.isActive;
    solicitor.reason = reason || solicitor.reason;
    solicitor.visaRequestStatus = visaRequestStatus || solicitor.visaRequestStatus;

    await solicitor.save();
    res.status(200).json({ message: "Solicitor updated successfully", solicitor });
  } catch (error) {
    res.status(500).json({ error: "Error updating solicitor" });
  }
};

// @desc Delete Solicitor
// @route DELETE /api/solicitors/:id
exports.deleteSolicitor = async (req, res) => {
  try {
    const solicitor = await Solicitor.findById(req.params.id);

    if (!solicitor || solicitor.isDeleted) {
      return res.status(404).json({ error: "Solicitor not found" });
    }

    solicitor.isDeleted = true;
    await solicitor.save();
    res.status(200).json({ message: "Solicitor deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting solicitor" });
  }
};
