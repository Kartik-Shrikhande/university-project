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



router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;