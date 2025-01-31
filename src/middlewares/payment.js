const studentModel = require('../models/studentsModel')


exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const student = await studentModel.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if the student has paid
    if (student.isPaid) {
      return next();
    } else {
      // Redirect to the payment process
      return res.status(403).json({
        message: 'Payment required to access the dashboard.',
      });
    }
  } catch (error) {
    console.error('Error in payment status middleware:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

