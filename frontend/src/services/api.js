import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isRegisterRequest = error.config?.url?.includes('/auth/register');

      if (!isLoginRequest && !isRegisterRequest) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const wallet = {
  getBalance: () => api.get('/wallet/balance'),
  initializePayment: (data) => api.post('/wallet/initialize-payment', data),
  verifyPayment: (data) => api.post('/wallet/verify-payment', data),
  getTransactions: (limit = 50, offset = 0) =>
    api.get(`/wallet/transactions?limit=${limit}&offset=${offset}`),
  verifyTransactionStatus: (data) => api.post('/wallet/verify-transaction-status', data),
  deleteTransaction: (id) => api.delete(`/wallet/transactions/${id}`),
};

export const purchases = {
  create: (data) => api.post('/purchases/create', data),
  list: (limit = 50, offset = 0) =>
    api.get(`/purchases/list?limit=${limit}&offset=${offset}`),
  buyDataBundle: (data) => api.post('/purchases/buy', data),
  verifyPurchase: (data) => api.post('/purchases/verify', data),
  getOrders: (limit = 50, offset = 0) =>
    api.get(`/purchases/orders?limit=${limit}&offset=${offset}`),
  getOrderById: (id) => api.get(`/purchases/orders/${id}`),
};

export const user = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getReferralStats: () => api.get('/user/referrals/stats'),
  getReferralLeaderboard: () => api.get('/user/referrals/leaderboard'),
};

export const publicAPI = {
  getReferralSettings: () => api.get('/public/referral-settings'),
  getSystemSettings: () => api.get('/public/settings'),
  getActivePlans: (limit = 10, offset = 0) => api.get(`/public/dataplans?limit=${limit}&offset=${offset}`),
  getBusinessStatus: () => api.get('/public/business-status'),
  getPublicStats: () => api.get('/public/stats'),
};

export const admin = {
  getDashboardStats: () => api.get('/admin/stats'),
  getAllUsers: (page = 1, limit = 10, role = 'user', search = '') =>
    api.get(`/admin/users?page=${page}&limit=${limit}&role=${role}&search=${search}`),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  getFullUserInfo: (id) => api.get(`/admin/users/${id}/full-info`),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),
  banUser: (id, banReason = '') => api.patch(`/admin/users/${id}/ban`, { banReason }),
  unbanUser: (id) => api.patch(`/admin/users/${id}/unban`),
  suspendUser: (id, days) => api.patch(`/admin/users/${id}/suspend`, { days }),
  unsuspendUser: (id) => api.patch(`/admin/users/${id}/unsuspend`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  restoreUser: (id) => api.patch(`/admin/users/${id}/restore`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getTransactions: (page = 1, limit = 10, type = '', status = '', scope = '') =>
    api.get(`/admin/transactions?page=${page}&limit=${limit}&type=${type}&status=${status}&scope=${scope}`),
  verifyPendingPayment: (transactionId) =>
    api.post(`/admin/transactions/${transactionId}/verify-pending-payment`),
  deleteTransaction: (id) => api.delete(`/admin/transactions/${id}`),
  deleteAllTransactions: () => api.delete('/admin/transactions'),
  bulkDeleteTransactionsByIds: (ids) => api.delete('/admin/transactions/bulk', { data: { ids } }),
    generatePasswordResetLink: (id) => api.post(`/admin/users/${id}/generate-reset-link`),
  bulkDeleteTransactionsByStatus: (status) =>
    api.post('/admin/transactions/bulk-delete', { status }),
  getPurchases: (page = 1, limit = 10) =>
    api.get(`/admin/purchases?page=${page}&limit=${limit}`),
  deletePurchase: (id) => api.delete(`/admin/purchases/${id}`),
  getOrders: (page = 1, limit = 10, status = '', network = '', scope = '') =>
    api.get(`/admin/orders?page=${page}&limit=${limit}&status=${status}&network=${network}&scope=${scope}`),
  updateOrderStatus: (id, status, adminNotes = '') =>
    api.patch(`/admin/orders/${id}/status`, { status, adminNotes }),
  deleteOrder: (id) => api.delete(`/admin/orders/${id}`),
  bulkDeleteOrdersByIds: (ids) => api.delete('/admin/orders/bulk', { data: { ids } }),
  bulkDeleteOrdersByStatus: (status) =>
    api.post('/admin/orders/bulk-delete', { status }),
  getAllReferrals: (page = 1, limit = 10, search = '') =>
    api.get(`/admin/referrals?page=${page}&limit=${limit}&search=${search}`),
  updateReferralStatus: (id, status) =>
    api.patch(`/admin/referrals/${id}/status`, { status }),
  getReferralSettings: () => api.get('/admin/referrals/settings'),
  updateReferralSettings: (settings) => api.patch('/admin/referrals/settings', settings),
  getXpresDataWalletSettings: () => api.get('/admin/xpresdata/settings'),
  getXpresDataWalletTransactions: (page = 1, limit = 20, type = '', status = '') =>
    api.get(`/admin/xpresdata/transactions?page=${page}&limit=${limit}&type=${type}&status=${status}`),
  getDigimallWalletSettings: () => api.get('/admin/digimall/settings'),
  getTopzaWalletSettings: () => api.get('/admin/topza/settings'),
  getTopzaWalletTransactions: (page = 1, limit = 25) =>
    api.get(`/admin/topza/transactions?page=${page}&limit=${limit}`),
  getTopzaWebhookLogs: (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.handled !== undefined) params.set('handled', String(filters.handled));
    if (filters.signatureValid !== undefined) params.set('signatureValid', String(filters.signatureValid));
    if (filters.event) params.set('event', String(filters.event));
    if (filters.reason) params.set('reason', String(filters.reason));
    return api.get(`/topza/webhook/logs?${params.toString()}`);
  },
  clearTopzaWebhookLogs: () => api.delete('/topza/webhook/logs'),
  getSystemSettings: () => api.get('/admin/settings'),
  updateSystemSettings: (data) => api.patch('/admin/settings', data),
  getNotifications: (page = 1, limit = 20, type = '', isRead = '', search = '') =>
    api.get(`/admin/notifications?page=${page}&limit=${limit}&type=${type}&isRead=${isRead}&search=${search}`),
  getNotificationStats: () => api.get('/admin/notifications/stats'),
  markNotificationAsRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.patch('/admin/notifications/mark-all/read'),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
  deleteAllNotifications: () => api.delete('/admin/notifications'),
};

