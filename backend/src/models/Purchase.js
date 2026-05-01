const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    gb: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    recipient: {
      type: String,
      required: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits and contain only numeric characters'],
    },
    reference: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
