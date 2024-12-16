const mongoose = require('mongoose');

const studentsSchema = new mongoose.Schema({
  name: { 
    type: String,
     required: true
     },
  email: { 
    type: String,
     unique: true, 
     required: true
     },
  password: {
     type: String, 
     required: true 
    },
  isPaid: { 
    type: Boolean,
     default: false 
     //message 2) if paid , hey check universities 
    
    },
    lastActivity: { 
      type: Date, 
      default: Date.now 
    }, 
    razorpayOrderId: {
         type: String
         },
  enrolledUniversities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'University' }],
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  loginCompleted: {
    type: Boolean,
    default: false //message // untill logged in for first time //left the login or hevent heard you
  },
},  

{ timestamps: true });

module.exports = mongoose.model('Students', studentsSchema);
