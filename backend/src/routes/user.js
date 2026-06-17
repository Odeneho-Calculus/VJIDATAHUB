const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
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
    const monthParam = req.query.month;
    const now = new Date();
    const month = monthParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const [transactionsAgg, ordersAgg] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: req.userId,
            createdAt: { $gte: startDate, $lt: endDate },
            type: { $in: ['data_purchase', 'checker_purchase', 'afa_purchase'] },
            status: { $in: ['completed', 'successful'] },
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            userId: req.userId,
            createdAt: { $gte: startDate, $lt: endDate },
            status: { $in: ['completed', 'successful'] },
            paymentStatus: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const txTotal = transactionsAgg[0]?.totalSpent || 0;
    const txCount = transactionsAgg[0]?.count || 0;
    const orderTotal = ordersAgg[0]?.totalSpent || 0;
    const orderCount = ordersAgg[0]?.count || 0;

    const totalSpent = Math.round((txTotal + orderTotal) * 100) / 100;
    const transactionCount = txCount + orderCount;

    const topUpAgg = await Transaction.aggregate([
      {
        $match: {
          userId: req.userId,
          createdAt: { $gte: startDate, $lt: endDate },
          type: { $in: ['wallet_topup', 'wallet_funding'] },
          status: { $in: ['completed', 'successful'] },
        },
      },
      {
        $group: {
          _id: null,
          totalTopUp: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalTopUp = Math.round((topUpAgg[0]?.totalTopUp || 0) * 100) / 100;

    res.json({
      success: true,
      month,
      totalSpent,
      totalTopUp,
      transactionCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/spending/summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const results = await Promise.all(
      months.map(async (month) => {
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 1);

        const [txAgg, orderAgg] = await Promise.all([
          Transaction.aggregate([
            {
              $match: {
                userId: req.userId,
                createdAt: { $gte: startDate, $lt: endDate },
                type: { $in: ['data_purchase', 'checker_purchase', 'afa_purchase'] },
                status: { $in: ['completed', 'successful'] },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
          Order.aggregate([
            {
              $match: {
                userId: req.userId,
                createdAt: { $gte: startDate, $lt: endDate },
                status: { $in: ['completed', 'successful'] },
                paymentStatus: 'completed',
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
        ]);

        const total = Math.round(((txAgg[0]?.total || 0) + (orderAgg[0]?.total || 0)) * 100) / 100;
        return { month, totalSpent: total };
      })
    );

    res.json({ success: true, summary: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
