const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getBalance,
  initializePayment,
  verifyPayment,
  getTransactions,
  verifyTransactionStatus,
  deleteTransaction,
} = require('../controllers/walletController');

router.get('/balance', protect, getBalance);

router.post('/initialize-payment', protect, initializePayment);

router.post('/verify-payment', protect, verifyPayment);

router.get('/transactions', protect, getTransactions);

router.delete('/transactions/:id', protect, adminOnly, deleteTransaction);

router.post('/verify-transaction-status', protect, verifyTransactionStatus);

module.exports = router;
