// services/emailService.js

const nodemailer = require('nodemailer');
const Student = require('../models/studentsModel');
const crypto = require('crypto');

const sendVerificationEmail = async (student) => {
  const token = crypto.randomBytes(32).toString('hex');
  student.verificationToken = token;

  await student.save();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,  // Stored in .env for security
      pass: process.env.EMAIL_PASS   // Stored in .env for security
    }
  });

  const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Please verify your email address',
    text: `Click here to verify your email: ${verificationLink}`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
};
