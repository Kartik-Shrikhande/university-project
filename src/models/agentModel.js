const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Agent'], default: 'Agent' },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }], // Students handled by the agent
    agency: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Agency', 
      // default: '677f6b7c701bc85481046b64', // Optional default agency ID
    }, // The agency they belong to
    isDeleted: { 
      type: Boolean, 
      default: false, // Default value is false
      // required: true  // Ensures it is always present
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model('Agent', agentSchema);

