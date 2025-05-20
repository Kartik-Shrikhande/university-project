
const mongoose = require("mongoose");

const SolicitorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, maxlength: 50 },
    lastName: { type: String, required: true, maxlength: 50 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String,required:true},
    // countryCode: { type: String, maxlength: 5, required: true }, // e.g., +91
    phoneNumber: { type: String, required: true },
    nameOfAssociate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "associate" // Associate ID who created this solicitor
    },
    studentAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // Array of student IDs
    assignedSolicitorRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application',default:null}],
    completedVisa:{ type:Number, default:0},
    // isActive: { type: Boolean, default: true }, // Active status
    visaRequestStatus: {
      type: String,
      enum: ["accepted", "rejected", "completed", "inprogress"],
      default: "inprogress", // Default status when solicitor is created
    },
    reason: { type: String, maxlength: 200 }, // Reason for deactivation, if applicable
    role: { type: String, default: "solicitor" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Solicitor", SolicitorSchema);





