// const AssociateSolicitor = require('../models/associateModel');
// const { encryptData,decryptData } = require('../services/encryption&decryptionKey');
// const bcrypt = require('bcrypt');
// const mongoose = require('mongoose');

// exports.updateAssociate = async (req, res) => {
//   try {
//     const  id  = req.user.id;
//     const updates = req.body;

//     // Validate MongoDB ObjectId
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ success: false, message: "Invalid Associate ID" });
//     }

//     // Check if the Associate exists and is not soft deleted
//     const existingAssociate = await AssociateSolicitor.findById(id);
//     if (!existingAssociate) {
//       return res.status(404).json({ success: false, message: "Associate Solicitor not found" });
//     }

//     if (existingAssociate.isDeleted) {
//       return res.status(400).json({ success: false, message: "Cannot update a deleted Associate Solicitor" });
//     }
//   // Prevent email and password updates
//   if (updates.email || updates.password) {
//     return res.status(400).json({ success: false, message: "Email and password cannot be updated" });
//   }
//     // Encrypt account number if provided
//     if (updates.bankDetails?.accountNumber) {
//       updates.bankDetails.accountNumber = encryptData(updates.bankDetails.accountNumber);
//     }

//     // Update Associate
//     const updatedAssociate = await AssociateSolicitor.findByIdAndUpdate(id, updates, { new: true });

//     res.status(200).json({ success: true, message: "Associate Solicitor updated successfully", data: updatedAssociate });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// exports.associateUpdatePassword = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const associateId = req.user.id;
//       const { currentPassword, newPassword, confirmPassword } = req.body;
  
//       // Validate request body
//       if (!currentPassword || !newPassword || !confirmPassword) {
//         return res.status(400).json({ message: 'Please provide currentPassword, newPassword, and confirmPassword.' });
//       }
  
//       if (newPassword.length < 8 || newPassword.length > 14) {
//         return res.status(400).json({ message: 'Password must be between 8 and 14 characters long.' });
//       }
  
//       // Fetch the Associate Solicitor
//       const getAssociate = await AssociateSolicitor.findById(associateId).session(session);
//       if (!getAssociate) {
//         return res.status(404).json({ message: 'Associate Solicitor not found.' });
//       }
  
//       // Verify current password
//       const isPasswordMatch = await bcrypt.compare(currentPassword, getAssociate.password);
//       if (!isPasswordMatch) {
//         return res.status(400).json({ message: 'Current password is incorrect.' });
//       }
  
//       if (newPassword !== confirmPassword) {
//         return res.status(400).json({ message: 'New password and confirm password do not match.' });
//       }
  
//       // Hash and update the password
//       getAssociate.password = await bcrypt.hash(newPassword, 10);
//       await getAssociate.save({ session });
  
//       await session.commitTransaction();
//       session.endSession();
  
//       return res.status(200).json({ message: 'Password updated successfully.' });
//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       console.error('Error updating password:', error);
//       return res.status(500).json({ message: 'Internal server error.' });
//     }
//   };
  

// exports.getAssociateById = async (req, res) => {
//     try {
//       const  id = req.user.id;
  
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         return res.status(400).json({ success: false, message: "Invalid Associate ID" });
//       }
  
//       const associate = await AssociateSolicitor.findById(id);
  
//       if (!associate) {
//         return res.status(404).json({ success: false, message: "Associate not found" });
//       }
  
//       // Decrypt bank details before sending response
//       if (associate.bankDetails && associate.bankDetails.accountNumber) {
//         associate.bankDetails.accountNumber = decryptData(associate.bankDetails.accountNumber);
//       }
  
//       res.status(200).json({ success: true, data: associate });
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   };