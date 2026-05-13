const express = require('express');
const router = express.Router();
const afaController = require('../controllers/afaController');
const { protect, adminOnly } = require('../middleware/auth');

// Public/User routes
router.get('/lock-status', protect, afaController.getAfaLockStatus);
router.post('/register', protect, afaController.registerAfa);
router.get('/my-registrations', protect, afaController.getMyAfaRegistrations);

// Admin routes
router.post('/sync', protect, adminOnly, afaController.syncAfaOffer);
router.get('/offer', protect, adminOnly, afaController.getAfaOffer);
router.put('/prices', protect, adminOnly, afaController.updateAfaPrices);
router.put('/lock-status', protect, adminOnly, afaController.updateAfaLockStatus);

// Public store AFA routes
router.get('/public-lock-status', afaController.getPublicAfaLockStatus);
router.get('/store/public/:slug/afa', afaController.getPublicStoreAfa);
router.post('/store/public/:slug/afa/purchase', afaController.initializePublicStoreAfaPurchase);
router.post('/store/public/afa/verify-payment', afaController.verifyPublicStoreAfaPayment);

module.exports = router;
