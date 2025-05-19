const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema(
  {
    name: {
         type: String, 
         required: true },
    email: {
         type: String, 
         required: true,
         unique:true
        },
      password:{
          type: String, 
          required: true 

        },
    contactPhone: { 
        type: String 
    },
    address: {
         type: String
         },
    agents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }], // List of agents under the agency
    pendingApplications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }], //here im storing applicationId for solicitor
    solicitorRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    sentAppliactionsToUniversities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    role:{type: String, default: 'admin'},
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agency', agencySchema);
