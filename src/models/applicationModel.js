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
  
    grades:{
      type: String, 
      enum: ['CGPA', 'Percentage'], 
      // required: true 
    },
    marks:{
      type: String, 
      // required: true 
    },
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
    solicitorPaid:{ type: Boolean, default: false },
    assignedSolicitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitor', default: null },
    agency: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Agency', 
      // default: '677f6b7c701bc85481046b64', // Default agency ID
    },
    visaApproved: { type: Boolean, default: false },
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);





  