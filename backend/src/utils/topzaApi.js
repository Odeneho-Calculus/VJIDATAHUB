const axios = require('axios');

const TOPZA_BASE_URL = process.env.TOPZA_BASE_URL;
const TOPZA_API_KEY = process.env.TOPZA_API_KEY;
const TOPZA_AUTH_TOKEN = process.env.TOPZA_AUTH_TOKEN;

const topzaClient = axios.create({
  baseURL: TOPZA_BASE_URL,
  timeout: 30000,
});

topzaClient.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json';
  config.headers['Accept'] = 'application/json';

  if (TOPZA_API_KEY) {
    config.headers['X-API-Key'] = TOPZA_API_KEY;
  }
  if (TOPZA_AUTH_TOKEN) {
    config.headers.Authorization = `Bearer ${TOPZA_AUTH_TOKEN}`;
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
      console.log(`[Topza API] Retrying request (attempt ${i + 2}/${retries}) after ${waitTime}ms...`);
      await new Promise((resolve) => globalThis.setTimeout(resolve, waitTime));
    }
  }
};

const normalizePlansResponse = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.plans)) return body.plans;
  if (Array.isArray(body?.offers)) return body.offers;
  return [];
};

const normalizeNetworksResponse = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.networks)) return body.networks;
  return [];
};

const normalizeTransactionsResponse = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.transactions)) return body.transactions;
  if (Array.isArray(body?.results)) return body.results;
  return [];
};

