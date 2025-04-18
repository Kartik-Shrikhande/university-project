const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session');
const passport = require('./utils/passport');
// const setupSwagger = require('./swagger/swagger'); // Adjust the path if needed
// const swaggerUi = require('swagger-ui-express');
// const swaggerDocument = require('./swagger/swagger-output.json');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const http = require('http');
const { initializeSocket } = require('../src/services/socketNotification'); // Import socket service

// Now, you can access your documentation at http://localhost:3000/api-docs
const app = express()
require('dotenv').config({ path: '.env' })
require('./utils/passport');


const server = http.createServer(app);
initializeSocket(server); // Initialize socket
// app.use(cors({
//     origin: function (origin, callback) {
//         console.log("Origin attempting to connect:", origin);

//         if (!origin || 
//             origin.match(/^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/) ||
//             origin === "http://localhost:5173") { 
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     credentials: true
// }));



const studentRoutes = require('../src/routes/studentsRoutes')
const universityRoutes = require('../src/routes/universityRoutes')
const agencyRoutes = require('../src/routes/agencyRoutes')
const agentsRoutes = require('../src/routes/agentRoutes')
const associateRoutes = require('../src/routes/associateRoutes')
const otpRoutes = require('../src/routes/otpRoutes')
const googleAuthRoutes = require('../src/routes/googleLoginRoutes')// New Google Auth routes
const solicitorRoutes = require('../src/routes/solicitorRoutes')
// const applicationRoutes = require('../src/routes/applicationRoutes');

const startCronJob = require('../src/controllers/inactivityMailController');
const startCourseExpiryCron = require('../src/services/courseExpiryCheck'); // Course expiry cron

// Start the cron job

// // Check each role collection
//     const roleCollections = [
//       { model: University, roleName: 'University' },
//       { model: Students, roleName: 'student' },
//       { model: Agents, roleName: 'agent' },
//       { model: Solicitors, roleName: 'solicitor' },
//       { model: Agencies, roleName: 'admin' }

// Set up middleware
app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));
app.use(cookieParser());

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}));

// app.use(cors({
//     origin: [
//         "https://6de8-152-59-199-254.ngrok-free.app/" 
//     ],
//     credentials: true
// }));

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
app.use('/agency', agencyRoutes)
app.use('/admin', agencyRoutes)
// app.use('/agent', agentsRoutes)
app.use('/associate', associateRoutes)
app.use('/otp', otpRoutes)
app.use('/redirect', googleAuthRoutes); // Google Auth route
// app.use('/application', applicationRoutes);
app.use('/solicitor', solicitorRoutes);
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



mongoose.connect(process.env.MONGODB_URL, { connectTimeoutMS: 60000, socketTimeoutMS: 60000 })
    .then(() => {
        console.log('MongoDB is connected')

    })
    .catch((error) => { console.log(error); })


try {
    startCronJob();
    startCourseExpiryCron(); // Start course expiry cron
} catch (error) {
    console.error('Error starting the inactivity check cron job:', error);
}


app.listen(process.env.PORT, () => {
    console.log('App is running on port', process.env.PORT)
})
