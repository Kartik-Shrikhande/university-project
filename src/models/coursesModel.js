
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    fees: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    courseImage: [{ type: String }],
    courseType:{
       type: String, 
       enum: ['fulltime', 'parttime','online'],
       required: true 
      },
    courseDuration : { type: String, required: true },
    ratings: [{ type: Number }],
    applicationDate: { 
      type: Date, 
      default: Date.now 
    },
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);


