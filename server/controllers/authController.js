const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');
const { Admin, Employee, getAccountModel } = require('../utils/accountModel');

const generateToken = (id, accountType) => {
  return jwt.sign({ id, accountType }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    let accountType = 'admin';
    let user = await Admin.findOne({ email: normalizedEmail });

    if (!user) {
      accountType = 'employee';
      user = await Employee.findOne({ email: normalizedEmail });
    }

    if (user && (await user.matchPassword(password))) {
      if (accountType === 'employee') {
        await Activity.create({
          type: 'employee_logged_in',
          message: `${user.firstName} ${user.lastName} logged in`,
          relatedUser: user._id
        });
      }

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        token: generateToken(user._id, accountType)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    if (req.accountType === 'employee') {
      await Activity.create({
        type: 'employee_logged_out',
        message: `${req.user.firstName} ${req.user.lastName} logged out`,
        relatedUser: req.user._id
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const AccountModel = getAccountModel(req.accountType);
    const user = await AccountModel.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login, logout, getMe };
