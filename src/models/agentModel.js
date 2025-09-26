const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String},
    assignedApplications: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Application' } // Pending applications
    ],
    approvedApplications: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Application' } // Approved applications //send to university
    ],
    agency: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Agency', 
    }, // The agency they belong to
      isActive:{
      type: Boolean, 
      default: true, 
    },
    currentToken: { type: String, default: null },
    role: { type: String,default: 'agent' },
    isDeleted: { 
      type: Boolean, 
      default: false, // Default value is false
     
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model('Agent', agentSchema);

