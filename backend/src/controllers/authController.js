/**
 * Reset password using token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    const jwt = require('jsonwebtoken');
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.password = password;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralSettings = require('../models/ReferralSettings');
const SystemSettings = require('../models/SystemSettings');
const Store = require('../models/Store');
const jwt = require('jsonwebtoken');
const { createNotification } = require('./notificationController');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, referralCode, role = 'user' } = req.body;

    // Validate role
    if (!['user', 'agent'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "agent"'
      });
    }

    // Check if agent recruitment is locked
    if (role === 'agent') {
      const settings = await SystemSettings.getSettings();
      if (!settings.recruitNewAgents) {
        return res.status(400).json({
          success: false,
          message: 'Agent registration is currently closed by administration'
        });
      }
    }

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and name'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const user = await User.create({
      email,
      password,
      name,
      phone,
      referredBy,
      role,
      agentFeeStatus: role === 'agent' ? 'pending' : undefined,
    });

    // If registering as agent, auto-create store
    if (role === 'agent') {
      const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
      await Store.create({
        owner: user._id,
        slug,
        name: name + "'s Store",
        description: '',
      });
    }

    if (referredBy) {
      const settings = await ReferralSettings.findOne() || { amountPerReferral: 1 };
      await Referral.create({
        referrer: referredBy,
        referredUser: user._id,
        amount: settings.amountPerReferral,
        status: 'pending'
      });
    }

    const token = generateToken(user._id);

    await createNotification({
      type: 'user_created',
      title: `New ${role === 'agent' ? 'Agent' : 'User'} Registration`,
      message: `New ${role} ${name} (${email}) has registered`,
      description: `A new ${role} account has been created with email: ${email}. Referral code: ${user.referralCode}`,
      severity: 'info',
      data: {
        userId: user._id,
        userName: name,
        userEmail: email,
        userRole: role,
      },
      actionUrl: `/admin/users/${user._id}`,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        totalSpent: user.totalSpent,
        dataUsed: user.dataUsed,
        referralEarnings: user.referralEarnings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deleted'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been banned. Reason: ' + (user.banReason || 'No reason provided')
      });
    }

    if (user.status === 'suspended') {
      if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
        user.status = 'active';
        user.suspendedUntil = null;
        await user.save();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Your account is suspended until ' + (user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleDateString() : 'further notice')
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        totalSpent: user.totalSpent,
        dataUsed: user.dataUsed,
        referralEarnings: user.referralEarnings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        totalSpent: user.totalSpent,
        dataUsed: user.dataUsed,
        referralEarnings: user.referralEarnings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
