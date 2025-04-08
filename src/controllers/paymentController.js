
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/paymentModel");
const Student = require("../models/studentsModel");
const nodemailer = require('nodemailer');
const { sendPaymentSuccessEmail } = require("../services/emailService");

// Fixed payment amount (in smallest currency unit, e.g., 2000 = £20.00)
const PAYMENT_AMOUNT = 2000;
const CURRENCY = "GBP";

exports.createPaymentIntent = async (req, res) => {
  const studentId = req.user.id;

  try {
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (student.isPaid) {
        return res.status(400).json({ error: "Payment already completed." });
      }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PAYMENT_AMOUNT,
      currency: CURRENCY,
      payment_method_types: ["card"],
      description: `Payment for Student ID: ${studentId}`,
    });

    // Save to DB with pending status
    await Payment.create({
      student: studentId,
      amount: PAYMENT_AMOUNT,
      currency: CURRENCY,
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
      description: `Payment for Student ID: ${studentId}`,
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



exports.confirmPayment = async (req, res) => {
  const { paymentIntentId } = req.body;
  const studentId = req.user.id;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: paymentIntent.status === "succeeded" ? "succeeded" : "failed",
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (paymentIntent.status === "succeeded") {
      await Student.findByIdAndUpdate(studentId, { isPaid: true });

      const student = await Student.findById(studentId);
      if (student) {
        await sendPaymentSuccessEmail(student); // 🎯 Send the email here
      }
    }

    res.status(200).json({ message: "Payment processed", status: paymentIntent.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
};


// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const Payment = require('../models/paymentModel');
// const Student = require('../models/studentsModel');



// // Fixed amount to charge every student
// const FIXED_AMOUNT = 100; // Amount in GBP

// exports.createPaymentIntent = async (req, res) => {
//     try {
//         const studentId = req.user.id; // ✅ Extracting from JWT token

//         // Check if student exists
//         const student = await Student.findById(studentId);
//         if (!student) {
//             return res.status(404).json({ success: false, message: 'Student not found' });
//         }

//         // Check if student has already paid
//         if (student.isPaid) {
//             return res.status(400).json({ success: false, message: 'Payment already completed' });
//         }

//         // Create Stripe PaymentIntent
//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: FIXED_AMOUNT * 100, // Convert GBP to pence
//             currency: 'GBP',
//             metadata: { studentId: studentId }
//         });

//         // Save payment details in MongoDB
//         const payment = new Payment({
//             student: studentId,
//             amount: FIXED_AMOUNT, // ✅ Fixed amount stored in DB
//             currency: 'GBP',
//             stripePaymentIntentId: paymentIntent.id,
//             status: 'pending'
//         });

//         await payment.save();

//         res.status(200).json({
//             success: true,
//             clientSecret: paymentIntent.client_secret,
//             paymentId: payment._id
//         });

//     } catch (error) {
//         console.error('Error creating payment intent:', error);
//         res.status(500).json({ success: false, message: 'Internal Server Error' });
//     }
// };



// exports.handleStripeWebhook = async (req, res) => {
//     const sig = req.headers['stripe-signature'];

//     try {
//         const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

//         if (event.type === 'payment_intent.succeeded') {
//             const paymentIntent = event.data.object;
//             const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });

//             if (payment) {
//                 payment.status = 'succeeded'; // 
//                 await payment.save();
//                 await Student.findByIdAndUpdate(payment.student, { isPaid: true });
//             }
//         }

//         res.status(200).send('Webhook received');
//     } catch (error) {
//         console.error('Webhook error:', error);
//         res.status(500).send('Webhook Error');
//     }
// };

