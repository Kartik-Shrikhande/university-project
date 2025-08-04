const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const logoPath = path.join(__dirname, '../images/logo.png'); // Adjust path as needed

// Reuse your styled HTML generator
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
            box-shadow:0 4px 12px rgba(0,0,0,0.12);">
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
                    ? `<div style="margin:30px 0; text-align:center;">
                        <a href="${actionButton.link}" 
                          style="background-color:#004AAC; color:#ffffff; padding:10px 40px; border-radius:5px; text-decoration:none; font-weight:400; display:inline-block;">
                          ${actionButton.text}
                        </a>
                      </div>`
                    : ''
                }
                ${reminderHtml || ''}
                <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eeeeee; text-align:center;">
                  <p style="margin:0;">Happy exploring!</p>
                  <p style="margin:0;">— The Connect2Uni Team</p>
                  <p style="margin:0; font-size:14px; margin-top:30px;">If you didn’t request this email, you can safely ignore it.</p>
                  <p style="margin:0; font-size:14px; margin-top:7px;">© ${new Date().getFullYear()} Connect2Uni. All rights reserved.</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

// 📧 Reset Password Email
exports.sendResetPasswordEmail = async (to, resetLink) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const html = generateEmailTemplate(
    'Reset Your Password',
    '#004AAC',
    `
      <p style="font-size:16px;color:#333;">Hi there,</p>
      <p style="font-size:16px;color:#555;">
        We received a request to reset your Connect2Uni password. Click the button below to proceed:
      </p>
      <p style="font-size:14px;color:#888;margin-top:20px;">This link will expire in 5 minutes.</p>
    `,
    {
      text: 'Reset My Password',
      link: resetLink
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your Connect2Uni password',
    html,
    attachments: [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: 'unique-logo-cid' // Used in img src
      }
    ]
  });
};
