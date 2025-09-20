const express = require('express');
const router = express.Router();
const visaController = require('../controllers/visaRequestController');
const { authenticateUser, authorizeRoles } = require('../middlewares/authenticationRoleBased'); // adapt to your auth

// Student creates visa request
// router.post('/visa/request/:applicationId', authenticateUser, authorizeRoles('student'), visaController.createVisaRequest);

// Agency accepts/rejects solicitor request
router.get("/agency/visa-requests", authenticateUser, authorizeRoles('admin'), visaController.getAllVisaRequestsForAgency);
router.get("/agency/visa-requests/:id", authenticateUser, authorizeRoles('admin'), visaController.getVisaRequestByIdForAgency);
router.post('/agency/visa-requests/accept/:applicationId', authenticateUser, authorizeRoles('admin'), visaController.agencyAcceptVisaRequest);
router.post('/agency/visa-requests/reject/:applicationId', authenticateUser, authorizeRoles('admin'), visaController.agencyRejectVisaRequest);

// Solicitor accepts/rejects visa request
router.get("/solicitor/visa-requests", authenticateUser, authorizeRoles('solicitor'), visaController.getAllVisaRequestsForSolicitor);
router.get("/solicitor/visa-requests/:id",  authenticateUser, authorizeRoles('solicitor'), visaController.getVisaRequestByIdForSolicitor);
router.post('/solicitor/visa-requests/accept/:applicationId', authenticateUser, authorizeRoles('solicitor'), visaController.solicitorAcceptVisaRequest);
router.post('/solicitor/visa-requests/reject/:applicationId', authenticateUser, authorizeRoles('solicitor'), visaController.solicitorRejectVisaRequest);

module.exports = router;
