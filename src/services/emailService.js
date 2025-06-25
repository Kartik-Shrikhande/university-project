
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

// 🎨 Branding Configuration
const BRAND_CONFIG = {
  name: 'Connect2Uni',
  primaryColor: '#4a6bdf',       // Vibrant blue
  secondaryColor: '#6c5ce7',     // Purple
  successColor: '#00b894',       // Teal green
  warningColor: '#fdcb6e',       // Golden yellow
  dangerColor: '#d63031',        // Red
  lightBg: '#f5f6fa',            // Light gray background
  textColor: '#2d3436',          // Dark gray text
  logoUrl: 'https://yourwebsite.com/logo.svg' // Your logo SVG URL
};

// 📦 Enhanced Email Template Generator
const generateEmailTemplate = (title, color, contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f6fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: ${color}; padding: 30px 20px; text-align: center; }
    .logo { height: 50px; margin-bottom: 15px; }
    .title { color: white; font-size: 24px; font-weight: 600; margin: 0; }
    .content { padding: 30px; color: ${BRAND_CONFIG.textColor}; line-height: 1.6; }
    .footer { text-align: center; padding: 20px; background: ${BRAND_CONFIG.lightBg}; color: #7f8c8d; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
    .divider { height: 1px; background: #eee; margin: 25px 0; }
    .highlight-box { background: ${BRAND_CONFIG.lightBg}; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; margin: 20px 0; }
    .reason-box { background: #fff4f4; padding: 15px; border-radius: 6px; border: 1px solid #ffdddd; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${BRAND_CONFIG.logoUrl}" alt="${BRAND_CONFIG.name}" class="logo">
      <h1 class="title">${title}</h1>
    </div>
    
    <div class="content">
      ${contentHtml}
    </div>
    
    <div class="footer">
      © ${new Date().getFullYear()} ${BRAND_CONFIG.name}. All rights reserved.<br>
      <small>If you didn't request this email, you can safely ignore it.</small>
    </div>
  </div>
</body>
</html>
`;

// 📧 Send Verification Email
const sendVerificationEmail = async (student) => {
  const token = crypto.randomBytes(32).toString('hex');
  student.verificationToken = token;
  await student.save();

  const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

  const html = generateEmailTemplate(
    'Verify Your Email',
    BRAND_CONFIG.primaryColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     <p>Welcome to ${BRAND_CONFIG.name}! We're excited to have you on board.</p>
     <p>To complete your registration, please verify your email address by clicking the button below:</p>
     <div style="text-align: center;">
       <a href="${verificationLink}" class="button">Verify Email Address</a>
     </div>
     <p>If the button doesn't work, copy and paste this link into your browser:</p>
     <div class="highlight-box">
       <small>${verificationLink}</small>
     </div>
     <p>This link will expire in 24 hours.</p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name}" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Verify Your Email Address',
    html
  });
};

// 📧 Send Application Rejection Email
const sendRejectionEmail = async (email, reason) => {
  const html = generateEmailTemplate(
    'Application Update',
    BRAND_CONFIG.dangerColor,
    `<p>Dear Applicant,</p>
     <p>We appreciate the time and effort you put into your application. After careful consideration, we regret to inform you that your application has not been successful.</p>
     
     <div class="reason-box">
       <strong>Feedback on your application:</strong>
       <p>${reason}</p>
     </div>
     
     <p>This decision doesn't reflect on your potential, and we encourage you to apply again in the future.</p>
     <p>If you have any questions about this decision, please don't hesitate to contact our admissions team.</p>
     <div class="divider"></div>
     <p>Wishing you all the best in your academic journey,</p>
     <p><strong>The ${BRAND_CONFIG.name} Team</strong></p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Application Status Update',
    html
  });
};

// 📧 Send Payment Success Email
const sendPaymentSuccessEmail = async (student) => {
  const html = generateEmailTemplate(
    'Payment Confirmed',
    BRAND_CONFIG.successColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     <p>We're pleased to confirm that we've received your payment of <strong>30 GBP</strong>.</p>
     
     <div class="highlight-box">
       <div style="text-align: center;">
         <p style="font-size: 18px; margin: 5px 0;">🎉 Payment Successful</p>
         <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">30 GBP</p>
         <p style="margin: 5px 0;">${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
       </div>
     </div>
     
     <p>You now have full access to the student portal where you can:</p>
     <ul>
       <li>Track your application status</li>
       <li>Upload required documents</li>
       <li>Communicate with your advisor</li>
     </ul>
     
     <div style="text-align: center; margin-top: 25px;">
       <a href="https://yourwebsite.com/portal" class="button">Go to Student Portal</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Payment Received - Thank You!',
    html
  });
};

