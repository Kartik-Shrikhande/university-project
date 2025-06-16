const nodemailer = require('nodemailer');
const Student = require('../models/studentsModel');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📦 Reusable Email Template Generator
const generateEmailTemplate = (title, color, contentHtml) => `
  <div style="max-width:600px;margin:20px auto;padding:30px;border:1px solid #e0e0e0;border-radius:8px;font-family:Arial,sans-serif;background-color:#ffffff;">
    <h2 style="color:${color};text-align:center;">${title}</h2>
    ${contentHtml}
    <div style="margin-top:30px;text-align:center;color:#999;font-size:12px;">
      © ${new Date().getFullYear()} Your Company Name. All rights reserved.
    </div>
  </div>
`;

// 📧 Send Verification Email
const sendVerificationEmail = async (student) => {
  const token = crypto.randomBytes(32).toString('hex');
  student.verificationToken = token;
  await student.save();

  const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

  const html = generateEmailTemplate(
    'Verify Your Email',
    '#007bff',
    `<p style="font-size:16px;">Hi ${student.firstName},</p>
     <p style="font-size:16px;">Click below to verify your email:</p>
     <p><a href="${verificationLink}" style="color:#007bff;">Verify Email</a></p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Please verify your email address',
    html
  });
};

// 📧 Send Application Rejection Email
const sendRejectionEmail = async (email, reason) => {
  const html = generateEmailTemplate(
    'Application Rejected',
    '#d9534f',
    `<p style="font-size:16px;">Dear Applicant,</p>
     <p>Your application has been <strong style="color:#d9534f;">rejected</strong>.</p>
     <div style="background-color:#f8d7da;padding:15px;border-radius:5px;border:1px solid #f5c6cb;margin:20px 0;">
       <strong>Reason:</strong>
       <p style="margin:10px 0 0;color:#721c24;">${reason}</p>
     </div>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Application Rejection Notification',
    html
  });
};

// 📧 Send Payment Success Email
const sendPaymentSuccessEmail = async (student) => {
  const html = generateEmailTemplate(
    'Payment Successful',
    '#28a745',
    `<p style="font-size:16px;">Hi ${student.firstName},</p>
     <p>Thank you for your payment of <strong>30 GBP</strong>. Transaction completed.</p>
     <p>You now have full access to the student portal.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Payment Successful - Thank You!',
    html
  });
};

// 📧 Solicitor Service Payment Email
const sendSolicitorPaymentEmail = async (student) => {
  const html = generateEmailTemplate(
    'Solicitor Service Payment Successful',
    '#28a745',
    `<p style="font-size:16px;">Hi ${student.firstName},</p>
     <p>Thank you for purchasing the solicitor service. You can now apply for solicitor services.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Solicitor Service Payment Successful',
    html
  });
};

// 📧 Application Acceptance Email (with attachment link)
const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
  const html = generateEmailTemplate(
    'Application Accepted 🎉',
    '#28a745',
    `<p>Congratulations! Your application has been <strong style="color:#28a745;">accepted</strong>.</p>
     ${fileUrl ? `<p><a href="${fileUrl}" style="color:#007bff;">Download your acceptance letter</a></p>` : ''}
     <p>We look forward to welcoming you!</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Application Accepted - Congratulations!',
    html
  });
};

// 📧 Notify Agency of Application Status
const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
  const color = status === 'Rejected' ? '#d9534f' : '#28a745';

  const html = generateEmailTemplate(
    `Student Application ${status}`,
    color,
    `<p>Dear Partner,</p>
     <p>The university has <strong>${status}</strong> the application for <strong>${studentName}</strong> (ID: ${studentId}).</p>
     <p>Please log in to your dashboard for more details.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Student Application ${status}`,
    html
  });
};

// 📧 Solicitor Request Approved
const sendSolicitorRequestApprovedEmail = async (student) => {
  const html = generateEmailTemplate(
    'Solicitor Request Approved',
    '#28a745',
    `<p>Hi ${student.firstName},</p>
     <p>🎉 Your request for solicitor assistance has been <strong>approved</strong>.</p>
     <p>A solicitor will be assigned to you shortly.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Solicitor Request Approved',
    html
  });
};

// 📧 Solicitor Assigned
const sendSolicitorAssignedEmail = async (student, solicitor) => {
  const html = generateEmailTemplate(
    'Solicitor Assigned',
    '#28a745',
    `<p>Hi ${student.firstName},</p>
     <p>Your solicitor request has been <strong>approved</strong>.</p>
     <p>Your assigned solicitor is <strong>${solicitor.firstName} ${solicitor.lastName}</strong>.</p>
     <p>Contact: ${solicitor.email}</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Solicitor Assigned to Your Request',
    html
  });
};

// 📧 Receipt Uploaded to University
const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
  const html = generateEmailTemplate(
    'New Payment Receipt Uploaded',
    '#007bff',
    `<p>Hi ${university.name},</p>
     <p>A new receipt was uploaded by <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong>.</p>
     <p>Please review it via your dashboard.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: university.email,
    subject: 'New Payment Receipt Uploaded',
    html
  });
};

