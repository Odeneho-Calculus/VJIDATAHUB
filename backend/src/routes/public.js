const express = require('express');
const router = express.Router();
const { getReferralSettings, getPublicStats, getPublicSettings } = require('../controllers/adminController');
const { getPublicActivePlans } = require('../controllers/dataPlanController');

router.get('/referral-settings', getReferralSettings);
router.get('/settings', getPublicSettings);
router.get('/dataplans', getPublicActivePlans);
router.get('/stats', getPublicStats);

router.get('/business-status', (req, res) => {
  res.json({ success: true, data: { isOpen: true, message: 'Business is open' } });
});

module.exports = router;
