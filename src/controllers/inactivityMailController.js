
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Students = require('../models/studentsModel');
require('dotenv').config();
const { generateEmailTemplate, COMPANY_LOGO } = require('../services/emailService');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send a styled HTML reminder email with unsubscribe link
const sendReminderEmail = async (student, title, message, color, button = null) => {
  const html = generateEmailTemplate(
    title,
    color,
    `
    <p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
    <p style="font-size:16px;color:#555555;line-height:1.6;">${message}</p>
  `,
    button,
    student._id // passing studentId for unsubscribe link
  );

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: title,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${student.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${student.email}:`, error);
  }
};

const startCronJob = () => {


//   cron.schedule('*/2 * * * *', async () => {
//     try {
//       const now = Date.now();
//       const inactivityLimit = 2 * 60 * 1000; // 2 minutes


 cron.schedule('0 0 * * *', async () => {
  try {
    const now = Date.now();
    const inactivityLimit = 24 * 60 * 60 * 1000; // 24 hours

  // 🔹 Students who haven't logged in yet
      const notLoggedInStudents = await Students.find({
        loginCompleted: false,
        lastActivity: { $lt: now - inactivityLimit },
        emailSubscribed: true
      });

      for (const student of notLoggedInStudents) {
        const message = `We noticed you haven't logged into your account yet. Don't miss out on the exciting opportunities waiting for you!`;
        await sendReminderEmail(student, 'We Miss You!', message, '#007bff', {
          text: 'Log In Now',
          link: `${process.env.CLIENT_BASE_URL}/login`
        });
      }

      // 🔹 Paid status reminders
      const notPaidStudents = await Students.find({
        isPaid: false,
        loginCompleted: true,
        lastActivity: { $lt: now - inactivityLimit },
        emailSubscribed: true
      });

      for (const student of notPaidStudents) {
        const message = `You haven't purchased a subscription yet. Subscribe now to unlock access to top universities and courses!`;
        await sendReminderEmail(student, 'Unlock Your Learning Journey!', message, '#28a745', {
          text: 'Subscribe Now',
          link: `${process.env.CLIENT_BASE_URL}/subscription`
        });
      }

      // 🔹 Paid students inactive without visiting courses
      const paidInactiveStudents = await Students.find({
        isPaid: true,
        lastActivity: { $lt: now - inactivityLimit },
        visitedCourses: { $size: 0 },
        emailSubscribed: true
      });

      for (const student of paidInactiveStudents) {
        const message = `You’ve taken the first step by subscribing! Now, discover our partner universities and their amazing opportunities.`;
        await sendReminderEmail(student, 'Time to Explore!', message, '#ffc107', {
          text: 'Browse Universities',
          link: `${process.env.CLIENT_BASE_URL}/get/universities`
        });
      }

      // 🔹 Students with visited courses but not enrolled
      const studentsWithVisitedCourses = await Students.find({
        visitedCourses: { $exists: true, $not: { $size: 0 } },
        lastActivity: { $lt: now - inactivityLimit },
        emailSubscribed: true
      }).populate({
        path: 'visitedCourses',
        populate: { path: 'university', select: 'name' },
      });

      for (const student of studentsWithVisitedCourses) {
        for (const course of student.visitedCourses) {
          if ((student.enrolledCourses || []).includes(course._id)) continue;

          const message = `You viewed <strong>${course.name}</strong> at <strong>${course.university && course.university.name}</strong> but didn't enrol. Take the next step and apply today!`;
          await sendReminderEmail(student, 'Don’t Miss Out!', message, '#17a2b8', {
            text: 'Explore Now',
            link: `${process.env.CLIENT_BASE_URL}/courses/${course._id}`
          });
        }
      }

      // If no students found for any category
      if (
        notLoggedInStudents.length === 0 &&
        notPaidStudents.length === 0 &&
        paidInactiveStudents.length === 0 &&
        studentsWithVisitedCourses.length === 0
      ) {
        console.log('No inactive or active users found for any condition.');
      }
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  });
};

module.exports = startCronJob;







