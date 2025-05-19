const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Students = require('../models/studentsModel');
const Universities = require('../models/universityModel');
const solicitorModel = require('../models/solicitorModel');
const Admins = require('../models/agencyModel');
const sendEmail = require('../utils/otpMail');
const AssociateSolicitor = require('../models/associateModel');

// // Utility function to find user by role
// const getUserByEmailAndRole = async (email, role) => {
//   switch (role) {
//     case 'student':
//       return await Students.findOne({ email });
//     case 'university':
//       return await Universities.findOne({ email });
//     case 'admin':
//       return await Admins.findOne({ email });

//  case 'associate':
//       return await AssociateSolicitor.findOne({ email });

//  case 'solicitor':
//       return await solicitorModel.findOne({ email });

//     default:
//       return null;
//   }
// };


// Utility: find user by email across all roles
const getUserByEmail = async (email) => {
  const student = await Students.findOne({ email });
  if (student) return { user: student, role: 'student' };

  const university = await Universities.findOne({ email });
  if (university) return { user: university, role: 'university' };

  const admin = await Admins.findOne({ email });
  if (admin) return { user: admin, role: 'admin' };

  const associate = await AssociateSolicitor.findOne({ email });
  if (associate) return { user: associate, role: 'associate' };

  const solicitor = await solicitorModel.findOne({ email });
  if (solicitor) return { user: solicitor, role: 'solicitor' };

  return { user: null };
};

// Forgot Password - Send Reset Link
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const { user, role } = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'No user found with this email.' });
    }

    const resetToken = jwt.sign(
      { id: user._id, role },
      process.env.SECRET_KEY,
      { expiresIn: '5m' }
    );

    const resetLink = `${process.env.CLIENT_ORIGIN}/reset-password/${resetToken}`;

    await sendEmail.sendResetPasswordEmail(user.email, resetLink);

    res.status(200).json({ message: 'Password reset link has been sent to your email.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    let user;
    switch (decoded.role) {
      case 'student':
        user = await Students.findById(decoded.id);
        break;
      case 'university':
        user = await Universities.findById(decoded.id);
        break;
      case 'admin':
        user = await Admins.findById(decoded.id);
        break;
      case 'associate':
        user = await AssociateSolicitor.findById(decoded.id);
        break;
      case 'solicitor':
        user = await Solicitor.findById(decoded.id);
        break;
      default:
        user = null;
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully.' });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Reset link expired. Please request a new one.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const Students = require('../models/studentsModel');
// const sendEmail = require('../utils/otpMail'); // assuming you have a mail service file

// // Forgot Password - Send Reset Link
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const student = await Students.findOne({ email });

//     if (!student) {
//       return res.status(404).json({ message: 'No student found with this email.' });
//     }

//     // Create a reset token valid for 15 minutes
//     const resetToken = jwt.sign(
//       { id: student._id },
//       process.env.SECRET_KEY,
//       { expiresIn: '5m' }
//     );

//     // Construct reset link
//     const resetLink = `${process.env.CLIENT_ORIGIN}/reset-password/${resetToken}`;

//     // Send Email (implement sendResetPasswordEmail inside emailService.js)
//     await sendEmail.sendResetPasswordEmail(student.email, resetLink);

//     res.status(200).json({ message: 'Password reset link has been sent to your email.' });
//   } catch (error) {
//     console.error('Forgot Password Error:', error);
//     res.status(500).json({ message: 'Internal server error.' });
//   }
// };

// // Reset Password - Verify Token & Update Password
// exports.resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { newPassword } = req.body;

//     // Verify token
//     const decoded = jwt.verify(token, process.env.SECRET_KEY);
//     const student = await Students.findById(decoded.id);

//     if (!student) {
//       return res.status(404).json({ message: 'Invalid or expired token.' });
//     }

//     // Hash new password
//     const hashedPassword = await bcrypt.hash(newPassword, 12);
//     student.password = hashedPassword;

//     await student.save();

//     res.status(200).json({ message: 'Password has been reset successfully.' });
//   } catch (error) {
//     console.error('Reset Password Error:', error);

//     if (error.name === 'TokenExpiredError') {
//       return res.status(400).json({ message: 'Reset link expired. Please request a new one.' });
//     }

//     res.status(500).json({ message: 'Internal server error.' });
//   }
// };







// const Otp = require('../models/otpModel'); // Import the OTP model
// const Students = require('../models/studentsModel');
// const nodemailer = require('nodemailer');
// const bcrypt = require('bcrypt');
// require('dotenv').config({ path: '/.env' })

// exports.requestOtp = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Check if the email exists
//     const student = await Students.findOne({ email });
//     if (!student) {
//       return res.status(404).json({ message: 'Student not found.' });
//     }

//     // Generate OTP
//     const otpCode = Math.floor(100000 + Math.random() * 900000)
//     const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // OTP valid for 1 minutes

//     // Save OTP to the database
//     const newOtp = new Otp({
//       email,
//       otp: otpCode,
//       expiry: otpExpiry,
//     });

//     await newOtp.save();

//     ///
//    const transporter = nodemailer.createTransport({
//      service: 'Gmail',
//      auth: {
//        user: process.env.EMAIL_USER, // Add your email in .env
//        pass: process.env.EMAIL_PASS, // Add your email password in .env
//      },
//    });
 
//    const mailOptions = {
//      from: process.env.EMAIL_USER,
//      to:email,
//      subject: 'Password Reset OTP',
//      text: `Your OTP for password reset is: ${otpCode}. It is valid for 1 minutes.`,
//    };
 
//    await transporter.sendMail(mailOptions);
 


//     // // Send OTP email
//     // const transporter = nodemailer.createTransport({
//     //   host: process.env.SMTP_HOST,
//     //   port: process.env.SMTP_PORT,
//     //   secure: false,
//     //   auth: {
//     //     user: process.env.SMTP_USER,
//     //     pass: process.env.SMTP_PASSWORD,
//     //   },
//     // });

//     // const mailOptions = {
//     //   from: process.env.SMTP_USER,
//     //   to: email,
//     //   subject: 'Password Reset OTP',
//     //   text: `Your OTP for password reset is: ${otpCode}. It is valid for 5 minutes.`,
//     // };

//     // await transporter.sendMail(mailOptions);

//     return res.status(200).json({ message: 'OTP sent to your email.' });
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



// exports.verifyOtp = async (req, res) => {
//     try {
//       const { email, otp } = req.body;
  
//       // Check if email is provided
//       if (!email) {
//         return res.status(400).json({ message: 'Email is required.' });
//       }
  
//       // Check if OTP is provided
//       if (!otp) {
//         return res.status(400).json({ message: 'OTP is required.' });
//       }
  
//       // First, check if the email exists in the OTP records
//       const emailRecord = await Otp.findOne({ email });
//       if (!emailRecord) {
//         return res.status(404).json({ message: 'Email not found.' });
//       }
  
//       // Now, check if the OTP matches the one stored for this email
//       const otpRecord = await Otp.findOne({ email, otp });
//       if (!otpRecord) {
//         return res.status(400).json({ message: 'Invalid OTP.' });
//       }
  
//       // Check if OTP is expired
//       if (new Date() > otpRecord.expiry) {
//         return res.status(400).json({ message: 'OTP has expired.' });
//       }
  
//       // Check if OTP is already used
//       if (otpRecord.isUsed) {
//         return res.status(400).json({ message: 'OTP has already been used.' });
//       }
  
//       // Mark OTP as used
//       otpRecord.isUsed = true;
//       await otpRecord.save();
  
//       return res.status(200).json({ message: 'OTP verified successfully.' });
//     } catch (error) {
//       console.error('Error verifying OTP:', error);
//       return res.status(500).json({ message: 'Internal server error.' });
//     }
//   };
  
  
//   exports.resetPassword = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       const { email, newPassword } = req.body;
  
//       // Check if a verified OTP exists
//       const otpRecord = await Otp.findOne({ email, isUsed: true }).session(session);
//       if (!otpRecord) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(400).json({ message: 'OTP verification is required before resetting the password.' });
//       }
  
//       // Find the student
//       const student = await Students.findOne({ email }).session(session);
//       if (!student) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(404).json({ message: 'Student not found.' });
//       }
  
//       // Hash the new password and update
//       const hashedPassword = await bcrypt.hash(newPassword, 10);
//       student.password = hashedPassword;
//       await student.save({ session });
  
//       // Delete all OTPs for this email to clean up
//       await Otp.deleteMany({ email }).session(session);
  
//       // Commit the transaction
//       await session.commitTransaction();
//       session.endSession();
  
//       return res.status(200).json({ message: 'Password reset successfully.' });
//     } catch (error) {
//       // Abort the transaction on error
//       await session.abortTransaction();
//       session.endSession();
//       console.error('Error resetting password:', error);
//       return res.status(500).json({ message: 'Internal server error.' });
//     }
//   };
  