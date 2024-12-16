const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Students = require('../models/StudentsModel'); 

require('dotenv').config();

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// Function to send a reminder email
const sendReminderEmail = async (student, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'We Miss You!',
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${student.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${student.email}:`, error);
  }
};

// Function to check inactivity and send appropriate emails
const startCronJob = () => {
  // Cron Job: Check for inactive users every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = Date.now();
      const inactivityLimit = 1 * 60 * 1000; // 1 minute for testing

      // Users who registered but have not logged in
      const notLoggedInStudents = await Students.find({
        loginCompleted: false,
        lastActivity: { $lt: now - inactivityLimit },
      });

      for (const student of notLoggedInStudents) {
        const message = `Hi ${student.name},\n\nWe noticed you haven't logged into your account yet. Don't miss out on the exciting opportunities waiting for you!\n\nLog in now and explore.\n\nTeam lexodd hypernova`;
        await sendReminderEmail(student, message);
      }

      // Users who have not purchased a paid course
      const notPaidStudents = await Students.find({
        isPaid: false,
        loginCompleted: true, // Ensure they logged in but haven't purchased
        lastActivity: { $lt: now - inactivityLimit },
      });

      for (const student of notPaidStudents) {
        const message = `Hi ${student.name},\n\nWe noticed you haven't purchased subscription yet.subscribe to us and Check out our universities and courses to unlock amazing learning opportunities!\n\nExplore now.\n\nTeam lexodd hypernova`;
        await sendReminderEmail(student, message);
      }

      // Users who purchased a course but haven’t returned
      const paidInactiveStudents = await Students.find({
        isPaid: true,
        lastActivity: { $lt: now - inactivityLimit },
      });

      //common triggered message after inactivity(eg 2days) of the user to bring him back on website 
      for (const student of paidInactiveStudents) {
        const message = `Hi ${student.name},\n\nWe noticed you haven't been active recently. Revisit our platform to explore more universities and courses that match your interests!\n\nWe are here to support you.\n\nTeam lexodd hypernova`;
        await sendReminderEmail(student, message);
      }

      if (
        notLoggedInStudents.length === 0 &&
        notPaidStudents.length === 0 &&
        paidInactiveStudents.length === 0
      ) {
        console.log('No inactive users found for any condition.');
      }
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  });

  console.log('Cron job is running');
};

module.exports = startCronJob;

