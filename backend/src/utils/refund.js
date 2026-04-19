const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { reverseCommissionForOrder } = require('../services/commissionService');

/**
 * Processes a refund for a failed data purchase order
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

    if (!userId) {
      return { success: false, message: 'No user associated with this order' };
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

module.exports = {
  processRefund,
};
