const Activity = require('../models/Activity');
const { getAccountModel } = require('../utils/accountModel');

// GET /api/settings/profile
const getProfile = async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.accountType);
    const user = await AccountModel.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/settings/profile
const updateProfile = async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.accountType);
    const user = await AccountModel.findById(req.user._id);
    const { firstName, lastName, email, password } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email.toLowerCase();
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    await Activity.create({
      type: 'profile_updated',
      message: `${req.accountType === 'admin' ? 'Admin' : 'Employee'} profile was updated`,
      relatedUser: req.accountType === 'employee' ? user._id : null
    });

    const updatedUser = await AccountModel.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile };
