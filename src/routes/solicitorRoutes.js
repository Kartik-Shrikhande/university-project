const solicitorController = require('../controllers/solicitorControllers')
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const { body, validationResult } = require('express-validator');
const {validateCreateSolicitor,validateUpdateSolicitor}=require('../validators/solicitorValidations')
const express = require('express');
const router = express.Router();

  // Middleware to validate requests
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array()});
  }
  next();
};



router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['solicitor']))


//SOLICITOR - PROFILE
router.put('/update/password',solicitorController.solicitorUpdatePassword)
router.put('/update',validateUpdateSolicitor,validate,solicitorController.updateSolicitor);
router.get('/profile', solicitorController.seeProfileSolicitor);


//SOLICITOR - SOLICITOR REQUEST
router.get('/all-assigned-requests', solicitorController.getAllAssignedSolicitorRequestsForSolicitor);
router.get('/assigned-request/:applicationId', solicitorController.getSolicitorRequestByIdForSolicitor);
router.post('/approve-request/:applicationId', solicitorController.approveSolicitorRequest);


module.exports = router;
