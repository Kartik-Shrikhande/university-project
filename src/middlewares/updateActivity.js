
const Students = require('../models/studentsModel');


exports.updateLastActivity = async (req, res, next) => {
    try {
      const studentId = req.studentId; // Assume you get this from auth middleware
      if (studentId) {
        await Students.findByIdAndUpdate(studentId, { lastActivity: Date.now() });
      }
      next();
    } catch (error) {
      console.error('Error updating last activity:', error);
      next(); 
    }
  };
  