const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.deletedAt) {
      return res.status(401).json({ success: false, message: 'User account has been deleted' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned. Reason: ' + (user.banReason || 'No reason provided') });
    }

    if (user.status === 'suspended') {
      if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
        user.status = 'active';
        user.suspendedUntil = null;
        await user.save();
      } else {
        return res.status(403).json({ success: false, message: 'Your account is suspended until ' + (user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleDateString() : 'further notice') });
      }
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const adminOrAgent = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !['admin', 'agent'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Admin or Agent access required' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { protect, adminOnly, adminOrAgent };