// 📧 Solicitor Service Payment Email
const sendSolicitorPaymentEmail = async (student) => {
  const html = generateEmailTemplate(
    'Solicitor Service Activated',
    BRAND_CONFIG.secondaryColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     <p>Thank you for purchasing our solicitor service! Your payment has been processed successfully.</p>
     
     <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
       <p style="font-size: 18px; margin: 0;">You can now apply for solicitor services through your student portal.</p>
     </div>
     
     <p>Here's what happens next:</p>
     <ol>
       <li>Our team will review your request within 1-2 business days</li>
       <li>You'll receive an email when a solicitor is assigned to you</li>
       <li>Your solicitor will contact you directly to begin the process</li>
     </ol>
     
     <div style="text-align: center;">
       <a href="https://yourwebsite.com/portal/solicitor" class="button">View Solicitor Services</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Support" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Solicitor Service Payment Confirmed',
    html
  });
};

// 📧 Application Acceptance Email (with attachment link)
const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
  const html = generateEmailTemplate(
    'Congratulations! 🎉',
    BRAND_CONFIG.successColor,
    `<p>We are delighted to inform you that your application has been <strong>accepted</strong>!</p>
     
     <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
       <p style="font-size: 24px; font-weight: bold; margin: 10px 0; color: ${BRAND_CONFIG.successColor};">Welcome to ${BRAND_CONFIG.name}!</p>
       <p>This is an exciting next step in your academic journey.</p>
     </div>
     
     ${fileUrl ? `
     <p>Your official acceptance letter is ready to download:</p>
     <div style="text-align: center; margin: 25px 0;">
       <a href="${fileUrl}" class="button">Download Acceptance Letter</a>
     </div>
     ` : ''}
     
     <p>Next steps:</p>
     <ul>
       <li>Review your acceptance letter carefully</li>
       <li>Complete any required enrollment forms</li>
       <li>Submit tuition payment by the deadline</li>
     </ul>
     
     <p>We look forward to welcoming you to our academic community!</p>
     
     <div class="divider"></div>
     <p>If you have any questions, please contact our admissions team at admissions@connect2uni.com</p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Congratulations! Your Application Has Been Accepted',
    html
  });
};

// 📧 Notify Agency of Application Status
const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
  const color = status === 'Rejected' ? BRAND_CONFIG.dangerColor : BRAND_CONFIG.successColor;
  const statusText = status === 'Rejected' ? 'not been successful' : 'been successful';

  const html = generateEmailTemplate(
    `Student Application ${status}`,
    color,
    `<p>Dear Partner,</p>
     
     <p>We're writing to inform you about the status update for one of your students:</p>
     
     <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
       <p><strong>Student Name:</strong> ${studentName}</p>
       <p><strong>Student ID:</strong> ${studentId}</p>
       <p><strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${status}</span></p>
     </div>
     
     <p>The application has ${statusText}. Please log in to your partner dashboard for more details:</p>
     
     <div style="text-align: center; margin: 20px 0;">
       <a href="https://yourwebsite.com/agency/dashboard" class="button">View Dashboard</a>
     </div>
     
     <p>Thank you for partnering with ${BRAND_CONFIG.name} to support students in their academic journey.</p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Partner Network" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Student Application Update: ${studentName} - ${status}`,
    html
  });
};

// 📧 Solicitor Request Approved
const sendSolicitorRequestApprovedEmail = async (student) => {
  const html = generateEmailTemplate(
    'Solicitor Request Approved',
    BRAND_CONFIG.secondaryColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     
     <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
       <p style="font-size: 24px; margin: 10px 0;">🎉 Great News!</p>
       <p>Your request for solicitor assistance has been <strong>approved</strong>.</p>
     </div>
     
     <p>What happens next:</p>
     <ul>
       <li>Our team is currently matching you with the best solicitor for your needs</li>
       <li>You'll receive another email once your solicitor is assigned (within 2 business days)</li>
       <li>Your solicitor will contact you directly to begin the process</li>
     </ul>
     
     <p>In the meantime, you can prepare by gathering any relevant documents you may need.</p>
     
     <div style="text-align: center; margin-top: 20px;">
       <a href="https://yourwebsite.com/portal/solicitor" class="button">View Solicitor Request</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Your Solicitor Request Has Been Approved',
    html
  });
};

