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

    documentType: { type: String, 
      enum: ['Passport'], 
      required: true ,
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    },


    documentUpload: [{ type: String}], // Path or URL to the document
    english_test: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
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
    applications: [{applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' }}],
    
    verificationToken: { type: String, required: false },  // Add this field for email verification
    isPaid: { type: Boolean, default: false },
       // Payment Integration
   payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }], // Store payment history
    referralSource: { type: String, enum: ['Social Media','Online Search/Google', 'Referral from friend/family member',
       'Education fair/exhibition','Advertisement(online/offline)','Other'],
      //  required: true
      },
    visitedCourses: { type: [mongoose.Schema.Types.ObjectId], ref: 'Course', default: [] },
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
    role:{type: String, default: 'student'},
    isVerified:{type: Boolean, default: false},
     // **New Fields for Response Structure**

    // Documents to track status
    documents: {
      passport: {
        url: { type: String },  // URL for passport file
        status: { type: String, enum: ['pending_verification', 'verified'], default: 'pending_verification' }
      },
      english_test: {
        url: { type: String },  // URL for English test file
        status: { type: String, enum: ['pending_verification', 'verified'], default: 'pending_verification' }
      }
    },

    // Payment status
    payment_status: {
      platform_fee: {
        amount: { type: Number, default: 100.00 },
        currency: { type: String, default: 'GBP' },
        description: { type: String, default: 'One-time platform access fee' },
        payment_url: { type: String, default: '/api/payments/platform-fee' },
        deadline: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }  // 7 days deadline
      }
    },

    // Platform access controls
    platform_access: {
      courses_visible: { type: Boolean, default: false },
      allowed_actions: [{ type: String, enum: ['view_profile', 'pay_platform_fee'] }],
      blocked_actions: [{ type: String, enum: ['edit_profile', 'apply_to_courses'] }]
    },
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
    // Additional metadata fields
    metadata: {
      profile_completeness: { type: Number, default: 100 },
      risk_flags: {
        multiple_devices: { type: Boolean, default: false },
        suspicious_activity: { type: Boolean, default: false }
      }
    }

  },
  { timestamps: true }
);


module.exports = mongoose.model('Student', studentSchema);
