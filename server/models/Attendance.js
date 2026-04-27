const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema(
  {
    startAt: {
      type: Date,
      required: true
    },
    endAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    attendanceDate: {
      type: Date,
      required: true,
      index: true
    },
    checkInAt: {
      type: Date,
      required: true
    },
    checkOutAt: {
      type: Date,
      default: null
    },
    breaks: {
      type: [breakSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ user: 1, attendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