// 📧 Solicitor Assigned
const sendSolicitorAssignedEmail = async (student, solicitor) => {
  const html = generateEmailTemplate(
    'Your Solicitor Is Ready',
    BRAND_CONFIG.secondaryColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     
     <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
       <p style="font-size: 24px; margin: 10px 0;">Your Solicitor Is Assigned</p>
       <p style="font-size: 18px; margin: 10px 0;">${solicitor.firstName} ${solicitor.lastName}</p>
     </div>
     
     <p>Your solicitor has been carefully selected based on your specific needs. Here's how to proceed:</p>
     
     <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin: 20px 0;">
       <p><strong>Solicitor Contact Information:</strong></p>
       <p>Name: ${solicitor.firstName} ${solicitor.lastName}</p>
       <p>Email: <a href="mailto:${solicitor.email}">${solicitor.email}</a></p>
       <p>You should expect to hear from them within the next 48 hours.</p>
     </div>
     
     <p>If you don't receive communication from your solicitor within 2 business days, please contact our support team.</p>
     
     <div style="text-align: center; margin-top: 20px;">
       <a href="mailto:${solicitor.email}" class="button">Email Your Solicitor</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Your Solicitor Has Been Assigned',
    html
  });
};

// 📧 Receipt Uploaded to University
const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
  const html = generateEmailTemplate(
    'New Payment Receipt Uploaded',
    BRAND_CONFIG.primaryColor,
    `<p>Dear ${university.name} Admissions Team,</p>
     
     <p>A new payment receipt has been uploaded by one of your prospective students:</p>
     
     <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
       <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
       <p><strong>Course:</strong> ${courseName}</p>
       <p><strong>Date Submitted:</strong> ${new Date().toLocaleDateString()}</p>
     </div>
     
     <p>Please review this receipt at your earliest convenience via the university portal:</p>
     
     <div style="text-align: center; margin: 20px 0;">
       <a href="https://yourwebsite.com/university/receipts" class="button">Review Receipts</a>
     </div>
     
     <p>Thank you for partnering with ${BRAND_CONFIG.name}.</p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} University Portal" <${process.env.EMAIL_USER}>`,
    to: university.email,
    subject: 'New Payment Receipt Submitted for Review',
    html
  });
};

// 📧 Receipt Accepted (Student)
const sendReceiptAcceptedEmail = async (student, application) => {
  const html = generateEmailTemplate(
    'Receipt Approved ✅',
    BRAND_CONFIG.successColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     
     <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
       <p style="font-size: 20px; margin: 10px 0;">Payment Receipt Accepted</p>
       <p>for ${application.course.name} at ${application.university.name}</p>
     </div>
     
     <p>Your payment receipt has been reviewed and <strong>approved</strong> by the university.</p>
     
     <p>Next steps in your application process:</p>
     <ul>
       <li>Await final confirmation from the university</li>
       <li>Prepare for your visa application (if applicable)</li>
       <li>Check your email regularly for updates</li>
     </ul>
     
     <p>You can track your application status anytime through your student portal.</p>
     
     <div style="text-align: center; margin-top: 20px;">
       <a href="https://yourwebsite.com/portal" class="button">View Application Status</a>
     </div>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Your Payment Receipt Has Been Approved',
    html
  });
};

// 📧 Receipt Rejected (Student)
const sendReceiptRejectedEmail = async (student, application, remark) => {
  const html = generateEmailTemplate(
    'Receipt Requires Attention',
    BRAND_CONFIG.dangerColor,
    `<p>Hi <strong>${student.firstName}</strong>,</p>
     
     <div style="background: #ffebee; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
       <p style="font-size: 20px; margin: 10px 0;">Payment Receipt Not Accepted</p>
       <p>for ${application.course.name} at ${application.university.name}</p>
     </div>
     
     <p>We regret to inform you that your payment receipt has been <strong>rejected</strong>.</p>
     
     <div style="background: #fff4f4; padding: 15px; border-radius: 6px; margin: 20px 0;">
       <p><strong>Reason for rejection:</strong></p>
       <p>${remark}</p>
     </div>
     
     <p>Please take the following actions:</p>
     <ol>
       <li>Review the reason for rejection above</li>
       <li>Correct the issue or obtain a new receipt</li>
       <li>Upload the corrected receipt through your portal</li>
     </ol>
     
     <div style="text-align: center; margin: 20px 0;">
       <a href="https://yourwebsite.com/portal/upload-receipt" class="button">Upload Corrected Receipt</a>
     </div>
     
     <p>If you need assistance, please contact our support team.</p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Action Required: Payment Receipt Rejected',
    html
  });
};

// 📧 Receipt Notifications (Agency)
const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
  const html = generateEmailTemplate(
    'Student Uploaded Payment Receipt',
    BRAND_CONFIG.primaryColor,
    `<p>Dear ${agency.name},</p>
     
     <p>One of your students has uploaded a payment receipt for university admission:</p>
     
     <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
       <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
       <p><strong>University:</strong> ${universityName}</p>
       <p><strong>Course:</strong> ${courseName}</p>
       <p><strong>Date Submitted:</strong> ${new Date().toLocaleDateString()}</p>
     </div>
     
     <p>You can view this receipt and track its status through your agency portal.</p>
     
     <div style="text-align: center; margin: 20px 0;">
       <a href="https://yourwebsite.com/agency/receipts" class="button">View Student Receipt</a>
     </div>
     
     <p>Thank you for using ${BRAND_CONFIG.name} to support your students.</p>`
  );

  await transporter.sendMail({
    from: `"${BRAND_CONFIG.name} Agency Portal" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `New Receipt Uploaded by ${student.firstName} ${student.lastName}`,
    html
  });
};

