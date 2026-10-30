const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');
const mongoose = require('mongoose');
const SellerCommission = require('../models/SellerCommission');
const CommissionLedger = require('../models/CommissionLedger');
const { reverseCommissionForOrder } = require('../services/commissionService');

/**
 * Processes a refund for a failed data purchase order (regular user orders)
 * @param {Object} order - The order document to refund
 * @param {string} reason - The reason for the refund
 * @returns {Promise<Object>} - The result of the refund process
 */
const processRefund = async (order, reason = 'Data purchase failed') => {
  try {
    // 1. Check if already refunded
    if (order.isRefunded) {
      console.log(`[Refund] Order ${order.orderNumber} already refunded.`);
      return { success: false, message: 'Already refunded' };
    }

    // 2. Determine amount to refund (base amount + any charges)
    const amountToRefund = (order.amount || 0) + (order.transactionCharge || 0);
    const userId = order.userId;

    if (!userId || order.isGuest) {
      return { success: false, message: order.isGuest ? 'Cannot auto-refund guest order to wallet' : 'No user associated with this order' };
    }

    // 3. Reverse agent commission if it was credited
    let commissionReversed = false;
    let reversedAmount = 0;
    if (order.commissionStatus === 'earned') {
      const reversalResult = await reverseCommissionForOrder(order);
      commissionReversed = reversalResult.reversed;
      reversedAmount = reversalResult.amount || 0;
    }

    // 4. Create refund transaction
    const reference = 'REF' + Date.now() + Math.random().toString(36).substr(2, 9);
    
    const refundTransaction = await Transaction.create({
      userId,
      type: 'refund',
      amount: amountToRefund,
      reference,
      status: 'completed',
      paymentStatus: 'completed',
      description: `Refund for failed order ${order.orderNumber}: ${reason}${commissionReversed ? ` (Commission of GHS ${reversedAmount} reversed)` : ''}`,
    });

    // 5. Update user balance
    await User.findByIdAndUpdate(userId, {
      $inc: { balance: amountToRefund }
    });

    // 6. Update order status
    order.isRefunded = true;
    order.adminNotes = (order.adminNotes ? order.adminNotes + '\n' : '') + `Auto-refunded GHS ${amountToRefund} on ${new Date().toISOString()}. Reason: ${reason}`;
    await order.save();

    console.log(`[Refund] Successfully refunded GHS ${amountToRefund} to user ${userId} for order ${order.orderNumber}. Commission reversed: ${commissionReversed}`);

    return { 
      success: true, 
      transaction: refundTransaction,
      amountRefunded: amountToRefund,
      commissionReversed
    };
  } catch (error) {
    console.error(`[Refund] Error processing refund for order ${order._id}:`, error);
    return { success: false, error: error.message };
  }
};

/** Refund the original selling price; payment fees are excluded. All writes commit together.
 * Requires MongoDB replica-set transactions. Never fall back to non-atomic writes.
 */
