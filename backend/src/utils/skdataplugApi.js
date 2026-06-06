const axios = require('axios');

const SKDATAPLUG_BASE_URL = process.env.SKDATAPLUG_BASE_URL;
const SKDATAPLUG_API_KEY = process.env.SKDATAPLUG_API_KEY;

const skdataplugClient = axios.create({
  baseURL: SKDATAPLUG_BASE_URL,
  timeout: 30000,
});

skdataplugClient.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json';
  config.headers['Accept'] = 'application/json';

  if (SKDATAPLUG_API_KEY) {
    config.headers.Authorization = `Bearer ${SKDATAPLUG_API_KEY}`;
  }

  return config;
});

const retryRequest = async (requestFn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i += 1) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const isRetryable =
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        (error.response && error.response.status >= 500);

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      const waitTime = delay * Math.pow(2, i);
      console.log(`[SKDataPlug API] Retrying request (attempt ${i + 2}/${retries}) after ${waitTime}ms...`);
      await new Promise((resolve) => globalThis.setTimeout(resolve, waitTime));
    }
  }
};

const normalizeBundlesResponse = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.bundles)) return body.bundles;
  if (Array.isArray(body?.offers)) return body.offers;
  if (Array.isArray(body?.plans)) return body.plans;
  return [];
};

const _normalizeOrdersResponse = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.orders)) return body.orders;
  if (Array.isArray(body?.results)) return body.results;
  return [];
};

exports.getWalletBalance = async () => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, balance: 0, error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    // SKDataPlug does not expose a dedicated wallet balance endpoint.
    // We infer approximate balance health from recent orders or treat as placeholder.
    await retryRequest(() => skdataplugClient.get('/orders/'), 3, 1000);
    // Placeholder: assume healthy if we can fetch orders
    return {
      success: true,
      balance: 0,
      isPlaceholder: true,
      message: 'Balance check not supported by SKDataPlug API. Provider connectivity confirmed.',
    };
  } catch (error) {
    console.error('[SKDataPlug API] Error checking connectivity:', error.message);
    return {
      success: false,
      balance: 0,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.fetchOffers = async () => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, offers: [], error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => skdataplugClient.get('/bundles/'), 3, 1000);
    const body = response.data || {};
    const offers = normalizeBundlesResponse(body);

    return { success: true, offers };
  } catch (error) {
    console.error('[SKDataPlug API] Error fetching bundles:', error.message);
    return {
      success: false,
      offers: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.purchaseDataBundle = async (dataPlanId, phoneNumber, network, volume, _idempotencyKey) => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  if (!dataPlanId) {
    return { success: false, error: 'dataPlanId is required for purchase' };
  }

  try {
    const requestBody = {
      recipient: phoneNumber,
      network: network || 'MTN',
      gb_size: volume || dataPlanId,
    };

    console.log('[SKDataPlug API] Purchase request:', { dataPlanId, phoneNumber, network, volume, endpoint: '/order/' });
    const response = await retryRequest(() => skdataplugClient.post('/order/', requestBody), 3, 1000);
    const body = response.data || {};

    const orderId = body.order_id || body.id || body.orderId || null;
    const orderNumber = body.order_number || body.orderNumber || null;
    const orderStatus = body.status || 'pending';
    const reference = body.reference || orderId || null;

    console.log('[SKDataPlug API] Purchase successful:', {
      orderId,
      reference,
      statusCode: response.status,
    });

    return {
      success: true,
      data: {
        orderId: orderId || null,
        orderNumber: orderNumber || null,
        status: orderStatus || null,
        reference: reference || null,
        message: body.message || 'Order placed successfully',
        raw: body,
      },
    };
  } catch (error) {
    const statusCode = error.response?.status;
    const errBody = error.response?.data;
    let providerMessage = errBody?.message || errBody?.error || error.message;
    if (typeof providerMessage === 'string') {
      providerMessage = providerMessage.replace(/skdataplug/gi, 'Service');
    }
    console.error('[SKDataPlug API] Purchase error:', { statusCode, dataPlanId, phoneNumber, error: providerMessage });
    return {
      success: false,
      error: statusCode ? `Order failed (${statusCode}): ${providerMessage}` : providerMessage,
      statusCode,
      providerError: errBody || null,
    };
  }
};

exports.getOrderStatus = async (identifier) => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => skdataplugClient.get(`/status/${identifier}/`), 3, 1000);
    return {
      success: true,
      order: response.data?.data || response.data,
    };
  } catch (error) {
    const is404 = error.response?.status === 404;
    return {
      success: false,
      isNotFound: is404,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.fetchNetworks = async () => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, networks: [], error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => skdataplugClient.get('/bundles/'), 3, 1000);
    const bundles = normalizeBundlesResponse(response.data);

    // Derive unique networks from bundles
    const networkMap = new Map();
    for (const bundle of bundles) {
      const network = String(bundle.network || bundle.isp || bundle.provider || 'Unknown').trim();
      if (!networkMap.has(network.toLowerCase())) {
        networkMap.set(network.toLowerCase(), {
          code: network.toLowerCase(),
          name: network,
          networkCode: network.toLowerCase(),
          id: network.toLowerCase(),
        });
      }
    }

    const networks = Array.from(networkMap.values());
    return { success: true, networks };
  } catch (error) {
    console.error('[SKDataPlug API] Error fetching networks:', error.message);
    return {
      success: false,
      networks: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.fetchNetworkByCode = async (code) => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    const result = await exports.fetchNetworks();
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to fetch networks' };
    }
    const network = result.networks.find((n) => String(n.code || n.id || n.networkCode).toLowerCase() === String(code).toLowerCase());
    if (!network) {
      return { success: false, isNotFound: true, error: 'Network not found' };
    }
    return { success: true, network };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

exports.getOrders = async ({ _page = 1, _limit = 25 } = {}) => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, orders: [], error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    console.log('[SKDataPlug API] Fetching orders from /orders endpoint...');
    const response = await retryRequest(
      () => skdataplugClient.get('/orders/'),
      3,
      1000
    );

    const body = response.data;
    console.log('[SKDataPlug API] Orders response received:', {
      status: response.status,
      hasData: !!body?.data,
      isArray: Array.isArray(body?.data),
      body: body,
    });

    const orders = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.results)
      ? body.results
      : Array.isArray(body?.orders)
      ? body.orders
      : Array.isArray(body)
      ? body
      : [];

    return {
      success: true,
      orders,
      pagination: null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SKDataPlug API] Error fetching orders:', error.message);
    return {
      success: false,
      orders: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.getCallbackUrl = async () => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => skdataplugClient.get('/callback/'), 3, 1000);
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.registerCallbackUrl = async (callbackUrl) => {
  if (!SKDATAPLUG_BASE_URL) {
    return { success: false, error: 'SKDATAPLUG_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => skdataplugClient.post('/callback/', { callback_url: callbackUrl }), 3, 1000);
    return {
      success: true,
      data: response.data?.data || response.data,
      message: response.data?.message || 'Callback URL registered successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};
