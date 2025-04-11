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

const sendPaymentSuccessEmail = async (student) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Payment Successful - Thank You!',
    text: `Hi ${student.firstName},\n\nThank you for your payment of £20. Your transaction has been successfully completed, and you now have full access to the student portal.\n\nBest regards,\nYour University Team`,
  };

  await transporter.sendMail(mailOptions);
};

const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Application Accepted - Congratulations!',
    html: `
      <p>Congratulations! Your application has been <b>accepted</b>.</p>
      ${fileUrl ? `<p>You can download your acceptance letter here: <a href="${fileUrl}" target="_blank">Download Letter</a></p>` : ''}
      <p>We look forward to welcoming you to our university!</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};





// ✅ Export functions
module.exports = {
  sendVerificationEmail,
  sendRejectionEmail,
  sendPaymentSuccessEmail,
  sendAcceptanceEmailWithAttachment
};