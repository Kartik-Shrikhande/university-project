// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const paymentConfigController = require("../controllers/paymentConfigController");

// // Payments
// router.post("/create-payment-intent", paymentController.createPaymentIntent);
// router.post("/confirm-payment", paymentController.confirmPayment);
// router.post("/solicitor/create-intent/:applicationId", paymentController.createSolicitorPaymentIntent);
// router.post("/solicitor/confirm-payment", paymentController.confirmSolicitorPayment);
// router.get("/payment-history", paymentController.getPaymentHistory);

// Admin routes
router.get('/config', paymentConfigController.getPaymentConfig);
router.put('/config/update', paymentConfigController.updatePaymentConfig); // 🧠 Only admin should access this

module.exports = router;
