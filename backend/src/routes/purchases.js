const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Purchase = require('../models/Purchase');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const {
  buyDataBundle,
  verifyDataPurchase,
  getOrders,
  getOrderById,
} = require('../controllers/purchaseController');

router.post('/buy', protect, buyDataBundle);

router.post('/verify', protect, verifyDataPurchase);

router.get('/orders', protect, getOrders);

router.get('/orders/:id', protect, getOrderById);

router.post('/create', protect, async (req, res) => {
  try {
    const { network, gb, price, recipient } = req.body;

    if (!network || !gb || !price || !recipient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    if (!['MTN', 'TELECEL', 'AIRTELTIGO'].includes(network)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid network' 
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.balance < price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient balance' 
      });
    }

    const purchase = await Purchase.create({
      userId: req.userId,
      network,
      gb,
      price,
      recipient,
      reference: 'PUR' + Date.now(),
      status: 'completed',
    });

    await User.findByIdAndUpdate(
      req.userId,
      { 
        $inc: { 
          balance: -price,
          totalSpent: price,
          dataUsed: gb
        } 
      }
    );

    await Transaction.create({
      userId: req.userId,
      type: 'purchase',
      amount: -price,
      reference: purchase.reference,
      status: 'completed',
      description: `${gb}GB ${network} to ${recipient}`,
    });

    res.status(201).json({ 
      success: true, 
      purchase: {
        id: purchase._id,
        network,
        gb,
        price,
        recipient,
        reference: purchase.reference,
        status: purchase.status,
        createdAt: purchase.createdAt,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/list', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const purchases = await Purchase.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    const total = await Purchase.countDocuments({ userId: req.userId });

    res.json({ 
      success: true, 
      purchases,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
