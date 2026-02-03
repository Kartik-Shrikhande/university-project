const Consent = require("../models/userConsent");

/**
 * POST /api/consent
 * Save user consent
 */
exports.saveConsent = async (req, res) => {
  try {
    const consent = new Consent({
      userId: req.user ? req.user._id : null,
      consent: req.body.consent,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      path: req.body.path || "/",
    });

    await consent.save();

    res.status(201).json({
      success: true,
      message: "Consent recorded successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save consent",
    });
  }
};

/**
 * GET /api/consent/logs
 * Admin: fetch all consent logs
 */


exports.getConsentLogs = async (req, res) => {
  try {
    const logs = await Consent.find({});

    return res.json({
      success: true,
      total: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Consent log error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



/**
 * GET /api/consent/latest
 * Get latest consent of logged-in user
 */
exports.getLatestConsent = async (req, res) => {
  try {
    const consent = await Consent.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: consent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch consent",
    });
  }
};