// Export all email functions
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
  sendReceiptUploadedEmailToAgency
};





// const nodemailer = require('nodemailer');
// const Student = require('../models/studentsModel');
// const crypto = require('crypto');

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// // 📦 Reusable Email Template Generator
// const generateEmailTemplate = (title, color, contentHtml) => `
//   <div style="max-width:600px;margin:20px auto;padding:30px;border:1px solid #e0e0e0;border-radius:8px;font-family:Arial,sans-serif;background-color:#ffffff;">
//     <h2 style="color:${color};text-align:center;">${title}</h2>
//     ${contentHtml}
//     <div style="margin-top:30px;text-align:center;color:#999;font-size:12px;">
//       © ${new Date().getFullYear()} Connect2Uni. All rights reserved.
//     </div>
//   </div>
// `;

// // 📧 Send Verification Email
// const sendVerificationEmail = async (student) => {
//   const token = crypto.randomBytes(32).toString('hex');
//   student.verificationToken = token;
//   await student.save();

//   const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

//   const html = generateEmailTemplate(
//     'Verify Your Email',
//     '#007bff',
//     `<p style="font-size:16px;">Hi ${student.firstName},</p>
//      <p style="font-size:16px;">Click below to verify your email:</p>
//      <p><a href="${verificationLink}" style="color:#007bff;">Verify Email</a></p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Please verify your email address',
//     html
//   });
// };

// // 📧 Send Application Rejection Email
// const sendRejectionEmail = async (email, reason) => {
//   const html = generateEmailTemplate(
//     'Application Rejected',
//     '#d9534f',
//     `<p style="font-size:16px;">Dear Applicant,</p>
//      <p>Your application has been <strong style="color:#d9534f;">rejected</strong>.</p>
//      <div style="background-color:#f8d7da;padding:15px;border-radius:5px;border:1px solid #f5c6cb;margin:20px 0;">
//        <strong>Reason:</strong>
//        <p style="margin:10px 0 0;color:#721c24;">${reason}</p>
//      </div>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Rejection Notification',
//     html
//   });
// };

// // 📧 Send Payment Success Email
// const sendPaymentSuccessEmail = async (student) => {
//   const html = generateEmailTemplate(
//     'Payment Successful',
//     '#28a745',
//     `<p style="font-size:16px;">Hi ${student.firstName},</p>
//      <p>Thank you for your payment of <strong>30 GBP</strong>. Transaction completed.</p>
//      <p>You now have full access to the student portal.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Payment Successful - Thank You!',
//     html
//   });
// };

// // 📧 Solicitor Service Payment Email
// const sendSolicitorPaymentEmail = async (student) => {
//   const html = generateEmailTemplate(
//     'Solicitor Service Payment Successful',
//     '#28a745',
//     `<p style="font-size:16px;">Hi ${student.firstName},</p>
//      <p>Thank you for purchasing the solicitor service. You can now apply for solicitor services.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Service Payment Successful',
//     html
//   });
// };

// // 📧 Application Acceptance Email (with attachment link)
// const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
//   const html = generateEmailTemplate(
//     'Application Accepted 🎉',
//     '#28a745',
//     `<p>Congratulations! Your application has been <strong style="color:#28a745;">accepted</strong>.</p>
//      ${fileUrl ? `<p><a href="${fileUrl}" style="color:#007bff;">Download your acceptance letter</a></p>` : ''}
//      <p>We look forward to welcoming you!</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Accepted - Congratulations!',
//     html
//   });
// };

