// const nodemailer = require('nodemailer');

// const sendEmail = async (to, subject, text) => {
//   const transporter = nodemailer.createTransport({
//     service: 'Gmail',
//     auth: {
//       user: process.env.EMAIL_USER, // Add your email in .env
//       pass: process.env.EMAIL_PASS, // Add your email password in .env
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to,
//     subject,
//     text,
//   };

//   await transporter.sendMail(mailOptions);
// };

// module.exports = { sendEmail };

const nodemailer = require('nodemailer');

exports.sendResetPasswordEmail = async (to, resetLink) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // or any SMTP service you use
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Reset your Connect2Uni password',
    html: `
      <h3>Reset Password Request</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link will expire in 5 minutes.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

