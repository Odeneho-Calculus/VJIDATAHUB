const express = require('express');
const router = express.Router();
const { register, login, getProfile, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

module.exports = router;
