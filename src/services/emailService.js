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

const sendSolicitorPaymentEmail = async (student) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Solicitor Service Payment Successful',
    text: `Hi ${student.firstName},\n\nThank you for purchasing the solicitor service. Now you can apply for solicitor services.\n\nRegards,\nYour University Team`,
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

// ✅ Send Notification Email to Agency
const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
  const subject = `Student Application ${status}`;
  const text = `Dear Partner,\n\nThe university has ${status.toLowerCase()} the application for ${studentName} (Student ID: ${studentId}).\n\nPlease log in to your agency dashboard for more details.\n\nThank you.`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};


// ✅ Send Email to Student When Solicitor Request is Approved
const sendSolicitorRequestApprovedEmail = async (student) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Solicitor Request Approved',
    html: `
      <p>Hi ${student.firstName},</p>
      <p>🎉 Congratulations! Your request for solicitor assistance has been <b>approved</b>.</p>
      <p>Sooner a solicitor will be assigned to guide you through the visa process shortly.</p>
      <p>We’ll notify you once the assignment is complete.</p>
      <br />
      <p>Best regards,<br />Student Services Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};


// ✅ Send Email to Student When Solicitor is Assigned After Request Approval
const sendSolicitorAssignedEmail = async (student, solicitor) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Solicitor Assigned to Your Request',
    html: `
      <p>Hi ${student.firstName},</p>
      <p>🎉 Good news — your solicitor service request has been <b>approved</b>!</p>
      <p>Your assigned solicitor is <b>${solicitor.firstName} ${solicitor.lastName}</b>. They will be reaching out to you shortly to assist with your visa application process.</p>
      <br />
      <p>Best regards,<br />Student Services Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: university.email,
    subject: 'New Payment Receipt Uploaded',
    html: `
      <p>Hi ${university.name},</p>
      <p>📄 A new payment receipt has been uploaded by <b>${student.firstName} ${student.lastName}</b> for the course <b>${courseName}</b>.</p>
      <p>Please log in to your university dashboard to review and process the receipt at your earliest convenience.</p>
      <br />
      <p>Best regards,<br />Student Services Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};


// 📩 Email when receipt accepted
const sendReceiptAcceptedEmail = async (student, application) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: '🎉 Payment Receipt Accepted',
    html: `
      <p>Hi ${student.firstName},</p>
      <p>Good news — your payment receipt for <b>${application.course.name}</b> at <b>${application.university.name}</b> has been <b>accepted</b> by the university.</p>
      <p>Thank you for completing your payment.</p>
      <br />
      <p>Best regards,<br />Admissions Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

// 📩 Email when receipt rejected
const sendReceiptRejectedEmail = async (student, application, remark) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: '⚠️ Payment Receipt Rejected',
    html: `
      <p>Hi ${student.firstName},</p>
      <p>Your payment receipt for <b>${application.course.name}</b> at <b>${application.university.name}</b> has been <b>rejected</b>.</p>
      <p><b>Reason:</b> ${remark}</p>
      <p>Please review and upload a corrected receipt at your earliest convenience.</p>
      <br />
      <p>Best regards,<br />Admissions Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};


const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: agency.email,
    subject: `🔔 New Payment Receipt Uploaded by ${student.firstName} ${student.lastName}`,
    html: `
      <p>Hi ${agency.name},</p>
      <p>A new payment receipt has been uploaded by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b>.</p>
      <p>Please log in to your portal to review the details and take further action if necessary.</p>
      <br />
      <p>Best regards,<br />Admissions Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendReceiptAcceptedEmailToAgency = async (agency, student, universityName, courseName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: agency.email,
    subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
    html: `
      <p>Hi ${agency.name},</p>
      <p>The payment receipt submitted by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b> has been <b>accepted</b>.</p>
      <p>Please log in to your portal to view the updated application details.</p>
      <br />
      <p>Best regards,<br />Admissions Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendReceiptRejectedEmailToAgency = async (agency, student, universityName, courseName, remark) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: agency.email,
    subject: `Receipt Rejected for ${student.firstName} ${student.lastName}`,
    html: `
      <p>Hi ${agency.name},</p>
      <p>The payment receipt submitted by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b> has been <b>rejected</b>.</p>
      <p><b>Reason:</b> ${remark}</p>
      <p>Please coordinate with the student to resubmit a correct receipt if needed.</p>
      <br />
      <p>Best regards,<br />Admissions Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};


// ✅ Export functions
module.exports = {
  sendVerificationEmail,
  sendRejectionEmail,
  sendPaymentSuccessEmail,
  sendSolicitorPaymentEmail,
  sendAcceptanceEmailWithAttachment,
  sendAgencyNotificationEmail,
  sendSolicitorRequestApprovedEmail,
  sendSolicitorAssignedEmail,
  sendReceiptUploadedEmailToUniversity,
  sendReceiptAcceptedEmail,
  sendReceiptRejectedEmail,
  sendReceiptUploadedEmailToAgency,
  sendReceiptAcceptedEmailToAgency,
  sendReceiptRejectedEmailToAgency
};