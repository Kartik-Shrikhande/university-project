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
}, 
{ timestamps: true });

module.exports = mongoose.model('Students', studentsSchema);
