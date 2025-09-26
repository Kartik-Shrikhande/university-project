
const { ClientSecretCredential } = require("@azure/identity");
const fetch = require("isomorphic-fetch");
const crypto = require("crypto");
require("dotenv").config({ path: ".env" });
const fs = require("fs");
const path = require("path");

// If you actually use these models elsewhere, import them here as needed
// const student = require("../models/studentsModel");
// const mongoose = require("mongoose");

const logoPath = path.join(__dirname, "../images/logo.png");

// --- Azure AD App Credentials & Sender ---
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const senderEmail = process.env.EMAIL_USER; // the mailbox that will send via Graph

// Create credential once
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

// --- Shared helper: send mail through Microsoft Graph with inline logo ---
// --- Centralized email sender with quota & error handling ---
async function sendEmail({ to, subject, html }) {
  const recipientEmail =
    typeof to === "string" ? to : to?.email || String(to || "");
  if (!recipientEmail) {
    console.error("❌ Email sending failed: Missing recipient.");
    return { success: false, reason: "MISSING_RECIPIENT" };
  }

  try {
    const tokenResponse = await credential.getToken(
      "https://graph.microsoft.com/.default"
    );

    const logoContentBytes = fs.readFileSync(logoPath).toString("base64");

    const payload = {
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: recipientEmail } }],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: "logo.png",
            contentId: "unique-logo-cid",
            isInline: true,
            contentBytes: logoContentBytes,
          },
        ],
      },
      saveToSentItems: true,
    };

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
        senderEmail
      )}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResponse.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const reason =
        res.status === 429
          ? "QUOTA_EXCEEDED"
          : res.status === 403
          ? "FORBIDDEN_OR_QUOTA_EXCEEDED"
          : `GRAPH_ERROR_${res.status}`;

      console.error(`❌ Email send failed: ${reason}`, text);

      return { success: false, reason, details: text };
    }

    return { success: true };
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    return { success: false, reason: "NETWORK_OR_UNKNOWN", details: err.message };
  }
}

