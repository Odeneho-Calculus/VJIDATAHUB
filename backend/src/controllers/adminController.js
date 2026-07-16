const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
// const Purchase = require('../models/Purchase');
const Order = require('../models/Order');
const ReferralSettings = require('../models/ReferralSettings');
const SystemSettings = require('../models/SystemSettings');
const Notification = require('../models/Notification');
const Store = require('../models/Store');
const AgentFeePayment = require('../models/AgentFeePayment');
const AgentCommissionPayout = require('../models/AgentCommissionPayout');
const SellerCommission = require('../models/SellerCommission');
const AgentCommissionAdjustment = require('../models/AgentCommissionAdjustment');
const CommissionLedger = require('../models/CommissionLedger');
const Referral = require('../models/Referral');
const Guest = require('../models/Guest');
const { creditCommissionForOrder, markAsWithdrawn, returnPendingToEarned } = require('../services/commissionService');
const topzaApi = require('../utils/topzaApi');
const { processRefund, processStoreOrderRefund } = require('../utils/refund');
// const { validatePhoneNumber } = require('../utils/phoneValidation');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

const skdataplugApi = require('../utils/skdataplugApi');
const { toAbbreviation, fromAbbreviation, planTypeToAbbreviation } = require('../utils/providerMap');

const getActiveApi = async () => {
  const settings = await SystemSettings.getSettings();
  const provider = settings?.vtuProvider || 'topza';
  if (provider === 'skdataplug') {
    return { api: skdataplugApi, provider: 'skdataplug' };
  }
  return { api: topzaApi, provider: 'topza' };
};

const normalizePaystackStatus = (status) => String(status || '').trim().toLowerCase();
const isPaystackReferenceNotFound = (message) => {
  const normalized = String(message || '').trim().toLowerCase();
  return normalized === 'transaction reference not found.' || normalized === 'transaction reference not found';
};

const processOrderAfterVerifiedPayment = async (order, paystackReference = null) => {
  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.status === 'completed' || order.status === 'processing') {
    return { success: true, message: 'Order already processed', order };
  }

  order.paymentStatus = 'completed';
  order.paidAt = order.paidAt || new Date();
  if (paystackReference) {
    order.paystackReference = paystackReference;
  }
  await order.save();

  await creditCommissionForOrder(order);

  const { api } = await getActiveApi();

  order.status = 'processing';
  await order.save();

  const idempotencyKey = 'TPZ' + order.orderNumber;
  const purchaseResponse = await api.purchaseDataBundle(order.apiPlanId, order.phoneNumber, order.network, null, idempotencyKey);

  if (!purchaseResponse.success) {
    order.status = 'failed';
    order.paymentStatus = 'failed';
    order.errorMessage = purchaseResponse.error || 'Provider order failed';
    await order.save();

    if (order.transactionId) {
      await Transaction.findByIdAndUpdate(order.transactionId, {
        status: 'failed',
        paymentStatus: 'failed',
      });
    }

    return {
      success: false,
      message: `Provider fulfillment failed: ${purchaseResponse.error || 'Unknown error'}`,
      order,
    };
  }

  const responseData = purchaseResponse.data || {};

  order.status = 'processing';
  order.externalOrderId = responseData.orderId || responseData.reference || responseData.transaction_code || responseData.order?.id;

  if (responseData.reference || responseData.orderId) {
    order.transactionReference = responseData.reference || responseData.orderId;
  }
  order.providerMessage = responseData.message || responseData.providerMessage;
  await order.save();

  if (order.transactionId) {
    const linkedTx = await Transaction.findById(order.transactionId);
    if (linkedTx) {
      linkedTx.status = 'completed';
      linkedTx.paymentStatus = 'completed';
      if (paystackReference) {
        linkedTx.paystackReference = paystackReference;
      }
      await linkedTx.save();
    }
  }

  return { success: true, message: 'Payment verified and order moved to processing', order };
};

exports.processOrderAfterVerifiedPayment = processOrderAfterVerifiedPayment;

