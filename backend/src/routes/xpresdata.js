const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  syncOffers,
  getOffers,
  updateOfferPrices,
  toggleOfferStatus,
  deleteOffer,
  getOfferStats
} = require('../controllers/xpresDataOfferController');

router.use(protect, adminOnly);

router.get('/stats', getOfferStats);
router.get('/list', getOffers);
router.post('/sync', syncOffers);
router.patch('/:id/prices', updateOfferPrices);
router.patch('/:id/toggle-status', toggleOfferStatus);
router.delete('/:id', deleteOffer);

module.exports = router;
