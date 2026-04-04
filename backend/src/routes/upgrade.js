const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const userUpgradeController = require('../controllers/userUpgradeController');

router.get('/status', protect, userUpgradeController.getUpgradeStatus);
router.post('/initialize', protect, userUpgradeController.initializeUpgrade);
router.post('/verify', protect, userUpgradeController.verifyUpgrade);
router.post('/switch-role', protect, userUpgradeController.switchRole);

module.exports = router;
