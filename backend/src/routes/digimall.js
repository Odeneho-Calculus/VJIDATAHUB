const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  syncOffers,
  getOffers,
  getStats,
  getNetworks,
  updatePrices,
  toggleStatus,
  updateStock,
  bulkDelete,
  deleteOffer,
  getWalletSettings,
} = require('../controllers/digimallController');

router.use(protect, adminOnly);

router.post('/sync', syncOffers);
router.get('/offers', getOffers);
router.get('/stats', getStats);
router.get('/wallet', getWalletSettings);
router.get('/networks', getNetworks);
router.patch('/offers/stock', updateStock);   // must be before /:id
router.patch('/:id/prices', updatePrices);
router.patch('/:id/toggle-status', toggleStatus);
router.delete('/offers', bulkDelete);          // must be before /:id
router.delete('/:id', deleteOffer);

module.exports = router;
