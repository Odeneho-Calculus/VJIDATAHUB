const axios = require('axios');

const XPRES_BASE_URL = process.env.XPRES_BASE_URL || 'https://www.xpresportal.app/api/v1';
const XPRES_API_KEY = process.env.XPRES_API_KEY;

const xpresDataApi = axios.create({
  baseURL: XPRES_BASE_URL,
  timeout: 30000, // Increased from 15s to 30s for external API reliability
  connectTimeout: 10000, // Separate connection timeout
});

xpresDataApi.interceptors.request.use((config) => {
  config.headers['x-api-key'] = XPRES_API_KEY;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

// Retry logic for transient failures
const retryRequest = async (requestFn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const isRetryable = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || 
                         (error.response && error.response.status >= 500);
      
      if (isLastAttempt || !isRetryable) {
        throw error;
      }
      
      const waitTime = delay * Math.pow(2, i); // Exponential backoff
      console.log(`[XpresData API] Retrying request (attempt ${i + 2}/${retries}) after ${waitTime}ms...`);
      await new Promise(resolve => globalThis.setTimeout(resolve, waitTime));
    }
  }
};

exports.getWalletBalance = async () => {
  try {
    const response = await retryRequest(
      () => xpresDataApi.get('/offers'),
      3,
      1000
    );

    if (response.data && response.data.success) {
      return {
        success: true,
        balance: 999999,
        isPlaceholder: true
      };
    }

    return {
      success: false,
      balance: 0,
      error: response.data?.error || 'Failed to fetch balance',
    };
  } catch (error) {
    console.error('[XpresData API] Error fetching balance:', error.message);
    return {
      success: false,
      balance: 0,
      error: error.response?.data?.error || error.message,
    };
  }
};

exports.fetchAllDataPlans = async () => {
  try {
    const response = await retryRequest(
      () => xpresDataApi.get('/offers'),
      3,
      1000
    );

    if (response.data && response.data.success) {
      return response.data.offers || [];
    }
    return [];
  } catch (error) {
    console.error('[XpresData API] Error fetching offers:', error.message);
    return [];
  }
};

exports.purchaseDataBundle = async (offerSlug, phoneNumber, network, volume) => {
  try {
    // Normalize network for endpoint
    let apiNetwork = (network || '').toLowerCase();
    if (apiNetwork.includes('mtn')) apiNetwork = 'mtn';
    else if (apiNetwork.includes('airtel') || apiNetwork.includes('tigo') || apiNetwork.includes('at')) apiNetwork = 'at';
    else if (apiNetwork.includes('telecel') || apiNetwork.includes('vodafone')) apiNetwork = 'telecel';

    const requestBody = {
      type: 'single',
      // Xpres expects GB; ensure we send the full requested amount in GB
      volume: parseFloat(volume) || 1,
      phone: phoneNumber,
      offerSlug: offerSlug,
      // webhookUrl could be added here if needed
    };

    console.log(`[XpresData API] Sending order request to /order/${apiNetwork}:`, requestBody);

    const response = await retryRequest(
      () => xpresDataApi.post(`/order/${apiNetwork}`, requestBody),
      3,
      1000
    );

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.data?.error || 'Order failed',
    };
  } catch (error) {
    console.error('[XpresData API] Error during order:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

exports.getOrderStatus = async (reference) => {
  try {
    const response = await retryRequest(
      () => xpresDataApi.get(`/order/status/${reference}`),
      3,
      1000
    );

    if (response.data && response.data.success) {
      return {
        success: true,
        order: response.data.order,
      };
    }

    return {
      success: false,
      error: response.data?.error || 'Failed to fetch order status',
    };
  } catch (error) {
    const is404 = error.response?.status === 404;

    if (!is404) {
      console.error(`[XpresData API] Error fetching order status for reference ${reference}:`, error.message);
      if (error.response) {
        console.error('[XpresData API] Status Error Response Data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    return {
      success: false,
      isNotFound: is404,
      error: error.response?.data?.error || error.message,
    };
  }
};
