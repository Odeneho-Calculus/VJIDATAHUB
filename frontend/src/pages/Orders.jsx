import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RotateCw, Copy, Check, Filter, Search, Calendar, ChevronRight, Hash, Smartphone, CreditCard, Layout, Zap, ArrowLeft, RefreshCw, AlertCircle, ShoppingBag, Activity, ShieldCheck, CheckCircle2, CheckCircle, Clock } from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { purchases, dataplans } from '../services/api';
import UserLayout from '../components/UserLayout';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';


/* ── Homepage multi-colour palette ── */
const palette = [
  { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' },   // purple
  { main: '#0F6E56', bg: '#D1FAE5', soft: '#ECFDF5', glow: 'rgba(15,110,86,0.15)' },    // teal
  { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF', glow: 'rgba(29,78,216,0.15)' },    // blue
  { main: '#B45309', bg: '#FEF3C7', soft: '#FFFBEB', glow: 'rgba(180,83,9,0.15)' },     // amber
  { main: '#BE185D', bg: '#FCE7F3', soft: '#FDF2F8', glow: 'rgba(190,24,93,0.15)' },    // pink
  { main: '#DC2626', bg: '#FEE2E2', soft: '#FFF5F5', glow: 'rgba(220,38,38,0.15)' },    // coral/red
  { main: '#0369A1', bg: '#E0F2FE', soft: '#F0F9FF', glow: 'rgba(3,105,161,0.15)' },    // sky
  { main: '#4D7C0F', bg: '#ECFCCB', soft: '#F7FEE7', glow: 'rgba(77,124,15,0.15)' },    // lime/green
];

const getColor = (index) => palette[index % palette.length];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #ffffff;
    min-height: 100vh;
    color: #1a1a1a;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%);
    border: 1.5px solid #FBCFE8;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(190,24,93,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .dash-h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: #111;
  }

  .dash-icon-box {
    width: 46px;
    height: 46px;
    background: #BE185D;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(190,24,93,0.25);
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-btn-outline {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #111;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .dash-btn-outline:hover {
    border-color: #BE185D;
    background: #FDF2F8;
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .dash-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 20px 0;
  }

  .dash-premium-banner {
    background: linear-gradient(135deg, #BE185D 0%, #9D174D 100%);
    border-radius: 14px;
    padding: 24px;
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
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
    pointer-events: none;
  }

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 14px;
    border: 1.5px solid #e4e4de;
    background: #fff;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
    background: #fafaf7;
    text-align: left;
    padding: 14px 16px;
    font-weight: 800;
    color: #999;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #111;
  }

  .dash-table-row {
    transition: all 0.2s;
    cursor: pointer;
  }

  .dash-table-row:hover {
    background: #fafaf7;
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
    border-color: var(--card-color, #111);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px var(--card-glow, rgba(0,0,0,0.06));
  }

  @media (max-width: 768px) {
    .dash-wrapper { padding: 12px; }
    .dash-header { padding: 16px; }
    .dash-premium-banner { padding: 20px; }
    .dash-stat-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default function Orders() {
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



  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const isCheckerOrder = (order) => {
    const kind = String(order?.orderKind || '').toLowerCase();
    const network = String(order?.network || '').toLowerCase();
    return kind === 'checker' || network === 'checker' || Boolean(order?.checkerDetails?.checkerType);
  };

  const isAfaOrder = (order) => {
    return order.isAfaRegistration || order.orderKind === 'afa' || order.orderCategory === 'afa';
  };

  const getOrderPlanDisplay = (order) => {
    if (isCheckerOrder(order)) {
      return order?.planName || order?.checkerDetails?.checkerType || 'Checker';
    }
    if (isAfaOrder(order)) {
      return 'AFA Registration';
    }
    return order?.dataAmount || order?.planName || 'N/A';
  };

  const getOrderNetworkDisplay = (order) => {
    if (isCheckerOrder(order)) return 'CHECKER';
    if (isAfaOrder(order)) return 'AFA';
    return order?.network || 'N/A';
  };

  const pageTheme = getColor(4); // Pink

  const statCards = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: getColor(4) },
    { label: 'Active Orders', value: orders.filter(o => o.status === 'pending').length, icon: Clock, color: getColor(3) },
    { label: 'Network Sync', value: 'Live', icon: Activity, color: getColor(1) },
    { label: 'Verified Data', value: 'Secure', icon: ShieldCheck, color: getColor(2) },
  ];

  return (
    <UserLayout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>

        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header !p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-11 !h-11" style={{ background: pageTheme.main, boxShadow: `0 8px 20px ${pageTheme.glow}` }}>
                  <Zap size={22} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: pageTheme.main }}>History Center</span>
                  </div>
                  <h2 className="dash-h2 !text-lg sm:!text-2xl">Purchase Records</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#fafaf7] border-1.5 border-[#e4e4de] text-slate-400 hover:text-[#111] transition-all"
                  title="Refresh Orders"
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            {statCards.map((stat, i) => (
              <div
                key={i}
                className="dash-stat-card"
                style={{
                  '--stat-color': stat.color.main + '66',
                  '--stat-glow': stat.color.glow,
                  '--stat-bg': stat.color.soft,
                  '--stat-border': stat.color.main + '33',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="dash-stat-label" style={{ color: stat.color.main }}>{stat.label}</p>
                    <p className="dash-stat-value">{stat.value}</p>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: stat.color.soft,
                    color: stat.color.main,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 8px ${stat.color.glow}`,
                  }}>
                    <stat.icon size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Card */}
          <div className="dash-card">
            <h3 className="dash-card-title">
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: pageTheme.soft, color: pageTheme.main,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Filter size={15} strokeWidth={2.5} />
              </div>
              Filter Records
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                  style={{ focusBorderColor: pageTheme.main }}
                  onFocus={(e) => e.target.style.borderColor = pageTheme.main}
                  onBlur={(e) => e.target.style.borderColor = '#e4e4de'}
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
                  className="w-full bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                  style={{ focusBorderColor: pageTheme.main }}
                  onFocus={(e) => e.target.style.borderColor = pageTheme.main}
                  onBlur={(e) => e.target.style.borderColor = '#e4e4de'}
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
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: pageTheme.soft, color: pageTheme.main,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={15} strokeWidth={2.5} />
              </div>
              Purchase History
            </h3>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <RefreshCw size={40} className="animate-spin" style={{ color: pageTheme.main, margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>Loading your records...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1.5px dashed #e4e4de', borderRadius: '14px' }}>
                <ShoppingBag size={40} style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>No orders matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className="dash-table-container hidden md:block">
                  {/* Desktop Table */}
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th className="dash-th">Order ID</th>
                        <th className="dash-th">Service & Plan</th>
                        <th className="dash-th">Amount</th>
                        <th className="dash-th">Status</th>
                        <th className="dash-th">Date</th>
                        <th className="dash-th text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, idx) => {
                        const c = getColor(idx);
                        return (
                          <tr key={order.id || order._id} className="dash-table-row" onClick={() => handleViewDetails(order)}>
                            <td className="dash-td">
                              <div className="flex flex-col">
                                <span className="font-black text-[#111]">#{order.orderNumber?.slice(-8).toUpperCase()}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{order.orderKind || 'Purchase'}</span>
                              </div>
                            </td>
                            <td className="dash-td">
                              <div className="flex items-center gap-3">
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: c.soft, color: c.main, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10, border: `1.5px solid ${c.main}22`, boxShadow: `0 2px 8px ${c.glow}` }}>
                                  {getOrderNetworkDisplay(order)?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#111]">{getOrderNetworkDisplay(order)}</span>
                                  <span className="text-[10px] text-slate-500">{getOrderPlanDisplay(order)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="dash-td">
                              <span className="font-black" style={{ color: c.main }}>{formatCurrencyAbbreviated(order.amount)}</span>
                            </td>
                            <td className="dash-td">
                              <span className={`badge-premium ${order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'success' ? 'badge-success' : order.status?.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                                {order.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="dash-td">
                              <div className="flex flex-col">
                                <span className="font-bold text-[#111] text-[11px]">{formatDate(order.date || order.createdAt)}</span>
                                <span className="text-[10px] text-slate-400">{formatTime(order.date || order.createdAt)}</span>
                              </div>
                            </td>
                            <td className="dash-td text-right">
                              <button className="p-2 rounded-lg hover:bg-[#fafaf7] text-slate-400 transition-all" style={{ '--tw-text-opacity': '1', color: pageTheme.main }}>
                                <ChevronRight size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden flex flex-col gap-3">
                  {filteredOrders.map((order, idx) => {
                    const c = getColor(idx);
                    return (
                      <div
                        key={order.id || order._id}
                        className="dash-mobile-card"
                        onClick={() => handleViewDetails(order)}
                        style={{ '--card-color': c.main + '66', '--card-glow': c.glow }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.soft, color: c.main, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: `1.5px solid ${c.main}22`, boxShadow: `0 2px 8px ${c.glow}` }}>
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
                            <span className="font-black" style={{ color: c.main }}>{formatCurrencyAbbreviated(order.amount)}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: c.main }}>
                            View Details <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
                  <div className="p-3 rounded-xl border" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                    <p className="text-[10px] font-black uppercase mb-1" style={{ color: '#0F6E56' }}>Status</p>
                    <span className={`badge-premium ${selectedOrder.status?.toLowerCase() === 'completed' || selectedOrder.status?.toLowerCase() === 'success' ? 'badge-success' : selectedOrder.status?.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-failed'}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border" style={{ background: '#F5F3FF', borderColor: '#DDD6FE' }}>
                    <p className="text-[10px] font-black uppercase mb-1" style={{ color: '#7C3AED' }}>Amount</p>
                    <p className="font-black text-[#111]">{formatCurrencyAbbreviated(selectedOrder.amount)}</p>
                  </div>
                </div>

                <div className="p-4 bg-[#fafaf7] rounded-2xl border border-[#e4e4de] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">{isAfaOrder(selectedOrder) ? 'Applicant' : 'Beneficiary'}</span>
                    <span className="text-sm font-black text-[#111]">{isAfaOrder(selectedOrder) ? selectedOrder.afaRegistration?.name : (selectedOrder.beneficiary || 'N/A')}</span>
                  </div>
                  {isAfaOrder(selectedOrder) && selectedOrder.afaRegistration && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">ID Number</span>
                        <span className="text-sm font-black text-[#111]">{selectedOrder.afaRegistration.idNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Occupation</span>
                        <span className="text-sm font-black text-[#111]">{selectedOrder.afaRegistration.occupation}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Location</span>
                        <span className="text-sm font-black text-[#111]">{selectedOrder.afaRegistration.location}</span>
                      </div>
                    </>
                  )}
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

                <div className="p-4 rounded-2xl text-white space-y-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #111 0%, #333 100%)' }}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Provider Response</p>
                  <p className="text-xs font-medium leading-relaxed italic">
                    {selectedOrder.providerResponse || 'Transaction processed successfully through secure gateway.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                    style={{ background: '#BE185D', color: '#fff', boxShadow: '0 4px 16px rgba(190,24,93,0.25)' }}
                  >
                    Close
                  </button>
                  {selectedOrder.status?.toLowerCase() === 'pending' && (
                    <button
                      onClick={(e) => {
                        setShowDetails(false);
                        openVerificationModal(selectedOrder, e);
                      }}
                      className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                      style={{ background: '#BE185D', color: '#fff', boxShadow: '0 4px 16px rgba(190,24,93,0.25)' }}
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
              <div className="p-6 rounded-2xl flex items-center gap-4" style={{ background: '#FDF2F8', border: '1.5px solid #FCE7F3' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ background: '#BE185D', boxShadow: '0 4px 12px rgba(190,24,93,0.25)' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-black tracking-tight" style={{ color: '#9D174D' }}>Payment Verification</h4>
                  <p className="text-xs font-bold uppercase" style={{ color: '#BE185D' }}>Reference Lookup</p>
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
                      className="p-2 bg-white border border-[#e4e4de] rounded-lg text-slate-500 hover:text-[#BE185D] transition-all"
                    >
                      {copied ? <Check size={16} style={{ color: '#0F6E56' }} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-medium text-slate-500 text-center px-4 leading-relaxed">
                  Click the button below to synchronize this payment with the network providers. This process usually takes less than 5 seconds.
                </p>

                <button
                  disabled={verifying}
                  onClick={handleConfirmVerify}
                  className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#BE185D', color: '#fff', boxShadow: '0 4px 16px rgba(190,24,93,0.25)' }}
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
