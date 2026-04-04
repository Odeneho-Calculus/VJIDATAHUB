const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  syncOffers,
  handleWebhook,
  getWebhookLogs,
  clearWebhookLogs,
  getOffers,
  getStats,
  getNetworks,
  getNetworkByCode,
  updatePrices,
  toggleStatus,
  updateStock,
  bulkDelete,
  deleteOffer,
  getWalletSettings,
} = require('../controllers/topzaController');

router.post('/webhook', handleWebhook);

router.use(protect, adminOnly);

router.get('/webhook/logs', getWebhookLogs);
router.delete('/webhook/logs', clearWebhookLogs);

router.post('/sync', syncOffers);
router.get('/offers', getOffers);
router.get('/stats', getStats);
router.get('/wallet', getWalletSettings);
router.get('/networks', getNetworks);
router.get('/networks/:code', getNetworkByCode);
router.patch('/offers/stock', updateStock);
router.patch('/:id/prices', updatePrices);
router.patch('/:id/toggle-status', toggleStatus);
router.delete('/offers', bulkDelete);
router.delete('/:id', deleteOffer);

module.exports = router;