const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Students = require('../models/studentsModel');
const Universities = require('../models/universityModel');
const solicitorModel = require('../models/solicitorModel');
const Admins = require('../models/agencyModel');
const sendEmail = require('../services/emailService'); // assuming you have a mail service file
const AssociateSolicitor = require('../models/associateModel');


// Utility: find user by email across all roles
const getUserByEmail = async (email) => {
  const student = await Students.findOne({ email });
  if (student) return { user: student, role: 'student' };

  const university = await Universities.findOne({ email });
  if (university) return { user: university, role: 'university' };

  const admin = await Admins.findOne({ email });
  if (admin) return { user: admin, role: 'admin' };

  const associate = await AssociateSolicitor.findOne({ email });
  if (associate) return { user: associate, role: 'associate' };

  const solicitor = await solicitorModel.findOne({ email });
  if (solicitor) return { user: solicitor, role: 'solicitor' };

  return { user: null };
};

// Forgot Password - Send Reset Link
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const { user, role } = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'No user found with this email.' });
    }

    const resetToken = jwt.sign(
      { id: user._id, role },
      process.env.SECRET_KEY,
      { expiresIn: '5m' }
    );

    const resetLink = `${process.env.CLIENT_ORIGIN}/reset-password/${resetToken}`;

    await sendEmail.sendResetPasswordEmail(user.email, resetLink);

    res.status(200).json({ message: 'Password reset link has been sent to your email.' });

  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};


// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    let user;
    switch (decoded.role) {
      case 'student':
        user = await Students.findById(decoded.id);
        break;
      case 'university':
        user = await Universities.findById(decoded.id);
        break;
      case 'admin':
        user = await Admins.findById(decoded.id);
        break;
      case 'associate':
        user = await AssociateSolicitor.findById(decoded.id);
        break;
      case 'solicitor':
        user = await Solicitor.findById(decoded.id);
        break;
      default:
        user = null;
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully.' });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Reset link expired. Please request a new one.' });
    }
    res.status(500).json({ message: 'Internal server error.' });
  }
};

