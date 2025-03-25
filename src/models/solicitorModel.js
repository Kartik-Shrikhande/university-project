
const mongoose = require("mongoose");

const SolicitorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, maxlength: 50 },
    lastName: { type: String, required: true, maxlength: 50 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: {
      country: { type: String, maxlength: 50 },
      zip_postalCode: { type: String, maxlength: 15 },
      state_province_region: { type: String, maxlength: 50 },
      city: { type: String, maxlength: 50 },
      addressLine: { type: String, maxlength: 100 },
    },
    countryCode: { type: String, maxlength: 5, required: true }, // e.g., +91
    phoneNumber: { type: String, required: true },
    studentAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // Array of student IDs
    experienceInYears: { type: String, maxlength: 5 }, // String for flexibility in formats like "5+ years"
    solicitorsLicence: { type: String}, // File URL for licence
    associate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Associate" // Associate ID who created this solicitor
    },
    commission: { type: Number, required: true }, // Commission percentage or fixed amount
    isActive: { type: Boolean, default: true }, // Active status
    visaRequestStatus: {
      type: String,
      enum: ["accepted", "rejected", "completed", "inprogress"],
      default: "inprogress", // Default status when solicitor is created
    },
    completedVisa:[],
    reason: { type: String, maxlength: 200 }, // Reason for deactivation, if applicable
    role: { type: String, default: "solicitor" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Solicitor", SolicitorSchema);





