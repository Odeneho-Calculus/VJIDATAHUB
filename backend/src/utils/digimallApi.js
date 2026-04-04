const axios = require('axios');

const DIGIMALL_BASE_URL = process.env.DIGIMALL_BASE_URL || 'https://www.digi-mall.app/api/v1';
const DIGIMALL_API_KEY = process.env.DIGIMALL_API_KEY;

const digimallClient = axios.create({
  baseURL: DIGIMALL_BASE_URL,
  timeout: 30000,
});

digimallClient.interceptors.request.use((config) => {
  config.headers['x-api-key'] = DIGIMALL_API_KEY;
  config.headers['Content-Type'] = 'application/json';
  config.headers['Accept'] = 'application/json';
  return config;
});

// Retry logic with exponential backoff
const retryRequest = async (requestFn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const providerBody = error.response?.data;
      const providerTypedBusinessError =
        providerBody &&
        typeof providerBody === 'object' &&
        providerBody.success === false &&
        typeof providerBody.type === 'string' &&
        providerBody.type.trim() !== '';
      const isRetryable =
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        (error.response && error.response.status >= 500 && !providerTypedBusinessError);

      if (isLastAttempt || !isRetryable) throw error;

      const waitTime = delay * Math.pow(2, i);
      console.log(`[DigiMall API] Retrying request (attempt ${i + 2}/${retries}) after ${waitTime}ms...`);
      await new Promise((resolve) => globalThis.setTimeout(resolve, waitTime));
    }
  }
};

/**
 * Check wallet balance
 * GET /balance
 */
