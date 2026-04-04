const mongoose = require('mongoose');

const referralSettingsSchema = new mongoose.Schema(
  {
    amountPerReferral: {
      type: Number,
      default: 1,
      min: 0,
      description: 'Amount in GHS earned per successful referral',
    },
    minimumWithdrawalAmount: {
      type: Number,
      default: 10,
      min: 0,
      description: 'Minimum referral earnings required to withdraw',
    },
    isEnabled: {
      type: Boolean,
      default: true,
      description: 'Whether the referral program is active',
    },
    maxReferralsPerUser: {
      type: Number,
      default: null,
      description: 'Maximum number of referrals per user (null = unlimited)',
    },
    description: {
      type: String,
      default: 'Earn GHS per successful referral',
      description: 'Program description displayed to users',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralSettings', referralSettingsSchema);
