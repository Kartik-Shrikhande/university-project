const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true,
        // default: 100
     },
    currency: { type: String, default: 'GBP' },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
    stripePaymentIntentId: { type: String, required: true }, // Store Stripe payment intent ID
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
