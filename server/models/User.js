const mongoose = require('mongoose');
const accountSchema = require('./accountSchema');

const userSchema = accountSchema.clone();

userSchema.index({
  role: 1,
  status: 1,
  preferredLanguage: 1,
  assignedLeadsCount: 1
});

module.exports = mongoose.models.Employee || mongoose.model('Employee', userSchema, 'employees');
