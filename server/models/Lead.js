const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    required: true,
    enum: ['marathi', 'kannada', 'hindi', 'english', 'bengali'],
    lowercase: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['ongoing', 'closed', 'scheduled'],
    default: 'ongoing'
  },
  type: {
    type: String,
    enum: ['hot', 'warm', 'cold', 'scheduled', ''],
    default: 'warm'
  },
  scheduledDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for performance
leadSchema.index({ language: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ assignedAt: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('Lead', leadSchema);
