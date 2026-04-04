const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  syncDataPlans,
  getDataPlans,
  getDataPlanById,
  getDataPlanStats,
  updateDataPlanPrices,
  clearDataPlanEdits,
  toggleDataPlanStatus,
  deleteDataPlan,
} = require('../controllers/dataPlanController');

router.get('/stats', getDataPlanStats);
router.get('/list', getDataPlans);
router.get('/:id', getDataPlanById);

router.use(protect, adminOnly);

router.post('/sync', syncDataPlans);
router.patch('/:id/prices', updateDataPlanPrices);
router.patch('/:id/clear-edits', clearDataPlanEdits);
router.patch('/:id/toggle-status', toggleDataPlanStatus);
router.delete('/:id', deleteDataPlan);

module.exports = router;
