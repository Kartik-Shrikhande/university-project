
const mongoose = require("mongoose");

const SolicitorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, maxlength: 50 },
    lastName: { type: String, required: true, maxlength: 50 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String,required:true},
    countryCode: { type: String}, // e.g., +91
    phoneNumber: { type: String, required: true },
   agency: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Agency', 
      },
    studentAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // Array of student IDs
    assignedSolicitorRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application',default:null}],
    completedSolicitorRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application',default:null}],
    completedVisa:{ type:Number, default:0},
    // isActive: { type: Boolean, default: true }, // Active status
    visaRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    approvedvisaRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    rejectRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    reason: { type: String, maxlength: 200 }, // Reason for deactivation, if applicable
    role: { type: String, default: "solicitor" },
    currentToken: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Solicitor", SolicitorSchema);





