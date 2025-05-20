const mongoose = require('mongoose');


const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { 
      type: String, 
      enum: ['Processing', 'Accepted', 'Rejected', 'Withdrawn'], 
      default: 'Processing' 
    },
    submissionDate: { type: Date, default: Date.now },
    reviewDate: { type: Date },
    notes: {
       type: String,
       default:'none'
       }, // Comments by reviewers
    extraDocuments:[{ type: String, default: [] }], 
    // New field for document uploads
    universityDocuments: [{ type: String, default: [] }],//university will send in response from request body 
    //Application Input fields 
    // previousDegree: { 
    //   type: String, //enum : masters , bachelors,others
    //   enum: ['Masters', 'Bachelors', 'Others'], 
    //   required: true 
    // },
    grades:{
      type: String, 
      enum: ['CGPA', 'Percentage'], 
      // required: true 
    },
    marks:{
      type: String, 
      // required: true 
    },
//  fromYear:{
//   type: Number, 
//   required: true
//  },
//   toYear:{
//   type: Number, 
//   required: true
//  },
//documents 
  // Documents (✅ No More `required: true`)
  // academicTranscripts: [{ type: String, default: [] }], 
  // proofofEnglishProficiency: [{ type: String, default: [] }],
  // lettersOfRecommendation: [{ type: String, default: [] }],
  // statementOfPurpose: [{ type: String, default: [] }],
  // resumeCV: [{ type: String, default: [] }],
  // passportSizePhotographs: [{ type: String, default: [] }],
  // financialStatements: [{ type: String, default: [] }],
  // additionalDocuments: [{ type: String, default: [] }],
  latestdegreeCertificates: [{ type: String, default: [] }], 
  englishTest: [{ type: String, default: [] }], 
  proofOfAddress: [{ type: String, default: [] }], 
  reason:{ type: String},

    // Financial Aid field
    financialAid: {
      type: String,
      enum: ['YES', 'NO'],
      default: 'NO',
    },
    assignedAgent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }],
    assignedSolicitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitor', default: null },
    agency: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Agency', 
      // default: '677f6b7c701bc85481046b64', // Default agency ID
    },
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);









// const mongoose = require('mongoose');

// const applicationSchema = new mongoose.Schema(
//   {
//     student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
//     university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
//     course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
//     status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'], default: 'Pending' },
//     submissionDate: { type: Date, default: Date.now },
//     reviewDate: { type: Date },
//     notes: { type: String }, // Agency or university notes on the application
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Application', applicationSchema);

  