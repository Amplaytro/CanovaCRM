const Admin = require('../models/Admin');
const Employee = require('../models/User');

const getAccountModel = (accountType) => (
  accountType === 'admin' ? Admin : Employee
);

module.exports = {
  Admin,
  Employee,
  getAccountModel
};
