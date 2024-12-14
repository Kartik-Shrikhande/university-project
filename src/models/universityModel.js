const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
  name: { 
    type: String,
     required: true
     },
  description: {
     type: String
     },
     location: {
      type: String
      },
      isPromoted: { 
        type: String, 
        enum: ['YES', 'NO'], 
        default: 'NO'
      },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  ratings: [{ type: Number }],
}, 
{ timestamps: true });

module.exports = mongoose.model('University', universitySchema);
