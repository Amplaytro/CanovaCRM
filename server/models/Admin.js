const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

const adminSchema = accountSchema.clone();

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema, 'admin');
