const express = require('express');
const passport = require('passport');
const { googleCallback, appleCallback } = require('../controllers/googleLoginController');
const googleController = require('../controllers/googleLoginController');
const router = express.Router();


// // Route to start Google login
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// // Callback route after Google login
// router.get(
//   '/google/callback',
//   passport.authenticate('google', { failureRedirect: '/login-failed' }),
//   (req, res) => {
//     // Successful login
//     res.send(`<h1>Welcome ${req.user.firstName}!</h1><p>Your email is: ${req.user.email}</p>`);
//   }
// );

// // Login failed route
// router.get('/login-failed', (req, res) => {
//   res.send('<h1>Login failed</h1><p>Please try again.</p>');
// });

// module.exports = router;




//in use
// Google Login Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  googleController.googleCallback
);

// // Apple Login Routes
// router.get(
//   '/apple',
//   passport.authenticate('apple', { scope: ['name', 'email'] })
// );
// router.post(
//   '/apple/callback',
//   passport.authenticate('apple', { session: false }),
//   googleController.appleCallback
// );

module.exports = router;
