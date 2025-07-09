const nodemailer = require("nodemailer");
const student = require("../models/studentsModel");
const crypto = require("crypto");
require("dotenv").config({ path: ".env" });
const fs = require("fs");
const path = require("path");
const logoPath = path.join(__dirname, "../images/logo.png"); // Adjusted path to logo

// const logoimage = fs.readFileSync(logoPath, 'utf8');
const mongoose = require("mongoose");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateEmailTemplate = (
  title,
  color,
  contentHtml,
  actionButton = null,
  studentId = null,
  reminderHtml = null
) => `
  <div style="max-width:600px;margin:20px auto;padding:0;font-family:'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f9f9f9;">
    <div style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <!-- Header with Logo -->
      <div style="text-align:center;padding-top:20px;">
        <img src="cid:unique-logo-cid" alt="connect2uni logo">
        <h1 style="margin-top:25px;color:#004AAC;font-size:24px;font-weight:600;">${title}</h1>
      </div>
      
      <div style="padding:30px;">


        ${contentHtml}
        
        ${
          actionButton
            ? `
          <div style="margin:30px 0;text-align:center;">
            <a href="${actionButton.link}" 
               style="background-color:${color};color:#ffffff;padding:10px 40px;border-radius:5px;text-decoration:none;font-weight:400;display:inline-block;">
              ${actionButton.text}
            </a>
          </div>`
            : ""
        }
        ${reminderHtml || ""}

        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;">
       

          
<p style="margin: 0;">Happy exploring!</p>
                    <p style="margin: 0;">— The Connect2Uni Team</p>

                    <p style="margin: 0;font-size:14px;line-height: normal;margin-top: 30px;">
                        If you didn’t request this email, you can safely ignore it.
                    </p>
                    <p style="margin: 0;font-size: 14px;margin-top: 7px;">
                        © ${new Date().getFullYear()} Connect2Uni. All rights reserved
                    </p>


          ${
            studentId
              ? `
            <p style="margin:5px 0;font-size:12px;text-align:center;">
              <a href="${process.env.SERVER_URL}/student/unsubscribe/${studentId}" style="color:#004AAC;text-decoration:underline;">
                Unsubscribe from reminders
              </a>
            </p>`
              : ""
          }
        </div>
      </div>
    </div>
  </div>
`;

// 📧 Send Verification Email
const sendVerificationEmail = async (student) => {
  const token = crypto.randomBytes(32).toString("hex");
  student.verificationToken = token;
  await student.save();

  const verificationLink = `${process.env.EMAIL_VERIFICATION_SERVER_LINK}/student/verify-email?token=${token}`;

  const html = generateEmailTemplate(
    "Verify Your Email",
    "#004AAC",
    `
                <div style="display: flex;">
                    <span style="font-size:16px;font-weight: normal; margin-right: 5px;">Hi</span><span style="font-size:16px;font-weight: bold;">${student.firstName}</span>
                </div>

                <div>
                    <p>
                 Welcome to Connect2Uni — your journey starts here! To finish setting up your account, just click the button below to verify your email:
                    </p>
                </div>

`,
    //  <div>
    //     <p style="font-weight: 300;">
    //         This link will expire in 24 hours, so don’t wait too long. If you didn’t sign up for Connect2Uni, feel free to ignore this email.
    //     </p>
    // </div>

    // <p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
    //  <p style="font-size:16px;color:#555555;line-height:1.6;">Welcome to Connect2Uni! We're excited to have you on board. To complete your registration, please verify your email address by clicking the button below:</p>
    //  <p style="font-size:14px;color:#888888;text-align:center;margin:20px 0;">This link will expire in 24 hours</p>
    //

    {
      text: "Verify My Email",
      link: verificationLink,
    },

    null,

    ` <div style="margin-top: 20px;">
                    <p style="font-weight: 300;">
                        This link will expire in 24 hours, so don't wait too long. If you didn't sign up for Connect2Uni, feel free to ignore this email.
                    </p>
        </div>
`
  );

  //   await transporter.sendMail({
  //     from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
  //     to: student.email,
  //     subject: "Let's Get You Started",
  //     html,

  //   });
  // };

  await transporter.sendMail({
    from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Let's Get You Started",
    html,
    attachments: [
      {
        filename: "logo.png",
        path: logoPath,
        cid: "unique-logo-cid", // same as in HTML img src
      },
    ],
  });
};

