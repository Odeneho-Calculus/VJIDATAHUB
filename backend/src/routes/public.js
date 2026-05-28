const express = require('express');
const router = express.Router();
const { getReferralSettings, getSystemSettings } = require('../controllers/adminController');
const { getPublicActivePlans } = require('../controllers/dataPlanController');

router.get('/referral-settings', getReferralSettings);
router.get('/settings', getSystemSettings);
router.get('/dataplans', getPublicActivePlans);
router.get('/stats', (req, res) => {
  res.json({ success: true, data: { users: 0, orders: 0, revenue: 0 } });
});

router.get('/business-status', (req, res) => {
  res.json({ success: true, data: { isOpen: true, message: 'Business is open' } });
});

module.exports = router;
