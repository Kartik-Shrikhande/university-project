const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session');
const passport = require('./utils/passport');
const app = express()
require('dotenv').config({ path: '.env' })
require('./utils/passport'); 

const studentRoutes = require('../src/routes/studentsRoutes')
const universityRoutes = require('../src/routes/universityRoutes')
const coursesRoutes = require('../src/routes/coursesRoutes')
const agencyRoutes = require('../src/routes/agencyRoutes')
const agentsRoutes = require('../src/routes/agentRoutes')
const otpRoutes = require('../src/routes/otpRoutes')
const googleAuthRoutes = require('../src/routes/googleloginRoutes')// New Google Auth routes

const applicationRoutes = require('../src/routes/applicationRoutes');

const startCronJob = require('../src/controllers/inactivityMailController');

// Start the cron job



app.use(express.json())

// Set up express-session
app.use(
    session({
      secret: process.env.SESSION_SECRET || 'defaultSecret',
      resave: false,
      saveUninitialized: false,
    })
  );
  
  // Initialize Passport for Google login
app.use(passport.initialize());
app.use(passport.session());


app.use('/student', studentRoutes)
app.use('/university', universityRoutes)
app.use('/courses', coursesRoutes)
app.use('/agency', agencyRoutes)
app.use('/agent', agentsRoutes)
app.use('/otp', otpRoutes)
app.use('/redirect', googleAuthRoutes); // Google Auth route
app.use('/application', applicationRoutes);

mongoose.connect(process.env.MONGODB_URL)
    .then(() => { console.log('MongoDB is connected')

     })
    .catch((error) => { console.log(error); })


    try {
        startCronJob();
    } catch (error) {
        console.error('Error starting the inactivity check cron job:', error);
    }
    

app.listen(process.env.PORT, () => {
    console.log('App is running on port', + process.env.PORT)
})