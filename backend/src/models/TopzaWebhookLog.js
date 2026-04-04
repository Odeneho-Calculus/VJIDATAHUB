const mongoose = require('mongoose');

const topzaWebhookLogSchema = new mongoose.Schema(
  {
    event: { type: String, default: '' },
    signatureValid: { type: Boolean, default: false },
    handled: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    providerStatus: { type: String, default: '' },
    matchedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    matchedOrderNumber: { type: String, default: '' },
    orderStatusBefore: { type: String, default: '' },
    orderStatusAfter: { type: String, default: '' },
    requestMeta: {
      userAgent: { type: String, default: '' },
      signature: { type: String, default: '' },
      contentType: { type: String, default: '' },
    },
    identifiers: {
      orderId: { type: String, default: '' },
      orderNumber: { type: String, default: '' },
      reference: { type: String, default: '' },
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawBodySnippet: { type: String, default: '' },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

topzaWebhookLogSchema.index({ createdAt: -1 });
topzaWebhookLogSchema.index({ event: 1, createdAt: -1 });
topzaWebhookLogSchema.index({ handled: 1, createdAt: -1 });
topzaWebhookLogSchema.index({ signatureValid: 1, createdAt: -1 });

module.exports = mongoose.model('TopzaWebhookLog', topzaWebhookLogSchema);