exports.getDashboardStats = async (req, res) => {
  try {
    const userQuery = { $or: [{ role: 'user' }, { role: { $exists: false } }, { role: 'agent' }] };
    
    const userStatsResult = await User.aggregate([
      { $match: userQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          banned: { $sum: { $cond: [{ $eq: ['$status', 'banned'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          totalBalance: { $sum: '$balance' },
          totalReferralEarnings: { $sum: '$referralEarnings' }
        }
      }
    ]);

    const userStats = userStatsResult[0] || { 
      total: 0, 
      active: 0, 
      banned: 0, 
      suspended: 0, 
      totalBalance: 0, 
      totalReferralEarnings: 0 
    };

    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalTransactions = await Transaction.countDocuments();
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    // Calculate comprehensive agent earnings statistics from CommissionLedger
    const agentEarningsResult = await CommissionLedger.aggregate([
      {
        $group: {
          _id: null,
          availableBalance: { $sum: '$totalEarned' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          totalPending: { $sum: '$totalPending' },
          totalCommissions: { $sum: '$totalCommissions' }
        }
      }
    ]);

    const agentStats = agentEarningsResult[0] || {
      availableBalance: 0,
      totalWithdrawn: 0,
      totalPending: 0,
      totalCommissions: 0
    };

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: userStats.total,
        totalAdmins,
        activeUsers: userStats.active,
        bannedUsers: userStats.banned,
        suspendedUsers: userStats.suspended,
        totalTransactions: totalTransactions + totalOrders,
        totalPurchases: totalOrders,
        totalOrders,
        completedOrders,
        totalBalance: userStats.totalBalance,
        totalReferralEarnings: userStats.totalReferralEarnings,
        totalAgentEarnings: agentStats.totalCommissions,
        totalAgentWithdrawn: agentStats.totalWithdrawn,
        totalAgentPending: agentStats.totalPending,
        totalAgentRemaining: agentStats.availableBalance,
        totalAgentCommissions: agentStats.totalCommissions,
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role = 'all', search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (role === 'all') {
      query = { $or: [{ role: 'user' }, { role: { $exists: false } }, { role: 'agent' }] };
    } else if (role === 'user') {
      query = { $or: [{ role: 'user' }, { role: { $exists: false } }] };
    } else {
      query = { role };
    }

    if (search) {
      query = {
        $and: [
          query,
          {
            $or: [
              { email: { $regex: search, $options: 'i' } },
              { name: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    // Populate store data for agents
    const usersWithStoreData = await Promise.all(
      users.map(async (user) => {
        if (user.role === 'agent') {
          const store = await Store.findOne({ owner: user._id }).select('totalRevenue totalOrders');
          return {
            ...user.toObject(),
            store: store || null
          };
        }
        return user;
      })
    );

    const total = await User.countDocuments(query);

    const statsResult = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          banned: { $sum: { $cond: [{ $eq: ['$status', 'banned'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);
    const stats = statsResult[0] || { total: 0, active: 0, banned: 0, suspended: 0, totalBalance: 0 };

    res.status(200).json({
      success: true,
      users: usersWithStoreData,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update user details (admin only)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, isEmailVerified, walletOperation, walletAmount } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone || null;
    if (role) user.role = role;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;

    // Handle wallet adjustment
    if (walletOperation && walletAmount !== undefined) {
      const amount = parseFloat(walletAmount) || 0;
      const oldBalance = user.balance;
      let newBalance = oldBalance;
      let adjustmentType = 'none';

      if (walletOperation === 'credit') {
        newBalance = oldBalance + amount;
        adjustmentType = 'credit';
      } else if (walletOperation === 'deduct') {
        newBalance = oldBalance - amount;
        adjustmentType = 'deduct';
      } else if (walletOperation === 'set') {
        newBalance = amount;
        adjustmentType = 'set';
      }

      if (newBalance < 0) {
        return res.status(400).json({ success: false, message: 'Balance cannot be negative' });
      }

      if (adjustmentType !== 'none') {
        user.balance = newBalance;

        // Record the transaction
        await Transaction.create({
          userId: user._id,
          type: 'admin_adjustment',
          amount: Math.abs(newBalance - oldBalance),
          status: 'completed',
          paymentStatus: 'completed',
          reference: `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          description: `Admin balance adjustment (${walletOperation}): ${oldBalance} -> ${newBalance}`
        });
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Ban a user
 */
exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { banReason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'banned';
    user.banReason = banReason || 'No reason provided';
    await user.save();

    res.json({ success: true, message: 'User banned successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unban a user
 */
exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'active';
    user.banReason = null;
    await user.save();

    res.json({ success: true, message: 'User unbanned successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Suspend a user
 */
exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'suspended';
    user.suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await user.save();

    res.json({ success: true, message: 'User suspended successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unsuspend a user
 */
exports.unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'active';
    user.suspendedUntil = null;
    await user.save();

    res.json({ success: true, message: 'User unsuspended successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Temporarily delete a user (access restricted)
 */
exports.temporaryDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'temporarily_deleted';
    user.deletedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'User account temporarily deleted', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Permanently delete a user and all related records
 */
exports.permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete associated data
    await Transaction.deleteMany({ userId: user._id });
    await Order.deleteMany({ userId: user._id });
    await Store.deleteMany({ owner: user._id });
    await Referral.deleteMany({ $or: [{ referrer: user._id }, { referred: user._id }] });

    await user.deleteOne();

    res.json({ success: true, message: 'User and all related records permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Restore a temporarily deleted user
 */
exports.restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'active';
    user.deletedAt = null;
    await user.save();

    res.json({ success: true, message: 'User account restored successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user", "agent", or "admin"',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: { id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = '', status = '', scope = '' } = req.query;
    const skip = (page - 1) * limit;
    const parsedLimit = parseInt(limit);
    const bufferLimit = skip + parsedLimit;
    const ORDER_TRANSACTION_TYPES = ['data_purchase', 'checker_purchase', 'afa_registration'];
    const isOrderTypeFilter = ORDER_TRANSACTION_TYPES.includes(type);

    const allTransactions = [];

    const txFilter = {};
    const orderFilter = {};

    let agentUserIds = [];
    if (scope === 'agent') {
      const agents = await User.find({ role: 'agent' }).select('_id');
      agentUserIds = agents.map((agent) => agent._id);
      orderFilter.$or = [
        { source: 'store' },
        { storeId: { $ne: null } },
      ];
      txFilter.userId = { $in: agentUserIds };
    }

    if (type && !isOrderTypeFilter) {
      txFilter.type = type;
    }

    if (type === 'data_purchase') {
      orderFilter.orderKind = { $nin: ['checker', 'afa'] };
    }

    if (type === 'checker_purchase') {
      orderFilter.orderKind = 'checker';
    }

    if (type === 'afa_registration') {
      orderFilter.orderKind = 'afa';
    }

    if (status) {
      if (!type || isOrderTypeFilter) {
        if (status === 'successful') {
          orderFilter.status = 'completed';
        } else {
          orderFilter.status = status;
        }
      }
      if (!type || !isOrderTypeFilter) {
        txFilter.status = status;
      }
    }

    // Fetch orders with buffered limit for performance
    if (!type || isOrderTypeFilter) {
      const orders = await Order.find(orderFilter)
        .populate('userId', 'name email phone')
        .populate('guestInfo', 'name email phone')
        .populate({
          path: 'storeId',
          select: 'name slug owner',
          populate: { path: 'owner', select: 'name email phone' }
        })
        .sort({ createdAt: -1 })
        .limit(bufferLimit);

      const formattedOrders = orders.map(order => {
        // Determine the best display name for the customer
        let displayUser = order.userId;
        if (order.source === 'store' || order.storeId) {
          // For store orders, prefer guest info, then phone number
          if (order.guestInfo && (order.guestInfo.name || order.guestInfo.phone)) {
            displayUser = order.guestInfo;
          } else if (!order.userId || !order.userId.name) {
            // Fallback to phone number as name for data bundle store orders
            displayUser = {
              name: order.phoneNumber ? `Customer (${order.phoneNumber})` : 'Store Customer',
              email: '',
              phone: order.phoneNumber || '',
            };
          }
        }

        return {
          _id: order._id,
          userId: displayUser,
          isGuest: order.isGuest || false,
          guestInfo: order.guestInfo,
          type: order.orderKind === 'checker' ? 'checker_purchase' : (order.orderKind === 'afa' ? 'afa_registration' : 'data_purchase'),
          amount: order.amount,
          currency: 'GHS',
          status: order.status === 'completed' ? 'successful' : order.status,
          paymentStatus: order.paymentStatus,
          reference: order.orderNumber,
          transactionReference: order.transactionReference,
          paystackReference: order.paystackReference,
          description: order.orderKind === 'checker'
            ? `Result checker purchase: ${order.planName} (${order.phoneNumber || 'N/A'})`
            : (order.orderKind === 'afa'
              ? `AFA Registration: ${order.afaRegistration?.name || 'N/A'} (${order.phoneNumber || 'N/A'})`
              : `${order.planName} - ${order.dataAmount}`),
          isAPI: false,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          _isOrder: true,
          storeId: order.storeId,
          storeName: order.storeId?.name || null,
          agentName: order.storeId?.owner?.name || null,
          agentPhone: order.storeId?.owner?.phone || null,
        };
      });

      allTransactions.push(...formattedOrders);
    }

    // Fetch transactions with buffered limit for performance
    if (!type || !isOrderTypeFilter) {
      if (!type) {
        txFilter.type = { $nin: ORDER_TRANSACTION_TYPES };
      }

      const transactions = await Transaction.find(txFilter)
        .populate('userId', 'name email phone')
        .populate('guestId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(bufferLimit);

      allTransactions.push(...transactions);
    }

    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Compute accurate stats using fast count/aggregate queries
    let orderCount = 0;
    let txCount = 0;
    let orderSuccessful = 0;
    let orderPending = 0;
    let orderAmount = 0;
    let txSuccessful = 0;
    let txPending = 0;
    let txAmount = 0;

    if (!type || isOrderTypeFilter) {
      orderCount = await Order.countDocuments(orderFilter);
      const orderStatsAgg = await Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: null,
            successful: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['completed', 'successful', 'success']] },
                  1, 0
                ]
              }
            },
            pending: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$paymentStatus', 'pending'] },
                    { $ne: ['$status', 'failed'] }
                  ]},
                  1, 0
                ]
              }
            },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);
      const os = orderStatsAgg[0];
      if (os) {
        orderSuccessful = os.successful;
        orderPending = os.pending;
        orderAmount = os.totalAmount || 0;
      }
    }

    if (!type || !isOrderTypeFilter) {
      txCount = await Transaction.countDocuments(txFilter);
      const txStatsAgg = await Transaction.aggregate([
        { $match: txFilter },
        {
          $group: {
            _id: null,
            successful: {
              $sum: {
                $cond: [
                  { $or: [
                    { $in: [{ $toLower: { $ifNull: ['$status', ''] } }, ['completed', 'successful', 'success']] },
                    { $in: [{ $toLower: { $ifNull: ['$paymentStatus', ''] } }, ['completed', 'success']] }
                  ]},
                  1, 0
                ]
              }
            },
            pending: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: [{ $toLower: { $ifNull: ['$paymentStatus', ''] } }, 'pending'] },
                    { $ne: [{ $toLower: { $ifNull: ['$status', ''] } }, 'failed'] }
                  ]},
                  1, 0
                ]
              }
            },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);
      const ts = txStatsAgg[0];
      if (ts) {
        txSuccessful = ts.successful;
        txPending = ts.pending;
        txAmount = ts.totalAmount || 0;
      }
    }

    const total = orderCount + txCount;

    const stats = {
      total,
      successful: orderSuccessful + txSuccessful,
      pending: orderPending + txPending,
      totalAmount: orderAmount + txAmount,
    };

    const paginatedTransactions = allTransactions.slice(skip, skip + parsedLimit);

    res.status(200).json({
      success: true,
      transactions: paginatedTransactions,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyPendingPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    let transaction = await Transaction.findById(transactionId).populate('userId', 'name email balance');

    if (transaction) {
      const reference = transaction.reference;
      if (!reference) {
        return res.status(400).json({ success: false, message: 'Transaction reference missing' });
      }

      const verifyResponse = await paystackAPI.get(`/transaction/verify/${reference}`);
      const paystackData = verifyResponse?.data?.data;
      const paystackMsg = verifyResponse?.data?.message || '';

      if (!verifyResponse?.data?.status || !paystackData) {
        if (isPaystackReferenceNotFound(paystackMsg)) {
          transaction.status = 'failed';
          transaction.paymentStatus = 'failed';
          await transaction.save();

          const linkedOrder = await Order.findOne({
            $or: [
              { transactionId: transaction._id },
              { transactionReference: transaction.reference },
            ],
          });

          if (linkedOrder) {
            linkedOrder.status = 'failed';
            linkedOrder.paymentStatus = 'failed';
            linkedOrder.errorMessage = 'Paystack verification failed: Transaction reference not found.';
            await linkedOrder.save();
          }

          return res.status(400).json({ success: false, message: 'Transaction reference not found.' });
        }
        return res.status(400).json({ success: false, message: paystackMsg || 'Payment verification failed' });
      }

      const paystackStatus = normalizePaystackStatus(paystackData.status);
      if (paystackStatus !== 'success') {
        const linkedOrder = transaction.type === 'data_purchase'
          ? await Order.findOne({
            $or: [
              { transactionId: transaction._id },
              { transactionReference: transaction.reference },
            ],
          })
          : null;

        if (paystackStatus === 'ongoing') {
          transaction.status = 'pending';
          transaction.paymentStatus = 'pending';
          await transaction.save();

          if (linkedOrder) {
            linkedOrder.paymentStatus = 'pending';
            await linkedOrder.save();
          }

          return res.status(409).json({
            success: false,
            message: 'Payment is still pending on Paystack. Please verify again later.',
            paystackStatus: paystackData.status,
          });
        }

        transaction.status = 'failed';
        transaction.paymentStatus = 'failed';
        await transaction.save();

        if (linkedOrder) {
          linkedOrder.status = 'failed';
          linkedOrder.paymentStatus = 'failed';
          linkedOrder.errorMessage = `Paystack verification failed with status: ${paystackData.status}`;
          await linkedOrder.save();
        }

        return res.status(400).json({ success: false, message: 'Payment was not successful', paystackStatus: paystackData.status });
      }

      if (['wallet_topup', 'wallet_funding'].includes(transaction.type)) {
        const targetUserId = transaction.userId?._id || transaction.userId;

        if (!targetUserId) {
          return res.status(404).json({ success: false, message: 'User not found for wallet funding transaction' });
        }

        if (transaction.paymentStatus === 'completed') {
          console.log(`Transaction ${transaction._id} already completed - skipping balance update`);
          
          const refreshedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'name email balance');
          
          return res.status(200).json({
            success: true,
            message: 'Payment already verified and completed',
            transaction: refreshedTransaction,
            user: refreshedTransaction.userId,
          });
        }

        transaction.status = 'completed';
        transaction.paymentStatus = 'completed';
        transaction.paystackReference = paystackData.reference;
        await transaction.save();

        await User.findByIdAndUpdate(targetUserId, {
          $inc: { balance: Math.abs(Number(transaction.amount) || 0) },
        });

        console.log(`Wallet credited: ${transaction.amount} to user ${targetUserId}`);

        const refreshedTransaction = await Transaction.findById(transaction._id)
          .populate('userId', 'name email balance');

        return res.status(200).json({
          success: true,
          message: 'Payment verified and wallet credited successfully',
          transaction: refreshedTransaction,
          user: refreshedTransaction.userId,
        });
      }

      if (transaction.type === 'data_purchase') {
        const order = await Order.findOne({
          $or: [
            { transactionId: transaction._id },
            { transactionReference: transaction.reference },
          ],
        });

        if (!order) {
          return res.status(404).json({ success: false, message: 'Linked order not found for data purchase transaction' });
        }

        if (transaction.paymentStatus === 'completed' && order.paymentStatus === 'completed') {
          console.log(`Transaction ${transaction._id} and Order ${order._id} payment already verified - skipping re-verification`);
          
          const refreshedOrder = await Order.findById(order._id);
          const refreshedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'name email balance');
          
          return res.status(200).json({
            success: true,
            message: 'Payment already verified and order already processed',
            transaction: refreshedTransaction,
            order: {
              ...refreshedOrder.toObject(),
              provider: toAbbreviation(refreshedOrder.provider),
              planType: planTypeToAbbreviation(refreshedOrder.planType),
            },
          });
        }

        transaction.status = 'pending';
        transaction.paymentStatus = 'pending';
        transaction.paystackReference = paystackData.reference;
        await transaction.save();

        console.log(`Processing VTU order ${order._id} for transaction ${transaction._id}`);

        const fulfillmentResult = await processOrderAfterVerifiedPayment(order, paystackData.reference);

        if (fulfillmentResult.success) {
          transaction.status = 'completed';
          transaction.paymentStatus = 'completed';
          await transaction.save();
        }

        const refreshedOrder = await Order.findById(order._id);
        const refreshedTransaction = await Transaction.findById(transaction._id)
          .populate('userId', 'name email balance');

        if (!fulfillmentResult.success) {
          return res.status(400).json({
            success: false,
            message: fulfillmentResult.message,
            transaction: refreshedTransaction,
            order: {
              ...refreshedOrder.toObject(),
              provider: toAbbreviation(refreshedOrder.provider),
              planType: planTypeToAbbreviation(refreshedOrder.planType),
            },
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Payment verified and data purchase processing initiated',
          transaction: refreshedTransaction,
          order: {
            ...refreshedOrder.toObject(),
            provider: toAbbreviation(refreshedOrder.provider),
            planType: planTypeToAbbreviation(refreshedOrder.planType),
          },
        });
      }

      transaction.status = 'completed';
      transaction.paymentStatus = 'completed';
      transaction.paystackReference = paystackData.reference;
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        transaction,
      });
    }

    const order = await Order.findById(transactionId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Transaction/Order not found' });
    }

    const reference = order.transactionReference || order.paystackReference;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Order payment reference missing' });
    }

    if (order.paymentStatus === 'completed') {
      console.log(`Order ${order._id} payment already verified - skipping re-verification`);
      
      const refreshedOrder = await Order.findById(order._id);
      
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and order already processed',
        order: {
          ...refreshedOrder.toObject(),
          provider: toAbbreviation(refreshedOrder.provider),
          planType: planTypeToAbbreviation(refreshedOrder.planType),
        },
      });
    }

    const verifyResponse = await paystackAPI.get(`/transaction/verify/${reference}`);
    const paystackData = verifyResponse?.data?.data;
    const paystackMsg = verifyResponse?.data?.message || '';

    if (!verifyResponse?.data?.status || !paystackData) {
      if (isPaystackReferenceNotFound(paystackMsg)) {
        order.paymentStatus = 'failed';
        order.status = 'failed';
        order.errorMessage = 'Paystack verification failed: Transaction reference not found.';
        await order.save();

        if (order.transactionId) {
          await Transaction.findByIdAndUpdate(order.transactionId, {
            status: 'failed',
            paymentStatus: 'failed',
          });
        }

        return res.status(400).json({ success: false, message: 'Transaction reference not found.' });
      }
      return res.status(400).json({ success: false, message: paystackMsg || 'Payment verification failed' });
    }

    const paystackStatus = normalizePaystackStatus(paystackData.status);
    if (paystackStatus !== 'success') {
      if (paystackStatus === 'ongoing') {
        order.paymentStatus = 'pending';
        await order.save();

        if (order.transactionId) {
          await Transaction.findByIdAndUpdate(order.transactionId, {
            status: 'pending',
            paymentStatus: 'pending',
          });
        }

        return res.status(409).json({
          success: false,
          message: 'Payment is still pending on Paystack. Please verify again later.',
          paystackStatus: paystackData.status,
        });
      }

      order.paymentStatus = 'failed';
      order.status = 'failed';
      await order.save();

      if (order.transactionId) {
        await Transaction.findByIdAndUpdate(order.transactionId, {
          status: 'failed',
          paymentStatus: 'failed',
        });
      }

      return res.status(400).json({ success: false, message: 'Payment was not successful', paystackStatus: paystackData.status });
    }

    console.log(`Processing VTU order ${order._id} after payment verification`);

    const fulfillmentResult = await processOrderAfterVerifiedPayment(order, paystackData.reference);
    
    const refreshedOrder = await Order.findById(order._id);
    
    if (!fulfillmentResult.success) {
      return res.status(400).json({
        success: false,
        message: fulfillmentResult.message,
        order: {
          ...refreshedOrder.toObject(),
          provider: toAbbreviation(refreshedOrder.provider),
          planType: planTypeToAbbreviation(refreshedOrder.planType),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order processing started',
      order: {
        ...refreshedOrder.toObject(),
        provider: toAbbreviation(refreshedOrder.provider),
        planType: planTypeToAbbreviation(refreshedOrder.planType),
      },
    });
  } catch (error) {
    console.error('verifyPendingPayment error:', error.response?.data || error.message);

    const paystackMessage = error.response?.data?.message || error.message;
    if (isPaystackReferenceNotFound(paystackMessage)) {
      const { transactionId } = req.params;

      if (transactionId) {
        const transaction = await Transaction.findById(transactionId);

        if (transaction) {
          transaction.status = 'failed';
          transaction.paymentStatus = 'failed';
          await transaction.save();

          const linkedOrder = await Order.findOne({
            $or: [
              { transactionId: transaction._id },
              { transactionReference: transaction.reference },
            ],
          });

          if (linkedOrder) {
            linkedOrder.status = 'failed';
            linkedOrder.paymentStatus = 'failed';
            linkedOrder.errorMessage = 'Paystack verification failed: Transaction reference not found.';
            await linkedOrder.save();
          }
        } else {
          const order = await Order.findById(transactionId);
          if (order) {
            order.status = 'failed';
            order.paymentStatus = 'failed';
            order.errorMessage = 'Paystack verification failed: Transaction reference not found.';
            await order.save();

            if (order.transactionId) {
              await Transaction.findByIdAndUpdate(order.transactionId, {
                status: 'failed',
                paymentStatus: 'failed',
              });
            }
          }
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Transaction reference not found.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message,
    });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    let transaction = await Transaction.findByIdAndDelete(transactionId);
    let type = 'transaction';

    if (!transaction) {
      transaction = await Order.findByIdAndDelete(transactionId);
      type = 'order';
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Record not found in transactions or orders',
      });
    }

    res.status(200).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
      transaction: {
        id: transaction._id,
        reference: transaction.reference || transaction.orderNumber,
      },
    });
  } catch (error) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteAllTransactions = async (req, res) => {
  try {
    const result = await Transaction.deleteMany({});

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} transactions`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('deleteAllTransactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkDeleteTransactionsByStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['successful', 'pending', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be successful, pending, failed, or cancelled',
      });
    }

    const result = await Transaction.deleteMany({ status });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} transactions with status: ${status}`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('bulkDeleteTransactionsByStatus error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkDeleteTransactionsByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array',
      });
    }

    const result = await Transaction.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} transactions`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('bulkDeleteTransactionsByIds error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findByIdAndDelete(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    console.error('deleteOrder error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkDeleteOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, processing, completed, or failed',
      });
    }

    const result = await Order.deleteMany({ status });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} orders with status: ${status}`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('bulkDeleteOrdersByStatus error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkDeleteOrdersByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array',
      });
    }

    const result = await Order.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} orders`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('bulkDeleteOrdersByIds error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', network = '', scope = '', search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    const andConditions = [];

    if (status) {
      query.status = status;
    }

    if (network) {
      query.network = network;
    }

    if (scope === 'agent') {
      andConditions.push({
        $or: [
          { source: 'store' },
          { storeId: { $ne: null } },
        ],
      });
    }

    if (search && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: term, $options: 'i' };

      const [matchingUsers, matchingGuests] = await Promise.all([
        User.find({
          $or: [
            { name: regex },
            { email: regex },
            { phone: regex },
          ],
        }).select('_id').lean(),
        Guest.find({
          $or: [
            { name: regex },
            { email: regex },
            { phone: regex },
          ],
        }).select('_id').lean(),
      ]);

      const userIds = matchingUsers.map((u) => u._id);
      const storeQuery = {
        $or: [
          { name: regex },
          { slug: regex },
        ],
      };
      if (userIds.length > 0) {
        storeQuery.$or.push({ owner: { $in: userIds } });
      }
      const matchingStores = await Store.find(storeQuery).select('_id').lean();

      const searchConditions = [
        { orderNumber: regex },
        { phoneNumber: regex },
        { planName: regex },
        { network: regex },
      ];

      if (matchingUsers.length > 0) {
        searchConditions.push({ userId: { $in: matchingUsers.map((u) => u._id) } });
      }
      if (matchingGuests.length > 0) {
        searchConditions.push({ guestInfo: { $in: matchingGuests.map((g) => g._id) } });
      }
      if (matchingStores.length > 0) {
        searchConditions.push({ storeId: { $in: matchingStores.map((s) => s._id) } });
      }

      andConditions.push({ $or: searchConditions });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .populate('guestInfo', 'name email phone')
      .populate({
        path: 'storeId',
        select: 'name slug owner',
        populate: { path: 'owner', select: 'name email phone' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Get overall stats (not filtered by status/network)
    let statsQuery = {};
    if (scope === 'agent') {
      statsQuery.$or = [
        { source: 'store' },
        { storeId: { $ne: null } },
      ];
    }
    const [completed, pending, processing] = await Promise.all([
      Order.countDocuments({ ...statsQuery, status: 'completed' }),
      Order.countDocuments({ ...statsQuery, status: 'pending' }),
      Order.countDocuments({ ...statsQuery, status: 'processing' }),
    ]);

    // Get unique networks from all orders matching the scope (not paginated)
    // This ensures filter chips show all available networks
    const networkAggregation = await Order.aggregate([
      { $match: statsQuery },
      { $group: { _id: '$network' } },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
    ]);
    const networks = networkAggregation.map((n) => n._id).filter(Boolean);

    res.status(200).json({
      success: true,
      orders: orders.map(order => ({
        ...order.toObject(),
        provider: toAbbreviation(order.provider),
        planType: planTypeToAbbreviation(order.planType),
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: await Order.countDocuments(statsQuery),
        completed,
        pending,
        processing,
      },
      networks,
    });
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes = '' } = req.body;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, processing, completed, or failed',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.status = status;
    order.adminModified = true;
    order.adminModifiedAt = new Date();
    order.adminModifiedFields = ['status'];
    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    if (status === 'completed') {
      order.completedAt = new Date();
      order.completedBy = 'admin';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        ...order.toObject(),
        provider: toAbbreviation(order.provider),
        planType: planTypeToAbbreviation(order.planType),
      },
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query = {
        $or: [
          { referrerCode: { $regex: search, $options: 'i' } },
          { referredEmail: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const referrals = await Referral.find(query)
      .populate('referrerId', 'name email')
      .populate('referredId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments(query);

    res.status(200).json({
      success: true,
      referrals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getReferrals error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateReferralStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, active, or completed',
      });
    }

    const referral = await Referral.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Referral status updated successfully',
      referral,
    });
  } catch (error) {
    console.error('updateReferralStatus error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReferralSettings = async (req, res) => {
  try {
    let settings = await ReferralSettings.findOne();

    if (!settings) {
      settings = await ReferralSettings.create({
        amountPerReferral: 1,
        minimumWithdrawalAmount: 10,
        isEnabled: true,
        description: 'Earn GHS per successful referral',
      });
    }

    res.status(200).json({
      success: true,
      settings,
      data: settings, // Added for compatibility
    });
  } catch (error) {
    console.error('getReferralSettings error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateReferralSettings = async (req, res) => {
  try {
    const { isEnabled, amountPerReferral, description, minimumWithdrawalAmount, maxReferralsPerUser } = req.body;

    let settings = await ReferralSettings.findOne();

    if (!settings) {
      settings = new ReferralSettings();
    }

    if (isEnabled !== undefined) settings.isEnabled = isEnabled;
    if (amountPerReferral !== undefined) settings.amountPerReferral = amountPerReferral;
    if (description !== undefined) settings.description = description;
    if (minimumWithdrawalAmount !== undefined) settings.minimumWithdrawalAmount = minimumWithdrawalAmount;
    if (maxReferralsPerUser !== undefined) settings.maxReferralsPerUser = maxReferralsPerUser;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Referral settings updated successfully',
      settings,
      data: settings, // Compatibility
    });
  } catch (error) {
    console.error('updateReferralSettings error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    // Migrate legacy networkCatalog to per-provider catalogs if needed
    if (Array.isArray(settings.networkCatalog) && settings.networkCatalog.length > 0) {
      if (!Array.isArray(settings.topzaNetworkCatalog) || settings.topzaNetworkCatalog.length === 0) {
        settings.topzaNetworkCatalog = settings.networkCatalog;
      }
      if (!Array.isArray(settings.skdataplugNetworkCatalog) || settings.skdataplugNetworkCatalog.length === 0) {
        settings.skdataplugNetworkCatalog = settings.networkCatalog;
      }
      await settings.save();
    }

    // Return a sanitized copy with abbreviated provider names
    const sanitizedSettings = settings.toObject ? settings.toObject() : { ...settings };
    if (sanitizedSettings.vtuProvider) {
      sanitizedSettings.vtuProvider = toAbbreviation(sanitizedSettings.vtuProvider);
    }

    res.status(200).json({
      success: true,
      settings: sanitizedSettings,
    });
  } catch (error) {
    console.error('getSystemSettings error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const {
      vtuProvider,
      recruitNewAgents,
      agentFeeSettings,
      commissionSettings,
      transactionCharges,
      networkCatalog,
      topzaNetworkCatalog,
      skdataplugNetworkCatalog,
      contactDetails,
      orderSettings,
    } = req.body;

    if (vtuProvider !== undefined) settings.vtuProvider = fromAbbreviation(vtuProvider);
    if (recruitNewAgents !== undefined) settings.recruitNewAgents = recruitNewAgents;
    if (agentFeeSettings !== undefined) {
      settings.agentFeeSettings = { ...settings.agentFeeSettings, ...agentFeeSettings };
    }
    if (commissionSettings !== undefined) {
      settings.commissionSettings = { ...settings.commissionSettings, ...commissionSettings };
    }
    if (transactionCharges !== undefined) {
      settings.transactionCharges = { ...settings.transactionCharges, ...transactionCharges };
    }
    // Save network catalog to the correct provider-specific field
    if (topzaNetworkCatalog !== undefined) {
      settings.topzaNetworkCatalog = topzaNetworkCatalog;
      settings.networkCatalog = topzaNetworkCatalog;
    }
    if (skdataplugNetworkCatalog !== undefined) {
      settings.skdataplugNetworkCatalog = skdataplugNetworkCatalog;
      settings.networkCatalog = skdataplugNetworkCatalog;
    }
    // Legacy fallback: if frontend sends networkCatalog without provider prefix
    if (networkCatalog !== undefined && topzaNetworkCatalog === undefined && skdataplugNetworkCatalog === undefined) {
      settings.networkCatalog = networkCatalog;
      const provider = settings.vtuProvider || 'topza';
      if (provider === 'skdataplug') {
        settings.skdataplugNetworkCatalog = networkCatalog;
      } else {
        settings.topzaNetworkCatalog = networkCatalog;
      }
    }
    if (contactDetails !== undefined) {
      settings.contactDetails = { ...settings.contactDetails, ...contactDetails };
    }
    if (orderSettings !== undefined) {
      settings.orderSettings = { ...settings.orderSettings, ...orderSettings };
    }

    await settings.save();

    // Emit VTU provider change event if it was updated
    if (vtuProvider !== undefined && global.io) {
      global.io.to('vtu_updates').emit('vtu_provider_changed', {
        provider: toAbbreviation(settings.vtuProvider),
      });
    }

    // Return sanitized copy with abbreviated provider names
    const sanitizedSettings = settings.toObject ? settings.toObject() : { ...settings };
    if (sanitizedSettings.vtuProvider) {
      sanitizedSettings.vtuProvider = toAbbreviation(sanitizedSettings.vtuProvider);
    }

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings: sanitizedSettings,
    });
  } catch (error) {
    console.error('updateSystemSettings error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAgentStores = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    let ownerIds = [];

    if (search) {
      // Find users matching name or phone
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      }).select('_id').lean();

      ownerIds = matchingUsers.map((u) => u._id.toString());

      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { owner: { $in: ownerIds } },
      ];
    }

    if (status) {
      if (status === 'banned') {
        query.isTemporarilyBanned = true;
      } else if (status === 'active') {
        query.isTemporarilyBanned = false;
      }
    }

    const stores = await Store.find(query)
      .populate('owner', 'name email phone agentFeeStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Store.countDocuments(query);

    res.status(200).json({
      success: true,
      stores,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAgentStores error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAgentStoreDetails = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId)
      .populate('owner', 'name email phone agentFeeStatus');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    const ownerId = store.owner?._id;

    const [
      orders,
      transactions,
      commissions,
      payouts,
      feePayments,
      adjustments,
      ledger,
    ] = await Promise.all([
      Order.find({ storeId: store._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Transaction.find({ userId: ownerId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      SellerCommission.find({ storeId: store._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('orderId', 'orderNumber')
        .lean(),
      AgentCommissionPayout.find({ storeId: store._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      AgentFeePayment.find({ storeId: store._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      AgentCommissionAdjustment.find({ storeId: store._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('performedBy', 'name')
        .lean(),
      CommissionLedger.findOne({ storeId: store._id }).lean(),
    ]);

    const totalOrders = await Order.countDocuments({ storeId: store._id });
    const paidOrders = await Order.countDocuments({ storeId: store._id, paymentStatus: 'completed' });
    const failedOrders = await Order.countDocuments({ storeId: store._id, status: 'failed' });
    const paidPayouts = await AgentCommissionPayout.countDocuments({ storeId: store._id, status: 'paid' });
    const pendingPayouts = await AgentCommissionPayout.countDocuments({ storeId: store._id, status: { $in: ['pending', 'processing'] } });
    const commissionRecords = await SellerCommission.countDocuments({ storeId: store._id });

    const details = {
      agent: {
        name: store.owner?.name || 'N/A',
        email: store.owner?.email || 'N/A',
        phone: store.owner?.phone || 'N/A',
      },
      ledger: ledger
        ? {
            totalEarned: ledger.totalEarned || 0,
            totalPending: ledger.totalPending || 0,
            totalWithdrawn: ledger.totalWithdrawn || 0,
            totalCommissions: ledger.totalCommissions || 0,
          }
        : {
            totalEarned: 0,
            totalPending: 0,
            totalWithdrawn: 0,
            totalCommissions: 0,
          },
      stats: {
        totalOrders,
        paidOrders,
        failedOrders,
        paidPayouts,
        pendingPayouts,
        commissionRecords,
      },
      orders: orders.map(order => ({
        ...order,
        provider: toAbbreviation(order.provider),
        planType: planTypeToAbbreviation(order.planType),
      })),
      transactions,
      commissions,
      payouts,
      feePayments,
      adjustments,
    };

    res.status(200).json({
      success: true,
      details,
    });
  } catch (error) {
    console.error('getAgentStoreDetails error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.adjustCommission = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { type, amount, reason, note } = req.body;

    if (!type || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Type, amount, and reason are required',
      });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be credit or debit',
      });
    }

    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Get or create ledger
    let ledger = await CommissionLedger.findOne({ storeId });
    if (!ledger) {
      ledger = await CommissionLedger.create({
        storeId,
        storeOwnerId: store.owner,
        totalEarned: 0,
        totalPending: 0,
        totalWithdrawn: 0,
        totalCommissions: 0,
      });
    }

    const beforeBalance = ledger.totalEarned || 0;
    const adjustmentAmount = Math.abs(Number(amount));

    if (type === 'debit' && beforeBalance < adjustmentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for debit',
      });
    }

    const afterBalance = type === 'credit'
      ? beforeBalance + adjustmentAmount
      : beforeBalance - adjustmentAmount;

    // Update ledger
    ledger.totalEarned = afterBalance;
    await ledger.save();

    // Record adjustment
    const adjustment = await AgentCommissionAdjustment.create({
      storeId,
      agentId: store.owner,
      type,
      amount: adjustmentAmount,
      reason,
      performedBy: req.userId,
      beforeBalance,
      afterBalance,
      note: note || null,
    });

    res.status(200).json({
      success: true,
      message: `Commission ${type} applied successfully`,
      adjustment,
      ledger: {
        totalEarned: afterBalance,
      },
    });
  } catch (error) {
    console.error('adjustCommission error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.applyTemporaryBan = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { isApplying, durationDays, reason } = req.body;

    const store = await Store.findById(storeId).populate('owner');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    if (isApplying === false) {
      // Remove ban
      store.isTemporarilyBanned = false;
      store.temporaryBanReason = null;
      store.temporaryBanUntil = null;
      store.temporaryBanBy = null;
      await store.save();
      return res.status(200).json({
        success: true,
        message: 'Store ban removed successfully',
        store,
      });
    }

    // Apply ban
    if (!reason || !durationDays) {
      return res.status(400).json({
        success: false,
        message: 'Reason and durationDays are required',
      });
    }

    store.isTemporarilyBanned = true;
    store.temporaryBanReason = reason;
    store.temporaryBanUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    store.temporaryBanBy = req.userId;

    await store.save();

    res.status(200).json({
      success: true,
      message: `Store temporarily banned for ${durationDays} days`,
      store,
    });
  } catch (error) {
    console.error('applyTemporaryBan error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.activateProtocol = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId).populate('owner');
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    const user = store.owner;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Store owner not found',
      });
    }

    user.agentFeeStatus = 'protocol';
    user.protocolActivatedAt = new Date();
    user.protocolActivatedBy = req.userId;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Protocol activated and agent marked as paid',
      store,
    });
  } catch (error) {
    console.error('activateProtocol error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deactivateProtocol = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId).populate('owner');
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    const user = store.owner;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Store owner not found',
      });
    }

    user.agentFeeStatus = 'pending';
    user.protocolActivatedAt = null;
    user.protocolActivatedBy = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Protocol deactivated and store locked',
      store,
    });
  } catch (error) {
    console.error('deactivateProtocol error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAgentFeePayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const payments = await AgentFeePayment.find(query)
      .populate('agentId', 'name email')
      .populate('storeId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentFeePayment.countDocuments(query);

    res.status(200).json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAgentFeePayments error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCommissionPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const payouts = await AgentCommissionPayout.find(query)
      .populate('agentId', 'name email')
      .populate('storeId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentCommissionPayout.countDocuments(query);

    res.status(200).json({
      success: true,
      payouts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getCommissionPayouts error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.approveMobileMoneyPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionReference } = req.body;

    const payout = await AgentCommissionPayout.findById(payoutId);

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payout is not pending',
      });
    }

    payout.status = 'processing';
    payout.transactionReference = transactionReference;
    payout.processedAt = new Date();
    payout.processedBy = req.userId;

    await payout.save();

    res.status(200).json({
      success: true,
      message: 'Payout approved successfully',
      payout,
    });
  } catch (error) {
    console.error('approveMobileMoneyPayout error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.markPayoutAsPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { transactionReference, adminNote } = req.body;

    const payout = await AgentCommissionPayout.findById(payoutId);

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Payout must be processing before marking as paid',
      });
    }

    // Move from pending to withdrawn in ledger
    await markAsWithdrawn({ storeId: payout.storeId, amount: payout.amount });

    // Mark linked commission rows as withdrawn
    await SellerCommission.updateMany(
      { withdrawalRequestId: payout._id, status: 'pending_withdrawal' },
      { status: 'withdrawn' }
    );

    payout.status = 'paid';
    payout.paidAt = new Date();
    payout.paidBy = req.userId;
    if (transactionReference) {
      payout.transactionReference = transactionReference;
    }
    if (adminNote !== undefined) {
      payout.adminNote = adminNote;
    }

    await payout.save();

    res.status(200).json({
      success: true,
      message: 'Payout marked as paid',
      payout,
    });
  } catch (error) {
    console.error('markPayoutAsPaid error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.rejectCommissionPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { adminNote } = req.body;

    const payout = await AgentCommissionPayout.findById(payoutId);

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status !== 'pending' && payout.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Only pending or processing payouts can be rejected',
      });
    }

    // Return amount from pending back to earned in ledger
    await returnPendingToEarned({ storeId: payout.storeId, amount: payout.amount });

    // Restore linked commission rows back to earned
    await SellerCommission.updateMany(
      { withdrawalRequestId: payout._id, status: 'pending_withdrawal' },
      { status: 'earned', withdrawalRequestId: null }
    );

    payout.status = 'rejected';
    payout.rejectedAt = new Date();
    payout.rejectedBy = req.userId;
    if (adminNote !== undefined) {
      payout.adminNote = adminNote;
    }

    await payout.save();

    res.status(200).json({
      success: true,
      message: 'Payout rejected and commission restored',
      payout,
    });
  } catch (error) {
    console.error('rejectCommissionPayout error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTopzaWalletSettings = async (req, res) => {
  try {
    const { getWalletBalance } = require('../utils/topzaApi');
    const balanceResult = await getWalletBalance();
    const now = new Date();

    res.status(200).json({
      success: true,
      data: {
        lastSync: now,
        balance: balanceResult.success ? balanceResult.balance : 0,
        isPlaceholder: balanceResult.isPlaceholder || false,
        syncStatus: balanceResult.success ? 'Success' : 'Error',
        error: balanceResult.success ? null : balanceResult.error,
      },
    });
  } catch (error) {
    console.error('getTopzaWalletSettings error:', error);
    res.status(200).json({
      success: true,
      data: {
        lastSync: new Date(),
        balance: 0,
        syncStatus: 'Error',
        error: error.message,
      },
    });
  }
};

exports.getTopzaWalletTransactions = async (req, res) => {
  try {
    const { page = 1 } = req.query;

    res.status(200).json({
      success: true,
      data: {
        transactions: [],
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        totalTransactions: 0,
        hasNextPage: false,
      },
    });
  } catch (error) {
    console.error('getTopzaWalletTransactions error:', error);
    res.status(200).json({
      success: true,
      data: {
        transactions: [],
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalTransactions: 0,
        hasNextPage: false,
      },
      error: error.message,
    });
  }
};

/**
 * Manually refund an order (Admin only)
 */
exports.refundOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Manual admin refund' } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.isRefunded) {
      return res.status(400).json({ success: false, message: 'Order is already refunded' });
    }

    const isStoreOrder = order.storeId || order.source === 'store';
    const refundResult = isStoreOrder 
      ? await processStoreOrderRefund(order, reason)
      : await processRefund(order, reason);

    if (!refundResult.success) {
      return res.status(400).json({ success: false, message: refundResult.message || 'Refund failed' });
    }

    // Notify the correct user
    const notifyUserId = isStoreOrder ? refundResult.transaction?.userId || order.userId : order.userId;
    
    if (notifyUserId) {
      await Notification.create({
        userId: notifyUserId,
        type: 'refund',
        title: 'Order Refunded',
        message: `Your order ${order.orderNumber} has been refunded (GHS ${(refundResult.amountRefunded || order.amount).toFixed(2)})`,
        description: `Reason: ${reason}. The amount has been credited to your wallet.`,
        severity: 'info',
      });
    }

    const updatedOrder = await Order.findById(id).populate('userId').populate('storeId');

    res.status(200).json({
      success: true,
      message: 'Order refunded successfully',
      data: refundResult,
      order: {
        ...updatedOrder.toObject(),
        provider: toAbbreviation(updatedOrder.provider),
        planType: planTypeToAbbreviation(updatedOrder.planType),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate password reset link for a user (admin only)
 */
exports.generatePasswordResetLink = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Generate a JWT token for password reset
    const resetToken = require('jsonwebtoken').sign(
      { id: user._id, email: user.email, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    // Construct reset link using SITE_URL from .env
    const resetLink = `${process.env.SITE_URL}/reset-password?token=${resetToken}`;
    res.json({ success: true, link: resetLink });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
