const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const { resetPassword } = require('../controllers/authController');
router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.post('/reset-password', resetPassword);

module.exports = router;
