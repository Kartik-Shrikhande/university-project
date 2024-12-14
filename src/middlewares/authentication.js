const jwt = require('jsonwebtoken')
const studentModel = require('../models/StudentsModel')


const authentication = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    // Check if token is present
    if (!token) {
      return res.status(400).json({ message: 'Token is not present' });
    }

    // Remove 'Bearer' prefix if present
    token = token.split(' ')[1]

    // Verify the token
    jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      // Find the student using the token's `id`
      const student = await studentModel.findById(decodedToken.id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
    
      req.studentId = student._id;
      req.student = student;

      next();
    });
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


module.exports = { authentication }
