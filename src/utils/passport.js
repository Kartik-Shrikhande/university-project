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