// 📧 Send Application Rejection Email
const sendRejectionEmail = async (email, reason) => {
  const html = generateEmailTemplate(
    "Application Status Update",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Applicant,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">After careful consideration, we regret to inform you that your application has been <strong style="color:#d9534f;">not approved</strong> at this time.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Feedback from our team:</h4>
       <p style="margin:0;color:#555555;">${reason}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We appreciate the time and effort you put into your application and encourage you to apply again in the future.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Application Status Update",
    html,
  });
};

// 📧 Send Payment Success Email
const sendPaymentSuccessEmail = async (student) => {
  const html = generateEmailTemplate(
    "Payment Confirmation",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${
      student.firstName
    }</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We've successfully processed your payment of <strong>20 GBP</strong>.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Payment Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Amount:</strong> 20 GBP</p>
       <p style="margin:5px 0;color:#555555;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Completed</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You now have full access to the student portal. If you have any questions about your payment, please contact our support team.</p>`,
    {
      text: "Access Student Portal",
      link: "https://yourwebsite.com/student-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Payment Successful - Thank You!",
    html,
  });
};

// 📧 Solicitor Service Payment Email
const sendSolicitorPaymentEmail = async (student) => {
  const html = generateEmailTemplate(
    "Solicitor Service Confirmation",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Thank you for purchasing our solicitor service package. Your payment has been processed successfully.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Next Steps</h4>
       <p style="margin:5px 0;color:#555555;">1. Complete your solicitor service request form</p>
       <p style="margin:5px 0;color:#555555;">2. Our team will review your requirements</p>
       <p style="margin:5px 0;color:#555555;">3. A qualified solicitor will be assigned to your case</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You can now apply for solicitor services through your student portal.</p>`,
    {
      text: "Request Solicitor Service",
      link: "https://yourwebsite.com/solicitor-services",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Solicitor Service Payment Confirmation",
    html,
  });
};

// 📧 Application Acceptance Email (with attachment link)

const sendAcceptanceEmail = async (email, courseName, universityName) => {
  const html = generateEmailTemplate(
    "Congratulations! 🎉",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Student,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We are thrilled to inform you that your application for <strong>${courseName}</strong> at <strong>${universityName}</strong> has been <strong style="color:#28a745;">accepted</strong>!</p>
     <div style="background-color:#e8f5e9;border-radius:4px;padding:15px;margin:20px 0;text-align:center;">
       <p style="margin:0;font-size:18px;color:#28a745;">Welcome to Connect2Uni!</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">This is an exciting step in your academic journey, and we look forward to supporting you every step of the way.</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your official acceptance letter will soon be sent to you by agency.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Application Accepted - Congratulations!",
    html,
  });
};

// 📧 Notify Agency of Application Status
const sendAgencyNotificationEmail = async (
  email,
  studentName,
  studentId,
  status,
  courseName,
  universityName,
  uploadedFileUrl = null
) => {
  const color = status === "Rejected" ? "#d9534f" : "#28a745";
  const statusText = status === "Rejected" ? "not approved" : "approved";

  const fileLinkHtml = uploadedFileUrl
    ? `<p style="margin:5px 0;color:#555555;"><strong>Document:</strong> <a href="${uploadedFileUrl}" target="_blank" style="color:#007bff;">View Document</a></p>`
    : "";

  const html = generateEmailTemplate(
    `Student Application ${status}`,
    color,
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Partner,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We would like to inform you about an update regarding one of your referred students.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:${color};">Application Status Update</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Student Name:</strong> ${studentName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Student ID:</strong> ${studentId}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:${color};">${statusText}</span></p>
       ${fileLinkHtml}
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in to your partner dashboard for more details about this application.</p>`,
    {
      text: "View in Dashboard",
      link: "https://yourwebsite.com/agency-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Student Application Update: ${studentName}`,
    html,
  });
};

