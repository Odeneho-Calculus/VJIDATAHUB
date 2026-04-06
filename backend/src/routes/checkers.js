const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const checkerController = require('../controllers/checkerController');

router.get('/lock-status', checkerController.getCheckerLockStatus);
router.get('/availability', checkerController.getCheckerAvailability);
router.get('/types', checkerController.getCheckerTypes);
router.get('/store/public/:slug/checkers', checkerController.getPublicStoreCheckers);
router.post('/store/public/:slug/checkers/purchase', checkerController.initializePublicStoreCheckerPurchase);
router.post('/store/public/checkers/verify-payment', checkerController.verifyPublicStoreCheckerPayment);

router.use(protect);

router.get('/products/list', checkerController.getCheckerProductsList);
router.post('/check', checkerController.buyChecker);
router.post('/verify', checkerController.verifyCheckerPurchase);
router.get('/', checkerController.listMyCheckers);
router.get('/results', checkerController.listMyCheckers);

router.get('/store/my-store/checkers', checkerController.getMyStoreCheckerProducts);
router.get('/store/my-store/checkers/available', checkerController.getAvailableCheckerProductsForStore);
router.post('/store/my-store/checkers', checkerController.addCheckerToStore);
router.patch('/store/my-store/checkers/:checkerId', checkerController.updateStoreChecker);
router.delete('/store/my-store/checkers/:checkerId', checkerController.removeStoreChecker);

router.post('/sync', adminOnly, checkerController.syncCheckerOffers);
router.get('/offers', adminOnly, checkerController.getCheckerOffers);
router.patch('/lock', adminOnly, checkerController.updateCheckerLockStatus);
router.patch('/:id/prices', adminOnly, checkerController.updateCheckerPrices);
router.patch('/:id/toggle-status', adminOnly, checkerController.toggleCheckerStatus);
router.get('/:id', checkerController.getCheckerById);

module.exports = router;