// const cron = require('node-cron');
// const nodemailer = require('nodemailer');
// const Students = require('../models/studentsModel');
// require('dotenv').config();
// const { generateEmailTemplate, COMPANY_LOGO } = require('../services/emailService'); // we'll move the template generator there

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Function to send a styled HTML reminder email
// const sendReminderEmail = async (student, title, message, color, button = null) => {
//   const html = generateEmailTemplate(title, color, `
//     <p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
//     <p style="font-size:16px;color:#555555;line-height:1.6;">${message}</p>
//   `, button);

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: title,
//     html,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log(`Reminder email sent to ${student.email}`);
//   } catch (error) {
//     console.error(`Failed to send email to ${student.email}:`, error);
//   }
// };

// // Cron job to check inactivity and send styled emails
// const startCronJob = () => {


// //   cron.schedule('*/2 * * * *', async () => {

// //    try {
// //      const now = Date.now();
// //  const inactivityLimit = 2 * 60 * 1000;




//  cron.schedule('0 0 * * *', async () => {
//    try {
//      const now = Date.now();
//      const inactivityLimit = 24 * 60 * 60 * 1000; // 10 minute for testing


//       const notLoggedInStudents = await Students.find({
//         loginCompleted: false,
//         lastActivity: { $lt: now - inactivityLimit },
//       });

//       for (const student of notLoggedInStudents) {
//         const message = `We noticed you haven't logged into your account yet. Don't miss out on the exciting opportunities waiting for you!`;
//         await sendReminderEmail(student, 'We Miss You!', message, '#007bff', {
//           text: 'Log In Now',
//           link: `${process.env.CLIENT_LOGIN_PAGE}/login`
//         });
//       }

//       const notPaidStudents = await Students.find({
//         isPaid: false,
//         loginCompleted: true,
//         lastActivity: { $lt: now - inactivityLimit },
//       });

//       for (const student of notPaidStudents) {
//         const message = `You haven't purchased a subscription yet. Subscribe now to unlock access to top universities and courses!`;
//         await sendReminderEmail(student, 'Unlock Your Learning Journey!', message, '#28a745', {
//           text: 'Subscribe Now',
//           link: `${process.env.CLIENT_BASE_URL}/create-payment-intent`
//         });
//       }

//       const paidInactiveStudents = await Students.find({
//         isPaid: true,
//         lastActivity: { $lt: now - inactivityLimit },
//         visitedCourses: { $size: 0 },
//       });

//       for (const student of paidInactiveStudents) {
//         const message = `You’ve taken the first step by subscribing! Now, discover our partner universities and their amazing opportunities.`;
//         await sendReminderEmail(student, 'Time to Explore!', message, '#ffc107', {
//           text: 'Browse Universities',
//           link: `${process.env.CLIENT_BASE_URL}/get/universities`
//         });
//       }

//       const studentsWithVisitedCourses = await Students.find({
//         visitedCourses: { $exists: true, $not: { $size: 0 } },
//         lastActivity: { $lt: now - inactivityLimit },
//       }).populate({
//         path: 'visitedCourses',
//         populate: { path: 'university', select: 'name' },
//       });

//       for (const student of studentsWithVisitedCourses) {
//         for (const course of student.visitedCourses) {
//         if ((student.enrolledCourses || []).includes(course._id)) {
//   continue;
// }
//           const message = `You viewed <strong>${course.name}</strong> at <strong>${course.university && course.university.name}</strong> but didn't enrol. Take the next step and apply today!`;
//           await sendReminderEmail(student, 'Don’t Miss Out!', message, '#17a2b8', {
//             text: 'Explore Now',
//             link: `${process.env.CLIENT_BASE_URL}/courses/${course._id}`
//           });
//         }
//       }

//       if (
//         notLoggedInStudents.length === 0 &&
//         notPaidStudents.length === 0 &&
//         paidInactiveStudents.length === 0 &&
//         studentsWithVisitedCourses.length === 0
//       ) {
//         console.log('No inactive or active users found for any condition.');
//       }
//     } catch (error) {
//       console.error('Error checking inactive users:', error);
//     }
//   });

//   console.log('Cron job is running');
// };

// module.exports = startCronJob;




