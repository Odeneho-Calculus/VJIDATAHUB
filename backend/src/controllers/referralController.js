const Referral = require('../models/Referral');
const User = require('../models/User');
const ReferralSettings = require('../models/ReferralSettings');
const { createNotification } = require('./notificationController');

exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.userId;
    const referrals = await Referral.find({ referrer: userId }).populate('referredUser', 'name email createdAt');
    const settings = await ReferralSettings.findOne() || { amountPerReferral: 1 };

    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
    const approvedReferrals = referrals.filter(r => r.status === 'approved').length;
    const paidReferrals = referrals.filter(r => r.status === 'paid').length;
    const totalEarnings = referrals.filter(r => r.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        referrals,
        stats: {
          totalReferrals,
          pendingReferrals,
          approvedReferrals,
          paidReferrals,
          totalEarnings
        },
        settings: {
          amountPerReferral: settings.amountPerReferral,
          description: settings.description
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReferralLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.find({ referralEarnings: { $gt: 0 } })
      .select('name referralEarnings')
      .sort({ referralEarnings: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Controllers
exports.getAllReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate('referrer', 'name email')
      .populate('referredUser', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: referrals
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReferralStatus = async (req, res) => {
  try {
    const { referralId } = req.params;
    const { status } = req.body;

    if (!['approved', 'paid', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const referral = await Referral.findById(referralId).populate('referrer');
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    if (referral.status === 'paid' && status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot change status of a paid referral' });
    }

    const oldStatus = referral.status;
    referral.status = status;

    if (status === 'paid' && oldStatus !== 'paid') {
      referral.paidAt = new Date();
      
      // Update referrer's balance and earnings
      const referrer = referral.referrer;
      referrer.referralEarnings += referral.amount;
      referrer.balance += referral.amount;
      await referrer.save();

      await createNotification({
        type: 'referral_paid',
        userId: referrer._id,
        title: 'Referral Reward Paid',
        message: `You have received GHS ${referral.amount} for referring a new user!`,
        severity: 'success'
      });
    }

    await referral.save();

    res.status(200).json({
      success: true,
      message: `Referral status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReferralSettings = async (req, res) => {
  try {
    const settings = await ReferralSettings.findOne() || await ReferralSettings.create({});
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReferralSettings = async (req, res) => {
  try {
    const { amountPerReferral, description, isEnabled } = req.body;
    let settings = await ReferralSettings.findOne();
    
    if (!settings) {
      settings = new ReferralSettings();
    }

    if (amountPerReferral !== undefined) settings.amountPerReferral = amountPerReferral;
    if (description !== undefined) settings.description = description;
    if (isEnabled !== undefined) settings.isEnabled = isEnabled;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Referral settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
