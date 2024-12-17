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
        loginCompleted: true,
        lastActivity: { $lt: now - inactivityLimit },
      });

      for (const student of notPaidStudents) {
        const message = `Hi ${student.name},\n\nWe noticed you haven't purchased a subscription yet. Subscribe to us and check out our universities and courses to unlock amazing learning opportunities!\n\nExplore now.\n\nTeam lexodd hypernova`;
        await sendReminderEmail(student, message);
      }

      // Users who purchased a course but haven’t returned (not enrolled in any university)
      const paidInactiveStudents = await Students.find({
        isPaid: true,
        lastActivity: { $lt: now - inactivityLimit },
        enrolledUniversities: { $size: 0 }, // Not enrolled in any universities
      });

      for (const student of paidInactiveStudents) {
        const message = `Hi ${student.name},\n\nWe noticed you've taken the first step by purchasing a course! Have you explored our partner universities and their amazing opportunities?\n\nDiscover more and enhance your learning journey.\n\nTeam lexodd hypernova`;
        await sendReminderEmail(student, message);
      }

      // Users who visited a university (only university-specific message)
      const studentsWithUniversities = await Students.find({
        enrolledUniversities: { $exists: true, $not: { $size: 0 } },
        lastActivity: { $lt: now - inactivityLimit },
      }).populate('enrolledUniversities', 'name');

      for (const student of studentsWithUniversities) {
        const lastUniversity =
          student.enrolledUniversities[student.enrolledUniversities.length - 1];

        if (lastUniversity) {
          const message = `Hi ${student.name},\n\nWe noticed you visited ${lastUniversity.name} recently. Check out the exciting courses offered by ${lastUniversity.name} and take the next step in your learning journey!\n\nExplore now.\n\nTeam lexodd hypernova`;
          await sendReminderEmail(student, message);
        }
      }

      if (
        notLoggedInStudents.length === 0 &&
        notPaidStudents.length === 0 &&
        paidInactiveStudents.length === 0 &&
        studentsWithUniversities.length === 0
      ) {
        console.log('No inactive or active users found for any condition.');
      }
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  });

  console.log('Cron job is running');
};

module.exports = startCronJob;
