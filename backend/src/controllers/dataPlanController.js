const DataPlan = require('../models/DataPlan');
const TopzaOffer = require('../models/TopzaOffer');
// const SystemSettings = require('../models/SystemSettings');
const { resolvePlanPrice } = require('../utils/planPricing');

exports.syncDataPlans = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Legacy sync is no longer available. Use Topza sync instead.',
  });
};

exports.getDataPlans = async (req, res) => {
  try {
    const { network, status, page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};

    if (network && network !== 'all') {
      query.network = network;
    }
    if (status) {
      query.status = status;
    }

    const total = await DataPlan.countDocuments(query);
    const plans = await DataPlan.find(query)
      .sort({ network: 1, createdAt: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    const groupedByNetwork = plans.reduce((acc, plan) => {
      if (!acc[plan.network]) {
        acc[plan.network] = [];
      }
      acc[plan.network].push(plan);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      plans,
      grouped: groupedByNetwork,
      count: plans.length,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDataPlanById = async (req, res) => {
  try {
    const plan = await DataPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found',
      });
    }

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateDataPlanPrices = async (req, res) => {
  try {
    const { costPrice, sellingPrice } = req.body;
    const plan = await DataPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found',
      });
    }

    if (!plan.inStock) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify out-of-stock data plans. This plan is unavailable from the provider.',
      });
    }

    if (costPrice !== undefined) {
      plan.costPrice = parseFloat(costPrice);
    }
    if (sellingPrice !== undefined) {
      plan.sellingPrice = parseFloat(sellingPrice);
    }

    plan.isEdited = true;
    await plan.save();

    const discount = plan.costPrice > 0
      ? (((plan.costPrice - plan.sellingPrice) / plan.costPrice) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      message: 'Data plan prices updated successfully',
      plan,
      discount: `${discount}%`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.clearDataPlanEdits = async (req, res) => {
  try {
    const plan = await DataPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found',
      });
    }

    if (!plan.inStock) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify out-of-stock data plans. This plan is unavailable from the provider.',
      });
    }

    plan.costPrice = plan.originalCostPrice;
    plan.sellingPrice = plan.originalCostPrice;
    plan.isEdited = false;
    await plan.save();

    res.status(200).json({
      success: true,
      message: 'Data plan edits cleared successfully',
      plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.toggleDataPlanStatus = async (req, res) => {
  try {
    const plan = await DataPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found',
      });
    }

    if (!plan.inStock) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify out-of-stock data plans. This plan is unavailable from the provider.',
      });
    }

    plan.status = plan.status === 'active' ? 'inactive' : 'active';
    await plan.save();

    res.status(200).json({
      success: true,
      message: `Data plan ${plan.status} successfully`,
      plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteDataPlan = async (req, res) => {
  try {
    const plan = await DataPlan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data plan deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDataPlanStats = async (req, res) => {
  try {
    const { network } = req.query;
    const query = {};

    if (network && network !== 'all') {
      query.network = network;
    }

    const totalPlans = await DataPlan.countDocuments(query);
    const activePlans = await DataPlan.countDocuments({ ...query, status: 'active' });
    const outOfStockPlans = await DataPlan.countDocuments({ ...query, inStock: false });

    const plans = await DataPlan.find(query);
    let totalMargin = 0;
    plans.forEach(plan => {
      const margin = plan.costPrice > 0
        ? ((plan.sellingPrice - plan.costPrice) / plan.costPrice) * 100
        : 0;
      totalMargin += margin;
    });
    const avgMargin = plans.length > 0 ? (totalMargin / plans.length).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalPlans,
        activePlans,
        outOfStockPlans,
        avgMargin,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.getPublicActivePlans = async (req, res) => {
  try {
    const { limit = 500, offset = 0 } = req.query;

    let userRole = 'user';
    let agentFeeStatus = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          userRole = user.role;
          agentFeeStatus = user.agentFeeStatus;
        }
      } catch {
        // Token invalid, continue as guest
      }
    }

    const topzaOffers = await TopzaOffer.find({
      status: 'active',
      inStock: true,
    }).sort({ isp: 1, volume: 1 });

    const plans = topzaOffers
      .map((p) => {
        const price = resolvePlanPrice(p, { userRole, agentFeeStatus });

        return price > 0
          ? {
            _id: p._id,
            network: p.isp,
            planName: p.name,
            dataSize: `${p.volume}GB`,
            sellingPrice: price,
            agentPrice: p.agentPrice,
            vendorPrice: p.vendorPrice,
            validity: p.validity || '30 Days',
            inStock: p.inStock,
            provider: 'topza',
            networkId: p.providerPlanId,
            dataSizeMB: p.volume,
          }
          : null;
      })
      .filter(Boolean);

    const groupedByNetwork = plans.reduce((acc, plan) => {
      const network = plan.network;
      if (!acc[network]) acc[network] = [];
      acc[network].push(plan);
      return acc;
    }, {});

    const paginatedPlans = plans.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.status(200).json({
      success: true,
      plans: paginatedPlans,
      grouped: groupedByNetwork,
      total: plans.length,
      provider: 'topza',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
