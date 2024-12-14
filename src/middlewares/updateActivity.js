
const Students = require('../models/StudentsModel');


exports.updateLastActivity = async (req, res, next) => {
    try {
      const studentId = req.studentId; // Assume you get this from auth middleware
      if (studentId) {
        await Students.findByIdAndUpdate(studentId, { lastActivity: Date.now() });
      }
      next();
    } catch (error) {
      console.error('Error updating last activity:', error);
      next(); // Don't block the request even if there's an error
    }
  };
  