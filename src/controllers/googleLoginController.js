const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' })
const Students = require('../models/studentsModel');

// Generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '5h' });
};


exports.googleCallback = async (req, res) => {
    try {
      // User authenticated successfully by Passport
      const user = req.user;
  
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.SECRET_KEY,
        { expiresIn: '5h' }
      );
  
      // Send response with token
      return res.status(200).json({
        message: 'Google login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error('Error in Google callback:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
// // Google Login Success Callback
// exports.googleCallback = async (req, res) => {
//   try {
//     const token = generateToken(req.user);
//     return res.status(200).json({ message: 'Google login successful', token });
//   } catch (error) {
//     console.error('Error in Google callback:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };

// Apple Login Success Callback
exports.appleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user);
    return res.status(200).json({ message: 'Apple login successful', token });
  } catch (error) {
    console.error('Error in Apple callback:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
