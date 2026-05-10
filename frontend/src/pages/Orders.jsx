import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RotateCw, Copy, Check, Filter, Search, Calendar, ChevronRight, Hash, Smartphone, CreditCard, Layout, Zap, ArrowLeft, RefreshCw, AlertCircle, ShoppingBag, Activity, ShieldCheck, CheckCircle2, CheckCircle, Clock } from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { purchases, dataplans } from '../services/api';
import UserLayout from '../components/UserLayout';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAuth } from '../hooks/useAuth';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #fafaf7;
    min-height: 100vh;
    padding: 20px;
    color: #1a1a1a;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }

  .dash-h2 {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin: 0;
    color: #111;
  }

  .dash-icon-box {
    width: 48px;
    height: 48px;
    background: #111;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-btn-outline {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 12px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 800;
    color: #111;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    border-color: #111;
    background: #fafaf7;
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }

  .dash-stat-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 20px;
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 800;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .dash-stat-value {
    font-size: 22px;
    font-weight: 900;
    color: #111;
    margin: 0;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 24px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dash-card-title {
    font-size: 14px;
    font-weight: 800;
    color: #111;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dash-premium-banner {
    background: linear-gradient(135deg, #111 0%, #333 100%);
    border-radius: 24px;
    padding: 32px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }

  .dash-banner-accent {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 120px;
    height: 120px;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
    pointer-events: none;
  }

  .dash-table {
    width: 100%;
    border-spacing: 0 8px;
    border-collapse: separate;
  }

  .dash-table th {
    padding: 12px 16px;
    font-size: 10px;
    font-weight: 800;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: left;
  }

  .dash-table-row {
    background: #fff;
    transition: all 0.2s;
    cursor: pointer;
  }

  .dash-table-row:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .dash-table td {
    padding: 16px;
    border-top: 1.5px solid #e4e4de;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 13px;
  }

  .dash-table td:first-child {
    border-left: 1.5px solid #e4e4de;
    border-top-left-radius: 16px;
    border-bottom-left-radius: 16px;
  }

  .dash-table td:last-child {
    border-right: 1.5px solid #e4e4de;
    border-top-right-radius: 16px;
    border-bottom-right-radius: 16px;
  }

  .badge-premium {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
  .badge-pending { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
  .badge-failed { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
  .badge-info { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }

  .dash-mobile-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 16px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  }

  .dash-mobile-card:hover {
    border-color: #111;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }

  @media (max-width: 768px) {
    .dash-wrapper { padding: 12px; }
    .dash-header { padding: 16px; }
    .dash-premium-banner { padding: 20px; }
    .dash-stat-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
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

  const isCheckerOrder = (order) => {
    const kind = String(order?.orderKind || '').toLowerCase();
    const network = String(order?.network || '').toLowerCase();
    return kind === 'checker' || network === 'checker' || Boolean(order?.checkerDetails?.checkerType);
  };

  const getOrderPlanDisplay = (order) => {
    if (isCheckerOrder(order)) {
      return order?.planName || order?.checkerDetails?.checkerType || 'Checker';
    }
    return order?.dataAmount || order?.planName || 'N/A';
  };

  const getOrderNetworkDisplay = (order) => {
    if (isCheckerOrder(order)) return 'CHECKER';
    return order?.network || 'N/A';
  };

  return (
    <UserLayout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>
        
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h2 className="dash-h2">Order History</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 font-mono uppercase">Manage Your Purchases</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="dash-btn-outline p-2"
                  title="Refresh Orders"
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Total Orders</p>
                  <p className="dash-stat-value">{orders.length}</p>
                </div>
                <ShoppingBag size={18} style={{ color: '#10b981' }} />
              </div>
            </div>
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Active Orders</p>
                  <p className="dash-stat-value">{orders.filter(o => o.status === 'pending').length}</p>
                </div>
                <Clock size={18} style={{ color: '#3b82f6' }} />
              </div>
            </div>
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Network Sync</p>
                  <p className="dash-stat-value">Live</p>
                </div>
                <Activity size={18} style={{ color: '#f0a500' }} />
              </div>
            </div>
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Verified Data</p>
                  <p className="dash-stat-value">Secure</p>
                </div>
                <ShieldCheck size={18} style={{ color: '#a855f7' }} />
              </div>
            </div>
          </div>

          {/* Filters Card */}
          <div className="dash-card">
            <h3 className="dash-card-title">
              <Filter size={18} style={{ color: '#3b82f6' }} />
              Filter Records
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:border-slate-400 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network</label>
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="w-full bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:border-slate-400 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Networks</option>
                  {getUniqueNetworks().map(network => (
                    <option key={network} value={network.toLowerCase()}>{network}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table Container */}
          <div className="dash-card">
            <h3 className="dash-card-title">
              <Zap size={18} style={{ color: '#f0a500' }} />
              Purchase History
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <RefreshCw size={40} className="animate-spin" style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>Loading your records...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1.5px dashed #e4e4de', borderRadius: '14px' }}>
                <ShoppingBag size={40} style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>No orders matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <table className="dash-table hidden md:table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Service & Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id || order._id} className="dash-table-row" onClick={() => handleViewDetails(order)}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-black text-[#111]">#{order.orderNumber?.slice(-8).toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{order.orderKind || 'Purchase'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#fafaf7] border border-[#e4e4de] flex items-center justify-center font-black text-[10px]">
                              {getOrderNetworkDisplay(order)?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[#111]">{getOrderNetworkDisplay(order)}</span>
                              <span className="text-[10px] text-slate-500">{getOrderPlanDisplay(order)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-black text-[#111]">{formatCurrencyAbbreviated(order.amount)}</span>
                        </td>
                        <td>
                          <span className={`badge-premium ${order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'success' ? 'badge-success' : order.status?.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                            {order.status || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#111] text-[11px]">{formatDate(order.date || order.createdAt)}</span>
                            <span className="text-[10px] text-slate-400">{formatTime(order.date || order.createdAt)}</span>
                          </div>
                        </td>
                        <td>
                          <button className="p-2 rounded-lg hover:bg-[#fafaf7] text-slate-400 hover:text-[#111] transition-all">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="md:hidden flex flex-col gap-3">
                  {filteredOrders.map(order => (
                    <div 
                      key={order.id || order._id} 
                      className="dash-mobile-card"
                      onClick={() => handleViewDetails(order)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#fafaf7] border border-[#e4e4de] flex items-center justify-center font-black">
                            {getOrderNetworkDisplay(order)?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getOrderNetworkDisplay(order)}</span>
                            <span className="font-black text-[#111]">{getOrderPlanDisplay(order)}</span>
                          </div>
                        </div>
                        <span className={`badge-premium ${order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'success' ? 'badge-success' : order.status?.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between items-end pt-3 border-t border-[#f0f0f0]">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400">{formatDate(order.date || order.createdAt)}</span>
                          <span className="font-black text-[#111]">{formatCurrencyAbbreviated(order.amount)}</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                          View Details <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Modal */}
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Transaction Details"
        >
          {selectedOrder && (
            <div className="dash-card border-0 p-0 shadow-none">
              <div className="dash-premium-banner mb-2" style={{ padding: '24px' }}>
                <div className="dash-banner-accent"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{getOrderPlanDisplay(selectedOrder)}</h3>
                    <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">{selectedOrder.orderNumber}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#fafaf7] rounded-xl border border-[#e4e4de]">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                    <span className={`badge-premium ${selectedOrder.status?.toLowerCase() === 'completed' || selectedOrder.status?.toLowerCase() === 'success' ? 'badge-success' : selectedOrder.status?.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="p-3 bg-[#fafaf7] rounded-xl border border-[#e4e4de]">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Amount</p>
                    <p className="font-black text-[#111]">{formatCurrencyAbbreviated(selectedOrder.amount)}</p>
                  </div>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-2xl border border-[#e4e4de] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Beneficiary</span>
                    <span className="text-sm font-black text-[#111]">{selectedOrder.beneficiary || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Network</span>
                    <span className="text-sm font-black text-[#111]">{getOrderNetworkDisplay(selectedOrder)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Date</span>
                    <span className="text-sm font-black text-[#111]">{formatDate(selectedOrder.date || selectedOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Time</span>
                    <span className="text-sm font-black text-[#111]">{formatTime(selectedOrder.date || selectedOrder.createdAt)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Provider Response</p>
                  <p className="text-xs font-medium leading-relaxed italic">
                    {selectedOrder.providerResponse || 'Transaction processed successfully through secure gateway.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="flex-1 py-4 bg-[#111] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#333] transition-all"
                  >
                    Close
                  </button>
                  {selectedOrder.status?.toLowerCase() === 'pending' && (
                    <button
                      onClick={(e) => {
                        setShowDetails(false);
                        openVerificationModal(selectedOrder, e);
                      }}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                    >
                      Verify Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Verification Modal */}
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          title="Verify Transaction"
        >
          {verificationOrder && (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-black text-blue-900 tracking-tight">Payment Verification</h4>
                  <p className="text-xs font-bold text-blue-700/70 uppercase">Reference Lookup</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-[#fafaf7] border border-[#e4e4de] rounded-2xl space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Reference</label>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs font-bold text-slate-700 break-all">
                      {verificationOrder.transactionReference || verificationOrder.paystackReference || 'N/A'}
                    </p>
                    <button
                      onClick={handleCopyReference}
                      className="p-2 bg-white border border-[#e4e4de] rounded-lg text-slate-500 hover:text-[#111] transition-all"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-medium text-slate-500 text-center px-4 leading-relaxed">
                  Click the button below to synchronize this payment with the network providers. This process usually takes less than 5 seconds.
                </p>

                <button
                  disabled={verifying}
                  onClick={handleConfirmVerify}
                  className="w-full py-4 bg-[#111] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#333] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Verify Transaction
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        <AlertModal
          isOpen={alertConfig.isOpen}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        />
      </div>
    </UserLayout>
  );
}