// models/paymentConfigModel.js
const mongoose = require("mongoose");

const paymentConfigSchema = new mongoose.Schema(
  {
    platformFee: {
      type: Number,
      required: true,
      default: 500, // in pence → £5
    },
    solicitorFee: {
      type: Number,
      required: true,
      default: 50000, // in pence → £500
    },
    currency: {
      type: String,
      default: "GBP",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentConfig", paymentConfigSchema);
