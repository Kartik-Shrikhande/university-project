const mongoose = require('mongoose');
const { isValidObjectId } = require('mongoose');
const Stripe = require("stripe");
const Application = require('../models/applicationModel');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/paymentModel");
const Student = require("../models/studentsModel");
const nodemailer = require('nodemailer');
const { sendPaymentSuccessEmail,sendSolicitorPaymentEmail } = require("../services/emailService");

//dummy payment 
exports.createDummySolicitorPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const studentId = req.user.id;

    // Fetch the student
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    // if(student.isPaid) res.status(200).json({message: 'Payment already done for this user'});

    // Simulate payment (mark as paid)
    await Student.findByIdAndUpdate(studentId, { solicitorService: true });
    await student.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: ' solicitor Payment successful',
      // student,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error processing payment:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};




//PLATFORM PAYMENT 

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
    // 1️⃣ Fetch latest status from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 2️⃣ Update your Payment document based on Stripe status
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: paymentIntent.status === "succeeded" ? "succeeded" : "failed",
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    // 3️⃣ Confirm from your DB if the payment is succeeded
    if (payment.status === "succeeded") {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found." });
      }

      // ✅ Extra check: only set isPaid = true if it's not already true
      if (!student.isPaid) {
        await Student.findByIdAndUpdate(studentId, { isPaid: true });
        await sendPaymentSuccessEmail(student);
      }
    }

    res.status(200).json({ message: "Payment processed", status: paymentIntent.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
};

// exports.confirmPayment = async (req, res) => {
//   const { paymentIntentId } = req.body;
//   const studentId = req.user.id;

//   try {
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//     const payment = await Payment.findOneAndUpdate(
//       { stripePaymentIntentId: paymentIntentId },
//       {
//         status: paymentIntent.status === "succeeded" ? "succeeded" : "failed",
//         updatedAt: new Date(),
//       },
//       { new: true }
//     );

//     if (payment.status === "succeeded") {
//       await Student.findByIdAndUpdate(studentId, { isPaid: true });

//       const student = await Student.findById(studentId);
//       if (student) {
//         await sendPaymentSuccessEmail(student); // 🎯 Send the email here
//       }
//     }

//     res.status(200).json({ message: "Payment processed", status: paymentIntent.status });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to verify payment" });
//   }
// };



//SOLICITOR PAYMENT



const SOLICITOR_PAYMENT_AMOUNT = 5000; // = £50.00


exports.createSolicitorPaymentIntent = async (req, res) => {
  const studentId = req.user.id;
  const { applicationId } = req.params;

       if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return res.status(400).json({ success: false, message: "Invalid application ID" });
      }

  try {
    const application = await Application.findOne({ _id: applicationId, student: studentId });
    if (!application) {
      return res.status(404).json({ error: "Application not found or does not belong to the student." });
    }

    if (application.solicitorPaid) {
      return res.status(400).json({ error: "Solicitor service already paid for this application." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: SOLICITOR_PAYMENT_AMOUNT,
      currency: CURRENCY,
      payment_method_types: ["card"],
      description: `Solicitor service payment for Application ID: ${applicationId}`,
    });

    await Payment.create({
      student: studentId,
      application: applicationId,
      amount: SOLICITOR_PAYMENT_AMOUNT,
      currency: CURRENCY,
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
      description: `Solicitor service payment for Application ID: ${applicationId}`,
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.confirmSolicitorPayment = async (req, res) => {
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

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    if (paymentIntent.status === "succeeded") {
      // Update solicitorPaid in application
      await Application.findOneAndUpdate(
        { _id: payment.application, student: studentId },
        { solicitorPaid: true }
      );

      const student = await Student.findById(studentId);
      if (student) {
        // Optional email notification
        await sendSolicitorPaymentEmail(student);
      }
    }

    res.status(200).json({ message: "Solicitor service payment processed", status: paymentIntent.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
};


exports.getPaymentHistory = async (req, res) => {
  const studentId = req.user.id;

  try {
    const payments = await Payment.find({ 
      student: studentId,
      status: 'succeeded'  // only succeeded payments
    })
    .sort({ createdAt: -1 });

    // Derive paymentType in response
    const paymentHistory = payments.map(payment => {
      let paymentType = 'unknown';

      // Derive type based on amount (or description if you prefer)
      if (payment.amount === 2000) {
        paymentType = 'platform_fee';
      } else if (payment.amount === 5000) {
        paymentType = 'solicitor_payment';
      }

      return {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        paymentType, // derived field
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      count: paymentHistory.length,
      payments: paymentHistory,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
};