// // 📧 Notify Agency of Application Status
// const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
//   const color = status === 'Rejected' ? '#d9534f' : '#28a745';

//   const html = generateEmailTemplate(
//     `Student Application ${status}`,
//     color,
//     `<p>Dear Partner,</p>
//      <p>The university has <strong>${status}</strong> the application for <strong>${studentName}</strong> (ID: ${studentId}).</p>
//      <p>Please log in to your dashboard for more details.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: `Student Application ${status}`,
//     html
//   });
// };

// // 📧 Solicitor Request Approved
// const sendSolicitorRequestApprovedEmail = async (student) => {
//   const html = generateEmailTemplate(
//     'Solicitor Request Approved',
//     '#28a745',
//     `<p>Hi ${student.firstName},</p>
//      <p>🎉 Your request for solicitor assistance has been <strong>approved</strong>.</p>
//      <p>A solicitor will be assigned to you shortly.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Request Approved',
//     html
//   });
// };

// // 📧 Solicitor Assigned
// const sendSolicitorAssignedEmail = async (student, solicitor) => {
//   const html = generateEmailTemplate(
//     'Solicitor Assigned',
//     '#28a745',
//     `<p>Hi ${student.firstName},</p>
//      <p>Your solicitor request has been <strong>approved</strong>.</p>
//      <p>Your assigned solicitor is <strong>${solicitor.firstName} ${solicitor.lastName}</strong>.</p>
//      <p>Contact: ${solicitor.email}</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Assigned to Your Request',
//     html
//   });
// };

// // 📧 Receipt Uploaded to University
// const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
//   const html = generateEmailTemplate(
//     'New Payment Receipt Uploaded',
//     '#007bff',
//     `<p>Hi ${university.name},</p>
//      <p>A new receipt was uploaded by <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong>.</p>
//      <p>Please review it via your dashboard.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: university.email,
//     subject: 'New Payment Receipt Uploaded',
//     html
//   });
// };

// // 📧 Receipt Accepted (Student)
// const sendReceiptAcceptedEmail = async (student, application) => {
//   const html = generateEmailTemplate(
//     '🎉 Payment Receipt Accepted',
//     '#28a745',
//     `<p>Hi ${student.firstName},</p>
//      <p>Your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> has been <strong>accepted</strong>.</p>
//      <p>Thank you!</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '🎉 Payment Receipt Accepted',
//     html
//   });
// };

// // 📧 Receipt Rejected (Student)
// const sendReceiptRejectedEmail = async (student, application, remark) => {
//   const html = generateEmailTemplate(
//     '⚠️ Payment Receipt Rejected',
//     '#d9534f',
//     `<p>Hi ${student.firstName},</p>
//      <p>Your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> has been <strong>rejected</strong>.</p>
//      <div style="background-color:#f8d7da;padding:15px;border-radius:5px;border:1px solid #f5c6cb;margin:20px 0;">
//        <strong>Reason:</strong>
//        <p style="margin:10px 0 0;color:#721c24;">${remark}</p>
//      </div>
//      <p>Please upload a corrected receipt.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '⚠️ Payment Receipt Rejected',
//     html
//   });
// };

// // 📧 Receipt Notifications (Agency)
// const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const html = generateEmailTemplate(
//     'New Payment Receipt Uploaded',
//     '#007bff',
//     `<p>Hi ${agency.name},</p>
//      <p><strong>${student.firstName} ${student.lastName}</strong> uploaded a receipt for <strong>${courseName}</strong> at <strong>${universityName}</strong>.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `🔔 New Payment Receipt by ${student.firstName} ${student.lastName}`,
//     html
//   });
// };

// const sendReceiptAcceptedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const html = generateEmailTemplate(
//     'Receipt Accepted',
//     '#28a745',
//     `<p>Hi ${agency.name},</p>
//      <p>The receipt from <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong> at <strong>${universityName}</strong> was <strong>accepted</strong>.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
//     html
//   });
// };

// const sendReceiptRejectedEmailToAgency = async (agency, student, universityName, courseName, remark) => {
//   const html = generateEmailTemplate(
//     'Receipt Rejected',
//     '#d9534f',
//     `<p>Hi ${agency.name},</p>
//      <p>The receipt from <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong> at <strong>${universityName}</strong> was <strong>rejected</strong>.</p>
//      <p><strong>Reason:</strong> ${remark}</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Rejected for ${student.firstName} ${student.lastName}`,
//     html
//   });
// };

// // ✅ Export all
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

