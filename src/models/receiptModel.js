const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    otherPaymentMethod: {
      type: String,
      default:null
    },
    paidToUniversity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },
    applicationsId: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Application',
      required: true // Make applicationsId required
  }],
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
 
    amountPaid: {
      type: Number,
      required: true,
    },
    dateofPayment: {
      type: Date,
      required: true,
    },
    uploadPaymentReceipt: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    remarks: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Receipt", receiptSchema);

