const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const Students = require('../models/studentsModel');
require('dotenv').config({ path: './.env' })

// Google Login Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/redirect/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if student already exists
        let student = await Students.findOne({ email: profile.emails[0].value });

        // Create a new student if not found
        if (!student) {
          student = new Students({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            loginCompleted: true,
          });
          await student.save();
        }

        return done(null, student);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// // Apple Login Strategy
// passport.use(
//   new AppleStrategy(
//     {
//       clientID: process.env.APPLE_CLIENT_ID,
//       teamID: process.env.APPLE_TEAM_ID,
//       keyID: process.env.APPLE_KEY_ID,
//       privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//       callbackURL: `${process.env.SERVER_URL}/api/auth/apple/callback`,
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         // Extract email from Apple profile
//         const email = profile.email;

//         // Check if student already exists
//         let student = await Students.findOne({ email });

//         // Create a new student if not found
//         if (!student) {
//           student = new Students({
//             firstName: profile.name?.givenName || 'Apple',
//             lastName: profile.name?.familyName || 'User',
//             email,
//             loginCompleted: true,
//           });
//           await student.save();
//         }

//         return done(null, student);
//       } catch (error) {
//         return done(error, null);
//       }
//     }
//   )
// );

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Students.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
