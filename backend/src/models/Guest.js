const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: null,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      default: null,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient guest lookup searches
guestSchema.index({ email: 1, store: 1 });
guestSchema.index({ phone: 1, store: 1 });

module.exports = mongoose.model('Guest', guestSchema);
