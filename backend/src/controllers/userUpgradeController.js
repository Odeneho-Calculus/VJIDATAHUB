const User = require('../models/User');
const Store = require('../models/Store');
const SystemSettings = require('../models/SystemSettings');
const AgentFeePayment = require('../models/AgentFeePayment');
const Transaction = require('../models/Transaction');
const axios = require('axios');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
});

// 1. GET /upgrade/status - Get upgrade status and required fee
exports.getUpgradeStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const settings = await SystemSettings.getSettings();

        res.status(200).json({
            success: true,
            data: {
                role: user.role,
                agentFeeStatus: user.agentFeeStatus,
                registrationFee: settings.agentFeeSettings.registrationFee,
                isEligible: user.role === 'user' || (user.role === 'agent' && user.agentFeeStatus === 'paid'),
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. POST /upgrade/initialize - Initialize payment for upgrade
exports.initializeUpgrade = async (req, res) => {
    try {
        const { paymentMethod = 'paystack' } = req.body;
        const user = await User.findById(req.userId);

        if (user.agentFeeStatus === 'paid' || user.agentFeeStatus === 'protocol') {
            return res.status(400).json({ success: false, message: 'You are already an active agent' });
        }

        const settings = await SystemSettings.getSettings();
        const registrationFee = settings.agentFeeSettings.registrationFee;

        // Handle free tier upgrade
        if (registrationFee === 0) {
            user.role = 'agent';
            user.agentFeeStatus = 'paid';
            user.agentFeePaidAt = new Date();
            user.agentFeePaidReference = 'FREE_UPGRADE_' + user._id.toString();
            await user.save();

            // Ensure store exists
            let store = await Store.findOne({ owner: user._id });
            if (!store) {
                const slug = user.name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
                await Store.create({
                    owner: user._id,
                    slug,
                    name: user.name + "'s Store",
                    description: '',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Upgraded to agent successfully',
                role: 'agent'
            });
        }

        if (paymentMethod === 'wallet') {
            if (user.balance < registrationFee) {
                return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
            }

            const reference = 'UPW' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

            // Deduct balance
            user.balance -= registrationFee;
            user.role = 'agent';
            user.agentFeeStatus = 'paid';
            user.agentFeePaidAt = new Date();
            user.agentFeePaidReference = reference;
            await user.save();

            // Create Payment Record
            let store = await Store.findOne({ owner: user._id });
            if (!store) {
                const slug = user.name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
                store = await Store.create({ owner: user._id, slug, name: user.name + "'s Store" });
            }

            await AgentFeePayment.create({
                agentId: user._id,
                storeId: store._id,
                amount: registrationFee,
                reference,
                status: 'paid',
                paidAt: new Date()
            });

            await Transaction.create({
                userId: user._id,
                type: 'admin_adjustment',
                amount: -registrationFee,
                reference,
                status: 'completed',
                paymentStatus: 'completed',
                description: 'Agent Role Upgrade Fee (Wallet)'
            });

            return res.status(200).json({
                success: true,
                message: 'Upgraded to agent successfully',
                role: 'agent',
                balance: user.balance
            });
        }

        // Paystack flow
        const reference = 'UPP' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Ensure store exists
        let store = await Store.findOne({ owner: user._id });
        if (!store) {
            const slug = user.name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
            store = await Store.create({
                owner: user._id,
                slug,
                name: user.name + "'s Store",
            });
        }

        // Create pending payment record
        const feePayment = await AgentFeePayment.create({
            agentId: user._id,
            storeId: store._id,
            amount: registrationFee,
            reference,
            status: 'pending'
        });

        // Create pending transaction record (matching storeController.js procedure)
        const _transaction = await Transaction.create({
            userId: user._id,
            type: 'wallet_topup',
            amount: registrationFee,
            reference,
            status: 'pending',
            paymentStatus: 'pending',
            description: 'Agent Store Registration Fee',
        });

        const paystackPayload = {
            email: user.email,
            amount: registrationFee * 100,
            reference,
            metadata: {
                userId: user._id.toString(),
                feePaymentId: feePayment._id.toString(),
                type: 'agent_fee',
            },
        };

        const response = await paystackAPI.post('/transaction/initialize', paystackPayload);

        if (!response.data.status) {
            return res.status(400).json({ success: false, message: response.data.message });
        }

        res.status(200).json({
            success: true,
            data: {
                reference,
                authorizationUrl: response.data.data.authorization_url,
                accessCode: response.data.data.access_code,
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. POST /upgrade/verify - Verify Paystack payment and upgrade
exports.verifyUpgrade = async (req, res) => {
    try {
        const { reference } = req.body;
        const user = await User.findById(req.userId);

        const response = await paystackAPI.get(`/transaction/verify/${reference}`);
        if (!response.data.status || response.data.data.status !== 'success') {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        const paystackData = response.data.data;

        // Update fee payment record
        const feePayment = await AgentFeePayment.findOne({ reference });
        if (feePayment) {
            feePayment.status = 'paid';
            feePayment.paidAt = new Date();
            feePayment.paystackResponse = paystackData;
            await feePayment.save();
        }

        // Update user
        user.role = 'agent';
        user.agentFeeStatus = 'paid';
        user.agentFeePaidAt = new Date();
        user.agentFeePaidReference = reference;
        await user.save();

        // Ensure store exists
        let store = await Store.findOne({ owner: user._id });
        if (!store) {
            const slug = user.name.toLowerCase().replace(/\s+/g, '-') + '-' + user._id.toString().slice(-6);
            store = await Store.create({
                owner: user._id,
                slug,
                name: user.name + "'s Store",
            });
        }

        if (feePayment && !feePayment.storeId) {
            feePayment.storeId = store._id;
            await feePayment.save();
        }

        // Update Transaction Record
        await Transaction.findOneAndUpdate(
            { reference },
            {
                status: 'completed',
                paymentStatus: 'completed',
                paystackReference: paystackData.reference // Ensure this matches model
            }
        );

        res.status(200).json({
            success: true,
            message: 'Payment verified and upgraded to agent',
            role: 'agent'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. POST /upgrade/switch-role - Toggle between user and agent role
exports.switchRole = async (req, res) => {
    try {
        const { targetRole } = req.body;
        const user = await User.findById(req.userId);

        if (!['user', 'agent'].includes(targetRole)) {
            return res.status(400).json({ success: false, message: 'Invalid target role' });
        }

        if (targetRole === 'agent' && user.agentFeeStatus !== 'paid' && user.agentFeeStatus !== 'protocol') {
            return res.status(403).json({ success: false, message: 'You must pay the agent fee to switch to agent role' });
        }

        user.role = targetRole;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Switched to ${targetRole} successfully`,
            role: user.role,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                balance: user.balance,
                role: user.role,
                agentFeeStatus: user.agentFeeStatus,
                referralCode: user.referralCode,
                totalSpent: user.totalSpent,
                dataUsed: user.dataUsed,
                referralEarnings: user.referralEarnings,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