export const dataplans = {
  list: (network = '', status = 'active', page = 1, limit = 10) =>
    api.get(`/dataplans/list?network=${network}&status=${status}&page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/dataplans/${id}`),
  getStats: (network = 'all') =>
    api.get(`/dataplans/stats?network=${network}`),
  sync: () => api.post('/dataplans/sync'),
  updatePrices: (id, costPrice, sellingPrice) =>
    api.patch(`/dataplans/${id}/prices`, { costPrice, sellingPrice }),
  clearEdits: (id) => api.patch(`/dataplans/${id}/clear-edits`),
  toggleStatus: (id) => api.patch(`/dataplans/${id}/toggle-status`),
  delete: (id) => api.delete(`/dataplans/${id}`),
};

export const digimall = {
  list: (network = '', status = 'active', page = 1, limit = 50) =>
    api.get(`/digimall/offers?network=${network}&status=${status}&page=${page}&limit=${limit}`),
  getStats: (network = 'all') => api.get(`/digimall/stats?network=${network}`),
  getNetworks: () => api.get('/digimall/networks'),
  sync: () => api.post('/digimall/sync'),
  updatePrices: (id, prices) => api.patch(`/digimall/${id}/prices`, prices),
  toggleStatus: (id) => api.patch(`/digimall/${id}/toggle-status`),
  delete: (id) => api.delete(`/digimall/${id}`),
  bulkDelete: (ids) => api.delete('/digimall/offers', { data: { ids } }),
  updateStock: (ids, inStock, resetOverride = false) =>
    api.patch('/digimall/offers/stock', { ids, inStock, resetOverride }),
  getWalletSettings: () => api.get('/digimall/wallet'),
};

export const topza = {
  list: (network = '', status = 'active', page = 1, limit = 50) =>
    api.get(`/topza/offers?network=${network}&status=${status}&page=${page}&limit=${limit}`),
  getStats: (network = 'all') => api.get(`/topza/stats?network=${network}`),
  getNetworks: () => api.get('/topza/networks'),
  sync: () => api.post('/topza/sync'),
  updatePrices: (id, prices) => api.patch(`/topza/${id}/prices`, prices),
  toggleStatus: (id) => api.patch(`/topza/${id}/toggle-status`),
  delete: (id) => api.delete(`/topza/${id}`),
  bulkDelete: (ids) => api.delete('/topza/offers', { data: { ids } }),
  updateStock: (ids, inStock, resetOverride = false) =>
    api.patch('/topza/offers/stock', { ids, inStock, resetOverride }),
  getWalletSettings: () => api.get('/topza/wallet'),
};

