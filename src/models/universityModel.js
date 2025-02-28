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
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['Admin', 'University'], default: 'University' }, // Default role is 'University'
    description: { type: String },
     bannerImage:  [{ type: String }],
       // 3. Official Website URL
    website: { type: String, required: true },

     // ✅ Newly added fields for login response:
     phoneNumber: { type: String, required: true },
     address: {
      country: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String},
      zipCode: { type: String, required: true },
    },
    institutionType: { type: String, enum: ['Public', 'Private'], required: true },
    isPromoted: { type: String, enum: ['YES', 'NO'], default: 'NO' },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    pendingApplications: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
        applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
      },
    ],
    approvedApplications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }], // ✅ Added field to track approved applications
    payments:[],
    ratings: [{ type: Number }],
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('University', universitySchema);
