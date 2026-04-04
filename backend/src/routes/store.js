const express = require('express');
const router = express.Router();
const { protect, adminOrAgent } = require('../middleware/auth');
const storeController = require('../controllers/storeController');

// Private store owner APIs
router.get('/my-store', protect, adminOrAgent, storeController.getMyStore);
router.patch('/my-store', protect, adminOrAgent, storeController.updateMyStore);

// Store plans
router.get('/my-store/available-plans', protect, adminOrAgent, storeController.getAvailablePlans);
router.post('/my-store/plans', protect, adminOrAgent, storeController.addPlanToStore);
router.patch('/my-store/plans/:planId', protect, adminOrAgent, storeController.updateStorePlan);
router.delete('/my-store/plans/:planId', protect, adminOrAgent, storeController.removePlanFromStore);

// Store orders
router.get('/my-store/orders/stats', protect, adminOrAgent, storeController.getStoreOrderStats);
router.get('/my-store/orders', protect, adminOrAgent, storeController.getStoreOrders);

// Commissions
router.get('/my-store/commissions/summary', protect, adminOrAgent, storeController.getCommissionSummary);
router.get('/my-store/commissions/payouts', protect, adminOrAgent, storeController.getCommissionPayouts);
router.post('/my-store/commissions/payouts', protect, adminOrAgent, storeController.createCommissionPayout);

// Agent fee payment
router.get('/my-store/agent-fee/status', protect, adminOrAgent, storeController.getAgentFeeStatus);
router.post('/my-store/agent-fee/initialize', protect, adminOrAgent, storeController.initializeAgentFeePayment);
router.post('/my-store/agent-fee/verify', protect, adminOrAgent, storeController.verifyAgentFeePayment);

// Public store APIs (no auth required)
router.get('/public/:slug', storeController.getPublicStore);
router.get('/public/:slug/plans', storeController.getPublicStorePlans);
router.get('/public/:slug/track/:phone', storeController.trackGuestOrders);
router.post('/public/:slug/purchase', storeController.purchasePublicStoreBundle);
router.post('/public/verify-payment', storeController.verifyPublicStorePayment);

module.exports = router;
