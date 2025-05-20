const associateController = require('../controllers/associateController');
// const solicitorController = require('../controllers/solicitorControllers')
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const { body, validationResult } = require('express-validator');
const {validateAssociateCreation,validateAssociateUpdate}=require('../validators/associateValidations')
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


router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['Associate']))

//ASSOCIATE - PROFILE
router.put('/update',validateAssociateUpdate,validate, associateController.updateAssociate);
router.get('/profile', associateController.getAssociateById);
router.put('/update/password', associateController.associateUpdatePassword)



//ASSOCIATE - SOLICITORS
// Route to create a new solicitor
router.post('/solicitor/create', validateCreateSolicitor,validate,associateController.createSolicitor);
// Route to update a solicitor by ID
router.put('/solicitor/update/:id',validateUpdateSolicitor,validate,associateController.updateSolicitorById);

// Route to get all solicitors
router.get('/solicitors',associateController.getAllSolicitors);

// Route to get a solicitor by ID
router.get('/solicitor/:id',associateController.getSolicitorById);
// Route to delete a solicitor by ID
router.delete('/solicitor/delete/:id',associateController.deleteSolicitor);




//ASSOCIATE - SOLICITORS REQUESTS 


// Get all assigned requests
router.get('/solicitor-requests', associateController.getAllAssignedSolicitorRequests);
// Get assigned request by studentId
router.get('/solicitor-requests/:applicationId', associateController.getSolicitorRequestById);
// Reject a solicitor request
router.delete('/request/reject/:applicationId', associateController.rejectSolicitorRequest);
router.post('/assign-request', associateController.assignRequestToSolicitor);



router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;