// const associateController = require('../controllers/associateController');
// const authenticationMiddleware = require('../middlewares/authenticationRoleBased')
// const express = require('express');
// const router = express.Router();

// router.use(authenticationMiddleware.authenticateUser,authenticationMiddleware.authorizeRoles(['Associate']))

// router.put('/update', associateController.updateAssociate);
// router.get('/profile', associateController.getAssociateById);
// router.put('/update/password', associateController.associateUpdatePassword)


// router.use('*', (req, res) => {
//     res.status(404).json({
//         error: "Invalid URL path",
//         message: `The requested URL not found on this server.`,
//     });
// });


// module.exports = router;