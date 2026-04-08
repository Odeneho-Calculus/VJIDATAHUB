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
    res.json({ success: true, resetLink });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Purchase = require('../models/Purchase');
const Order = require('../models/Order');
const ReferralSettings = require('../models/ReferralSettings');
const SystemSettings = require('../models/SystemSettings');
const Notification = require('../models/Notification');
const Store = require('../models/Store');
const AgentFeePayment = require('../models/AgentFeePayment');
const AgentCommissionPayout = require('../models/AgentCommissionPayout');
const SellerCommission = require('../models/SellerCommission');
const AgentCommissionAdjustment = require('../models/AgentCommissionAdjustment');
const Referral = require('../models/Referral');
const Guest = require('../models/Guest');
const { creditCommissionForOrder, getOrCreateLedger, markAsWithdrawn, returnPendingToEarned } = require('../services/commissionService');
// XpresData and DigiMall supported
const xpresDataApi = require('../utils/xpresDataApi');
const digimallApi = require('../utils/digimallApi');
const topzaApi = require('../utils/topzaApi');
const { processRefund } = require('../utils/refund');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

const getActiveApi = async () => {
  const SystemSettings = require('../models/SystemSettings');
  const settings = await SystemSettings.getSettings();
  const provider = settings.vtuProvider || 'topza';
  if (provider === 'digimall') {
    return { api: digimallApi, provider: 'digimall' };
  }
  if (provider === 'topza') {
    return { api: topzaApi, provider: 'topza' };
  }
  return { api: xpresDataApi, provider: 'xpresdata' };
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

  const { api, provider } = await getActiveApi();

  order.status = 'processing';
  await order.save();

  let purchaseResponse;
  if (provider === 'xpresdata') {
    const [offerSlug, volume] = (order.apiPlanId || '').split('|');
    purchaseResponse = await api.purchaseDataBundle(offerSlug, order.phoneNumber, order.network, volume);
  } else if (provider === 'digimall') {
    // apiPlanId format for digimall: "offerSlug|volume"
    const [offerSlug, volume] = (order.apiPlanId || '').split('|');
    const idempotencyKey = 'DGM' + order.orderNumber;
    purchaseResponse = await api.purchaseDataBundle(offerSlug, order.phoneNumber, order.network, volume, idempotencyKey);
  } else if (provider === 'topza') {
    const idempotencyKey = 'TPZ' + order.orderNumber;
    purchaseResponse = await api.purchaseDataBundle(order.apiPlanId, order.phoneNumber, order.network, null, idempotencyKey);
  } else {
    purchaseResponse = await api.purchaseDataBundle(order.apiPlanId, order.phoneNumber, order.network);
  }

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

  if (provider === 'xpresdata' && responseData.reference) {
    order.transactionReference = responseData.reference;
  }
  if (provider === 'digimall' && (responseData.reference || responseData.orderId)) {
    order.transactionReference = responseData.reference || responseData.orderId;
  }
  if (provider === 'topza' && (responseData.reference || responseData.orderId)) {
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

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ $or: [{ role: 'user' }, { role: { $exists: false } }] });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeUsers = await User.countDocuments({ $and: [{ $or: [{ role: 'user' }, { role: { $exists: false } }] }, { isActive: true }] });
    const totalTransactions = await Transaction.countDocuments();
    const totalPurchases = await Purchase.countDocuments();
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    const totalBalance = await User.aggregate([
      { $match: { $or: [{ role: 'user' }, { role: { $exists: false } }] } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    const totalReferralEarnings = await User.aggregate([
      { $match: { $or: [{ role: 'user' }, { role: { $exists: false } }] } },
      { $group: { _id: null, total: { $sum: '$referralEarnings' } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        activeUsers,
        totalTransactions: totalTransactions + totalOrders,
        totalPurchases,
        totalOrders,
        completedOrders,
        totalBalance: totalBalance[0]?.total || 0,
        totalReferralEarnings: totalReferralEarnings[0]?.total || 0,
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
              { name: { $regex: search, $options: 'i' } }
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

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
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
    const ORDER_TRANSACTION_TYPES = ['data_purchase', 'checker_purchase'];
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
      orderFilter.orderKind = { $ne: 'checker' };
    }

    if (type === 'checker_purchase') {
      orderFilter.orderKind = 'checker';
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

    if (!type || isOrderTypeFilter) {
      const orders = await Order.find(orderFilter)
        .populate('userId', 'name email')
        .populate('guestInfo', 'name email phone')
        .sort({ createdAt: -1 });

      const formattedOrders = orders.map(order => {
        // console.log('[Admin Get Transactions] Data purchase order:', {
        //   orderId: order._id,
        //   amount: order.amount,
        //   dataPlanId: order.dataPlanId,
        //   status: order.status,
        // });
        return {
          _id: order._id,
          userId: order.userId,
          isGuest: order.isGuest || false,
          guestInfo: order.guestInfo,
          type: order.orderKind === 'checker' ? 'checker_purchase' : 'data_purchase',
          amount: order.amount,
          currency: 'GHS',
          status: order.status === 'completed' ? 'successful' : order.status,
          paymentStatus: order.paymentStatus,
          reference: order.orderNumber,
          transactionReference: order.transactionReference,
          paystackReference: order.paystackReference,
          description: order.orderKind === 'checker'
            ? `Result checker purchase: ${order.planName} (${order.phoneNumber || 'N/A'})`
            : `${order.planName} - ${order.dataAmount}`,
          isAPI: false,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          _isOrder: true,
        };
      });

      allTransactions.push(...formattedOrders);
    }

    if (!type || !isOrderTypeFilter) {
      // Exclude purchase types from Transaction model when listing all,
      // because purchase events are represented from Order model.
      // included from the Order model to avoid duplicates
      if (!type) {
        txFilter.type = { $nin: ORDER_TRANSACTION_TYPES };
      }

      const transactions = await Transaction.find(txFilter)
        .populate('userId', 'name email')
        .populate('guestId', 'name email phone')
        .sort({ createdAt: -1 });

      allTransactions.push(...transactions);
    }

    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      transactions: paginatedTransactions,
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

      if (!verifyResponse?.data?.status || !paystackData) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
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

        // Check if already completed
        if (transaction.paymentStatus === 'completed') {
          console.log(`Transaction ${transaction._id} already completed - skipping balance update`);
          
          // Re-populate transaction with fresh user data
          const refreshedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'name email balance');
          
          return res.status(200).json({
            success: true,
            message: 'Payment already verified and completed',
            transaction: refreshedTransaction,
            user: refreshedTransaction.userId,
          });
        }

        // Update transaction status first
        transaction.status = 'completed';
        transaction.paymentStatus = 'completed';
        transaction.paystackReference = paystackData.reference;
        await transaction.save();

        // Credit user wallet
        await User.findByIdAndUpdate(targetUserId, {
          $inc: { balance: Math.abs(Number(transaction.amount) || 0) },
        });

        console.log(`Wallet credited: ${transaction.amount} to user ${targetUserId}`);

        // Re-populate transaction with updated user data
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

          // Check if payment already verified (order status can be 'pending' while waiting for VTU sync)
          if (transaction.paymentStatus === 'completed' && order.paymentStatus === 'completed') {
            console.log(`Transaction ${transaction._id} and Order ${order._id} payment already verified - skipping re-verification`);
          
          // Refresh order data
          const refreshedOrder = await Order.findById(order._id);
          const refreshedTransaction = await Transaction.findById(transaction._id)
            .populate('userId', 'name email balance');
          
          return res.status(200).json({
            success: true,
            message: 'Payment already verified and order already processed',
            transaction: refreshedTransaction,
            order: refreshedOrder,
          });
        }

        // Keep transaction retryable until VTU fulfillment starts successfully.
        transaction.status = 'pending';
        transaction.paymentStatus = 'pending';
        transaction.paystackReference = paystackData.reference;
        await transaction.save();

        console.log(`Processing VTU order ${order._id} for transaction ${transaction._id}`);

        // Attempt to fulfill the order
        const fulfillmentResult = await processOrderAfterVerifiedPayment(order, paystackData.reference);

        if (fulfillmentResult.success) {
          transaction.status = 'completed';
          transaction.paymentStatus = 'completed';
          await transaction.save();
        }

        // Refresh data regardless of success/failure
        const refreshedOrder = await Order.findById(order._id);
        const refreshedTransaction = await Transaction.findById(transaction._id)
          .populate('userId', 'name email balance');

        if (!fulfillmentResult.success) {
          return res.status(400).json({
            success: false,
            message: fulfillmentResult.message,
            transaction: refreshedTransaction,
            order: refreshedOrder,
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Payment verified and data purchase processing initiated',
          transaction: refreshedTransaction,
          order: refreshedOrder,
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

      // Check if payment already verified (order status can be 'pending' while waiting for VTU sync)
      if (order.paymentStatus === 'completed') {
        console.log(`Order ${order._id} payment already verified - skipping re-verification`);
      
      // Refresh order data
      const refreshedOrder = await Order.findById(order._id);
      
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and order already processed',
        order: refreshedOrder,
      });
    }

    const verifyResponse = await paystackAPI.get(`/transaction/verify/${reference}`);
    const paystackData = verifyResponse?.data?.data;

    if (!verifyResponse?.data?.status || !paystackData) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
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
    
    // Refresh order data
    const refreshedOrder = await Order.findById(order._id);
    
    if (!fulfillmentResult.success) {
      return res.status(400).json({
        success: false,
        message: fulfillmentResult.message,
        order: refreshedOrder,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order processing started',
      order: refreshedOrder,
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

    // Try deleting from Transaction model first
    let transaction = await Transaction.findByIdAndDelete(transactionId);
    let type = 'transaction';

    // If not found in Transaction, try Order model
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
      message: `Deleted ${result.deletedCount} transaction(s)`,
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

exports.getPurchases = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const purchases = await Purchase.find()
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Purchase.countDocuments();

    res.status(200).json({
      success: true,
      purchases,
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

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, network, scope = '' } = req.query;
    const skip = (page - 1) * limit;

    const normalizeNetwork = (val = '') => val.toString().trim().toLowerCase().replace(/\s+/g, '');
    const getNetworkFamily = (n = '') => {
      if (!n) return '';
      if (n.startsWith('mtn')) return 'mtn';
      if (n.startsWith('telecel') || n.startsWith('vodafone')) return 'telecel';
      if (
        n.startsWith('airtel') || n.startsWith('tigo') || n.startsWith('at') ||
        n.includes('airteltigo') || n.includes('ishare')
      ) return 'at';
      return n;
    };
    const buildNetworkVariants = (value = '') => {
      const normalized = normalizeNetwork(value);
      const variants = new Set();
      if (!normalized) return variants;

      variants.add(normalized);

      const family = getNetworkFamily(normalized);
      if (family === 'mtn') {
        variants.add('mtn');
        variants.add('express(mtn)');
        variants.add('mtnup2u');
      } else if (family === 'telecel') {
        variants.add('telecel');
        variants.add('vodafone');
      } else if (family === 'at') {
        variants.add('airteltigo');
        variants.add('at-ishare');
        variants.add('atishare');
        variants.add('tigo');
        variants.add('airtel');
      }

      return variants;
    };

    const filter = {};
    if (status) filter.status = status;
    if (network) {
      const variants = Array.from(buildNetworkVariants(network));
      if (variants.length > 0) {
        const pattern = variants
          .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        filter.network = { $regex: pattern, $options: 'i' };
      } else {
        filter.network = network;
      }
    }
    if (scope === 'agent') {
      filter.$or = [
        { source: 'store' },
        { storeId: { $ne: null } },
      ];
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .populate('guestInfo', 'name email phone')
      .populate('dataPlanId', 'network dataSize planName')
      .populate('transactionId', 'reference amount status')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        orders: orders.map(order => ({
          _id: order._id,
          id: order._id,
          orderNumber: order.orderNumber,
          externalOrderId: order.externalOrderId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          user: order.userId,
          isGuest: order.isGuest || false,
          guestInfo: order.guestInfo,
          network: order.network,
          phoneNumber: order.phoneNumber,
          dataAmount: order.dataAmount,
          planName: order.planName,
          amount: order.amount,
          paymentMethod: order.paymentMethod,
          transactionReference: order.transactionReference,
          paystackReference: order.paystackReference,
          transaction: order.transactionId,
          providerStatus: order.providerStatus,
          providerMessage: order.providerMessage,
          errorMessage: order.errorMessage,
          adminNotes: order.adminNotes,
          date: order.createdAt,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFullUserInfo = async (req, res) => {
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

exports.banUser = async (req, res) => {
  try {
    const { banReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot ban admin users',
      });
    }

    user.status = 'banned';
    user.banReason = banReason || 'No reason provided';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User banned successfully',
      user: { id: user._id, status: user.status, banReason: user.banReason },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'active';
    user.banReason = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unbanned successfully',
      user: { id: user._id, status: user.status },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { days } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid suspension duration in days',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend admin users',
      });
    }

    const suspendedUntil = new Date();
    suspendedUntil.setDate(suspendedUntil.getDate() + days);

    user.status = 'suspended';
    user.suspendedUntil = suspendedUntil;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User suspended for ${days} days`,
      user: {
        id: user._id,
        status: user.status,
        suspendedUntil: user.suspendedUntil
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'active';
    user.suspendedUntil = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User suspension lifted',
      user: { id: user._id, status: user.status },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users',
      });
    }

    if (user.role === 'agent') {
      const stores = await Store.find({ owner: user._id }).select('_id');
      const storeIds = stores.map((store) => store._id);

      const orderQuery = {
        $or: [
          { userId: user._id },
          ...(storeIds.length ? [{ storeId: { $in: storeIds } }] : []),
        ],
      };

      await Promise.all([
        Order.deleteMany(orderQuery),
        Transaction.deleteMany({ userId: user._id }),
        Purchase.deleteMany({ userId: user._id }),
        Notification.deleteMany({ 'data.userId': user._id }),
        AgentFeePayment.deleteMany({
          $or: [
            { agentId: user._id },
            ...(storeIds.length ? [{ storeId: { $in: storeIds } }] : []),
          ],
        }),
        AgentCommissionPayout.deleteMany({
          $or: [
            { agentId: user._id },
            ...(storeIds.length ? [{ storeId: { $in: storeIds } }] : []),
          ],
        }),
        ...(storeIds.length ? [Guest.deleteMany({ store: { $in: storeIds } })] : []),
        ...(storeIds.length ? [Store.deleteMany({ _id: { $in: storeIds } })] : []),
        Referral.deleteMany({
          $or: [
            { referrer: user._id },
            { referredUser: user._id },
          ],
        }),
        User.updateMany({ referredBy: user._id }, { $set: { referredBy: null } }),
        User.findByIdAndDelete(user._id),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Agent and all related records permanently deleted',
        user: { id: user._id, role: user.role, isPermanent: true },
      });
    }

    // Hard Delete: If already soft-deleted, perform permanent removal
    if (user.deletedAt) {
      await Promise.all([
        Order.deleteMany({ userId: user._id }),
        Transaction.deleteMany({ userId: user._id }),
        Purchase.deleteMany({ userId: user._id }),
        Notification.deleteMany({ 'data.userId': user._id }), // Clean up notifications related to user
        Referral.deleteMany({
          $or: [
            { referrer: user._id },
            { referredUser: user._id },
          ],
        }),
        User.updateMany({ referredBy: user._id }, { $set: { referredBy: null } }),
        User.findByIdAndDelete(user._id)
      ]);

      return res.status(200).json({
        success: true,
        message: 'User and all related records permanently deleted',
        user: { id: user._id, deletedAt: user.deletedAt, isPermanent: true },
      });
    }

    // Soft Delete: Mark as deleted but preserve records
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User soft-deleted successfully',
      user: { id: user._id, deletedAt: user.deletedAt, isPermanent: false },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.deletedAt = null;
    user.status = 'active';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User restored successfully',
      user: { id: user._id, deletedAt: user.deletedAt },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, balance, role, walletOperation, walletAmount } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role === 'admin' && req.userId !== userId) {
      // Potentially restrict editing other admins unless super admin? 
      // For now, allow it but maybe add a note.
    }

    if (role && !['user', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user", "agent", or "admin"',
      });
    }

    const oldBalance = user.balance;

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;

    // Handle wallet operations (Credit/Deduct/Set)
    let finalBalance = user.balance;
    let adjustment = 0;
    let operationDesc = '';

    if (walletOperation && walletAmount !== undefined) {
      const amount = parseFloat(walletAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ success: false, message: 'Invalid wallet amount' });
      }

      if (walletOperation === 'credit') {
        adjustment = amount;
        finalBalance = oldBalance + amount;
        operationDesc = `Credit: +${amount.toFixed(2)}`;
      } else if (walletOperation === 'deduct') {
        if (oldBalance < amount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance to deduct GHS ${amount.toFixed(2)}. Current balance: GHS ${oldBalance.toFixed(2)}`
          });
        }
        adjustment = -amount;
        finalBalance = oldBalance - amount;
        operationDesc = `Deduct: -${amount.toFixed(2)}`;
      } else if (walletOperation === 'set') {
        adjustment = amount - oldBalance;
        finalBalance = amount;
        operationDesc = `Set Balance to: ${amount.toFixed(2)}`;
      }
    } else if (balance !== undefined) {
      // Backward compatibility for direct balance set
      const targetBalance = parseFloat(balance);
      if (targetBalance < 0) {
        return res.status(400).json({ success: false, message: 'Balance cannot be negative' });
      }
      adjustment = targetBalance - oldBalance;
      finalBalance = targetBalance;
      operationDesc = `Direct Set: ${targetBalance.toFixed(2)}`;
    }

    if (adjustment !== 0 || (walletOperation === 'set' && finalBalance !== oldBalance)) {
      user.balance = finalBalance;

      await Transaction.create({
        userId: user._id,
        type: 'admin_adjustment',
        amount: Math.abs(adjustment),
        reference: 'ADJ' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase(),
        status: 'successful',
        description: `Admin manual balance adjustment (${operationDesc}). Old: ${oldBalance.toFixed(2)}, New: ${finalBalance.toFixed(2)}`,
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = { referralEarnings: { $gt: 0 } };

    if (search) {
      query = {
        $and: [
          query,
          {
            $or: [
              { email: { $regex: search, $options: 'i' } },
              { name: { $regex: search, $options: 'i' } },
              { referralCode: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    const referrals = await User.find(query)
      .select('name email referralCode referralEarnings createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ referralEarnings: -1 });

    const total = await User.countDocuments(query);

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getReferralStats = async (req, res) => {
  try {
    const totalReferralUsers = await User.countDocuments({ referralEarnings: { $gt: 0 } });

    const topReferrers = await User.find({ referralEarnings: { $gt: 0 } })
      .select('name email referralCode referralEarnings')
      .sort({ referralEarnings: -1 })
      .limit(10);

    const totalReferralEarnings = await User.aggregate([
      { $match: { referralEarnings: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$referralEarnings' } } }
    ]);

    const averageEarnings = totalReferralUsers > 0
      ? (totalReferralEarnings[0]?.total || 0) / totalReferralUsers
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalReferralUsers,
        totalReferralEarnings: totalReferralEarnings[0]?.total || 0,
        averageEarningsPerReferrer: averageEarnings,
        topReferrers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateReferralEarnings = async (req, res) => {
  try {
    const { earnings } = req.body;

    if (earnings === undefined || earnings < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid earnings amount',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { referralEarnings: earnings },
      { new: true, runValidators: true }
    ).select('name email referralCode referralEarnings');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Referral earnings updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.resetReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.referralCode = 'REF' + user._id.toString().slice(-8).toUpperCase();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Referral code reset successfully',
      user: { id: user._id, referralCode: user.referralCode },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.resetAllReferralEarnings = async (req, res) => {
  try {
    const result = await User.updateMany(
      { referralEarnings: { $gt: 0 } },
      { referralEarnings: 0 }
    );

    res.status(200).json({
      success: true,
      message: 'All referral earnings reset successfully',
      updated: result.modifiedCount,
    });
  } catch (error) {
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
        maxReferralsPerUser: null,
        description: 'Earn GHS per successful referral',
      });
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateReferralSettings = async (req, res) => {
  try {
    const { amountPerReferral, minimumWithdrawalAmount, isEnabled, maxReferralsPerUser, description } = req.body;

    let settings = await ReferralSettings.findOne();

    if (!settings) {
      settings = await ReferralSettings.create({
        amountPerReferral: amountPerReferral ?? 1,
        minimumWithdrawalAmount: minimumWithdrawalAmount ?? 10,
        isEnabled: isEnabled ?? true,
        maxReferralsPerUser: maxReferralsPerUser ?? null,
        description: description ?? 'Earn GHS per successful referral',
      });
    } else {
      if (amountPerReferral !== undefined) settings.amountPerReferral = amountPerReferral;
      if (minimumWithdrawalAmount !== undefined) settings.minimumWithdrawalAmount = minimumWithdrawalAmount;
      if (isEnabled !== undefined) settings.isEnabled = isEnabled;
      if (maxReferralsPerUser !== undefined) settings.maxReferralsPerUser = maxReferralsPerUser;
      if (description !== undefined) settings.description = description;
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: 'Referral settings updated successfully',
      settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const orderId = req.params.id;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, processing, completed, or failed',
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const oldStatus = order.status;
    order.status = status;

    // Keep provider status aligned for Topza so admin UI does not show stale values.
    if (order.provider === 'topza') {
      const topzaStatusMap = {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
      };
      order.providerStatus = topzaStatusMap[status] || order.providerStatus;
    }

    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    if (status === 'completed' && !order.completedAt) {
      order.completedAt = new Date();
      order.completedBy = 'admin';
    }

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status,
      updatedAt: new Date(),
      source: 'admin',
      notes: adminNotes || null,
    });

    await order.save();

    // Auto refund if status changed to failed
    if (status === 'failed') {
      await processRefund(order, adminNotes || 'Status updated to failed by admin');
    }

    res.status(200).json({
      success: true,
      message: `Order status updated from ${oldStatus} to ${status}`,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        adminNotes: order.adminNotes,
        completedAt: order.completedAt,
        completedBy: order.completedBy,
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
      message: `Deleted ${result.deletedCount} order(s)`,
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

// Provider wallet functions below

// STORE GOVERNANCE FUNCTIONS

exports.getAgentStores = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ],
      }).select('_id');

      const ownerIds = matchingUsers.map((user) => user._id);

      query.$or = [
        { name: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
        { owner: { $in: ownerIds } },
      ];
    }

    if (status) {
      if (status === 'active') {
        query.isActive = true;
        query.isTemporarilyBanned = false;
      } else if (status === 'banned') {
        query.isTemporarilyBanned = true;
      }
    }

    const total = await Store.countDocuments(query);
    const stores = await Store.find(query)
      .populate('owner', 'name email phone agentFeeStatus agentFeePaidReference protocolActivatedAt protocolActivatedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      stores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAgentStoreDetails = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId)
      .populate('owner', 'name email phone role status balance referralEarnings totalSpent dataUsed isActive agentFeeStatus agentFeePaidAt agentFeePaidReference protocolActivatedAt protocolActivatedBy createdAt');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const ledger = await getOrCreateLedger(store._id, store.owner?._id || store.owner);

    const [
      orders,
      transactions,
      payouts,
      commissionRows,
      feePayments,
      adjustments,
      counts,
    ] = await Promise.all([
      Order.find({ storeId: store._id })
        .populate('guestInfo', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(30),
      Transaction.find({ userId: store.owner._id })
        .sort({ createdAt: -1 })
        .limit(30),
      AgentCommissionPayout.find({ storeId: store._id })
        .populate('paidBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(30),
      SellerCommission.find({ storeId: store._id })
        .populate('orderId', 'orderNumber amount paymentStatus status createdAt')
        .sort({ createdAt: -1 })
        .limit(50),
      AgentFeePayment.find({ storeId: store._id })
        .sort({ createdAt: -1 })
        .limit(20),
      AgentCommissionAdjustment.find({ storeId: store._id })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(50),
      Promise.all([
        Order.countDocuments({ storeId: store._id }),
        Order.countDocuments({ storeId: store._id, paymentStatus: 'completed' }),
        Order.countDocuments({ storeId: store._id, status: 'failed' }),
        SellerCommission.countDocuments({ storeId: store._id }),
        AgentCommissionPayout.countDocuments({ storeId: store._id, status: 'paid' }),
        AgentCommissionPayout.countDocuments({ storeId: store._id, status: { $in: ['pending', 'processing'] } }),
      ]),
    ]);

    const [totalOrders, paidOrders, failedOrders, commissionRecords, paidPayouts, pendingPayouts] = counts;

    res.status(200).json({
      success: true,
      details: {
        store,
        agent: store.owner,
        ledger,
        stats: {
          totalOrders,
          paidOrders,
          failedOrders,
          commissionRecords,
          paidPayouts,
          pendingPayouts,
        },
        orders,
        transactions,
        payouts,
        commissions: commissionRows,
        feePayments,
        adjustments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adjustAgentStoreCommission = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { type, amount, reason, note } = req.body;

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be credit or debit' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'reason is required' });
    }

    const store = await Store.findById(storeId).populate('owner', 'name email');
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const ledger = await getOrCreateLedger(store._id, store.owner._id);
    const beforeBalance = Number(ledger.totalEarned || 0);

    if (type === 'debit' && parsedAmount > beforeBalance) {
      return res.status(400).json({
        success: false,
        message: `Cannot debit beyond available earned balance (${beforeBalance})`,
      });
    }

    if (type === 'credit') {
      ledger.totalEarned += parsedAmount;
      ledger.totalCommissions += parsedAmount;
    } else {
      ledger.totalEarned -= parsedAmount;
      ledger.totalCommissions = Math.max(0, Number(ledger.totalCommissions || 0) - parsedAmount);
    }

    await ledger.save();

    const adjustment = await AgentCommissionAdjustment.create({
      storeId: store._id,
      agentId: store.owner._id,
      type,
      amount: parsedAmount,
      reason: String(reason).trim(),
      performedBy: req.userId,
      beforeBalance,
      afterBalance: Number(ledger.totalEarned || 0),
      note: note ? String(note).trim() : null,
    });

    await Transaction.create({
      userId: store.owner._id,
      type: 'admin_adjustment',
      amount: type === 'credit' ? parsedAmount : -parsedAmount,
      reference: `COM_ADJ_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      status: 'completed',
      paymentStatus: 'completed',
      description: `Admin commission ${type} for store ${store.name}: ${parsedAmount}. Reason: ${String(reason).trim()}`,
      isAPI: false,
    });

    res.status(200).json({
      success: true,
      message: `Commission ${type} applied successfully`,
      adjustment,
      ledger,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.applyTemporaryBan = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { isApplying, durationDays, reason } = req.body;

    if (isApplying && (!durationDays || !reason)) {
      return res.status(400).json({
        success: false,
        message: 'durationDays and reason required when applying ban'
      });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (isApplying) {
      store.isTemporarilyBanned = true;
      store.temporaryBanReason = reason;
      store.temporaryBanUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      store.temporaryBanBy = req.userId;
    } else {
      store.isTemporarilyBanned = false;
      store.temporaryBanReason = null;
      store.temporaryBanUntil = null;
      store.temporaryBanBy = null;
    }

    await store.save();

    res.status(200).json({
      success: true,
      store: store.toObject(),
      message: isApplying ? 'Ban applied' : 'Ban removed',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.activateProtocol = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const agent = await User.findById(store.owner);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const settings = await SystemSettings.getSettings();
    const protocolReference = `PROTOCOL_${store._id}_${Date.now()}`;

    // Create protocol fee payment
    const feePayment = await AgentFeePayment.create({
      agentId: agent._id,
      storeId: store._id,
      amount: settings.agentFeeSettings.registrationFee,
      reference: protocolReference,
      status: 'protocol',
      paidAt: new Date(),
    });

    // Update agent status
    agent.agentFeeStatus = 'paid';
    agent.agentFeePaidAt = new Date();
    agent.agentFeePaidReference = protocolReference;
    agent.protocolActivatedAt = new Date();
    agent.protocolActivatedBy = req.userId;
    await agent.save();

    // Clear temporary ban
    store.isTemporarilyBanned = false;
    store.temporaryBanReason = null;
    store.temporaryBanUntil = null;
    store.temporaryBanBy = null;
    await store.save();

    res.status(200).json({
      success: true,
      message: 'Protocol activation successful',
      feePayment: feePayment.toObject(),
      store: store.toObject(),
      agent: {
        _id: agent._id,
        email: agent.email,
        name: agent.name,
        agentFeeStatus: agent.agentFeeStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deactivateProtocol = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const agent = await User.findById(store.owner);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const isProtocolManaged =
      !!agent.protocolActivatedAt ||
      (typeof agent.agentFeePaidReference === 'string' && agent.agentFeePaidReference.startsWith('PROTOCOL_'));

    if (!isProtocolManaged) {
      return res.status(400).json({
        success: false,
        message: 'Protocol is not active for this agent',
      });
    }

    agent.agentFeeStatus = 'pending';
    agent.agentFeePaidAt = null;
    agent.agentFeePaidReference = null;
    agent.protocolActivatedAt = null;
    agent.protocolActivatedBy = null;
    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Protocol deactivated. Store is locked until agent fee is paid.',
      store: store.toObject(),
      agent: {
        _id: agent._id,
        email: agent.email,
        name: agent.name,
        agentFeeStatus: agent.agentFeeStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAgentFeePayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status === 'settled') {
      query.status = { $in: ['paid', 'protocol'] };
    } else if (status) {
      query.status = status;
    }

    const total = await AgentFeePayment.countDocuments(query);
    const payments = await AgentFeePayment.find(query)
      .populate('agentId', 'name email phone')
      .populate('storeId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCommissionPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const total = await AgentCommissionPayout.countDocuments(query);
    const payouts = await AgentCommissionPayout.find(query)
      .populate('agentId', 'name email phone')
      .populate('storeId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      payouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveMobileMoneyPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { requiresOtp, otpCode: _otpCode } = req.body;

    const payout = await AgentCommissionPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    if (payout.method !== 'mobile_money') {
      return res.status(400).json({ success: false, message: 'Payout is not mobile money type' });
    }

    // Mark as processing
    payout.status = 'processing';
    payout.paidBy = req.userId;
    await payout.save();

    // In a real implementation, this would call Paystack transfer API
    // For now, just mark as processing

    res.status(200).json({
      success: true,
      message: requiresOtp ? 'OTP required for transfer' : 'Payout approval initiated',
      payout: payout.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markPayoutAsPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { adminNote } = req.body;

    const payout = await AgentCommissionPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    payout.status = 'paid';
    payout.paidBy = req.userId;
    payout.paidAt = new Date();
    if (adminNote) payout.adminNote = adminNote;
    await payout.save();

    if (payout.storeId && payout.amount > 0) {
      await markAsWithdrawn({ storeId: payout.storeId, amount: payout.amount });
    }

    await SellerCommission.updateMany(
      { withdrawalRequestId: payout._id, status: 'pending_withdrawal' },
      { $set: { status: 'withdrawn' } }
    );

    res.status(200).json({
      success: true,
      message: 'Payout marked as paid',
      payout: payout.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectCommissionPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { adminNote } = req.body;

    const payout = await AgentCommissionPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    if (!['pending', 'processing'].includes(payout.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or processing payouts can be rejected' });
    }

    payout.status = 'rejected';
    payout.paidAt = null;
    if (adminNote) payout.adminNote = adminNote;
    await payout.save();

    if (payout.storeId && payout.amount > 0) {
      await returnPendingToEarned({ storeId: payout.storeId, amount: payout.amount });
    }

    await SellerCommission.updateMany(
      { withdrawalRequestId: payout._id, status: 'pending_withdrawal' },
      { $set: { status: 'earned', withdrawalRequestId: null } }
    );

    res.status(200).json({
      success: true,
      message: 'Payout rejected and commission returned to agent balance',
      payout: payout.toObject(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ $or: [{ role: 'user' }, { role: { $exists: false } }] });
    const totalOrders = await Order.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    const successRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalOrdersCompleted: completedOrders,
        transactions: totalOrders + totalTransactions,
        successRate: parseFloat(successRate),
        uptime: 99.9,
        support: '24/7',
      },
    });
  } catch (error) {
    console.error('getPublicStats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    // Only return public fields
    const networkCatalog = Array.isArray(settings.networkCatalog)
      ? settings.networkCatalog
          .filter((n) => n && n.isActive !== false)
          .map((n) => ({ name: n.name, slug: (n.slug && n.slug !== 'undefined') ? n.slug : n.name, logoUrl: n.logoUrl }))
      : [];

    const contactDetails = settings.contactDetails || {};
    const orderSettings = settings.orderSettings || {};

    const transactionCharges = settings.transactionCharges || {};

    res.status(200).json({
      success: true,
      settings: {
        vtuProvider: settings.vtuProvider,
        recruitNewAgents: settings.recruitNewAgents,
        registrationFee: settings.agentFeeSettings.registrationFee,
        networkCatalog,
        contactDetails: {
          phone: contactDetails.phone || '',
          whatsapp: contactDetails.whatsapp || '',
          whatsappGroup: contactDetails.whatsappGroup || '',
          email: contactDetails.email || '',
        },
        orderSettings: {
          duplicateOrderCooldownMinutes: Number(orderSettings.duplicateOrderCooldownMinutes) || 10,
          statusUpdateMethod: ['webhook', 'cron'].includes(orderSettings.statusUpdateMethod)
            ? orderSettings.statusUpdateMethod
            : 'cron',
          statusSyncIntervalMinutes: Number(orderSettings.statusSyncIntervalMinutes) || 5,
          statusSyncBatchLimit: Number(orderSettings.statusSyncBatchLimit) || 100,
        },
        transactionCharges: {
          dataPurchaseCharge: Number(transactionCharges.dataPurchaseCharge) || 0,
          walletFundingCharge: Number(transactionCharges.walletFundingCharge) || 0,
        },
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    // Normalize networkCatalog to ensure slug always has a value
    if (Array.isArray(settings.networkCatalog)) {
      settings.networkCatalog = settings.networkCatalog.map((n) => ({
        ...n,
        slug: (n.slug && n.slug !== 'undefined') ? n.slug : n.name,
      }));
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      networkCatalog,
      contactDetails,
      orderSettings,
    } = req.body || {};

    if (recruitNewAgents !== undefined) {
      settings.recruitNewAgents = !!recruitNewAgents;
    }

    if (vtuProvider !== undefined) {
      if (!['xpresdata', 'digimall', 'topza'].includes(vtuProvider)) {
        return res.status(400).json({ success: false, message: 'Invalid provider' });
      }
      settings.vtuProvider = vtuProvider;
      // Broadcast VTU provider change to all connected clients via Socket.IO
      if (global.io) {
        global.io.to('vtu_updates').emit('vtu_provider_changed', { provider: vtuProvider });
        console.log(`[VTU] Provider changed to '${vtuProvider}', broadcasting to clients`);
      }
    }

    if (agentFeeSettings && agentFeeSettings.registrationFee !== undefined) {
      const registrationFee = Number(agentFeeSettings.registrationFee);
      if (Number.isNaN(registrationFee) || registrationFee < 0) {
        return res.status(400).json({ success: false, message: 'Registration fee must be a valid non-negative number' });
      }
      settings.agentFeeSettings.registrationFee = registrationFee;
    }

    if (Array.isArray(networkCatalog)) {
      const normalized = networkCatalog
        .map((entry = {}) => {
          const name = (entry.name || '').toString().trim();
          if (!name) return null;
          let slug = (entry.slug || name).toString().trim();
          // Replace literal "undefined" string with name
          if (slug === 'undefined') {
            slug = name;
          }
          const logoUrl = (entry.logoUrl || '').toString().trim();
          const isActive = entry.isActive !== false;
          return { name, slug, logoUrl, isActive };
        })
        .filter(Boolean);

      settings.networkCatalog = normalized;
    }

    if (commissionSettings) {
      if (commissionSettings.minWithdrawal !== undefined) {
        const minWithdrawal = Number(commissionSettings.minWithdrawal);
        if (Number.isNaN(minWithdrawal) || minWithdrawal < 0) {
          return res.status(400).json({ success: false, message: 'Minimum withdrawal must be a valid non-negative number' });
        }
        settings.commissionSettings.minWithdrawal = minWithdrawal;
      }

      if (commissionSettings.maxWithdrawal !== undefined) {
        const maxWithdrawal = Number(commissionSettings.maxWithdrawal);
        if (Number.isNaN(maxWithdrawal) || maxWithdrawal < 0) {
          return res.status(400).json({ success: false, message: 'Maximum withdrawal must be a valid non-negative number' });
        }
        settings.commissionSettings.maxWithdrawal = maxWithdrawal;
      }

      if (
        commissionSettings.minWithdrawal !== undefined ||
        commissionSettings.maxWithdrawal !== undefined
      ) {
        const minValue = commissionSettings.minWithdrawal !== undefined
          ? Number(commissionSettings.minWithdrawal)
          : Number(settings.commissionSettings.minWithdrawal);
        const maxValue = commissionSettings.maxWithdrawal !== undefined
          ? Number(commissionSettings.maxWithdrawal)
          : Number(settings.commissionSettings.maxWithdrawal);

        if (minValue > maxValue) {
          return res.status(400).json({ success: false, message: 'Minimum withdrawal cannot be greater than maximum withdrawal' });
        }
      }

      if (commissionSettings.withdrawalFeeType !== undefined) {
        if (!['fixed', 'percentage'].includes(commissionSettings.withdrawalFeeType)) {
          return res.status(400).json({ success: false, message: 'Withdrawal fee type must be fixed or percentage' });
        }
        settings.commissionSettings.withdrawalFeeType = commissionSettings.withdrawalFeeType;
      }

      if (commissionSettings.withdrawalFeeValue !== undefined) {
        const withdrawalFeeValue = Number(commissionSettings.withdrawalFeeValue);
        if (Number.isNaN(withdrawalFeeValue) || withdrawalFeeValue < 0) {
          return res.status(400).json({ success: false, message: 'Withdrawal fee value must be a valid non-negative number' });
        }
        settings.commissionSettings.withdrawalFeeValue = withdrawalFeeValue;
      }
    }

    if (contactDetails) {
      if (!settings.contactDetails) settings.contactDetails = {};
      if (contactDetails.phone !== undefined) settings.contactDetails.phone = contactDetails.phone.trim();
      if (contactDetails.whatsapp !== undefined) settings.contactDetails.whatsapp = contactDetails.whatsapp.trim();
      if (contactDetails.whatsappGroup !== undefined) settings.contactDetails.whatsappGroup = contactDetails.whatsappGroup.trim();
      if (contactDetails.email !== undefined) settings.contactDetails.email = contactDetails.email.trim();
    }

    if (orderSettings && orderSettings.duplicateOrderCooldownMinutes !== undefined) {
      const duplicateOrderCooldownMinutes = Number(orderSettings.duplicateOrderCooldownMinutes);
      if (
        Number.isNaN(duplicateOrderCooldownMinutes) ||
        duplicateOrderCooldownMinutes < 1 ||
        duplicateOrderCooldownMinutes > 1440
      ) {
        return res.status(400).json({
          success: false,
          message: 'Order cooldown must be a valid number between 1 and 1440 minutes',
        });
      }
      if (!settings.orderSettings) settings.orderSettings = {};
      settings.orderSettings.duplicateOrderCooldownMinutes = Math.floor(duplicateOrderCooldownMinutes);
    }

    if (orderSettings && orderSettings.statusUpdateMethod !== undefined) {
      const statusUpdateMethod = String(orderSettings.statusUpdateMethod || '').trim().toLowerCase();
      if (!['webhook', 'cron'].includes(statusUpdateMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Status update method must be either webhook or cron',
        });
      }
      if (!settings.orderSettings) settings.orderSettings = {};
      settings.orderSettings.statusUpdateMethod = statusUpdateMethod;
    }

    if (orderSettings && orderSettings.statusSyncIntervalMinutes !== undefined) {
      const statusSyncIntervalMinutes = Number(orderSettings.statusSyncIntervalMinutes);
      if (
        Number.isNaN(statusSyncIntervalMinutes) ||
        statusSyncIntervalMinutes < 1 ||
        statusSyncIntervalMinutes > 60
      ) {
        return res.status(400).json({
          success: false,
          message: 'Status sync interval must be a valid number between 1 and 60 minutes',
        });
      }
      if (!settings.orderSettings) settings.orderSettings = {};
      settings.orderSettings.statusSyncIntervalMinutes = Math.floor(statusSyncIntervalMinutes);
    }

    if (orderSettings && orderSettings.statusSyncBatchLimit !== undefined) {
      const statusSyncBatchLimit = Number(orderSettings.statusSyncBatchLimit);
      if (
        Number.isNaN(statusSyncBatchLimit) ||
        statusSyncBatchLimit < 1 ||
        statusSyncBatchLimit > 500
      ) {
        return res.status(400).json({
          success: false,
          message: 'Status sync batch limit must be a valid number between 1 and 500',
        });
      }
      if (!settings.orderSettings) settings.orderSettings = {};
      settings.orderSettings.statusSyncBatchLimit = Math.floor(statusSyncBatchLimit);
    }

    if (req.body.transactionCharges) {
      const { dataPurchaseCharge, walletFundingCharge } = req.body.transactionCharges;
      if (!settings.transactionCharges) settings.transactionCharges = {};
      if (dataPurchaseCharge !== undefined) {
        const v = Number(dataPurchaseCharge);
        if (!Number.isNaN(v) && v >= 0) settings.transactionCharges.dataPurchaseCharge = v;
        else return res.status(400).json({ success: false, message: 'dataPurchaseCharge must be a non-negative number' });
      }
      if (walletFundingCharge !== undefined) {
        const v = Number(walletFundingCharge);
        if (!Number.isNaN(v) && v >= 0) settings.transactionCharges.walletFundingCharge = v;
        else return res.status(400).json({ success: false, message: 'walletFundingCharge must be a non-negative number' });
      }
    }

    await settings.save();
    res.status(200).json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getXpresWalletSettings = async (req, res) => {
  try {
    const { getWalletBalance } = require('../utils/xpresDataApi');
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
    console.error('getXpresWalletSettings error:', error);
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

exports.getXpresWalletTransactions = async (req, res) => {
  try {
    const { page = 1 } = req.query;

    // Note: XpresPortal API might not have a public transaction history API
    // Returning empty for now as placeholder
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
    console.error('getXpresWalletTransactions error:', error);
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
