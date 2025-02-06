const mongoose = require('mongoose');

const solicitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role:{type: String, default: 'solicitor'},
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    assignedApplications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    solicitorType: {
      type: String,
      enum: ['Regular', 'Head'], // Defines the type of solicitor
      default: 'Regular', // Default value is 'Regular'
    },
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
    currentVisa:[],
    approvedVisa:[],
    rejectedVisa:[]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Solicitor', solicitorSchema);

