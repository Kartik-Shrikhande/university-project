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
    confirmEmail: { type: String, required: true }, // Added from input model
    password: { type: String, required: true, minlength: 8 },
    countryCode:{ type: String, required: true, maxlength: 10 },
    telephoneNumber: { type: String, required: true, maxlength: 15 },
    presentAddress: {
      type: { type: String, default: 'present' },
      streetAddress: { type: String, maxlength: 100 },
      city: { type: String, maxlength: 50 },
      state: { type: String, maxlength: 50 },
      postalCode: { type: String, maxlength: 15 },
      country: { type: String, maxlength: 50 },
    },
    permanentAddress: {
      type: { type: String, default: 'permanent' },
      streetAddress: { type: String, maxlength: 100 },
      city: { type: String, maxlength: 50 },
      state: { type: String, maxlength: 50 },
      postalCode: { type: String, maxlength: 15 },
      country: { type: String, maxlength: 50 },
    },
    profilePhoto: { type: String }, // Path or URL to the profile photo
    documentType: { type: String, enum: ['Passport'], required: true },
    documentUpload: [{ type: String}], // Path or URL to the document

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
    countryApplyingFrom: { type: String,
      enum: ['India', 'UK', 'Other'],
       required: true },
    countryName: { type: String },
    preferredUniversity: { type: String,
      enum: ['Yes', 'No'],
      required: true
    }, 
    NameOfUniversity:{ type: String },
    // Added from input model
    preferredCourse: { type: String,
      enum: ['Yes', 'No'],
      required: true
     }, 
    NameOfCourse:{ type: String },
    courseStartTimeline: { type: String,
      enum: ['3 months','6 months','9 months','1 year'],
      required: true
     }, 
    englishLanguageRequirement: { type: String, 
      enum: ['Yes', 'No'],
      required: true
    },
    testName :{
      type: String, enum: ['TOEFL', 'IELTS','Other'],
    },
    score :{
      type: String
    },
    document:[{ type: String}],
    // languageTestName: { type: String }, // Added from input model
    // languageTestScore: { type: String }, // Added from input model

    // Application Details
    applications: [
      {
        applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
      },
    ],

    isPaid: { type: Boolean, default: false },
    referralSource: { type: String, enum: ['Social Media','Online Search/Google', 'Referral from friend/family member',
       'Education fair/exhibition','Advertisement(online/offline)','Other'],
      //  required: true
      },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    termsAndConditionsAccepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v) => v === true,
        message: 'Terms and Conditions must be accepted.',
      },
    },
    gdprAccepted: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v) => v === true,
        message: 'GDPR regulations must be accepted.',
      },
    },
    loginCompleted: { type: Boolean, default: false },
    lastActivity: { type: Date, default: Date.now },
    role:{type: String, default: 'student'}
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
