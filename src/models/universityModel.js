const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      unique: true,
      required: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format',
      },
    },
    role: { type: String, enum: ['Admin', 'University'], default: 'University' }, // Default role is 'University'
    password: { type: String, required: true, minlength: 8 },
    description: { type: String },
    country: { type: String, required: true },
    isPromoted: { type: String, enum: ['YES', 'NO'], default: 'NO' },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    pendingApplications: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
        applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
      },
    ],
    payments:[],
    ratings: [{ type: Number }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('University', universitySchema);
