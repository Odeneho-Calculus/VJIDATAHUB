const { getUserSpending } = require('../services/spendingService');
const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralSettings = require('../models/ReferralSettings');
const SystemSettings = require('../models/SystemSettings');
const Store = require('../models/Store');
const jwt = require('jsonwebtoken');
const { createNotification } = require('./notificationController');
const { validatePhoneNumber, toInternationalFormat } = require('../utils/phoneValidation');
const crypto = require('crypto');
const axios = require('axios');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

/**
 * Verify email using token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    console.log(`[VerifyEmail] Attempting to verify with token: ${token}`);

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log(`[VerifyEmail] No user found for token or token expired: ${token}`);
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    console.log(`[VerifyEmail] Found user: ${user.email}. Updating isEmailVerified to true using findOneAndUpdate.`);

    await User.findOneAndUpdate(
      { _id: user._id },
      { 
        $set: { 
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        } 
      }
    );

    console.log(`[VerifyEmail] User ${user.email} verified successfully via findOneAndUpdate.`);

    res.json({ success: true, message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    console.error(`[VerifyEmail] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get verification status (attempts remaining, cooldown)
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Reset attempts if 24 hours have passed since last attempt
    let currentAttempts = user.emailVerificationAttempts;
    if (user.lastEmailVerificationAttempt && user.lastEmailVerificationAttempt <= twentyFourHoursAgo) {
      currentAttempts = 0;
    }

    const attemptsRemaining = Math.max(0, 3 - currentAttempts);
    let cooldownSeconds = 0;

    if (currentAttempts >= 3 && user.lastEmailVerificationAttempt && user.lastEmailVerificationAttempt > twentyFourHoursAgo) {
      cooldownSeconds = Math.ceil((user.lastEmailVerificationAttempt.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000);
    }

    res.json({
      success: true,
      isEmailVerified: user.isEmailVerified,
      attemptsRemaining,
      cooldownSeconds
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Resend verification email
 */
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Check rate limiting
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // If user has reached max attempts and hasn't waited 24 hours
    if (user.emailVerificationAttempts >= 3 && user.lastEmailVerificationAttempt && user.lastEmailVerificationAttempt > twentyFourHoursAgo) {
      const msRemaining = user.lastEmailVerificationAttempt.getTime() + 24 * 60 * 60 * 1000 - now.getTime();
      const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));
      const secondsRemaining = Math.ceil(msRemaining / 1000);
      
      return res.status(429).json({
        success: false,
        message: `Too many verification attempts. Please wait ${hoursRemaining} hours before trying again.`,
        attemptsRemaining: 0,
        cooldownHours: hoursRemaining,
        cooldownSeconds: secondsRemaining
      });
    }

    // Reset attempts if 24 hours have passed since last attempt
    if (user.lastEmailVerificationAttempt && user.lastEmailVerificationAttempt <= twentyFourHoursAgo) {
      user.emailVerificationAttempts = 0;
    }

    // Increment attempts
    user.emailVerificationAttempts += 1;
    user.lastEmailVerificationAttempt = now;

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    await sendVerificationEmail(user, verificationToken);

    const attemptsRemaining = Math.max(0, 3 - user.emailVerificationAttempts);
    res.json({
      success: true,
      message: 'Verification email resent successfully',
      attemptsRemaining,
      cooldownSeconds: attemptsRemaining > 0 ? 0 : 24 * 60 * 60,
      nextAttemptAllowed: attemptsRemaining > 0 ? null : new Date(user.lastEmailVerificationAttempt.getTime() + 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get password reset status (attempts remaining, cooldown)
 */
exports.getPasswordResetStatus = async (req, res) => {
  try {
    const { email, token } = req.query;

    if (!email && !token) {
      return res.status(400).json({ success: false, message: 'Email or token is required' });
    }

    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else {
      query.resetPasswordToken = token;
    }

    const user = await User.findOne(query);

    if (!user) {
      // For security, if user not found, return "full" attempts
      return res.json({
        success: true,
        attemptsRemaining: 3,
        cooldownSeconds: 0
      });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Reset attempts if 24 hours have passed since last attempt
    let currentAttempts = user.passwordResetAttempts || 0;
    if (user.lastPasswordResetAttempt && user.lastPasswordResetAttempt <= twentyFourHoursAgo) {
      currentAttempts = 0;
    }

    const attemptsRemaining = Math.max(0, 3 - currentAttempts);
    let cooldownSeconds = 0;

    if (currentAttempts >= 3 && user.lastPasswordResetAttempt && user.lastPasswordResetAttempt > twentyFourHoursAgo) {
      cooldownSeconds = Math.ceil((user.lastPasswordResetAttempt.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000);
    }

    res.json({
      success: true,
      attemptsRemaining,
      cooldownSeconds
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Forgot password - send reset email
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security reasons, don't reveal if user exists
      return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    }

    // Check rate limiting
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (user.passwordResetAttempts >= 3 && user.lastPasswordResetAttempt && user.lastPasswordResetAttempt > twentyFourHoursAgo) {
      const msRemaining = user.lastPasswordResetAttempt.getTime() + 24 * 60 * 60 * 1000 - now.getTime();
      const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));
      const secondsRemaining = Math.ceil(msRemaining / 1000);
      
      return res.status(429).json({
        success: false,
        message: `Too many password reset attempts. Please wait ${hoursRemaining} hours before trying again.`,
        attemptsRemaining: 0,
        cooldownHours: hoursRemaining,
        cooldownSeconds: secondsRemaining
      });
    }

    // Reset attempts if 24 hours have passed
    if (user.lastPasswordResetAttempt && user.lastPasswordResetAttempt <= twentyFourHoursAgo) {
      user.passwordResetAttempts = 0;
    }

    // Increment attempts
    user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
    user.lastPasswordResetAttempt = now;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    const attemptsRemaining = Math.max(0, 3 - user.passwordResetAttempts);
    res.json({ 
      success: true, 
      message: 'If an account exists with that email, a reset link has been sent.',
      attemptsRemaining,
      cooldownSeconds: attemptsRemaining > 0 ? 0 : 24 * 60 * 60
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reset password using token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Check lockout status
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (user.passwordResetAttempts >= 3 && user.lastPasswordResetAttempt && user.lastPasswordResetAttempt > twentyFourHoursAgo) {
      const msRemaining = user.lastPasswordResetAttempt.getTime() + 24 * 60 * 60 * 1000 - now.getTime();
      const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Your account recovery is currently locked. Please try again in ${hoursRemaining} hours.`
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.passwordResetAttempts = 0; // Clear attempts on success
    user.lastPasswordResetAttempt = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide current and a valid new password (min 6 chars)' 
      });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, referralCode, role = 'user' } = req.body;

    // Validate role
    if (!['user', 'agent'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "agent"'
      });
    }

    // Check if agent recruitment is locked
    if (role === 'agent') {
      const settings = await SystemSettings.getSettings();
      if (!settings.recruitNewAgents) {
        return res.status(400).json({
          success: false,
          message: 'Agent registration is currently closed by administration'
        });
      }
    }

    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, name, and phone'
      });
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }

    // Verify MoMo phone number via DataCore API
    let momoData = null;
    try {
      const internationalPhone = toInternationalFormat(phoneValidation.normalized);
      const momoResponse = await axios.post(
        'https://www.datacoregh.com/api/auth/verify-phone',
        { phoneNumber: internationalPhone },
        { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
      );
      if (momoResponse.data?.success && momoResponse.data?.data) {
        momoData = momoResponse.data.data;
      }
    } catch (momoError) {
      console.error('[Register] MoMo verification failed:', momoError?.response?.data || momoError.message);
    }

    if (!momoData) {
      return res.status(400).json({
        success: false,
        message: 'Phone number could not be verified. Please ensure it is a valid active MoMo number.'
      });
    }

    const userExists = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { phone: phoneValidation.normalized }
      ]
    });

    if (userExists) {
      if (userExists.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered. Please login instead.'
        });
      }
      if (userExists.phone === phoneValidation.normalized) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists with an account. Please login instead.'
        });
      }
    }

    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      phone: phoneValidation.normalized,
      referredBy,
      role,
      agentFeeStatus: role === 'agent' ? 'pending' : undefined,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      emailVerificationAttempts: 1,
      lastEmailVerificationAttempt: new Date(),
      momoVerified: true,
      momoVerifiedName: momoData.fullName || null,
      momoNetworkProvider: momoData.networkProvider || null,
      momoVerifiedAt: new Date(),
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email during registration:', emailError);
    }

    // If registering as agent, auto-create store
    if (role === 'agent') {
      const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
      await Store.create({
        owner: user._id,
        slug,
        name: name + "'s Store",
        description: '',
      });
    }

    if (referredBy) {
      const settings = await ReferralSettings.findOne() || { amountPerReferral: 1 };
      await Referral.create({
        referrer: referredBy,
        referredUser: user._id,
        amount: settings.amountPerReferral,
        status: 'pending'
      });
    }

    await createNotification({
      type: 'user_created',
      title: `New ${role === 'agent' ? 'Agent' : 'User'} Registration`,
      message: `New ${role} ${name} (${email}) has registered`,
      description: `A new ${role} account has been created with email: ${email}. Referral code: ${user.referralCode}`,
      severity: 'info',
      data: {
        userId: user._id,
        userName: name,
        userEmail: email,
        userRole: role,
      },
      actionUrl: `/admin/users/${user._id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        totalSpent: (await getUserSpending(user._id)).totalSpent,
        dataUsed: user.dataUsed,
        referralEarnings: user.referralEarnings,
        isEmailVerified: user.isEmailVerified,
        momoVerified: user.momoVerified,
        momoVerifiedName: user.momoVerifiedName,
        momoNetworkProvider: user.momoNetworkProvider,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.verifyPhone = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.error });
    }

    const internationalPhone = toInternationalFormat(phoneValidation.normalized);

    const response = await axios.post(
      'https://www.datacoregh.com/api/auth/verify-phone',
      { phoneNumber: internationalPhone },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data?.success && response.data?.data) {
      return res.json({
        success: true,
        data: {
          fullName: response.data.data.fullName,
          phoneNumber: response.data.data.phoneNumber,
          networkProvider: response.data.data.networkProvider,
        }
      });
    }

    return res.status(400).json({ success: false, message: 'Phone verification failed. Number may not be registered on MoMo.' });
  } catch (error) {
    console.error('[VerifyPhone] Error:', error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify phone number at this time. Please try again later.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    console.log(`[Login] Attempting login for: ${email}`);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      console.log(`[Login] User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deleted, please contact support for assistance.'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been banned. Reason: ' + (user.banReason || 'No reason provided')
      });
    }

    if (user.status === 'suspended') {
      if (user.suspendedUntil && new Date() >= user.suspendedUntil) {
        user.status = 'active';
        user.suspendedUntil = null;
        await user.save();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Your account is suspended until ' + (user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleDateString() : 'further notice')
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`[Login] Password mismatch for: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log(`[Login] User ${email} isEmailVerified: ${user.isEmailVerified}`);

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required.',
        isEmailVerified: false,
        email: user.email
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        totalSpent: (await getUserSpending(user._id)).totalSpent,
        dataUsed: user.dataUsed,
        referralEarnings: user.referralEarnings,
        isEmailVerified: user.isEmailVerified,
        momoVerified: user.momoVerified,
        momoVerifiedName: user.momoVerifiedName,
        momoNetworkProvider: user.momoNetworkProvider,
      },
    });
  } catch (error) {
    console.error(`[Login] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        referralCode: user.referralCode,
        role: user.role,
        agentFeeStatus: user.agentFeeStatus,
        totalSpent: (await getUserSpending(user._id)).totalSpent,
        dataUsed: user.dataUsed,
        referralEarnings: user.referralEarnings,
        isEmailVerified: user.isEmailVerified,
        momoVerified: user.momoVerified,
        momoVerifiedName: user.momoVerifiedName,
        momoNetworkProvider: user.momoNetworkProvider,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
