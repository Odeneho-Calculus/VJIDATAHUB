const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const AfaOffer = require('../models/AfaOffer');
const SystemSettings = require('../models/SystemSettings');
const Store = require('../models/Store');
const Guest = require('../models/Guest');
const topzaApi = require('../utils/topzaApi');
const { resolvePlanPrice, toPriceNumber } = require('../utils/planPricing');
const { creditCommissionForOrder } = require('../services/commissionService');
const { isValidNetworkNumber } = require('../utils/validation');
const { calculateDataPurchaseCharge } = require('../utils/transactionCharges');
const axios = require('axios');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  },
});

const normalizeSlug = (rawSlug = '') =>
    rawSlug
      .toString()
      .trim()
      .toLowerCase();

const isStoreAccessible = (store, owner) => {
    if (!store || !owner) return false;
    if (!store.isActive) return false;
    if (owner.role === 'agent' && owner.agentFeeStatus === 'pending') return false;
    if (store.isTemporarilyBanned) return false;
    return true;
};

const resolveRolePrice = (offer, user) => {
  const userRole = user?.role || 'user';
  const agentFeeStatus = user?.agentFeeStatus || 'pending';
  return resolvePlanPrice(offer, { userRole, agentFeeStatus });
};

exports.syncAfaOffer = async (req, res) => {
  try {
    const statusResult = await topzaApi.getAfaLockStatus();
    
    if (!statusResult.success) {
      return res.status(400).json({
        success: false,
        message: statusResult.error || 'Failed to sync AFA status from Topza',
      });
    }

    const registrationFee = statusResult.data?.registrationFee || 0;
    const now = new Date();

    let afaOffer = await AfaOffer.findOne({ serviceName: 'AFA Registration' });

    if (!afaOffer) {
      afaOffer = await AfaOffer.create({
        serviceName: 'AFA Registration',
        costPrice: registrationFee,
        sellingPrice: registrationFee + 5, // Default markup
        agentPrice: registrationFee + 2,
        vendorPrice: registrationFee + 1,
        status: 'active',
        isActive: true,
        lastSyncedAt: now,
      });
    } else {
      if (!afaOffer.isEdited) {
        afaOffer.costPrice = registrationFee;
      }
      afaOffer.lastSyncedAt = now;
      await afaOffer.save();
    }

    return res.status(200).json({
      success: true,
      message: 'AFA offer synced successfully',
      afaOffer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to sync AFA offer' });
  }
};

exports.getAfaOffer = async (req, res) => {
  try {
    const afaOffer = await AfaOffer.findOne({ serviceName: 'AFA Registration' });
    if (!afaOffer) {
      return res.status(404).json({ success: false, message: 'AFA offer not found. Please sync first.' });
    }
    return res.status(200).json({ success: true, afaOffer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch AFA offer' });
  }
};

exports.updateAfaPrices = async (req, res) => {
  try {
    const { sellingPrice, agentPrice, vendorPrice, costPrice } = req.body || {};
    let afaOffer = await AfaOffer.findOne({ serviceName: 'AFA Registration' });

    if (!afaOffer) {
      return res.status(404).json({ success: false, message: 'AFA offer not found' });
    }

    if (costPrice !== undefined) afaOffer.costPrice = toPriceNumber(costPrice);
    if (sellingPrice !== undefined) afaOffer.sellingPrice = toPriceNumber(sellingPrice);
    if (agentPrice !== undefined) afaOffer.agentPrice = toPriceNumber(agentPrice);
    if (vendorPrice !== undefined) afaOffer.vendorPrice = toPriceNumber(vendorPrice);

    afaOffer.isEdited = true;
    afaOffer.status = 'active';
    afaOffer.isActive = true;
    await afaOffer.save();

    return res.status(200).json({
      success: true,
      message: 'AFA prices updated successfully',
      afaOffer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update AFA prices' });
  }
};

exports.getAfaLockStatus = async (_req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const afaLocked = Boolean(settings?.orderSettings?.afaSalesLocked);
    
    // Also get the current price for the user if authenticated
    let registrationFee = 0;
    if (_req.userId) {
      const user = await User.findById(_req.userId);
      const afaOffer = await AfaOffer.findOne({ serviceName: 'AFA Registration' });
      registrationFee = afaOffer ? resolveRolePrice(afaOffer, user) : 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        enabled: !afaLocked,
        message: afaLocked ? 'AFA Registration is currently locked' : '',
        registrationFee,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch AFA lock status' });
  }
};

exports.getPublicAfaLockStatus = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    const afaLocked = Boolean(settings?.orderSettings?.afaSalesLocked);
    
    return res.status(200).json({
      success: true,
      enabled: !afaLocked,
      message: afaLocked ? 'AFA Registration is currently disabled' : '',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch AFA status' });
  }
};

exports.updateAfaLockStatus = async (req, res) => {
  try {
    const { enabled } = req.body || {};

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
    }

    const settings = await SystemSettings.getSettings();
    if (!settings.orderSettings) {
      settings.orderSettings = {};
    }

    settings.orderSettings.afaSalesLocked = !enabled; // enabled=true means unlocked
    await settings.save();

    return res.status(200).json({
      success: true,
      message: enabled ? 'AFA sales unlocked successfully' : 'AFA sales locked successfully',
      data: {
        enabled,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update AFA lock status' });
  }
};

exports.registerAfa = async (req, res) => {
  try {
    const { name, phoneNumber, idNumber, occupation, location, region, dateOfBirth } = req.body;

    // Validation
    if (!name || !phoneNumber || !idNumber || !occupation || !location || !region || !dateOfBirth) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!isValidNetworkNumber(phoneNumber, 'MTN')) {
      return res.status(400).json({ success: false, message: 'A valid MTN Ghana number is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const settings = await SystemSettings.getSettings();
    if (settings?.orderSettings?.afaSalesLocked) {
      return res.status(403).json({ success: false, message: 'AFA Registration is currently disabled' });
    }

    const afaOffer = await AfaOffer.findOne({ serviceName: 'AFA Registration', status: 'active' });
    if (!afaOffer) {
      return res.status(404).json({ success: false, message: 'AFA Registration service is not available' });
    }

    const price = resolveRolePrice(afaOffer, user);

    if (user.walletBalance < price) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Create Order
    const orderNumber = `AFA${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const order = await Order.create({
      userId: user._id,
      orderNumber,
      orderKind: 'afa',
      orderCategory: 'afa',
      isAfaRegistration: true,
      dataPlanId: afaOffer._id,
      planType: 'AfaOffer',
      planName: 'AFA Registration',
      phoneNumber: phoneNumber,
      amount: price,
      costPrice: afaOffer.costPrice,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'wallet',
      afaRegistration: {
        name,
        phoneNumber,
        idNumber,
        occupation,
        location,
        region,
        dateOfBirth,
      }
    });

    // Deduct Wallet
    if (user) {
      user.walletBalance -= price;
      await user.save();
    }

    // Create Transaction
    await Transaction.create({
      userId: user?._id || null,
      isGuest: !user,
      amount: price,
      type: 'afa_purchase',
      status: 'completed',
      reference: orderNumber,
      description: `AFA Registration for ${phoneNumber}`,
      metadata: { orderId: order._id }
    });

    // Call Topza API
    const topzaResult = await topzaApi.registerAfa({
      name,
      phoneNumber,
      idNumber,
      occupation,
      location,
      region,
      dateOfBirth
    });

    if (!topzaResult.success) {
      // Refund if it's a wallet transaction (not a guest)
      if (user && !order.isGuest) {
        user.walletBalance += price;
        await user.save();

        await Transaction.create({
          userId: user._id,
          amount: price,
          type: 'refund',
          status: 'completed',
          paymentStatus: 'completed',
          reference: `REF${orderNumber}`,
          description: `Refund for failed AFA Registration: ${phoneNumber}`,
          metadata: { orderId: order._id }
        });
      }
      
      order.status = 'failed';
      order.errorMessage = topzaResult.error || 'AFA Registration failed';
      await order.save();

      return res.status(400).json({ success: false, message: order.errorMessage });
    }

    // Success
    order.status = 'completed';
    order.paymentStatus = 'completed';
    order.externalOrderId = topzaResult.data?.id || topzaResult.data?.registrationId;
    order.providerStatus = topzaResult.data?.status || 'completed';
    await order.save();

    // Credit Commission if applicable
    await creditCommissionForOrder(order);

    return res.status(201).json({
      success: true,
      message: 'AFA Registration submitted successfully',
      data: {
        id: order._id,
        registrationId: topzaResult.data?.registrationId,
        name: topzaResult.data?.name || name,
        phoneNumber: topzaResult.data?.phoneNumber || phoneNumber,
        status: order.status,
        registrationPrice: price,
        submittedAt: order.createdAt,
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

exports.getMyAfaRegistrations = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.userId,
      isAfaRegistration: true
    }).sort({ createdAt: -1 });

    const formattedData = orders.map(order => ({
      _id: order._id,
      registrationId: order.externalOrderId,
      name: order.afaRegistration?.name,
      phoneNumber: order.phoneNumber,
      status: order.status,
      submittedAt: order.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch AFA registrations' });
  }
};

exports.getPublicStoreAfa = async (req, res) => {
  try {
    const { slug } = req.params;
    const normalizedSlug = normalizeSlug(slug);

    const store = await Store.findOne({ slug: normalizedSlug })
      .populate('owner')
      .populate('afaProducts.afaId');

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (!isStoreAccessible(store, store.owner)) {
      return res.status(403).json({ success: false, message: 'Store is currently unavailable' });
    }

    const afaProducts = (store.afaProducts || [])
      .filter((row) => row?.isActive && row?.afaId && row.afaId.status === 'active')
      .map((row) => ({
        _id: row._id,
        afaId: row.afaId._id,
        serviceName: row.afaId.serviceName,
        sellingPrice: Number(row.customPrice || 0),
      }))
      .filter((row) => row.sellingPrice > 0);

    return res.status(200).json({ success: true, afaProducts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch public store AFA products' });
  }
};

exports.initializePublicStoreAfaPurchase = async (req, res) => {
  try {
    const { slug } = req.params;
    const { afaId, email, phone, name, idNumber, occupation, location, region, dateOfBirth } = req.body || {};

    if (!afaId || !email || !phone || !name || !idNumber || !occupation || !location || !region || !dateOfBirth) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const normalizedSlug = normalizeSlug(slug);
    const settings = await SystemSettings.getSettings();
    if (settings?.orderSettings?.afaSalesLocked) {
      return res.status(403).json({ success: false, message: 'AFA registration is currently locked by admin' });
    }

    const store = await Store.findOne({ slug: normalizedSlug }).populate('owner');
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    if (!isStoreAccessible(store, store.owner)) {
      return res.status(403).json({ success: false, message: 'Store is currently unavailable' });
    }

    const storeAfa = (store.afaProducts || []).find((row) =>
      row?.isActive && String(row?.afaId) === String(afaId)
    );

    if (!storeAfa) {
      return res.status(404).json({ success: false, message: 'AFA product not found or inactive in this store' });
    }

    const afaOffer = await AfaOffer.findById(afaId);
    if (!afaOffer || afaOffer.status !== 'active') {
      return res.status(404).json({ success: false, message: 'AFA service is currently unavailable globally' });
    }

    const baseCost = resolveRolePrice(afaOffer, { role: 'agent', agentFeeStatus: 'paid' });
    const customPrice = Number(storeAfa.customPrice || 0);

    let guest = await Guest.findOne({ email, store: store._id });
    if (!guest) {
      guest = await Guest.create({ email, phone, name, store: store._id });
    } else {
      guest.phone = phone;
      guest.name = name;
      await guest.save();
    }

    const reference = 'GAFA' + Date.now() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const orderNumber = 'AFA-G' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 5).toUpperCase();

    const order = await Order.create({
      userId: store.owner._id,
      dataPlanId: afaOffer._id,
      planType: 'AfaOffer',
      orderKind: 'afa',
      orderNumber,
      network: 'MTN',
      phoneNumber: String(phone).trim(),
      planName: afaOffer.serviceName,
      amount: customPrice,
      paymentMethod: 'paystack',
      status: 'pending',
      paymentStatus: 'pending',
      source: 'store',
      provider: 'topza',
      isGuest: true,
      guestInfo: guest._id,
      storeId: store._id,
      adminBasePrice: baseCost,
      agentCommission: Math.max(0, customPrice - baseCost),
      isAfaRegistration: true,
      afaRegistration: {
        name,
        phoneNumber: phone,
        idNumber,
        occupation,
        location,
        region,
        dateOfBirth,
      },
    });

    const transaction = await Transaction.create({
      userId: store.owner?._id || null,
      guestId: guest._id,
      isGuest: true,
      type: 'afa_purchase',
      amount: customPrice,
      reference,
      status: 'pending',
      paymentStatus: 'pending',
      description: `Guest AFA registration: ${phone} (Store: ${store.name})`,
    });

    const dataPurchaseCharge = calculateDataPurchaseCharge({
      dataPurchaseChargeType: settings.transactionCharges?.dataPurchaseChargeType,
      dataPurchaseCharge: settings.transactionCharges?.dataPurchaseCharge,
      isStoreBuyer: true,
      paymentMethod: 'paystack',
      baseAmount: customPrice,
    });
    const totalAmount = customPrice + dataPurchaseCharge;

    const paystackPayload = {
      email,
      amount: Math.round(totalAmount * 100),
      reference,
      metadata: {
        orderId: order._id.toString(),
        transactionId: transaction._id.toString(),
        type: 'public_store_afa_purchase',
        storeSlug: store.slug,
        guestId: guest._id.toString(),
        transactionCharge: dataPurchaseCharge,
      },
    };

    const response = await paystackAPI.post('/transaction/initialize', paystackPayload);
    if (!response.data?.status) {
      order.status = 'failed';
      transaction.status = 'failed';
      await Promise.all([order.save(), transaction.save()]);
      return res.status(400).json({ success: false, message: response.data?.message || 'Payment initialization failed' });
    }

    order.paystackReference = reference;
    order.transactionReference = reference;
    order.transactionId = transaction._id;
    await order.save();

    return res.status(200).json({
      success: true,
      data: {
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        orderId: order._id,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to initialize AFA purchase' });
  }
};

exports.verifyPublicStoreAfaPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    if (!response.data?.status || response.data.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const { orderId, type } = response.data.data.metadata;
    if (type !== 'public_store_afa_purchase') {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(200).json({ success: true, message: 'Payment already verified', order });
    }

    order.paymentStatus = 'completed';
    order.status = 'processing';
    await order.save();

    const transaction = await Transaction.findOne({ reference });
    if (transaction) {
      transaction.status = 'completed';
      transaction.paymentStatus = 'completed';
      await transaction.save();
    }

    // Call Topza API for AFA registration
    const topzaResult = await topzaApi.registerAfa({
      name: order.afaRegistration.name,
      phoneNumber: order.afaRegistration.phoneNumber,
      idNumber: order.afaRegistration.idNumber,
      occupation: order.afaRegistration.occupation,
      location: order.afaRegistration.location,
      region: order.afaRegistration.region,
      dateOfBirth: order.afaRegistration.dateOfBirth
    });

    if (!topzaResult.success) {
      order.status = 'failed';
      order.errorMessage = topzaResult.error || 'AFA Registration failed at provider';
      await order.save();
      return res.status(400).json({ success: false, message: order.errorMessage, order });
    }

    order.status = 'completed';
    order.externalOrderId = topzaResult.data?.id || topzaResult.data?.registrationId;
    order.providerStatus = topzaResult.data?.status || 'completed';
    await order.save();

    // Credit commission to agent
    await creditCommissionForOrder(order);

    return res.status(200).json({ success: true, message: 'AFA Registration successful', order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Payment verification error' });
  }
};
