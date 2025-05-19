const express = require('express');
const resetPasswordController = require('../controllers/resetPasswordController');
const router = express.Router();

// router.post('/otp/request', otpController.requestOtp); // Request OTP
router.post('/forgot-password', resetPasswordController.forgotPassword);   // Verify OTP
router.post('/reset-password/:token', resetPasswordController.resetPassword); // Reset Password


module.exports = router;