exports.getWalletBalance = async () => {
  if (!TOPZA_BASE_URL) {
    return { success: false, balance: 0, error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get('/wallet/balance'), 3, 1000);
    const body = response.data;
    const balance = Number(
      body?.data?.balance ?? body?.balance ?? body?.wallet?.balance ?? 0
    );

    return {
      success: true,
      balance: Number.isFinite(balance) ? balance : 0,
      isPlaceholder: false,
    };
  } catch (error) {
    console.error('[Topza API] Error fetching wallet balance:', error.message);
    return {
      success: false,
      balance: 0,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.fetchOffers = async () => {
  if (!TOPZA_BASE_URL) {
    return { success: false, offers: [], error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const firstResponse = await retryRequest(
      () => topzaClient.get('/dataplans', { params: { page: 1, limit: 100 } }),
      3,
      1000
    );

    const firstBody = firstResponse.data || {};
    const firstOffers = normalizePlansResponse(firstBody);

    const pagination = firstBody.pagination || firstBody.meta || firstBody.paging || {};
    const totalPages = Math.max(1, Number(pagination.pages || pagination.totalPages || 1) || 1);
    const pageLimit = Math.max(1, Number(pagination.limit || 100) || 100);

    let offers = [...firstOffers];

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await retryRequest(
        () => topzaClient.get('/dataplans', { params: { page, limit: pageLimit } }),
        3,
        1000
      );

      const pageOffers = normalizePlansResponse(response.data || {});
      if (pageOffers.length === 0) break;
      offers = offers.concat(pageOffers);
    }

    const uniqueOffers = [];
    const seen = new Set();
    for (const offer of offers) {
      const key = String(
        offer?.id || offer?._id || offer?.dataPlanId || offer?.planId || offer?.slug || ''
      ).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueOffers.push(offer);
    }

    return { success: true, offers: uniqueOffers };
  } catch (error) {
    console.error('[Topza API] Error fetching dataplans:', error.message);
    return {
      success: false,
      offers: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.purchaseDataBundle = async (dataPlanId, phoneNumber, _network, _volume, idempotencyKey) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, error: 'TOPZA_BASE_URL is not configured' };
  }

  if (!dataPlanId) {
    return { success: false, error: 'dataPlanId is required for Topza purchase' };
  }

  try {
    const requestBody = {
      dataPlanId,
      phoneNumber,
      paymentMethod: 'wallet',
    };

    if (idempotencyKey) {
      requestBody.idempotencyKey = idempotencyKey;
    }

    console.log('[Topza API] Purchase request:', { dataPlanId, phoneNumber, endpoint: '/orders/buy' });
    const response = await retryRequest(() => topzaClient.post('/orders/buy', requestBody), 3, 1000);
    const body = response.data || {};
    const payload = body.data || {};
    const providerOrder = payload.order || {};
    const providerTx = payload.transaction || {};

    const orderId = providerOrder.id || providerOrder.orderId;
    const orderNumber = providerOrder.orderNumber || payload.orderNumber || null;
    const orderStatus = providerOrder.status || payload.status || null;
    const reference = providerTx.reference || providerOrder.orderNumber || providerOrder.id;
    
    console.log('[Topza API] Purchase successful:', {
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
        message: body.message || payload.providerMessage || 'Order placed successfully',
        raw: body,
      },
    };
  } catch (error) {
    const statusCode = error.response?.status;
    const errBody = error.response?.data;
    const providerMessage = errBody?.message || errBody?.error || error.message;
    console.error('[Topza API] Purchase error:', { statusCode, dataPlanId, phoneNumber, error: providerMessage });
    return {
      success: false,
      error: statusCode ? `Topza order failed (${statusCode}): ${providerMessage}` : providerMessage,
      statusCode,
      providerError: errBody || null,
    };
  }
};

exports.getOrderStatus = async (identifier) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get(`/orders/${identifier}`), 3, 1000);
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
  if (!TOPZA_BASE_URL) {
    return { success: false, networks: [], error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get('/networks'), 3, 1000);
    const networks = normalizeNetworksResponse(response.data);
    return { success: true, networks };
  } catch (error) {
    console.error('[Topza API] Error fetching networks:', error.message);
    return {
      success: false,
      networks: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.fetchNetworkByCode = async (code) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get(`/networks/${encodeURIComponent(code)}`), 3, 1000);
    return {
      success: true,
      network: response.data?.data || response.data,
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

exports.getWalletTransactions = async ({ page = 1, limit = 25 } = {}) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, transactions: [], error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(
      () => topzaClient.get('/wallet/transactions', { params: { page, limit } }),
      3,
      1000
    );

    const body = response.data;
    const transactions = normalizeTransactionsResponse(body);
    const pagination = body?.pagination || body?.meta || null;

    return {
      success: true,
      transactions,
      pagination,
    };
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.getOrders = async ({ page = 1, limit = 25 } = {}) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, orders: [], error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    console.log('[Topza API] Fetching orders from /orders endpoint...');
    const response = await retryRequest(
      () => topzaClient.get('/orders', { params: { page, limit } }),
      3,
      1000
    );

    const body = response.data;
    console.log('[Topza API] Orders response received:', {
      status: response.status,
      hasData: !!body?.data,
      isArray: Array.isArray(body?.data),
      body: body,
    });

    const orders = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.orders)
      ? body.orders
      : Array.isArray(body)
      ? body
      : [];

    const pagination = body?.pagination || body?.meta || body?.paging || null;

    return {
      success: true,
      orders,
      pagination,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Topza API] Error fetching orders:', error.message);
    return {
      success: false,
      orders: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.getCheckerAvailability = async (checkerType = '') => {
  if (!TOPZA_BASE_URL) {
    return { success: false, error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const params = {};
    if (checkerType) {
      params.checkerType = checkerType;
    }
    const response = await retryRequest(() => topzaClient.get('/checkers/availability', { params }), 3, 1000);
    return {
      success: true,
      data: response.data?.data || response.data || null,
      raw: response.data || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.getCheckerTypes = async () => {
  if (!TOPZA_BASE_URL) {
    return { success: false, types: [], error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get('/checkers/types'), 3, 1000);
    const types = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
      ? response.data
      : [];

    return {
      success: true,
      types,
      raw: response.data || null,
    };
  } catch (error) {
    return {
      success: false,
      types: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.getCheckerProducts = async () => {
  if (!TOPZA_BASE_URL) {
    return { success: false, products: [], error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get('/checkers/products/list'), 3, 1000);
    const products = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
      ? response.data
      : [];

    return {
      success: true,
      products,
      raw: response.data || null,
    };
  } catch (error) {
    return {
      success: false,
      products: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

exports.buyChecker = async ({ checkerType, phoneNumber, skipSms = false, idempotencyKey = '' } = {}) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const payload = {
      checkerType,
      phoneNumber,
      skipSms: Boolean(skipSms),
    };

    if (idempotencyKey) {
      payload.idempotencyKey = idempotencyKey;
    }

    const response = await retryRequest(() => topzaClient.post('/checkers/check', payload), 3, 1000);
    return {
      success: true,
      data: response.data?.data || null,
      message: response.data?.message || 'Checker purchase initiated',
      raw: response.data || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
      statusCode: error.response?.status,
      providerError: error.response?.data || null,
    };
  }
};

exports.getCheckerById = async (id) => {
  if (!TOPZA_BASE_URL) {
    return { success: false, error: 'TOPZA_BASE_URL is not configured' };
  }

  try {
    const response = await retryRequest(() => topzaClient.get(`/checkers/${id}`), 3, 1000);
    return {
      success: true,
      checker: response.data?.data || response.data || null,
      raw: response.data || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
      statusCode: error.response?.status,
    };
  }
};