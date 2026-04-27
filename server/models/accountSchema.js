const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    password: {
      type: String,
      required: true
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    preferredLanguage: {
      type: String,
      enum: ['marathi', 'kannada', 'hindi', 'english', 'bengali'],
      default: 'english'
    },
    assignedLeadsCount: {
      type: Number,
      default: 0
    },
    closedLeadsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

accountSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

accountSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

accountSchema.pre('save', function () {
  if (!this.employeeId && this.role !== 'admin') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '#';

    for (let i = 0; i < 12; i += 1) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.employeeId = id;
  }
});

module.exports = accountSchema;