// --- Keep EXACT same HTML template & styling from your original file ---
const generateEmailTemplate = (
  title,
  color,
  contentHtml,
  actionButton = null,
  studentId = null,
  reminderHtml = null
) => `
  <div style="max-width:600px;margin:20px auto;padding:0;font-family:'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f9f9f9;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="
            background-color:#ffffff;
            border-radius:8px;
            overflow:hidden;
            border:1px solid #ddd;
            box-shadow:0 4px 12px rgba(0,0,0,0.12);
            -webkit-box-shadow:0 4px 12px rgba(0,0,0,0.12);
            ">
            <tr>
              <td style="padding: 20px 30px 0 30px; text-align:center;">
                <img src="cid:unique-logo-cid" alt="connect2uni logo" style="margin-bottom: 20px;" />
                <h1 style="margin:0 0 20px 0; color:#004AAC; font-size:24px; font-weight:600;">${title}</h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 30px 30px 30px; font-size:16px; color:#333; line-height:1.6;">
                ${contentHtml}

                ${
                  actionButton
                    ? `
                    <div style="margin:30px 0; text-align:center;">
                      <a href="${actionButton.link}" 
                        style="background-color:#004AAC; color:#ffffff; padding:10px 40px; border-radius:5px; text-decoration:none; font-weight:400; display:inline-block;">
                        ${actionButton.text}
                      </a>
                    </div>`
                    : ""
                }

                ${reminderHtml || ""}

                <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eeeeee; text-align:center;">
                  <p style="margin:0;">Happy exploring!</p>
                  <p style="margin:0;">— The Connect2Uni Team</p>

                  <p style="margin:0; font-size:14px; line-height:normal; margin-top:30px;">
                    If you didn’t request this email, you can safely ignore it.
                  </p>
                  <p style="margin:0; font-size:14px; margin-top:7px; text-align:center;">
                    © ${new Date().getFullYear()} Connect2Uni. All rights reserved.
                  </p>

                  ${
                    studentId
                      ? `
                    <p style="margin:5px 0; font-size:12px; text-align:center;">
                      <a href="${process.env.SERVER_URL}/student/unsubscribe/${studentId}" style="color:#004AAC; text-decoration:underline;">
                        Unsubscribe from reminders
                      </a>
                    </p>`
                      : ""
                  }
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

// ----------------------
//  Functions (unchanged logic, Graph-powered sending)
// ----------------------

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

  await sendEmail({
    to: student.email,
    subject: "Let's Get You Started",
    html,
  });
};

// 📧 Send Application Rejection Email
const sendRejectionEmail = async (email, reason) => {
  const html = generateEmailTemplate(
    "Application Status Update",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Applicant,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">After careful consideration, we regret to inform that your application is  <strong style="color:#d9534f;">not approved</strong>
at this time but you can consider applying to different universities – please login and
apply for a different university.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Feedback from our team:</h4>
       <p style="margin:0;color:#555555;">${reason}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">If you wish you contact us please email – admin@connect2uni.com.</p>`
  );

  await sendEmail({
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
     <p style="font-size:16px;color:#555555;line-height:1.6;">You now have full access to the student portal. If you have any questions about your payment, please contact our support team - admin@connect2uni.com</p>`,
    {
      text: "Access Student Portal",
      link: `${process.env.DASHBOARD_BASE_URL}`,
    }
  );

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
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
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your student <strong>${student.firstName} ${student.lastName}</strong> has uploaded a payment receipt for your reference.</p>
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

  await sendEmail({
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

  await sendEmail({
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

  await sendEmail({
    to: agency.email,
    subject: `Receipt Correction Needed for ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendPasswordResetByAdminEmail = async (user, newPassword) => {
  const html = generateEmailTemplate(
    "Password Reset by Admin",
    "#007bff", // color theme for info
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hello <strong>${user.firstName || "User"}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your password has been reset by an administrator.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Your New Password</h4>
       <p style="font-size:18px;color:#333333;"><strong>${newPassword}</strong></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in using this password and change it immediately for your account security.</p>`
  );

  await sendEmail({
    to: user.email,
    subject: "Your Password Has Been Reset",
    html,
  });
};



/**
 * 📩 Visa / Solicitor Request Accepted Email
 */
const sendRequestAcceptedEmail = async (student, application, actor = "Solicitor/Agency") => {
  const html = generateEmailTemplate(
    "Visa Request Accepted ✅",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">
       Your visa request has been <strong style="color:#28a745;">accepted</strong> by the ${actor}.
     </p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${application.university.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${application.course.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Accepted</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You’ll be updated with further steps soon.</p>`,
    // {
    //   text: "View Application",
    //   link: "https://yourwebsite.com/student-portal/application-status",
    // }
  );

  await sendEmail({
    to: student.email,
    subject: "Your Visa Request Has Been Accepted",
    html,
  });
};

/**
 * 📩 Visa / Solicitor Request Rejected Email
 */
const sendRequestRejectedEmail = async (student, application, reason, actor = "Solicitor/Agency") => {
  const html = generateEmailTemplate(
    "Visa Request Rejected ❌",
    "#dc3545",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">
       Unfortunately, your visa request was <strong style="color:#dc3545;">rejected</strong> by the ${actor}.
     </p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#dc3545;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${application.university.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${application.course.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#dc3545;">Rejected</span></p>
       <p style="margin:5px 0;color:#555555;"><strong>Reason:</strong> ${reason}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You may contact your agency for further guidance.</p>`,
    // {
    //   text: "View Application",
    //   link: "https://yourwebsite.com/student-portal/application-status",
    // }
  );

  await sendEmail({
    to: student.email,
    subject: "Your Visa Request Has Been Rejected",
    html,
  });
};


// 📧 Reset Password Email
const sendResetPasswordEmail = async (to, resetLink) => {
  const html = generateEmailTemplate(
    "Reset Your Password",
    "#004AAC",
    `
      <p style="font-size:16px;color:#333;">Hi there,</p>
      <p style="font-size:16px;color:#555;">
        We received a request to reset your Connect2Uni password. Click the button below to proceed:
      </p>
      <p style="font-size:14px;color:#888;margin-top:20px;">
        This link will expire in 5 minutes.
      </p>
    `,
    {
      text: "Reset My Password",
      link: resetLink,
    }
  );

  await sendEmail({
    to,
    subject: "Reset your Connect2Uni password",
    html,
  });
};



// 📧 Send MFA OTP Email
const sendLoginOtpEmail = async (email, otpCode) => {
  const html = generateEmailTemplate(
    "Your Login Verification Code",
    "#004AAC",
    `
      <p style="font-size:16px;color:#333;">Hi there,</p>
      <p style="font-size:16px;color:#555;">
        Use the following verification code to complete your login. This code is valid for 5 minutes.
      </p>
      <div style="text-align:center; margin:20px 0;">
        <div style="font-size:28px; font-weight:bold; letter-spacing:4px; color:#004AAC;">${otpCode}</div>
      </div>
      <p style="font-size:14px;color:#888;margin-top:20px;">If you didn't try to log in, you can safely ignore this email.</p>
    `
  );

  await sendEmail({
    to: email,
    subject: "Your One-Time Login Code",
    html,
  });
};


const sendVisaRequestCreatedEmail = async (student, application) => {
  const html = generateEmailTemplate(
    "Visa Request Submitted ✈️",
    "#007bff",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">
       Your <strong>visa request</strong> for your application has been successfully created. 
       Our team will review it and update you soon.
     </p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${application.university.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${application.course.name}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">
       We’ll notify you once your solicitor or agency processes this request.
     </p>`,
    // {
    //   text: "View Application Status",
    //   link: "https://yourwebsite.com/student-portal/application-status",
    // }
  );

  await sendEmail({
    to: student.email,
    subject: "Visa Request Created",
    html,
  });
};



// Optional: a generic helper compatible with your old name, now Graph-backed
const sendEmailWithLogo = async ({ to, subject, html }) => {
  await sendEmail({ to, subject, html });
};

// ✅ Export all (same names/shape as your original)
module.exports = {
  sendEmail,  
  generateEmailTemplate,
  sendEmailWithLogo,
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
  sendLoginOtpEmail,
  sendVisaRequestCreatedEmail,
   sendRequestAcceptedEmail,
  sendRequestRejectedEmail,
  sendResetPasswordEmail,
};




////////////////////////////////////////////////////////////////////////////////////////////////////
//gamil email service
// const nodemailer = require("nodemailer");
// const student = require("../models/studentsModel");
// const crypto = require("crypto");
// require("dotenv").config({ path: ".env" });
// const fs = require("fs");
// const path = require("path");
// const logoPath = path.join(__dirname, "../images/logo.png"); // Adjusted path to logo

// // const logoimage = fs.readFileSync(logoPath, 'utf8');
// const mongoose = require("mongoose");


// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });



// const generateEmailTemplate = (
//   title,
//   color,
//   contentHtml,
//   actionButton = null,
//   studentId = null,
//   reminderHtml = null
// ) => `
//   <div style="max-width:600px;margin:20px auto;padding:0;font-family:'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f9f9f9;">
//     <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
//       <tr>
//         <td align="center">
//           <table width="600" cellpadding="0" cellspacing="0" border="0" style="
//             background-color:#ffffff;
//             border-radius:8px;
//             overflow:hidden;
//             border:1px solid #ddd;
//             box-shadow:0 4px 12px rgba(0,0,0,0.12);
//             -webkit-box-shadow:0 4px 12px rgba(0,0,0,0.12);
//             ">
//             <tr>
//               <td style="padding: 20px 30px 0 30px; text-align:center;">
//                 <img src="cid:unique-logo-cid" alt="connect2uni logo" style="margin-bottom: 20px;" />
//                 <h1 style="margin:0 0 20px 0; color:#004AAC; font-size:24px; font-weight:600;">${title}</h1>
//               </td>
//             </tr>

//             <tr>
//               <td style="padding: 0 30px 30px 30px; font-size:16px; color:#333; line-height:1.6;">
//                 ${contentHtml}

//                 ${
//                   actionButton
//                     ? `
//                     <div style="margin:30px 0; text-align:center;">
//                       <a href="${actionButton.link}" 
//                         style="background-color:#004AAC; color:#ffffff; padding:10px 40px; border-radius:5px; text-decoration:none; font-weight:400; display:inline-block;">
//                         ${actionButton.text}
//                       </a>
//                     </div>`
//                     : ""
//                 }

//                 ${reminderHtml || ""}

//                 <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eeeeee; text-align:center;">
//                   <p style="margin:0;">Happy exploring!</p>
//                   <p style="margin:0;">— The Connect2Uni Team</p>

//                   <p style="margin:0; font-size:14px; line-height:normal; margin-top:30px;">
//                     If you didn’t request this email, you can safely ignore it.
//                   </p>
//                   <p style="margin:0; font-size:14px; margin-top:7px; text-align:center;">
//                     © ${new Date().getFullYear()} Connect2Uni. All rights reserved.
//                   </p>

//                   ${
//                     studentId
//                       ? `
//                     <p style="margin:5px 0; font-size:12px; text-align:center;">
//                       <a href="${process.env.SERVER_URL}/student/unsubscribe/${studentId}" style="color:#004AAC; text-decoration:underline;">
//                         Unsubscribe from reminders
//                       </a>
//                     </p>`
//                       : ""
//                   }
//                 </div>
//               </td>
//             </tr>
//           </table>
//         </td>
//       </tr>
//     </table>
//   </div>
// `;



// // 📧 Send Verification Email
// const sendVerificationEmail = async (student) => {
//   const token = crypto.randomBytes(32).toString("hex");
//   student.verificationToken = token;
//   await student.save();

//   const verificationLink = `${process.env.EMAIL_VERIFICATION_SERVER_LINK}/student/verify-email?token=${token}`;

//   const html = generateEmailTemplate(
//     "Verify Your Email",
//     "#004AAC",
//     `
//                 <div style="display: flex;">
//                     <span style="font-size:16px;font-weight: normal; margin-right: 5px;">Hi</span><span style="font-size:16px;font-weight: bold;">${student.firstName}</span>
//                 </div>

//                 <div>
//                     <p>
//                  Welcome to Connect2Uni — your journey starts here! To finish setting up your account, just click the button below to verify your email:
//                     </p>
//                 </div>

// `,

//     {
//       text: "Verify My Email",
//       link: verificationLink,
//     },

//     null,

//     ` <div style="margin-top: 20px;">
//                     <p style="font-weight: 300;">
//                         This link will expire in 24 hours, so don't wait too long. If you didn't sign up for Connect2Uni, feel free to ignore this email.
//                     </p>
//         </div>
// `
//   );


//   await transporter.sendMail({
//     from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Let's Get You Started",
//     html,
//     attachments: [
//       {
//         filename: "logo.png",
//         path: logoPath,
//         cid: "unique-logo-cid", // same as in HTML img src
//       },
//     ],
//   });
// };

// // 📧 Send Application Rejection Email
// const sendRejectionEmail = async (email, reason) => {
//   const html = generateEmailTemplate(
//     "Application Status Update",
//     "#d9534f",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Applicant,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">After careful consideration, we regret to inform that your application is  <strong style="color:#d9534f;">not approved</strong>
// at this time but you can consider applying to different universities – please login and
// apply for a different university.</p>
//      <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#d9534f;">Feedback from our team:</h4>
//        <p style="margin:0;color:#555555;">${reason}</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">If you wish you contact us please email – admin@connect2uni.com.</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Your Application Status Update",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Send Payment Success Email
// const sendPaymentSuccessEmail = async (student) => {
//   const html = generateEmailTemplate(
//     "Payment Confirmation",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${
//       student.firstName
//     }</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We've successfully processed your payment of <strong>20 GBP</strong>.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#28a745;">Payment Details</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>Amount:</strong> 20 GBP</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Completed</span></p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">You now have full access to the student portal. If you have any questions about your payment, please contact our support team - admin@connect2uni.com</p>`,
//     {
//       text: "Access Student Portal",
//       link:`${process.env.DASHBOARD_BASE_URL}` ,
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Payment Successful - Thank You!",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Solicitor Service Payment Email
// const sendSolicitorPaymentEmail = async (student) => {
//   const html = generateEmailTemplate(
//     "Solicitor Service Confirmation",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Thank you for purchasing our solicitor service package. Your payment has been processed successfully.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#28a745;">Next Steps</h4>
//        <p style="margin:5px 0;color:#555555;">1. Complete your solicitor service request form</p>
//        <p style="margin:5px 0;color:#555555;">2. Our team will review your requirements</p>
//        <p style="margin:5px 0;color:#555555;">3. A qualified solicitor will be assigned to your case</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">You can now apply for solicitor services through your student portal.</p>`,
//     {
//       text: "Request Solicitor Service",
//       link: "https://yourwebsite.com/solicitor-services",
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Solicitor Service Payment Confirmation",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Application Acceptance Email (with attachment link)

// const sendAcceptanceEmail = async (email, courseName, universityName) => {
//   const html = generateEmailTemplate(
//     "Congratulations! 🎉",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Student,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We are thrilled to inform you that your application for <strong>${courseName}</strong> at <strong>${universityName}</strong> has been <strong style="color:#28a745;">accepted</strong>!</p>
//      <div style="background-color:#e8f5e9;border-radius:4px;padding:15px;margin:20px 0;text-align:center;">
//        <p style="margin:0;font-size:18px;color:#28a745;">Welcome to Connect2Uni!</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">This is an exciting step in your academic journey, and we look forward to supporting you every step of the way.</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Your official acceptance letter will soon be sent to you by agency.</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Application Accepted - Congratulations!",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Notify Agency of Application Status
// const sendAgencyNotificationEmail = async (
//   email,
//   studentName,
//   studentId,
//   status,
//   courseName,
//   universityName,
//   uploadedFileUrl = null
// ) => {
//   const color = status === "Rejected" ? "#d9534f" : "#28a745";
//   const statusText = status === "Rejected" ? "not approved" : "approved";

//   const fileLinkHtml = uploadedFileUrl
//     ? `<p style="margin:5px 0;color:#555555;"><strong>Document:</strong> <a href="${uploadedFileUrl}" target="_blank" style="color:#007bff;">View Document</a></p>`
//     : "";

//   const html = generateEmailTemplate(
//     `Student Application ${status}`,
//     color,
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Partner,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We would like to inform you about an update regarding one of your referred students.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:${color};">Application Status Update</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>Student Name:</strong> ${studentName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Student ID:</strong> ${studentId}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:${color};">${statusText}</span></p>
//        ${fileLinkHtml}
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in to your partner dashboard for more details about this application.</p>`,
//     {
//       text: "View in Dashboard",
//       link: "https://yourwebsite.com/agency-portal",
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: `Student Application Update: ${studentName}`,
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// const sendOfferLetterEmailByAgency = async (
//   email,
//   studentName,
//   courseName,
//   universityName,
//   fileUrl
// ) => {
//   const html = generateEmailTemplate(
//     "Your Official Acceptance Letter",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;">Hi <strong>${studentName}</strong>,</p>
//      <p style="font-size:16px;color:#555555;">We are delighted to officially welcome you to <strong>${universityName}</strong> for the <strong>${courseName}</strong> program!</p>
//      ${
//        fileUrl
//          ? `<p style="font-size:16px;color:#555555;">You can download your acceptance letter from the link below:</p>
//            <div style="text-align:center;margin:20px 0;">
//              <a href="${fileUrl}" style="background-color:#28a745;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">Download Acceptance Letter</a>
//            </div>`
//          : `<p style="font-size:16px;color:#555555;">Your acceptance documents will be sent to you shortly.</p>`
//      }
//      <p style="font-size:16px;color:#555555;">Congratulations once again on this achievement!</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: `Official Acceptance Letter from ${universityName}`,
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Solicitor Request Approved
// const sendSolicitorRequestApprovedEmail = async (student) => {
//   const html = generateEmailTemplate(
//     "Solicitor Request Approved",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that your request for solicitor assistance has been <strong style="color:#28a745;">approved</strong>!</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#28a745;">What Happens Next?</h4>
//        <p style="margin:5px 0;color:#555555;">• Our team is reviewing your case details</p>
//        <p style="margin:5px 0;color:#555555;">• We're matching you with the most suitable solicitor</p>
//        <p style="margin:5px 0;color:#555555;">• You'll receive another email with your solicitor's contact information</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">This process typically takes 1-2 business days. Thank you for your patience.</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Solicitor Request Approved",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Solicitor Assigned
// const sendSolicitorAssignedEmail = async (student, solicitor) => {
//   const html = generateEmailTemplate(
//     "Your Solicitor is Ready",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We're excited to connect you with your assigned solicitor who will guide you through the next steps of your application.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#28a745;">Your Solicitor</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>Name:</strong> ${solicitor.firstName} ${solicitor.lastName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Email:</strong> ${solicitor.email}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Specialization:</strong> Student Visa Applications</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Your solicitor will reach out to you within 24 hours to schedule your first consultation. In the meantime, feel free to contact them directly with any urgent questions.</p>`,
//     {
//       text: "Contact Your Solicitor",
//       link: `mailto:${solicitor.email}`,
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Solicitor Assigned to Your Request",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Receipt Uploaded to University
// const sendReceiptUploadedEmailToUniversity = async (
//   university,
//   student,
//   courseName
// ) => {
//   const html = generateEmailTemplate(
//     "New Payment Receipt Uploaded",
//     "#007bff",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear ${
//       university.name
//     } Admissions Team,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">A student has uploaded a payment receipt that requires your review.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#007bff;">Receipt Details</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>Student Name:</strong> ${
//          student.firstName
//        } ${student.lastName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in to your university portal to review this receipt and update the application status accordingly.</p>`,
//     {
//       text: "Review in Portal",
//       link: "https://yourwebsite.com/university-portal",
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
//     to: university.email,
//     subject: "New Payment Receipt Uploaded for Review",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Receipt Accepted (Student)
// const sendReceiptAcceptedEmail = async (student, application) => {
//   const html = generateEmailTemplate(
//     "Payment Verified ✅",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that your payment receipt has been <strong style="color:#28a745;">verified and accepted</strong>.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${application.university.name}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${application.course.name}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Payment Verified</span></p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Your application is now one step closer to completion. We'll notify you of any further updates.</p>`,
//     {
//       text: "View Application Status",
//       link: "https://yourwebsite.com/student-portal/application-status",
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Payment Receipt Accepted",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Receipt Rejected (Student)
// const sendReceiptRejectedEmail = async (student, application, remark) => {
//   const html = generateEmailTemplate(
//     "Receipt Requires Attention",
//     "#d9534f",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We've reviewed your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> and found some issues that need to be addressed.</p>
//      <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#d9534f;">Reason for Rejection</h4>
//        <p style="margin:0;color:#555555;">${remark}</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Please upload a corrected receipt through your student portal as soon as possible to avoid delays in processing your application.</p>`,
//     {
//       text: "Upload Corrected Receipt",
//       link: "https://yourwebsite.com/student-portal/upload-receipt",
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
//     to: student.email,
//     subject: "Payment Receipt Requires Correction",
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// // 📧 Receipt Notifications (Agency)
// const sendReceiptUploadedEmailToAgency = async (
//   agency,
//   student,
//   universityName,
//   courseName
// ) => {
//   const html = generateEmailTemplate(
//     "Student Uploaded Payment Receipt",
//     "#007bff",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${
//       agency.name
//     },</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Your student <strong>${
//        student.firstName
//      } ${
//       student.lastName
//     }</strong> has uploaded a payment receipt for your reference.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">You can view this receipt and track the application status through your agency portal.</p>`,
//     {
//       text: "View in Agency Portal",
//       link: "https://yourwebsite.com/agency-portal",
//     }
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
//     to: agency.email,
//     subject: `New Payment Receipt from ${student.firstName} ${student.lastName}`,
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// const sendReceiptAcceptedEmailToAgency = async (
//   agency,
//   student,
//   universityName,
//   courseName
// ) => {
//   const html = generateEmailTemplate(
//     "Student Receipt Accepted",
//     "#28a745",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that the payment receipt from your student <strong>${student.firstName} ${student.lastName}</strong> has been <strong style="color:#28a745;">accepted</strong>.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Payment Verified</span></p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">This brings the application one step closer to completion. We'll notify you of any further updates.</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
//     to: agency.email,
//     subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// const sendReceiptRejectedEmailToAgency = async (
//   agency,
//   student,
//   universityName,
//   courseName,
//   remark
// ) => {
//   const html = generateEmailTemplate(
//     "Student Receipt Requires Correction",
//     "#d9534f",
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">The payment receipt from your student <strong>${student.firstName} ${student.lastName}</strong> requires correction.</p>
//      <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#d9534f;">Reason for Rejection</h4>
//        <p style="margin:0;color:#555555;">${remark}</p>
//      </div>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
//        <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
//        <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Please advise your student to upload a corrected receipt through their student portal to avoid delays in processing their application.</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
//     to: agency.email,
//     subject: `Receipt Correction Needed for ${student.firstName} ${student.lastName}`,
//     html,
//      attachments: [
//     {
//       filename: "logo.png",
//       path: logoPath,
//       cid: "unique-logo-cid",
//     },
//   ],
//   });
// };

// const sendPasswordResetByAdminEmail = async (user, newPassword) => {
//   const html = generateEmailTemplate(
//     "Password Reset by Admin",
//     "#007bff", // color theme for info
//     `<p style="font-size:16px;color:#333333;line-height:1.6;">Hello <strong>${user.firstName || "User"}</strong>,</p>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Your password has been reset by an administrator.</p>
//      <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
//        <h4 style="margin:0 0 10px 0;color:#007bff;">Your New Password</h4>
//        <p style="font-size:18px;color:#333333;"><strong>${newPassword}</strong></p>
//      </div>
//      <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in using this password and change it immediately for your account security.</p>`
//   );

//   await transporter.sendMail({
//     from: `"Connect2Uni Admin Team" <${process.env.EMAIL_USER}>`,
//     to: user.email,
//     subject: "Your Password Has Been Reset",
//     html,
//     attachments: [
//       {
//         filename: "logo.png",
//         path: logoPath,
//         cid: "unique-logo-cid",
//       },
//     ],
//   });
// };


// const sendEmailWithLogo = async (mailOptions) => {
//   mailOptions.attachments = [
//     {
//       filename: 'logo.png',
//       path: logoPath,
//       cid: 'unique-logo-cid'
//     }
//   ];

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Export all
// module.exports = {
//   generateEmailTemplate, 
//   sendEmailWithLogo,
//   sendVerificationEmail,
//   sendRejectionEmail,
//   sendPaymentSuccessEmail,
//   sendSolicitorPaymentEmail,
//   sendAcceptanceEmail,
//   sendAgencyNotificationEmail,
//   sendOfferLetterEmailByAgency,
//   sendSolicitorRequestApprovedEmail,
//   sendSolicitorAssignedEmail,
//   sendReceiptUploadedEmailToUniversity,
//   sendReceiptAcceptedEmail,
//   sendReceiptRejectedEmail,
//   sendReceiptUploadedEmailToAgency,
//   sendReceiptAcceptedEmailToAgency,
//   sendReceiptRejectedEmailToAgency,
//   sendPasswordResetByAdminEmail,
// };
