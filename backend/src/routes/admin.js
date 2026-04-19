const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  getFullUserInfo,
  updateUserRole,
  toggleUserStatus,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
  deleteUser,
  restoreUser,
  updateUser,
  getTransactions,
  verifyPendingPayment,
  deleteTransaction,
  deleteAllTransactions,
  bulkDeleteTransactionsByStatus,
  bulkDeleteTransactionsByIds,
  getPurchases,
  getOrders,
  updateOrderStatus,
  refundOrder,
  deleteOrder,
  bulkDeleteOrdersByStatus,
  bulkDeleteOrdersByIds,
  getSystemSettings,
  updateSystemSettings,
  getXpresWalletSettings,
  getXpresWalletTransactions,
  generatePasswordResetLink,
} = require('../controllers/adminController');

const {
  getAllReferrals,
  updateReferralStatus,
  getReferralSettings,
  updateReferralSettings
} = require('../controllers/referralController');

const {
  getAgentStores,
  getAgentStoreDetails,
  adjustAgentStoreCommission,
  applyTemporaryBan,
  activateProtocol,
  deactivateProtocol,
  getAgentFeePayments,
  getCommissionPayouts,
  approveMobileMoneyPayout,
  markPayoutAsPaid,
  rejectCommissionPayout,
} = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.get('/users/:id/full-info', getFullUserInfo);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/restore', restoreUser);
router.patch('/users/:id', updateUser);
router.post('/users/:id/generate-reset-link', generatePasswordResetLink);
router.get('/transactions', getTransactions);
router.post('/transactions/:transactionId/verify-pending-payment', verifyPendingPayment);
router.delete('/transactions/bulk', bulkDeleteTransactionsByIds);
router.delete('/transactions/:id', deleteTransaction);
router.delete('/transactions', deleteAllTransactions);
router.post('/transactions/bulk-delete', bulkDeleteTransactionsByStatus);
router.get('/purchases', getPurchases);
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/refund', refundOrder);
router.delete('/orders/bulk', bulkDeleteOrdersByIds);
router.delete('/orders/:id', deleteOrder);
router.post('/orders/bulk-delete', bulkDeleteOrdersByStatus);

router.get('/referrals/settings', getReferralSettings);
router.patch('/referrals/settings', updateReferralSettings);
router.get('/referrals', getAllReferrals);
router.patch('/referrals/:referralId/status', updateReferralStatus);

router.get('/xpresdata/settings', getXpresWalletSettings);
router.get('/xpresdata/transactions', getXpresWalletTransactions);

// DigiMall wallet settings (admin)
router.get('/digimall/settings', (req, res) => require('../controllers/digimallController').getWalletSettings(req, res));
router.get('/topza/settings', (req, res) => require('../controllers/topzaController').getWalletSettings(req, res));
router.get('/topza/transactions', (req, res) => require('../controllers/topzaController').getWalletTransactions(req, res));

router.get('/settings', getSystemSettings);
router.patch('/settings', updateSystemSettings);

// Store governance
router.get('/agent-stores', getAgentStores);
router.get('/agent-stores/:storeId/details', getAgentStoreDetails);
router.post('/agent-stores/:storeId/commission-adjustment', adjustAgentStoreCommission);
router.patch('/agent-stores/:storeId/temporary-ban', applyTemporaryBan);
router.patch('/agent-stores/:storeId/protocol-activate', activateProtocol);
router.patch('/agent-stores/:storeId/protocol-deactivate', deactivateProtocol);

// Agent fees
router.get('/agent-fee-payments', getAgentFeePayments);

// Commission payouts
router.get('/agent-commission-payouts', getCommissionPayouts);
router.patch('/agent-commission-payouts/:payoutId/approve', approveMobileMoneyPayout);
router.patch('/agent-commission-payouts/:payoutId/paid', markPayoutAsPaid);
router.patch('/agent-commission-payouts/:payoutId/reject', rejectCommissionPayout);

module.exports = router;