export const xpresdata = {
  list: (network = '', status = 'active', page = 1, limit = 10, type = '') =>
    api.get(`/xpresdata/list?network=${network}&status=${status}&page=${page}&limit=${limit}&type=${type}`),
  getStats: (network = 'all') =>
    api.get(`/xpresdata/stats?network=${network}`),
  sync: () => api.post('/xpresdata/sync'),
  updatePrices: (id, prices) =>
    api.patch(`/xpresdata/${id}/prices`, prices),
  toggleStatus: (id) => api.patch(`/xpresdata/${id}/toggle-status`),
  delete: (id) => api.delete(`/xpresdata/${id}`),
};

export const store = {
  // Private store owner APIs
  getMyStore: () => api.get('/store/my-store'),
  updateMyStore: (data) => api.patch('/store/my-store', data),

  // Store plans
  getAvailablePlans: () => api.get('/store/my-store/available-plans'),
  addPlan: (data) => api.post('/store/my-store/plans', data),
  updatePlan: (planId, data) => api.patch(`/store/my-store/plans/${planId}`, data),
  removePlan: (planId) => api.delete(`/store/my-store/plans/${planId}`),

  // Store orders
  getOrderStats: () => api.get('/store/my-store/orders/stats'),
  getOrders: (page = 1, limit = 20, status = '', search = '', network = '') =>
    api.get(`/store/my-store/orders?page=${page}&limit=${limit}&status=${status}&search=${search}&network=${network}`),

  // Commissions
  getCommissionSummary: () => api.get('/store/my-store/commissions/summary'),
  getPayouts: (page = 1, limit = 20, status = '') =>
    api.get(`/store/my-store/commissions/payouts?page=${page}&limit=${limit}&status=${status}`),
  createPayout: (data) => api.post('/store/my-store/commissions/payouts', data),

  // Agent fee payment
  getAgentFeeStatus: () => api.get('/store/my-store/agent-fee/status'),
  initializeAgentFeePayment: (data = {}) => api.post('/store/my-store/agent-fee/initialize', data),
  verifyAgentFeePayment: (data) => api.post('/store/my-store/agent-fee/verify', data),

  // Public store APIs
  getPublicStore: (slug) => api.get(`/store/public/${slug}`),
  getPublicPlans: (slug, network = '') =>
    api.get(`/store/public/${slug}/plans${network ? `?network=${network}` : ''}`),
  purchasePublicBundle: (slug, data) => api.post(`/store/public/${slug}/purchase`, data),
  verifyPublicPayment: (data) => api.post('/store/public/verify-payment', data),
  trackGuestOrders: (slug, phone) => api.get(`/store/public/${slug}/track/${phone}`),
};

export const adminStore = {
  getAgentStores: (page = 1, limit = 20, search = '', status = '') =>
    api.get(`/admin/agent-stores?page=${page}&limit=${limit}&search=${search}&status=${status}`),
  getAgentStoreDetails: (storeId) =>
    api.get(`/admin/agent-stores/${storeId}/details`),
  adjustCommission: (storeId, data) =>
    api.post(`/admin/agent-stores/${storeId}/commission-adjustment`, data),
  applyTemporaryBan: (storeId, data) =>
    api.patch(`/admin/agent-stores/${storeId}/temporary-ban`, data),
  activateProtocol: (storeId) =>
    api.patch(`/admin/agent-stores/${storeId}/protocol-activate`),
  deactivateProtocol: (storeId) =>
    api.patch(`/admin/agent-stores/${storeId}/protocol-deactivate`),
  getAgentFeePayments: (page = 1, limit = 20, status = '') =>
    api.get(`/admin/agent-fee-payments?page=${page}&limit=${limit}&status=${status}`),
  getCommissionPayouts: (page = 1, limit = 20, status = '') =>
    api.get(`/admin/agent-commission-payouts?page=${page}&limit=${limit}&status=${status}`),
  approveMobileMoneyPayout: (payoutId, data) =>
    api.patch(`/admin/agent-commission-payouts/${payoutId}/approve`, data),
  markPayoutAsPaid: (payoutId, data) =>
    api.patch(`/admin/agent-commission-payouts/${payoutId}/paid`, data),
  rejectCommissionPayout: (payoutId, data) =>
    api.patch(`/admin/agent-commission-payouts/${payoutId}/reject`, data),
};

export const guest = {
  getDataPlans: (network = '') =>
    api.get(`/guest/plans${network ? `?network=${network}` : ''}`),
  initializePurchase: (data) =>
    api.post('/guest/purchase/initialize', data),
  verifyPayment: (data) =>
    api.post('/guest/payment/verify', data),
  trackOrders: (phoneNumber) =>
    api.get(`/guest/orders/track?phoneNumber=${phoneNumber}`),
  getOrderDetails: (orderNumber, phoneNumber) =>
    api.get(`/guest/orders/details?orderNumber=${orderNumber}&phoneNumber=${phoneNumber}`),
};

export default api;
