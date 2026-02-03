const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // guest users allowed
    },

    consent: {
      necessary: { type: Boolean, required: true },
      analytics: { type: Boolean, required: true },
      marketing: { type: Boolean, required: true },
    },

    ipAddress: { type: String },
    userAgent: { type: String },
    path: { type: String }, // page where consent was given
  },
  { timestamps: true }
);

module.exports = mongoose.model("Consent", consentSchema);
