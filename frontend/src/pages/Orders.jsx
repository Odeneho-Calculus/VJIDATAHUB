import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RotateCw, Copy, Check, Filter, Search, Calendar, ChevronRight, Hash, Smartphone, CreditCard, Layout, Zap, ArrowLeft, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { purchases, dataplans, wallet } from '../services/api';
import UserLayout from '../components/UserLayout';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAuth } from '../hooks/useAuth';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [availableNetworksFromPlans, setAvailableNetworksFromPlans] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationOrder, setVerificationOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Alert State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type, message, title = '') => {
    setAlertConfig({ isOpen: true, type, message, title });
  };

  const fetchDataPlansNetworks = useCallback(async () => {
    try {
      const resp = await dataplans.list('', '', 1, 500);
      const grouped = resp.grouped || {};
      const keys = Object.keys(grouped);
      setAvailableNetworksFromPlans(keys);
    } catch (err) {
      console.error('Failed to load dataplans for networks', err);
    }
  }, []);

  const fetchOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await purchases.getOrders(100, 0);
      if (response.success) {
        setOrders(response.data?.orders || response.orders || []);
      }
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDataPlansNetworks();
  }, [fetchOrders, fetchDataPlansNetworks]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders(false);
    setIsRefreshing(false);
  };

  const openVerificationModal = (order, e) => {
    e.stopPropagation();
    setVerificationOrder(order);
    setVerifyModalOpen(true);
    setCopied(false);
  };

  const handleCopyReference = () => {
    if (!verificationOrder) return;
    const reference = verificationOrder.transactionReference || verificationOrder.paystackReference;
    if (reference) {
      navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmVerify = async () => {
    if (!verificationOrder) return;
    const reference = verificationOrder.transactionReference || verificationOrder.paystackReference;
    if (!reference) {
      showAlert('error', 'No reference found for this order');
      return;
    }

    setVerifying(true);
    try {
      const response = await purchases.verifyPurchase({ reference });
      if (response.success) {
        setVerifyModalOpen(false);
        setVerificationOrder(null);
        await fetchOrders();
        if (selectedOrder && (selectedOrder.id === verificationOrder.id || selectedOrder._id === verificationOrder.id)) {
          setShowDetails(false);
        }
      } else {
        showAlert('error', response.message || 'Verification failed');
      }
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const getUniqueNetworks = () => {
    const fromOrders = new Set(orders.map(o => o.network).filter(Boolean));
    const fromPlans = new Set(availableNetworksFromPlans.filter(Boolean));
    const merged = new Set([...fromOrders, ...fromPlans]);
    return Array.from(merged).sort();
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (networkFilter !== 'all' && order.network?.toLowerCase() !== networkFilter.toLowerCase()) return false;
    return true;
  });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'processing':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'failed':
      case 'cancelled':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getPaymentStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'failed':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getDeliveryStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'processing':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'pending':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'failed':
      case 'cancelled':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 pb-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <ShoppingBag size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Orders</h1>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    History • {orders.length} Records
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="hidden sm:flex flex-col items-end px-4 py-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/40">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Your Balance</span>
                  <span className="text-sm font-black text-slate-900">{formatCurrencyAbbreviated(user?.balance) || '0'}</span>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-slate-600 hover:text-blue-600 group active:scale-95"
                >
                  <RefreshCw size={20} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Filters Card */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Filter size={12} className="text-blue-500" />
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">Check All</option>
                    <option value="completed">Success</option>
                    <option value="pending">Waiting</option>
                    <option value="failed">Rejected</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Layout size={12} className="text-indigo-500" />
                    Network
                  </label>
                  <select
                    value={networkFilter}
                    onChange={(e) => setNetworkFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">All Carriers</option>
                    {getUniqueNetworks().map(network => (
                      <option key={network} value={network.toLowerCase()}>{network}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3 text-slate-400 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <AlertCircle size={16} />
                <p className="text-xs font-bold tracking-tight">Orders are synced in real-time with providers</p>
              </div>
            </div>
          </div>

          {/* Orders Container */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Loading Records...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                  <ShoppingBag size={48} strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black text-slate-900 tracking-tight">No orders found</p>
                  <p className="text-sm font-bold text-slate-400">Try adjusting your filters or check back later.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Carrier & Plan</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Delivery</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredOrders.map(order => (
                      <tr
                        key={order.id || order._id}
                        onClick={() => handleViewDetails(order)}
                        className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 shadow-sm transition-colors">
                              <Hash size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tighter truncate">
                                {order.orderNumber?.slice(-12) || 'N/A'}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">
                                {formatDate(order.date || order.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">
                              {order.network?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 tracking-tight truncate">
                                {order.dataAmount || 'N/A'}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {order.network}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <p className="text-sm font-black text-slate-900 tracking-tight">
                            GH₵ {formatCurrencyAbbreviated(order.amount) || '0'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 italic">
                            {order.paymentMethod}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPaymentStatusStyles(order.paymentStatus || 'pending')}`}>
                              {order.paymentStatus || 'pending'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getDeliveryStatusStyles(order.status)}`}>
                              {order.status || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.paymentStatus === 'pending' && order.paymentMethod === 'paystack' && (
                              <button
                                onClick={(e) => openVerificationModal(order, e)}
                                className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95 border border-amber-100"
                                title="Verify Payment"
                              >
                                <RefreshCw size={14} strokeWidth={3} />
                              </button>
                            )}
                            <button
                              className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                              title="Details"
                            >
                              <ChevronRight size={16} strokeWidth={3} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredOrders.map(order => (
                    <div
                      key={order.id || order._id}
                      onClick={() => handleViewDetails(order)}
                      className="p-5 active:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shadow-sm">
                            {order.network?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900 tracking-tight">
                              {order.dataAmount}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                              {order.network}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border text-center ${getPaymentStatusStyles(order.paymentStatus || 'pending')}`}>
                            Pay: {order.paymentStatus || 'pending'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border text-center ${getDeliveryStatusStyles(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <Calendar size={12} className="text-slate-300" />
                            {formatDate(order.date || order.createdAt)} • {formatTime(order.date || order.createdAt)}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <Smartphone size={12} className="text-slate-300" />
                            {order.phoneNumber || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900 tracking-tighter">
                            GH₵ {formatCurrencyAbbreviated(order.amount)}
                          </p>
                          <div className="flex items-center justify-end gap-2 mt-2">
                            {order.paymentStatus === 'pending' && order.paymentMethod === 'paystack' && (
                              <button
                                onClick={(e) => openVerificationModal(order, e)}
                                className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                            <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                              <ChevronRight size={16} strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Order Details"
          icon={ShoppingBag}
          footer={
            <button
              onClick={() => setShowDetails(false)}
              className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
            >
              Close Record
            </button>
          }
        >
          {selectedOrder && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 mb-4 border border-slate-100">
                  <Smartphone size={32} strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{selectedOrder.dataAmount}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{selectedOrder.network}</p>

                <div className="mt-6 space-y-2">
                  <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block ${getPaymentStatusStyles(selectedOrder.paymentStatus || 'pending')}`}>
                    Payment: {selectedOrder.paymentStatus || 'pending'}
                  </div>
                  <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border block ${getDeliveryStatusStyles(selectedOrder.status)}`}>
                    Delivery: {selectedOrder.status}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { label: 'Reference', value: selectedOrder.orderNumber, mono: true, icon: Hash },
                  { label: 'Recipient', value: selectedOrder.phoneNumber, mono: true, icon: Smartphone },
                  { label: 'Plan Name', value: selectedOrder.planName || '-' },
                  { label: 'Total Paid', value: `GH₵ ${formatCurrencyAbbreviated(selectedOrder.amount)}`, bold: true, icon: CreditCard },
                  { label: 'Method', value: selectedOrder.paymentMethod, icon: CreditCard },
                  { label: 'Timestamp', value: new Date(selectedOrder.date || selectedOrder.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), icon: Calendar }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
                    <div className="flex items-center gap-2 text-slate-400">
                      {item.icon && <item.icon size={12} className="group-hover:text-blue-500 transition-colors" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </div>
                    <span className={`text-[11px] font-bold ${item.mono ? 'font-mono' : ''} ${item.bold ? 'text-blue-600 text-sm font-black' : 'text-slate-700'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {(selectedOrder.providerMessage || selectedOrder.errorMessage) && (
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <AlertCircle size={10} />
                    System Response
                  </p>
                  <p className="text-[11px] font-bold text-rose-600 leading-relaxed italic">
                    {selectedOrder.providerMessage || selectedOrder.errorMessage}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Verification Modal */}
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          title="Verify Payment"
          icon={RefreshCw}
          footer={
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
                disabled={verifying}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerify}
                disabled={verifying}
                className="flex-[2] py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <Check size={14} strokeWidth={3} />
                    Finalize Verification
                  </>
                )}
              </button>
            </div>
          }
        >
          {verificationOrder && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  Please confirm the Paystack transaction reference for manual verification.
                </p>
              </div>

              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 text-center">Transaction Reference</p>
                <div className="flex flex-col items-center gap-4">
                  <code className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 break-all w-full text-center shadow-sm">
                    {verificationOrder.transactionReference || verificationOrder.paystackReference || 'N/A'}
                  </code>
                  <button
                    onClick={handleCopyReference}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                      }`}
                  >
                    {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy Reference'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertCircle size={18} className="text-amber-500 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700 leading-tight">
                  Verification will sync your account balance if the payment was successful on Paystack.
                </p>
              </div>
            </div>
          )}
        </Modal>

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
        />
      </div>
    </UserLayout>
  );
}