const sendOfferLetterEmailByAgency = async (
  email,
  studentName,
  courseName,
  universityName,
  fileUrl
) => {
  const html = generateEmailTemplate(
    "Your Official Acceptance Letter",
    "#28a745",
    `<p style="font-size:16px;color:#333333;">Hi <strong>${studentName}</strong>,</p>
     <p style="font-size:16px;color:#555555;">We are delighted to officially welcome you to <strong>${universityName}</strong> for the <strong>${courseName}</strong> program!</p>
     ${
       fileUrl
         ? `<p style="font-size:16px;color:#555555;">You can download your acceptance letter from the link below:</p>
           <div style="text-align:center;margin:20px 0;">
             <a href="${fileUrl}" style="background-color:#28a745;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">Download Acceptance Letter</a>
           </div>`
         : `<p style="font-size:16px;color:#555555;">Your acceptance documents will be sent to you shortly.</p>`
     }
     <p style="font-size:16px;color:#555555;">Congratulations once again on this achievement!</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Official Acceptance Letter from ${universityName}`,
    html,
  });
};

// 📧 Solicitor Request Approved
const sendSolicitorRequestApprovedEmail = async (student) => {
  const html = generateEmailTemplate(
    "Solicitor Request Approved",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that your request for solicitor assistance has been <strong style="color:#28a745;">approved</strong>!</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">What Happens Next?</h4>
       <p style="margin:5px 0;color:#555555;">• Our team is reviewing your case details</p>
       <p style="margin:5px 0;color:#555555;">• We're matching you with the most suitable solicitor</p>
       <p style="margin:5px 0;color:#555555;">• You'll receive another email with your solicitor's contact information</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">This process typically takes 1-2 business days. Thank you for your patience.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Solicitor Request Approved",
    html,
  });
};

// 📧 Solicitor Assigned
const sendSolicitorAssignedEmail = async (student, solicitor) => {
  const html = generateEmailTemplate(
    "Your Solicitor is Ready",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're excited to connect you with your assigned solicitor who will guide you through the next steps of your application.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Your Solicitor</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Name:</strong> ${solicitor.firstName} ${solicitor.lastName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Email:</strong> ${solicitor.email}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Specialization:</strong> Student Visa Applications</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your solicitor will reach out to you within 24 hours to schedule your first consultation. In the meantime, feel free to contact them directly with any urgent questions.</p>`,
    {
      text: "Contact Your Solicitor",
      link: `mailto:${solicitor.email}`,
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Solicitor Assigned to Your Request",
    html,
  });
};

// 📧 Receipt Uploaded to University
const sendReceiptUploadedEmailToUniversity = async (
  university,
  student,
  courseName
) => {
  const html = generateEmailTemplate(
    "New Payment Receipt Uploaded",
    "#007bff",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear ${
      university.name
    } Admissions Team,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">A student has uploaded a payment receipt that requires your review.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Receipt Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Student Name:</strong> ${
         student.firstName
       } ${student.lastName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in to your university portal to review this receipt and update the application status accordingly.</p>`,
    {
      text: "Review in Portal",
      link: "https://yourwebsite.com/university-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
    to: university.email,
    subject: "New Payment Receipt Uploaded for Review",
    html,
  });
};

// 📧 Receipt Accepted (Student)
const sendReceiptAcceptedEmail = async (student, application) => {
  const html = generateEmailTemplate(
    "Payment Verified ✅",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that your payment receipt has been <strong style="color:#28a745;">verified and accepted</strong>.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${application.university.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${application.course.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Payment Verified</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your application is now one step closer to completion. We'll notify you of any further updates.</p>`,
    {
      text: "View Application Status",
      link: "https://yourwebsite.com/student-portal/application-status",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Payment Receipt Accepted",
    html,
  });
};

