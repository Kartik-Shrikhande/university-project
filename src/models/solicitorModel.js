const mongoose = require('mongoose');

const solicitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true },
    assignedApplications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    solicitorType: {
      type: String,
      enum: ['Regular', 'Head'], // Defines the type of solicitor
      default: 'Regular', // Default value is 'Regular'
    },
    currentVisa:[],
    approvedVisa:[],
    rejectedVisa:[]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Solicitor', solicitorSchema);

