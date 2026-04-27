const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

const adminSchema = accountSchema.clone();

adminSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema, 'admin');
