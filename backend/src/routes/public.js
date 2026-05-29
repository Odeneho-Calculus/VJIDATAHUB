const express = require('express');
const router = express.Router();
const { getReferralSettings, getSystemSettings } = require('../controllers/adminController');
const { getPublicActivePlans } = require('../controllers/dataPlanController');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

router.get('/referral-settings', getReferralSettings);
router.get('/settings', getSystemSettings);
router.get('/dataplans', getPublicActivePlans);
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, transactions, totalOrdersCompleted] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Order.countDocuments({ status: 'completed' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        transactions,
        totalOrdersCompleted,
        successRate: 0,
        uptime: 99.9,
        support: '24/7',
      },
    });
  } catch (err) {
    console.error('Error fetching public stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

router.get('/business-status', (req, res) => {
  res.json({ success: true, data: { isOpen: true, message: 'Business is open' } });
});

module.exports = router;
