const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, maxlength: 50 },
    middleName: { type: String, maxlength: 50 },
    lastName: { type: String, required: true, maxlength: 50 },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
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
    confirmEmail: { type: String, required: true },
    password: { type: String, required: true, minlength: 8 },
    telephoneNumber: { type: String, required: true, maxlength: 15 },
    documentType: { type: String, enum: ['Passport'], required: true },
    documentUpload: { type: String }, // Path or URL to the document

    // Education Details
    mostRecentEducation: {
      type: String,
      enum: ['BTech', 'Diploma', 'Degree', 'Masters', 'PhD', 'Other'],
      required: true,
    },
    otherEducationName: { type: String },
    yearOfGraduation: { type: Number, min: 2014, max: 2024 },
    collegeUniversity: { type: String, maxlength: 100 },
    programType: {
      type: String,
      enum: ['Graduation', 'Post Graduation', 'Under Graduation', 'PhD', 'Other'],
      required: true,
    },
    otherProgramName: { type: String },
    discipline: { type: String, enum: ['Computers', 'Business', 'Marketing', 'Other'] },
    otherDisciplineName: { type: String },
    countryApplyingFrom: { 
      type: String,
      //  required: true
       },

    // Application Details
    applications: [
      {
        applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      },
    ],

    isPaid: { type: Boolean, default: false },
    referralSource: { type: String, enum: ['Google Search', 'Facebook', 'Instagram', 'Agent'] },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    preferredCommunicationMethod: { type: String, enum: ['Email', 'Phone', 'WhatsApp', 'Video Call'],
      //  required: true 
      },
    termsAndConditionsAccepted: { 
      type: Boolean,
      //  required: true 
      },
    gdprAccepted: {
       type: Boolean, 
      // required: true
     },
    loginCompleted: { type: Boolean, default: false },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
