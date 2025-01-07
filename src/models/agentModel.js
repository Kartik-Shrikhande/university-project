const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Agent'], default: 'Agent' },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }], // Students handled by the agent
    agency: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency', required: true }, // The agency they belong to
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', agentSchema);
