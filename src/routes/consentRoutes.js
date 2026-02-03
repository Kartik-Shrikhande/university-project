const express = require("express");
const router = express.Router();
const {
  saveConsent,
  getConsentLogs,
  getLatestConsent,
} = require("../controllers/consentController");

const authenticationMiddleware = require('../middlewares/authenticationRoleBased')

// Public / Logged-in users
router.post("/save", saveConsent);
router.get("/consent/latest", getLatestConsent);
// Logged-in user

router.use(
  authenticationMiddleware.authenticateUser,
  authenticationMiddleware.authorizeRoles(['admin', 'agent']),
  authenticationMiddleware.resolveAgencyContext // <-- New middleware here
);
// Admin only

router.get("/consent/logs", getConsentLogs);

module.exports = router;