exports.getWalletBalance = async () => {
  try {
    const response = await retryRequest(() => digimallClient.get('/balance'), 3, 1000);
    const data = response.data;

    const balance = parseFloat(
      data?.balance ?? data?.data?.balance ?? data?.wallet_balance ?? 0
    );

    return {
      success: true,
      balance,
      isPlaceholder: false,
    };
  } catch (error) {
    console.error('[DigiMall API] Error fetching balance:', error.message);
    return {
      success: false,
      balance: 0,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Fetch available offers
 * GET /offers
 * Returns array of offer objects with offerSlug, isp (network), volumes, etc.
 */
exports.fetchOffers = async () => {
  try {
    const response = await retryRequest(() => digimallClient.get('/offers'), 3, 1000);
    const data = response.data;

    // DigiMall may return array directly or wrapped
    const offers = Array.isArray(data)
      ? data
      : (data?.offers || data?.data || data?.plans || []);

    return { success: true, offers };
  } catch (error) {
    console.error('[DigiMall API] Error fetching offers:', error.message);
    return { success: false, offers: [], error: error.response?.data?.message || error.message };
  }
};

/**
 * Purchase a data bundle
 * POST /order/:network
 * @param {string} offerSlug  - the offer slug from DigiMall
 * @param {string} phoneNumber - recipient phone (e.g. "233241234567")
 * @param {string} network    - network display name (MTN, Telecel, AirtelTigo)
 * @param {string|number} volume - data volume in GB
 * @param {string} idempotencyKey - unique key for idempotency
 */
exports.purchaseDataBundle = async (offerSlug, phoneNumber, network, volume, idempotencyKey) => {
  try {
    const networkSlug = mapNetworkToSlug(network);
    const normalizedOfferSlug = normalizeOfferSlug(offerSlug, volume);
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const requestBody = {
      type: 'single',
      volume: String(volume),
      phone: normalizedPhone,
      offerSlug: normalizedOfferSlug,
      metadata: {
        idempotencyKey: idempotencyKey || ('DGM' + Date.now()),
      },
    };

    console.log(`[DigiMall API] Placing order on network "${networkSlug}":`, requestBody);

    const response = await retryRequest(
      () => digimallClient.post(`/order/${networkSlug}`, requestBody),
      3,
      1000
    );

    const data = response.data;

    // Extract order identifiers from response
    const orderId =
      data?.id ||
      data?.orderId ||
      data?.order_id ||
      data?.order?.id ||
      data?.data?.id;

    const reference =
      data?.reference ||
      data?.ref ||
      data?.order?.reference ||
      data?.data?.reference ||
      orderId;

    return {
      success: true,
      data: {
        orderId,
        reference,
        message: data?.message || 'Order placed successfully',
      },
    };
  } catch (error) {
    const statusCode = error.response?.status;
    const errData = error.response?.data;
    const responseHeaders = error.response?.headers || {};
    const providerRequestId =
      responseHeaders['x-request-id'] ||
      responseHeaders['x-correlation-id'] ||
      responseHeaders['x-trace-id'] ||
      null;
    console.error('[DigiMall API] Error during order:', {
      message: error.message,
      statusCode,
      providerRequestId,
      response: errData,
    });

    const providerMessage =
      errData?.message ||
      errData?.error ||
      errData?.details ||
      error.message;
    const providerErrorType = errData?.type || null;
    const providerHint =
      statusCode === 500 && providerErrorType === 'DEFAULT'
        ? 'Provider returned a generic processing error. Common causes: another unfinished order for this recipient or temporary provider outage.'
        : null;

    return {
      success: false,
      error: statusCode ? `DigiMall order failed (${statusCode}): ${providerMessage}` : providerMessage,
      statusCode,
      providerRequestId,
      providerErrorType,
      providerHint,
      providerError: errData || null,
    };
  }
};

/**
 * Check order status by identifier (order ID e.g. ORD-000067 or reference e.g. ORD-IB22OQws)
 * GET /order/status/:identifier
 */
exports.getOrderStatus = async (identifier) => {
  try {
    const response = await retryRequest(
      () => digimallClient.get(`/order/status/${identifier}`),
      3,
      1000
    );

    const data = response.data;

    return {
      success: true,
      order: data?.order || data?.data || data,
    };
  } catch (error) {
    const is404 = error.response?.status === 404;
    if (!is404) {
      console.error(`[DigiMall API] Error fetching order status for ${identifier}:`, error.message);
    }
    return {
      success: false,
      isNotFound: is404,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Check multiple order statuses in one call
 * POST /order/status/bulk
 * @param {string[]} identifiers - array of order IDs and/or references (max 100)
 */
exports.getBulkOrderStatuses = async (identifiers = []) => {
  try {
    const cleanIdentifiers = Array.from(
      new Set(
        (Array.isArray(identifiers) ? identifiers : [])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 100);

    if (cleanIdentifiers.length === 0) {
      return { success: true, orders: [] };
    }

    const response = await retryRequest(
      () => digimallClient.post('/order/status/bulk', { identifiers: cleanIdentifiers }),
      3,
      1000
    );

    const data = response.data;
    const orders = Array.isArray(data?.orders)
      ? data.orders
      : Array.isArray(data?.data?.orders)
        ? data.data.orders
        : [];

    return {
      success: true,
      total: data?.total,
      found: data?.found,
      notFound: data?.notFound,
      orders,
    };
  } catch (error) {
    console.error('[DigiMall API] Error fetching bulk order status:', error.message);
    return {
      success: false,
      orders: [],
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
};

/**
 * Map a network display name to DigiMall's URL path slug (case-insensitive)
 */
const mapNetworkToSlug = (network) => {
  if (!network) return 'mtn';
  const n = String(network).toLowerCase();
  if (n.includes('mtn')) return 'mtn';
  if (n.includes('telecel')) return 'telecel';
  if (n.includes('airteltigo') || n.includes('airtel')) return 'airteltigo';
  return n;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeOfferSlug = (offerSlug, volume) => {
  const raw = String(offerSlug || '').trim();
  const vol = String(volume || '').trim();
  if (!raw || !vol) return raw;

  // Local sync stores some offers as baseSlug_volume (e.g. mtn_master_bundle_1),
  // but DigiMall order API expects base offerSlug + separate volume.
  const suffixRegex = new RegExp(`[_-]${escapeRegex(vol)}$`, 'i');
  return raw.replace(suffixRegex, '');
};

const normalizePhoneNumber = (phoneNumber) => {
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`;
  return digits || String(phoneNumber || '');
};
