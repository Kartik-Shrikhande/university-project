const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session');
const passport = require('./utils/passport');
const setupSwagger = require('./swagger/swagger'); // Adjust the path if needed
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger-output.json');
const cookieParser = require('cookie-parser');
const cors = require('cors')


// Now, you can access your documentation at http://localhost:3000/api-docs
const app = express()
require('dotenv').config({ path: '.env' })
require('./utils/passport'); 

// app.use(cors({
//     origin: [
//         "http://localhost:5173" 
//     ],
//     credentials: true
// }));

const studentRoutes = require('../src/routes/studentsRoutes')
const universityRoutes = require('../src/routes/universityRoutes')
const coursesRoutes = require('../src/routes/coursesRoutes')
const agencyRoutes = require('../src/routes/agencyRoutes')
const agentsRoutes = require('../src/routes/agentRoutes')
const otpRoutes = require('../src/routes/otpRoutes')
const googleAuthRoutes = require('../src/routes/googleLoginRoutes')// New Google Auth routes

// const applicationRoutes = require('../src/routes/applicationRoutes');

const startCronJob = require('../src/controllers/inactivityMailController');

// Start the cron job

// // Check each role collection
//     const roleCollections = [
//       { model: University, roleName: 'University' },
//       { model: Students, roleName: 'student' },
//       { model: Agents, roleName: 'agent' },
//       { model: Solicitors, roleName: 'solicitor' },
//       { model: Agencies, roleName: 'admin' }
// app.use(
//     express.json({
//       verify: (req, res, buf) => {
//         req.rawBody = buf.toString();
//       },
//     })
//   );
  
// Set up middleware
app.use(express.json({ 
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173"], 
    credentials: true
}));


// app.use(express.json())
// app.use(cookieParser());

// // Set up Swagger
// setupSwagger(app);
// Swagger route


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
// app.use('/application', applicationRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



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
