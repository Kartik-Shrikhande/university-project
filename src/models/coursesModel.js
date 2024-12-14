const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true
 },
  description: {
     type: String
     },
  university: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'University', required: true 
},
fees:{
    type: String, 
    required: true
},
  ratings: [{ type: Number }],
}, 
{ timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
