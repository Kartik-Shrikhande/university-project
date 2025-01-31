// const jwt = require('jsonwebtoken')
// const studentModel = require('../models/studentsModel')


// const authentication = async (req, res, next) => {
//   try {
//     let token = req.headers.authorization;

//     // Check if token is present
//     if (!token) {
//       return res.status(401).json({ message: 'Token is not present' });
//     }

//     // Remove 'Bearer' prefix if present
//     token = token.split(' ')[1]

//     // Verify the token
//     jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
//       if (err) {
//         return res.status(401).json({ message: 'Invalid or expired token' });
//       }

//       // Find the student using the token's `id`
//       const student = await studentModel.findById(decodedToken.id);
//       if (!student) {
//         return res.status(404).json({ message: 'Student not found' });
//       }
    
//       req.studentId = student._id;
//       next();
//     });
//   } catch (error) {
//     console.error('Authentication Error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



// const authorization = async(req, res, next) => {
//   try {

//     const studentId = req.studentId;
//     const student = await studentModel.findById(studentId);
//     //     if (!student) {
//     //       return res.status(404).json({ message: 'Student not found' });
//     //     }

//     // Check if the user has the 'Admin' role
//     if (student.isAdmin !== 'Admin') {
//       return res.status(401).json({
//         message: 'Unauthorized access.Students dont have access to this route.',
//       });
//     }

//     next(); // Proceed to the route handler if the user is an admin
//   } catch (error) {
//     console.error('Authorization Error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



// ///API to check authorization for
// const authorization = async (req, res, next) => {
//   try {
//     const studentId = req.studentId;

//     if (!studentId) {
//       return res.status(401).json({ message: 'Unauthorized: No student ID found in request' });
//     }

//     const student = await studentModel.findById(studentId);
//     if (!student) {
//       return res.status(404).json({ message: 'Student not found' });
//     }

//     // Check if the user has the 'Admin' role
//     if (student.isAdmin !== 'Admin') {
//       return res.status(403).json({ message: 'Access denied. Admins only.' });
//     }

//     next(); // Proceed if the user is an admin
//   } catch (error) {
//     console.error('Authorization Error:', error);
//     return res.status(500).json({ message: 'Internal server error.' });
//   }
// };



// module.exports = { authentication,authorization}
