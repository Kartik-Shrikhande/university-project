const express = require('express')
const mongoose = require('mongoose')
const app = express()

const studentRoutes = require('../src/routes/studentsRoutes')
const universityRoutes = require('../src/routes/universityRoutes')
const coursesRoutes = require('../src/routes/coursesRoutes')
const startCronJob = require('../src/controllers/inactivityMailController');

// Start the cron job




require('dotenv').config({ path: '.env' })
app.use(express.json())

app.use('/student', studentRoutes)
app.use('/university', universityRoutes)
app.use('/courses', coursesRoutes)

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