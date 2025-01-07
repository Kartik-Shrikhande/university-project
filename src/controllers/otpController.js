const Otp = require('../models/otpModel'); // Import the OTP model
const Students = require('../models/studentsModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '/.env' })

exports.requestOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email exists
    const student = await Students.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000)
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

    // Save OTP to the database
    const newOtp = new Otp({
      email,
      otp: otpCode,
      expiry: otpExpiry,
    });

    await newOtp.save();

    ///
   const transporter = nodemailer.createTransport({
     service: 'Gmail',
     auth: {
       user: process.env.EMAIL_USER, // Add your email in .env
       pass: process.env.EMAIL_PASS, // Add your email password in .env
     },
   });
 
   const mailOptions = {
     from: process.env.EMAIL_USER,
     to:email,
     subject: 'Password Reset OTP',
     text: `Your OTP for password reset is: ${otpCode}. It is valid for 5 minutes.`,
   };
 
   await transporter.sendMail(mailOptions);
 


    // // Send OTP email
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: false,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASSWORD,
    //   },
    // });

    // const mailOptions = {
    //   from: process.env.SMTP_USER,
    //   to: email,
    //   subject: 'Password Reset OTP',
    //   text: `Your OTP for password reset is: ${otpCode}. It is valid for 5 minutes.`,
    // };

    // await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



exports.verifyOtp = async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      // Check if email is provided
      if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
      }
  
      // Check if OTP is provided
      if (!otp) {
        return res.status(400).json({ message: 'OTP is required.' });
      }
  
      // First, check if the email exists in the OTP records
      const emailRecord = await Otp.findOne({ email });
      if (!emailRecord) {
        return res.status(404).json({ message: 'Email not found.' });
      }
  
      // Now, check if the OTP matches the one stored for this email
      const otpRecord = await Otp.findOne({ email, otp });
      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid OTP.' });
      }
  
      // Check if OTP is expired
      if (new Date() > otpRecord.expiry) {
        return res.status(400).json({ message: 'OTP has expired.' });
      }
  
      // Check if OTP is already used
      if (otpRecord.isUsed) {
        return res.status(400).json({ message: 'OTP has already been used.' });
      }
  
      // Mark OTP as used
      otpRecord.isUsed = true;
      await otpRecord.save();
  
      return res.status(200).json({ message: 'OTP verified successfully.' });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
  
  

  exports.resetPassword = async (req, res) => {
    try {
      const { email, newPassword } = req.body;
  
      // Check if a verified OTP exists
      const otpRecord = await Otp.findOne({ email, isUsed: true });
      if (!otpRecord) {
        return res.status(400).json({ message: 'OTP verification is required before resetting the password.' });
      }
  
      // Find the student
      const student = await Students.findOne({ email });
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }
  
      // Hash the new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      student.password = hashedPassword;
      await student.save();
  
      // Optionally delete all OTPs for this email to clean up
      await Otp.deleteMany({ email });
  
      return res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
  