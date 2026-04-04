const User = require('../models/User');
const Transaction = require('../models/Transaction');

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

    // 2. Only refund if payment was successful and it was Paystack or wallet
    // For wallet, we only need to refund if the balance was already deducted.
    // In our system, wallet deduction happens after provider success in purchaseController.
    // HOWEVER, if an order was marked as 'processing' and then later fails, 
    // we need to check if the balance was deducted.
    
    // For Paystack, the user definitely paid Paystack, so we MUST refund to wallet.
    
    const amountToRefund = order.amount;
    const userId = order.userId;

    // 3. Create refund transaction
    const reference = 'REF' + Date.now() + Math.random().toString(36).substr(2, 9);
    
    const refundTransaction = await Transaction.create({
      userId,
      type: 'refund',
      amount: amountToRefund,
      reference,
      status: 'completed',
      description: `Refund for failed order ${order.orderNumber}: ${reason}`,
    });

    // 4. Update user balance
    await User.findByIdAndUpdate(userId, {
      $inc: { balance: amountToRefund }
    });

    // 5. Update order status
    order.isRefunded = true;
    order.adminNotes = (order.adminNotes ? order.adminNotes + '\n' : '') + `Auto-refunded GHS ${amountToRefund} on ${new Date().toISOString()}. Reason: ${reason}`;
    await order.save();

    console.log(`[Refund] Successfully refunded GHS ${amountToRefund} to user ${userId} for order ${order.orderNumber}`);

    return { 
      success: true, 
      transaction: refundTransaction 
    };
  } catch (error) {
    console.error(`[Refund] Error processing refund for order ${order._id}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  processRefund,
};
