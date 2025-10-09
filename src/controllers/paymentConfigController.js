// controllers/paymentConfigController.js
const PaymentConfig = require("../models/paymentConfigModel");

// Get current config
exports.getPaymentConfig = async (req, res) => {
  try {
    const config = await PaymentConfig.findOne();
    if (!config) {
      // Initialize default config if not found
      const defaultConfig = await PaymentConfig.create({});
      return res.status(200).json(defaultConfig);
    }
    res.status(200).json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update config (Admin only)
exports.updatePaymentConfig = async (req, res) => {
  try {
    const { platformFee, solicitorFee, currency } = req.body;

    const config = await PaymentConfig.findOneAndUpdate(
      {},
      { platformFee, solicitorFee, currency },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Payment configuration updated successfully.",
      config,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
