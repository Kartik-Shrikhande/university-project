const express = require('express');
const otpController = require('../controllers/otpController');
const router = express.Router();

router.post('/otp/request', otpController.requestOtp); // Request OTP
router.post('/otp/verify', otpController.verifyOtp);   // Verify OTP
router.post('/password/reset', otpController.resetPassword); // Reset Password


module.exports = router;
