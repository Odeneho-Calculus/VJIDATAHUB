const express = require('express');
const router = express.Router();
const {
  getGuestDataPlans,
  initializeGuestPurchase,
  verifyGuestPayment,
  trackGuestOrders,
  getGuestOrderDetails,
} = require('../controllers/guestController');

// Public routes for guest purchases
router.get('/plans', getGuestDataPlans);
router.post('/purchase/initialize', initializeGuestPurchase);
router.post('/payment/verify', verifyGuestPayment);
router.get('/orders/track', trackGuestOrders);
router.get('/orders/details', getGuestOrderDetails);

module.exports = router;
