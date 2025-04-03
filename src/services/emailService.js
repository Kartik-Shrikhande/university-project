// services/emailService.js

const nodemailer = require('nodemailer');
const Student = require('../models/studentsModel');
const crypto = require('crypto');

// ✅ Define transporter globally at the top
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Stored in .env for security
    pass: process.env.EMAIL_PASS   // Stored in .env for security
  }
});

// ✅ Send Verification Email
const sendVerificationEmail = async (student) => {
  const token = crypto.randomBytes(32).toString('hex');
  student.verificationToken = token;
  await student.save();

  const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Please verify your email address',
    text: `Click here to verify your email: ${verificationLink}`,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ Send Rejection Email
const sendRejectionEmail = async (email, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Application Rejection Notification',
    text: `We regret to inform you that your application has been rejected. Reason: ${reason}`,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ Export functions
module.exports = {
  sendVerificationEmail,
  sendRejectionEmail,
};