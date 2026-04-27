const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'lead_assigned',
      'lead_status_updated',
      'lead_type_updated',
      'employee_created',
      'employee_updated',
      'employee_deleted',
      'employee_logged_in',
      'employee_logged_out',
      'lead_created',
      'csv_uploaded',
      'profile_updated',
      'attendance_checked_in',
      'attendance_checked_out',
      'break_started',
      'break_ended',
      'lead_scheduled'
    ]
  },
  message: {
    type: String,
    required: true
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  relatedLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  scheduledDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Activity', activitySchema);
