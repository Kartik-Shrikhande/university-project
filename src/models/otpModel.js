const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true }, // Email of the user the OTP is associated with
    otp: { type: String, required: true }, // OTP code
    expiry: { type: Date, required: true }, // Expiry time for the OTP
    isUsed: { type: Boolean, default: false }, // Indicates if the OTP has already been used
  },
  { timestamps: true }
);

module.exports = mongoose.model('Otp', otpSchema);