// 📧 Receipt Rejected (Student)
const sendReceiptRejectedEmail = async (student, application, remark) => {
  const html = generateEmailTemplate(
    "Receipt Requires Attention",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We've reviewed your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> and found some issues that need to be addressed.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Reason for Rejection</h4>
       <p style="margin:0;color:#555555;">${remark}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please upload a corrected receipt through your student portal as soon as possible to avoid delays in processing your application.</p>`,
    {
      text: "Upload Corrected Receipt",
      link: "https://yourwebsite.com/student-portal/upload-receipt",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Payment Receipt Requires Correction",
    html,
  });
};

// 📧 Receipt Notifications (Agency)
const sendReceiptUploadedEmailToAgency = async (
  agency,
  student,
  universityName,
  courseName
) => {
  const html = generateEmailTemplate(
    "Student Uploaded Payment Receipt",
    "#007bff",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${
      agency.name
    },</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your student <strong>${
       student.firstName
     } ${
      student.lastName
    }</strong> has uploaded a payment receipt for your reference.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You can view this receipt and track the application status through your agency portal.</p>`,
    {
      text: "View in Agency Portal",
      link: "https://yourwebsite.com/agency-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `New Payment Receipt from ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendReceiptAcceptedEmailToAgency = async (
  agency,
  student,
  universityName,
  courseName
) => {
  const html = generateEmailTemplate(
    "Student Receipt Accepted",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that the payment receipt from your student <strong>${student.firstName} ${student.lastName}</strong> has been <strong style="color:#28a745;">accepted</strong>.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Payment Verified</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">This brings the application one step closer to completion. We'll notify you of any further updates.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendReceiptRejectedEmailToAgency = async (
  agency,
  student,
  universityName,
  courseName,
  remark
) => {
  const html = generateEmailTemplate(
    "Student Receipt Requires Correction",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">The payment receipt from your student <strong>${student.firstName} ${student.lastName}</strong> requires correction.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Reason for Rejection</h4>
       <p style="margin:0;color:#555555;">${remark}</p>
     </div>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please advise your student to upload a corrected receipt through their student portal to avoid delays in processing their application.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `Receipt Correction Needed for ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendPasswordResetByAdminEmail = async (user, newPassword) => {
  const html = `
    <h2 style="font-family:sans-serif;color:#333;">Hello ${
      user.firstName || "User"
    },</h2>
    <p style="font-size:16px;color:#555;">Your password has been reset by the admin.</p>
    <p style="font-size:16px;color:#333;">Here is your new password:</p>
    <p style="font-size:18px;color:#007bff;"><strong>${newPassword}</strong></p>
    <p>Please log in and change your password immediately after.</p>
    <br>
    <p style="font-size:14px;color:#777;">Regards,<br>Connect2Uni Admin Team</p>
  `;

  await transporter.sendMail({
    from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your password has been reset",
    html,
  });
};

// ✅ Export all
module.exports = {
  generateEmailTemplate,
  // COMPANY_LOGO,
  sendVerificationEmail,
  sendRejectionEmail,
  sendPaymentSuccessEmail,
  sendSolicitorPaymentEmail,
  sendAcceptanceEmail,
  sendAgencyNotificationEmail,
  sendOfferLetterEmailByAgency,
  sendSolicitorRequestApprovedEmail,
  sendSolicitorAssignedEmail,
  sendReceiptUploadedEmailToUniversity,
  sendReceiptAcceptedEmail,
  sendReceiptRejectedEmail,
  sendReceiptUploadedEmailToAgency,
  sendReceiptAcceptedEmailToAgency,
  sendReceiptRejectedEmailToAgency,
  sendPasswordResetByAdminEmail,
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
