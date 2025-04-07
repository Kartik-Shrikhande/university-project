const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // User receiving notification
  message: { type: String, required: true }, 
  type: { type: String, enum: ['Application', 'Payment', 'General'], required: true }, // Notification category
  isRead: { type: Boolean, default: false }, // Read/unread status
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema); 
