const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getUserSpending, currentMonth } = require('../services/spendingService');
const {
  getReferralStats,
  getReferralLeaderboard
} = require('../controllers/referralController');

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        totalSpent: (await getUserSpending(user._id)).totalSpent,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        referralCode: user.referralCode,
        referralEarnings: user.referralEarnings,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone },
      { new: true }
    );
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        totalSpent: (await getUserSpending(user._id)).totalSpent,
      }
    });
  } catch (error) {
    // Handle duplicate key error for phone number
    if (error.code === 11000 && error.keyPattern && error.keyPattern.phone) {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered to another account. Please use a different phone number.'
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/referrals/stats', protect, getReferralStats);
router.get('/referrals/leaderboard', getReferralLeaderboard);

router.get('/spending/monthly', protect, async (req, res) => {
  try {
    const month = req.query.month ?? currentMonth();
    const spending = await getUserSpending(req.userId, { month });
    res.json({ success: true, month, ...spending });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.get('/spending/summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)).toISOString().slice(0, 7));
    const summary = await Promise.all(months.map(async month => ({ month,
      totalSpent: (await getUserSpending(req.userId, { month })).totalSpent })));
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
