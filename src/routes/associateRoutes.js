const associateController = require('../controllers/associateController');
const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
const { body, validationResult } = require('express-validator');
const {validateAssociateCreation,validateAssociateUpdate}=require('../validators/associateValidations')

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

router.put('/update',validateAssociateUpdate,validate, associateController.updateAssociate);
router.get('/profile', associateController.getAssociateById);
router.put('/update/password', associateController.associateUpdatePassword)


router.use('*', (req, res) => {
    res.status(404).json({
        error: "Invalid URL path",
        message: `The requested URL not found on this server.`,
    });
});


module.exports = router;