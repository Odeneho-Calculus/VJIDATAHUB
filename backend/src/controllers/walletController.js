const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SystemSettings = require('../models/SystemSettings');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

const normalizeCurrencyAmount = (value) => {
  const parsedValue = Number.parseFloat(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.round(parsedValue * 100) / 100;
};

exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, balance: user.balance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.initializePayment = async (req, res) => {
  try {
    const normalizedAmount = normalizeCurrencyAmount(req.body?.amount);

    if (normalizedAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for a very recent pending transaction to avoid duplicates (within last 30 seconds)
    const recentPending = await Transaction.findOne({
      userId: req.userId,
      type: 'wallet_topup',
      amount: normalizedAmount,
      status: 'pending',
      createdAt: { $gt: new Date(Date.now() - 30 * 1000) }
    });

    if (recentPending) {
      // If we found a very recent pending one, we could either return it or block
      // Let's block to prevent multiple windows/popups
      return res.status(429).json({
        success: false,
        message: 'A similar payment initialization is already in progress. Please wait.'
      });
    }

    const reference = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9);

    const sysSettings = await SystemSettings.getSettings();
    const walletFundingCharge = Math.round(((Number(sysSettings.transactionCharges?.walletFundingCharge) || 0) * 100)) / 100;
    const totalAmount = Math.round((normalizedAmount + walletFundingCharge) * 100) / 100;
    const paystackAmount = Math.round(totalAmount * 100);

    const transaction = await Transaction.create({
      userId: req.userId,
      type: 'wallet_topup',
      amount: normalizedAmount,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Wallet top-up of ${normalizedAmount.toFixed(2)}`,
    });

    const paystackPayload = {
      email: user.email,
      amount: paystackAmount,
      reference,
      metadata: {
        userId: req.userId.toString(),
        transactionId: transaction._id.toString(),
        type: 'wallet_topup',
        transactionCharge: walletFundingCharge,
      },
    };

    const response = await paystackAPI.post('/transaction/initialize', paystackPayload);

    if (!response.data.status) {
      return res.status(400).json({
        success: false,
        message: response.data.message,
      });
    }

    res.json({
      success: true,
      data: {
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        transactionId: transaction._id,
        walletFundingCharge,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Initialize payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference is required',
      });
    }

    const transaction = await Transaction.findOne({
      reference,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const response = await paystackAPI.get(`/transaction/verify/${reference}`);

    if (!response.data.status) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    const paystackData = response.data.data;

    if (paystackData.status !== 'success') {
      transaction.status = 'failed';
      transaction.paymentStatus = 'failed';
      await transaction.save();

      return res.json({
        success: false,
        message: 'Payment was not successful',
        status: paystackData.status,
      });
    }

    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          reference: transaction.reference,
          status: transaction.status,
          createdAt: transaction.createdAt,
        },
      });
    }

    transaction.status = 'completed';
    transaction.paymentStatus = 'completed';
    transaction.paystackReference = paystackData.reference;
    await transaction.save();

    const updateObj = { $inc: { balance: transaction.amount } };
    if (transaction.type === 'referral_bonus') {
      updateObj.$inc.referralEarnings = transaction.amount;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateObj,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Payment verified successfully',
      balance: user.balance,
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        reference: transaction.reference,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    const total = await Transaction.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      transactions,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyTransactionStatus = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference is required',
      });
    }

    const transaction = await Transaction.findOne({
      reference,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        reference: transaction.reference,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    // The adminOnly middleware ensures only admins get here
    const Order = require('../models/Order');

    let deleted = await Transaction.findByIdAndDelete(transactionId);

    if (!deleted) {
      deleted = await Order.findByIdAndDelete(transactionId);
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully by admin',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
