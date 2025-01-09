const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