// 📧 Receipt Accepted (Student)
const sendReceiptAcceptedEmail = async (student, application) => {
  const html = generateEmailTemplate(
    '🎉 Payment Receipt Accepted',
    '#28a745',
    `<p>Hi ${student.firstName},</p>
     <p>Your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> has been <strong>accepted</strong>.</p>
     <p>Thank you!</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: '🎉 Payment Receipt Accepted',
    html
  });
};

// 📧 Receipt Rejected (Student)
const sendReceiptRejectedEmail = async (student, application, remark) => {
  const html = generateEmailTemplate(
    '⚠️ Payment Receipt Rejected',
    '#d9534f',
    `<p>Hi ${student.firstName},</p>
     <p>Your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> has been <strong>rejected</strong>.</p>
     <div style="background-color:#f8d7da;padding:15px;border-radius:5px;border:1px solid #f5c6cb;margin:20px 0;">
       <strong>Reason:</strong>
       <p style="margin:10px 0 0;color:#721c24;">${remark}</p>
     </div>
     <p>Please upload a corrected receipt.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: '⚠️ Payment Receipt Rejected',
    html
  });
};

// 📧 Receipt Notifications (Agency)
const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
  const html = generateEmailTemplate(
    'New Payment Receipt Uploaded',
    '#007bff',
    `<p>Hi ${agency.name},</p>
     <p><strong>${student.firstName} ${student.lastName}</strong> uploaded a receipt for <strong>${courseName}</strong> at <strong>${universityName}</strong>.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: agency.email,
    subject: `🔔 New Payment Receipt by ${student.firstName} ${student.lastName}`,
    html
  });
};

const sendReceiptAcceptedEmailToAgency = async (agency, student, universityName, courseName) => {
  const html = generateEmailTemplate(
    'Receipt Accepted',
    '#28a745',
    `<p>Hi ${agency.name},</p>
     <p>The receipt from <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong> at <strong>${universityName}</strong> was <strong>accepted</strong>.</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: agency.email,
    subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
    html
  });
};

const sendReceiptRejectedEmailToAgency = async (agency, student, universityName, courseName, remark) => {
  const html = generateEmailTemplate(
    'Receipt Rejected',
    '#d9534f',
    `<p>Hi ${agency.name},</p>
     <p>The receipt from <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong> at <strong>${universityName}</strong> was <strong>rejected</strong>.</p>
     <p><strong>Reason:</strong> ${remark}</p>`
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: agency.email,
    subject: `Receipt Rejected for ${student.firstName} ${student.lastName}`,
    html
  });
};

// ✅ Export all
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






// // services/emailService.js

// const nodemailer = require('nodemailer');
// const Student = require('../models/studentsModel');
// const crypto = require('crypto');

// // ✅ Define transporter globally at the top
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,  // Stored in .env for security
//     pass: process.env.EMAIL_PASS   // Stored in .env for security
//   }
// });

// // ✅ Send Verification Email
// const sendVerificationEmail = async (student) => {
//   const token = crypto.randomBytes(32).toString('hex');
//   student.verificationToken = token;
//   await student.save();

//   const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Please verify your email address',
//     text: `Click here to verify your email: ${verificationLink}`,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Send Rejection Email
// const sendRejectionEmail = async (email, reason) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Rejection Notification',
//     html: `
//       <div style="max-width: 600px; margin: 20px auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; font-family: Arial, sans-serif; background-color: #ffffff;">
//         <h2 style="color: #d9534f; text-align: center;">Application Rejected</h2>
//         <p style="font-size: 16px; color: #333333;">Dear Applicant,</p>
//         <p style="font-size: 16px; color: #333333;">We regret to inform you that your application has been <strong style="color: #d9534f;">rejected</strong>.</p>
//         <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb; margin: 20px 0;">
//           <strong>Reason for Rejection:</strong>
//           <p style="margin: 10px 0 0; color: #721c24;">${reason}</p>
//         </div>
//         <p style="font-size: 14px; color: #555555;">If you have any questions, feel free to reach out to our support team.</p>
//         <p style="font-size: 14px; color: #555555;">Thank you for your interest.</p>
//         <div style="margin-top: 30px; text-align: center; color: #999999; font-size: 12px;">
//           © ${new Date().getFullYear()} Your Company Name. All rights reserved.
//         </div>
//       </div>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };


// const sendPaymentSuccessEmail = async (student) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Payment Successful - Thank You!',
//     text: `Hi ${student.firstName},\n\nThank you for your payment of £20. Your transaction has been successfully completed, and you now have full access to the student portal.\n\nBest regards,\nYour University Team`,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendSolicitorPaymentEmail = async (student) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Service Payment Successful',
//     text: `Hi ${student.firstName},\n\nThank you for purchasing the solicitor service. Now you can apply for solicitor services.\n\nRegards,\nYour University Team`,
//   };
//   await transporter.sendMail(mailOptions);
// };



