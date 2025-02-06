const mongoose = require('mongoose');

const paymentReceiptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // Reference to the student making the payment
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true }, // Reference to the related application
    paymentAmount: { type: Number, required: true }, // Amount paid
    paymentDate: { type: Date, default: Date.now }, // Payment date
    paymentStatus: { 
      type: String, 
      enum: ['Pending', 'Completed', 'Failed'], 
      default: 'Pending' 
    }, // Status of the payment
    paymentMethod: { 
      type: String, 
      enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer'], 
      required: true 
    }, // Payment method
    transactionId: { type: String, required: true }, // Unique transaction ID
    financialAidApplied: { 
      type: Boolean, 
      default: false 
    }, // Indicates if financial aid was applied
    notes: { type: String }, // Additional notes or comments on the payment
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
