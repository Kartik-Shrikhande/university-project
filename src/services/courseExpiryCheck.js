const cron = require('node-cron');
const Course = require('../models/coursesModel'); // Import Course model

// Function to check and update expired courses
const checkExpiredCourses = async () => {
  try {
    const now = new Date();

    // Update courses that have expired
    const result = await Course.updateMany(
      { expiryDate: { $lt: now }, status: 'Active' },
      { $set: { status: 'Inactive' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} expired courses to Inactive.`);
    } else {
      console.log('No expired courses found.');
    }
  } catch (error) {
    console.error('Error updating expired courses:', error);
  }
};

// Start Course Expiry Cron Job
const startCourseExpiryCron = () => {
  // Runs daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running course expiration check...');
    await checkExpiredCourses();
  });

  // console.log('Course expiration cron job is running.');
};

module.exports = startCourseExpiryCron;
