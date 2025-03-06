const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String,required: true},
    description2: { type: String },
    description3: { type: String },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    fees: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    courseImage: [{ type: String }],
    courseType: {
      type: String, 
      enum: ['fulltime', 'parttime', 'online'],
      required: true 
    },
    courseDuration: { type: String, required: true },
    ratings: [{ type: Number }],

    // seatingAvailability:{
    //   type: Number,
    //   default:0
    // },                    //keeping it for future
    
    applicationDate: { 
      type: Date, 
      default: Date.now 
    },
    expiryDate: { 
      type: Date, 
      required: true, // University must manually set this
    },
    isDeleted: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);

// Virtual field to calculate remaining days dynamically
courseSchema.virtual('daysRemaining').get(function () {
  const today = new Date();
  const timeDiff = this.expiryDate - today;
  return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24))); // Convert milliseconds to days
});

// Pre-save middleware to update course status if expired
courseSchema.pre('save', function (next) {
  if (this.expiryDate < new Date()) {
    this.status = 'Inactive';
  }
  next();
});

// Function to check and update expired courses automatically
courseSchema.statics.updateExpiredCourses = async function () {
  await this.updateMany(
    { expiryDate: { $lt: new Date() }, status: 'Active' },
    { $set: { status: 'Inactive' } }
  );
};

module.exports = mongoose.model('Course', courseSchema);

// const mongoose = require('mongoose');

// const courseSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     description: { type: String },
//     university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
//     fees: { type: Number, required: true },
//     status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
//     courseImage: [{ type: String }],
//     courseType:{
//        type: String, 
//        enum: ['fulltime', 'parttime','online'],
//        required: true 
//       },
//     courseDuration : { type: String, required: true },
//     ratings: [{ type: Number }],
//     applicationDate: { 
//       type: Date, 
//       default: Date.now 
//     },
//     isDeleted: { 
//       type: Boolean, 
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Course', courseSchema);


