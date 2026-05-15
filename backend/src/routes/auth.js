const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  resetPassword, 
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  getVerificationStatus,
  getPasswordResetStatus
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.get('/verification-status', getVerificationStatus);
router.get('/password-reset-status', getPasswordResetStatus);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.post('/change-password', protect, changePassword);

module.exports = router;
