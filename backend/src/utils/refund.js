const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');
const { reverseCommissionForOrder, resolveAdminPriceForOrder } = require('../services/commissionService');

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

/**
 * Processes a refund for a failed store order.
 * For store orders, the agent paid the admin base price to fulfill the order.
 * When the order fails, the admin base price is refunded to the agent's MAIN WALLET
 * (not commission ledger) so they can repurchase for the customer or refund the customer directly.
 * 
 * @param {Object} order - The store order document to refund
 * @param {string} reason - The reason for the refund
 * @returns {Promise<Object>} - The result of the refund process
 */
const processStoreOrderRefund = async (order, reason = 'Store order failed') => {
  try {
    // 1. Check if already refunded
    if (order.isRefunded) {
      console.log(`[StoreRefund] Order ${order.orderNumber} already refunded.`);
      return { success: false, message: 'Already refunded' };
    }

    // 2. Only process store orders
    if (!order.storeId || order.source !== 'store') {
      return { success: false, message: 'Not a store order' };
    }

    // 3. Find the store and its owner (agent)
    const store = await Store.findById(order.storeId).populate('owner', '_id name email');
    if (!store || !store.owner) {
      return { success: false, message: 'Store or store owner not found' };
    }

    const agentId = store.owner._id;

    // 4. Resolve the admin base price (cost to agent) — lookup from plan if not stored
    let adminBasePrice = order.adminBasePrice || 0;
    if (!adminBasePrice) {
      adminBasePrice = await resolveAdminPriceForOrder(order);
    }
    // Ensure we have a positive amount to refund
    if (!adminBasePrice || adminBasePrice <= 0) {
      adminBasePrice = order.amount || 0;
    }

    // 5. Reverse any earned commission for this order
    let commissionReversed = false;
    let reversedAmount = 0;
    if (order.commissionStatus === 'earned') {
      const reversalResult = await reverseCommissionForOrder(order);
      commissionReversed = reversalResult.reversed;
      reversedAmount = reversalResult.amount || 0;
    }

    // 6. Refund the admin base price to the agent's MAIN WALLET
    // This is the cost the agent would have paid to fulfill the order
    let walletCredited = false;
    if (adminBasePrice > 0) {
      await User.findByIdAndUpdate(agentId, {
        $inc: { balance: adminBasePrice }
      });
      walletCredited = true;
    }

    // 7. Create a refund transaction record for audit
    const reference = 'STOREREF' + Date.now() + Math.random().toString(36).substr(2, 9);
    const refundTransaction = await Transaction.create({
      userId: agentId,
      type: 'refund',
      amount: adminBasePrice,
      reference,
      status: 'completed',
      description: `Store order refund for failed order ${order.orderNumber}: ${reason}. Admin base price GHS ${adminBasePrice} credited to agent wallet.${commissionReversed ? ` Commission of GHS ${reversedAmount} reversed.` : ''}`,
    });

    // 8. Update order status
    order.isRefunded = true;
    order.adminNotes = (order.adminNotes ? order.adminNotes + '\n' : '') + 
      `Store order auto-refunded on ${new Date().toISOString()}. Reason: ${reason}. Admin base price GHS ${adminBasePrice} credited to agent wallet.`;
    await order.save();

    console.log(`[StoreRefund] Processed refund for store order ${order.orderNumber}. Agent: ${agentId}, Wallet credited: GHS ${adminBasePrice}, Commission reversed: ${commissionReversed}`);

    return { 
      success: true, 
      transaction: refundTransaction,
      amountRefunded: adminBasePrice,
      commissionReversed,
      walletCredited,
    };
  } catch (error) {
    console.error(`[StoreRefund] Error processing store order refund for order ${order._id}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  processRefund,
  processStoreOrderRefund,
};
