const jwt = require('jsonwebtoken');
const { Admin, Employee } = require('../utils/accountModel');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user = null;
      let accountType = decoded.accountType || null;

      if (accountType === 'admin') {
        user = await Admin.findById(decoded.id).select('-password');
      } else if (accountType === 'employee') {
        user = await Employee.findById(decoded.id).select('-password');
      } else {
        user = await Admin.findById(decoded.id).select('-password');
        accountType = user ? 'admin' : 'employee';
        if (!user) {
          user = await Employee.findById(decoded.id).select('-password');
        }
      }

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, account not found' });
      }

      req.user = user;
      req.accountType = accountType;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  return res.status(401).json({ message: 'Not authorized, no token' });
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.accountType === 'admin' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, adminOnly };
