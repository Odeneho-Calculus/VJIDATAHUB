import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Edit2, Trash2, AlertCircle, Search, ShoppingCart, CheckCircle, Clock, TrendingUp, Database, CheckCircle2 } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import { OrderDetailsModal, OrderStatusModal } from '../components/AdminOrderModals';
import { VerifyingPaymentModal, VerifiedPaymentModal } from '../components/AdminVerifyPaymentFeedbackModal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminOrders() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope') === 'agent' ? 'agent' : '';
  const isAgentScope = scope === 'agent';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [newStatus, setNewStatus] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [showVerifyingModal, setShowVerifyingModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState('Payment verified successfully.');

  const normalizeNetwork = (val = '') => val.toString().trim().toLowerCase().replace(/\s+/g, '');
  const getNetworkFamily = (n = '') => {
    if (!n) return '';
    if (n.startsWith('mtn')) return 'mtn';
    if (n.startsWith('telecel') || n.startsWith('vodafone')) return 'telecel';
    if (
      n.startsWith('airtel') || n.startsWith('tigo') || n.startsWith('at') ||
      n.includes('airteltigo') || n.includes('ishare')
    ) return 'at';
    return n;
  };
  const networksMatch = (left = '', right = '') => {
    const normalizedLeft = normalizeNetwork(left);
    const normalizedRight = normalizeNetwork(right);
    if (!normalizedLeft || !normalizedRight) return false;
    if (normalizedLeft === normalizedRight) return true;
    return getNetworkFamily(normalizedLeft) === getNetworkFamily(normalizedRight);
  };

  const networkCatalog = (settings?.networkCatalog || []).filter((n) => n?.isActive !== false);
  const dynamicNetworks = Array.from(
    new Set(
      orders
        .map((order) => order?.network)
        .filter(Boolean)
    )
  );
  const networkOptions = networkCatalog.length > 0
    ? networkCatalog.map((network) => network.name)
    : dynamicNetworks;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, networkFilter, searchTerm]);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await adminAPI.getOrders(page, 10, statusFilter, networkFilter, scope);

      if (response.success) {
        setOrders(response.data?.orders || response.orders || []);
        setTotalPages(response.data?.pagination?.pages || response.pagination?.pages || 0);
      } else {
        setError(response.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch orders');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, statusFilter, networkFilter, scope]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, networkFilter]);

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
    } else {
      setSuccess(msg);
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3000);
  };

  const getFilteredOrders = () => {
    const term = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !term ||
        (order.user?.name || order.userId?.name || '').toLowerCase().includes(term) ||
        (order.user?.email || order.userId?.email || '').toLowerCase().includes(term) ||
        (order.phoneNumber || '').toLowerCase().includes(term) ||
        (order.orderNumber || '').toLowerCase().includes(term) ||
        (order.planName || '').toLowerCase().includes(term);

      const matchesNetwork = !networkFilter || networksMatch(order.network, networkFilter);
      return matchesSearch && matchesNetwork;
    });
  };

  const calculateStats = () => {
    const total = orders.length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    return { total, completed, pending, processing };
  };

  const stats = calculateStats();
  const filteredOrders = getFilteredOrders();
  const allSelected = filteredOrders.length > 0 && filteredOrders.every(order => selectedIds.has(order.id || order._id));
  const someSelected = selectedIds.size > 0;

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const isCheckerOrder = (order) => {
    const kind = String(order?.orderKind || '').toLowerCase();
    const network = String(order?.network || '').toLowerCase();
    return kind === 'checker' || network === 'checker' || Boolean(order?.checkerDetails?.checkerType);
  };

  const getPlanDisplayValue = (order) => {
    if (isCheckerOrder(order)) {
      return order?.planName || order?.checkerDetails?.checkerType || 'Checker';
    }
    return order?.dataAmount || order?.planName || 'N/A';
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleEditStatus = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setAdminNotes(order.adminNotes || '');
    setShowStatusModal(true);
  };

  const canVerifyPendingPayment = (order) => {
    return order?.paymentStatus === 'pending' && order?.paymentMethod === 'paystack';
  };

  const handleVerifyPendingPayment = async (order) => {
    const orderId = order?._id || order?.id;
    if (!orderId) return;

    try {
      setVerifyingId(orderId);
      setShowVerifyingModal(true);
      const response = await adminAPI.verifyPendingPayment(orderId);

      if (response.success) {
        const successText = response.message || 'Payment verified and order processing started';
        showMessage(successText);
        setVerifiedMessage(successText);
        setShowVerifiedModal(true);
        await fetchOrders({ silent: true });
      } else {
        showMessage(response.message || 'Failed to verify pending payment', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to verify pending payment', true);
    } finally {
      setShowVerifyingModal(false);
      setVerifyingId(null);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;

    try {
      setUpdateLoading(true);
      const response = await adminAPI.updateOrderStatus(
        selectedOrder.id || selectedOrder._id,
        newStatus,
        adminNotes
      );

      if (response.success) {
        setShowStatusModal(false);
        await fetchOrders();
        setSelectedOrder(null);
        showMessage('Order status updated successfully');
      } else {
        showMessage(response.message || 'Failed to update status', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to update status', true);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleOpenDelete = (order) => {
    setSelectedOrder(order);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;

    try {
      setUpdateLoading(true);
      const response = await adminAPI.deleteOrder(selectedOrder.id || selectedOrder._id);

      if (response.success) {
        setShowDeleteConfirm(false);
        await fetchOrders();
        setSelectedOrder(null);
        showMessage('Order deleted successfully');
      } else {
        showMessage(response.message || 'Failed to delete order', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete order', true);
    } finally {
      setUpdateLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (filteredOrders.length > 0 && filteredOrders.every(order => selectedIds.has(order.id || order._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(order => order.id || order._id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulkDelete = async () => {
    try {
      setUpdateLoading(true);
      const ids = Array.from(selectedIds);
      const response = await adminAPI.bulkDeleteOrdersByIds(ids);

      if (response.success) {
        setShowBulkDeleteConfirm(false);
        setSelectedIds(new Set());
        await fetchOrders();
        showMessage(`Deleted ${response.deletedCount || 0} selected order(s)`);
      } else {
        showMessage(response.message || 'Failed to delete orders', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete orders', true);
    } finally {
      setUpdateLoading(false);
    }
  };


  return (
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
            {/* Page Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-5 sm:px-6 sm:py-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">{isAgentScope ? 'Agent Orders' : 'Order Management'}</h1>
              <p className="text-sm text-slate-500">{isAgentScope ? 'Track all orders placed by buyers through agent stores' : 'Manage all customer orders and track their status'}</p>
            </div>

            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm flex items-center gap-3">
                <CheckCircle size={18} className="flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Total Orders</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>

              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Completed</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{stats.completed}</p>
              </div>

              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Pending</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{stats.pending}</p>
              </div>

              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Processing</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{stats.processing}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by order #, user name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-0 text-sm hover:border-slate-300"
                  />
                </div>

              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter('')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${statusFilter === ''
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                      All Status
                    </button>
                    {['pending', 'processing', 'completed', 'failed'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${statusFilter === status
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                          }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Network</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setNetworkFilter('')}
                      className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${networkFilter === ''
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                      All Networks
                    </button>
                    {networkOptions.map(network => (
                      <button
                        key={network}
                        onClick={() => setNetworkFilter(network)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${networkFilter === network
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                          }`}
                      >
                        {network}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Section Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">Order Records</h2>
                <p className="text-xs text-slate-500 mt-0.5">{filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}</p>
              </div>
              {someSelected && (
                <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-blue-50 flex items-center justify-between gap-2">
                  <span className="text-sm text-blue-700 font-medium">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Trash2 size={13} />
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-blue-700 mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm">Loading orders...</p>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No orders found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="pl-4 sm:pl-6 pr-2 py-4 w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              className="rounded border-slate-300 accent-slate-900"
                            />
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Order</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Customer</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Plan</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Amount</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Payment</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Delivery</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Date</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredOrders.map(order => {
                          const orderId = order.id || order._id;
                          return (
                          <tr
                            key={orderId}
                            className={`hover:bg-slate-50 transition ${selectedIds.has(orderId) ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                          >
                            <td className="pl-4 sm:pl-6 pr-2 py-4 whitespace-nowrap w-10">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(orderId)}
                                onChange={() => toggleSelectOne(orderId)}
                                className="rounded border-slate-300 accent-slate-900"
                              />
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold text-slate-900">{order.orderNumber?.slice(-8) || order._id?.slice(-8) || 'N/A'}</p>
                                <p className="text-[11px] text-slate-600 font-medium uppercase tracking-tight">{order.network || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {order.isGuest
                                      ? order.guestInfo?.name  || order.guestInfo?.email || 'Guest User'
                                      : order.user?.name || order.userId?.name || 'Unknown'}
                                  </p>
                                  {order.isGuest && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-300">
                                      GUEST
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {order.isGuest
                                    ? order.guestInfo?.email || order.guestInfo?.phone || 'N/A'
                                    : order.user?.email || order.userId?.email || 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold text-slate-900">{getPlanDisplayValue(order)}</p>
                                <p className="text-[11px] text-slate-500 font-medium">{order.phoneNumber || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-black text-slate-900">GHS {formatNumberAbbreviated(order.amount) || '0'}</p>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight inline-block ${getPaymentStatusColor(order.paymentStatus)}`}>
                                {order.paymentStatus || 'pending'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight self-start ${getOrderStatusColor(order.status)}`}>
                                  {order.providerStatus || order.status || 'N/A'}
                                </span>
                                {order.providerStatus && (
                                  <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">
                                    local: {order.status}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <p className="text-xs font-bold text-slate-900">{new Date(order.date || order.createdAt).toLocaleDateString()}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{new Date(order.date || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1 items-center">
                                <button
                                  onClick={() => handleViewDetails(order)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4 text-cyan-600" />
                                </button>
                                {canVerifyPendingPayment(order) && (
                                  <button
                                    onClick={() => handleVerifyPendingPayment(order)}
                                    disabled={verifyingId === (order._id || order.id)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200 disabled:opacity-50"
                                    title="Verify Pending Payment"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditStatus(order)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                  title="Edit Status"
                                >
                                  <Edit2 className="w-4 h-4 text-slate-600" />
                                </button>
                                <button
                                  onClick={() => handleOpenDelete(order)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <p className="text-sm text-slate-600">
                      Page {page} of {totalPages} • {filteredOrders.length} orders total
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />

      <OrderStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        newStatus={newStatus}
        setNewStatus={setNewStatus}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
        updateLoading={updateLoading}
        onUpdate={handleUpdateStatus}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Order"
        message={selectedOrder ? `Are you sure you want to delete order "${selectedOrder.orderNumber}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedOrder(null);
        }}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title="Delete Selected"
        message={`Delete ${selectedIds.size} selected order(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      <VerifyingPaymentModal isOpen={showVerifyingModal} />
      <VerifiedPaymentModal
        isOpen={showVerifiedModal}
        onClose={() => setShowVerifiedModal(false)}
        message={verifiedMessage}
      />
    </div>
  );
}