// const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Accepted - Congratulations!',
//     html: `
//       <p>Congratulations! Your application has been <b>accepted</b>.</p>
//       ${fileUrl ? `<p>You can download your acceptance letter here: <a href="${fileUrl}" target="_blank">Download Letter</a></p>` : ''}
//       <p>We look forward to welcoming you to our university!</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Send Notification Email to Agency
// const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
//   const subject = `Student Application ${status}`;
//   const text = `Dear Partner,\n\nThe university has ${status.toLowerCase()} the application for ${studentName} (Student ID: ${studentId}).\n\nPlease log in to your agency dashboard for more details.\n\nThank you.`;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject,
//     text,
//   };

//   await transporter.sendMail(mailOptions);
// };


// // ✅ Send Email to Student When Solicitor Request is Approved
// const sendSolicitorRequestApprovedEmail = async (student) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Request Approved',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>🎉 Congratulations! Your request for solicitor assistance has been <b>approved</b>.</p>
//       <p>Sooner a solicitor will be assigned to guide you through the visa process shortly.</p>
//       <p>We’ll notify you once the assignment is complete.</p>
//       <br />
//       <p>Best regards,<br />Student Services Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };


// // ✅ Send Email to Student When Solicitor is Assigned After Request Approval
// const sendSolicitorAssignedEmail = async (student, solicitor) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Assigned to Your Request',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>🎉 Good news — your solicitor service request has been <b>approved</b>!</p>
//       <p>Your assigned solicitor is <b>${solicitor.firstName} ${solicitor.lastName}</b>. They will be reaching out to you shortly to assist with your visa application process.</p>
//        <p> You can reach Assigned solicitor at ${solicitor.email} </p>
//       <br />
//       <p>Best regards,<br />Student Services Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: university.email,
//     subject: 'New Payment Receipt Uploaded',
//     html: `
//       <p>Hi ${university.name},</p>
//       <p>📄 A new payment receipt has been uploaded by <b>${student.firstName} ${student.lastName}</b> for the course <b>${courseName}</b>.</p>
//       <p>Please log in to your university dashboard to review and process the receipt at your earliest convenience.</p>
//       <br />
//       <p>Best regards,<br />Student Services Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };


// // 📩 Email when receipt accepted
// const sendReceiptAcceptedEmail = async (student, application) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '🎉 Payment Receipt Accepted',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>Good news — your payment receipt for <b>${application.course.name}</b> at <b>${application.university.name}</b> has been <b>accepted</b> by the university.</p>
//       <p>Thank you for completing your payment.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// // 📩 Email when receipt rejected
// const sendReceiptRejectedEmail = async (student, application, remark) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '⚠️ Payment Receipt Rejected',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>Your payment receipt for <b>${application.course.name}</b> at <b>${application.university.name}</b> has been <b>rejected</b>.</p>
//       <p><b>Reason:</b> ${remark}</p>
//       <p>Please review and upload a corrected receipt at your earliest convenience.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };


// const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `🔔 New Payment Receipt Uploaded by ${student.firstName} ${student.lastName}`,
//     html: `
//       <p>Hi ${agency.name},</p>
//       <p>A new payment receipt has been uploaded by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b>.</p>
//       <p>Please log in to your portal to review the details and take further action if necessary.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptAcceptedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
//     html: `
//       <p>Hi ${agency.name},</p>
//       <p>The payment receipt submitted by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b> has been <b>accepted</b>.</p>
//       <p>Please log in to your portal to view the updated application details.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptRejectedEmailToAgency = async (agency, student, universityName, courseName, remark) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Rejected for ${student.firstName} ${student.lastName}`,
//     html: `
//       <p>Hi ${agency.name},</p>
//       <p>The payment receipt submitted by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b> has been <b>rejected</b>.</p>
//       <p><b>Reason:</b> ${remark}</p>
//       <p>Please coordinate with the student to resubmit a correct receipt if needed.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };


// // ✅ Export functions
// module.exports = {
//   sendVerificationEmail,
//   sendRejectionEmail,
//   sendPaymentSuccessEmail,
//   sendSolicitorPaymentEmail,
//   sendAcceptanceEmailWithAttachment,
//   sendAgencyNotificationEmail,
//   sendSolicitorRequestApprovedEmail,
//   sendSolicitorAssignedEmail,
//   sendReceiptUploadedEmailToUniversity,
//   sendReceiptAcceptedEmail,
//   sendReceiptRejectedEmail,
//   sendReceiptUploadedEmailToAgency,
//   sendReceiptAcceptedEmailToAgency,
//   sendReceiptRejectedEmailToAgency
// };