const processStoreOrderRefund = async (inputOrder, reason = 'Store order failed') => {
  let session;
  let result;
  const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const Order = require('../models/Order');
      const order = await Order.findById(inputOrder._id).session(session);
      if (!order) throw new Error('Order not found');
      if (order.isRefunded) {
        result = { success: false, message: 'Already refunded' };
        return;
      }
      if (!order.storeId || order.source !== 'store') throw new Error('Not a store order');
      if (order.paymentStatus !== 'completed') throw new Error('Only paid orders can be refunded');
      const amount = money(order.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid original selling price');
      const store = await Store.findById(order.storeId).session(session);
      if (!store?.owner) throw new Error('Store or store owner not found');

      // Read the actual credited record, including commissions already reserved or paid.
      const commission = await SellerCommission.findOne({ orderId: order._id }).session(session);
      if (!commission && order.commissionStatus === 'earned' && order.agentCommission > 0) {
        throw new Error('Earned commission record missing; manual reconciliation required');
      }
      if (commission && String(commission.storeOwnerId) !== String(store.owner)) {
        throw new Error('Store ownership changed; manual reconciliation required');
      }
      let reversedAmount = 0;
      let recoveredAmount = 0;
      if (commission && !commission.refundSettled && commission.status !== 'reversed') {
        const margin = money(commission.commissionEarned);
        if (!Number.isFinite(margin) || margin < 0 || margin > amount) {
          throw new Error('Invalid commission amount; manual reconciliation required');
        }
        let reserved = 0;
        if (commission.status !== 'earned') {
          if (commission.withdrawalAllocatedAmount != null) {
            reserved = Number(commission.withdrawalAllocatedAmount);
          } else {
            // Legacy requests marked the entire last row even for a partial payout.
            const Payout = require('../models/AgentCommissionPayout');
            const payout = await Payout.findById(commission.withdrawalRequestId).session(session);
            if (!payout) throw new Error('Commission payout missing; manual reconciliation required');
            const rows = await SellerCommission.find({ withdrawalRequestId: payout._id })
              .sort({ createdAt: 1, _id: 1 }).session(session);
            let remaining = Number(payout.amount);
            for (const row of rows) {
              const allocation = Math.min(Math.max(remaining, 0), Number(row.commissionEarned));
              if (String(row._id) === String(commission._id)) reserved = allocation;
              remaining -= allocation;
            }
          }
        }
        if (!Number.isFinite(reserved) || reserved < 0 || reserved > margin) {
          throw new Error('Invalid commission payout allocation');
        }
        const ledger = await CommissionLedger.findOne({ storeId: order.storeId }).session(session);
        if (!ledger) throw new Error('Commission ledger missing; manual reconciliation required');
        reversedAmount = Math.min(margin - reserved, ledger.totalEarned);
        ledger.totalEarned = money(ledger.totalEarned - reversedAmount);
        ledger.totalCommissions = money(Math.max(0, ledger.totalCommissions - reversedAmount));
        // Even a cash-only recovery writes the ledger, conflicting with concurrent
        // payout reservation so its allocation is re-read on transaction retry.
        ledger.markModified('totalEarned');
        await ledger.save({ session });
        recoveredAmount = money(margin - reversedAmount);
        if (commission.status === 'earned') commission.status = 'reversed';
        commission.refundReversedAmount = reversedAmount;
        commission.refundRecoveredAmount = recoveredAmount;
        commission.refundSettled = true;
        await commission.save({ session });
      }
      const netWalletCredit = money(amount - recoveredAmount);
      const user = await User.findByIdAndUpdate(store.owner,
        { $inc: { balance: netWalletCredit } }, { session, new: true });
      if (!user) throw new Error('Store owner wallet not found');
      const [transaction] = await Transaction.create([{
        userId: store.owner, type: 'refund', amount,
        reference: `STOREREF-${order._id}`, orderNumber: order.orderNumber,
        status: 'completed', paymentStatus: 'completed',
        description: `Store order ${order.orderNumber}: selling price GHS ${amount} refunded. Commission reversed GHS ${reversedAmount}; previously reserved/paid or unavailable commission recovered GHS ${recoveredAmount}. Net wallet credit GHS ${netWalletCredit}. Reason: ${reason}`,
      }], { session });
      if (recoveredAmount > 0) {
        await Transaction.create([{
          userId: store.owner, type: 'admin_adjustment', amount: -recoveredAmount,
          reference: `STOREREF-COMMISSION-${order._id}`, orderNumber: order.orderNumber,
          status: 'completed', paymentStatus: 'completed',
          description: `Recovery of commission already reserved/paid or unavailable for refunded store order ${order.orderNumber}`,
        }], { session });
      }
      order.isRefunded = true;
      order.commissionStatus = 'none';
      order.refundAmount = amount;
      order.refundCommissionRecovery = recoveredAmount;
      order.refundedAt = new Date();
      order.adminNotes = (order.adminNotes ? order.adminNotes + '\n' : '') +
        `Store refund: GHS ${amount}; commission recovery GHS ${recoveredAmount}; net wallet credit GHS ${netWalletCredit}. Reason: ${reason}`;
      await order.save({ session });
      result = { success: true, transaction, amountRefunded: amount, netWalletCredit,
        commissionRecovery: recoveredAmount, commissionReversed: reversedAmount > 0, walletCredited: true };
    });
    // Callers save this document again after webhook processing. Preserve refund state.
    if (result?.success) {
      inputOrder.refundedAt = new Date();
      inputOrder.isRefunded = true;
      inputOrder.commissionStatus = 'none';
      inputOrder.refundAmount = result.amountRefunded;
      inputOrder.refundCommissionRecovery = result.commissionRecovery;
    }
    return result;
  } catch (error) {
    console.error(`[StoreRefund] ${inputOrder.orderNumber}:`, error.message);
    return { success: false, message: error.message, error: error.message };
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = { processRefund, processStoreOrderRefund };
