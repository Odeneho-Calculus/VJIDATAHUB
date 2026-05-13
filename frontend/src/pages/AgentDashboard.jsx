import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  AlertCircle,
  ShoppingBag,
  CheckCircle,
  Clock,
  ArrowRight,
  Copy,
  Zap,
  Lock,
  Mail,
  Phone,
  Layers,
  BarChart3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Target,
  Layout,
  RefreshCw,
  Eye,
  Activity,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Store,
  Loader2
} from 'lucide-react';
import { store as storeAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
    min-height: 100vh;
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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-icon-box {
    width: 46px;
    height: 46px;
    background: #111;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f0a500;
    flex-shrink: 0;
  }

  .dash-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .dash-p {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0 0;
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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: #d4d4ce;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
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
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
    background: #111;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .dash-btn-outline {
    background: #fff;
    color: #111;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: 1.5px solid #e4e4de;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    background: #fafaf7;
    border-color: #d4d4ce;
  }

  @media (max-width: 640px) {
    .dash-btn-primary, .dash-btn-outline {
      padding: 6px 12px;
      font-size: 12px;
    }
  }

  .dash-premium-banner {
    background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%);
    color: #fff;
    border-radius: 14px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  }

  .dash-banner-accent {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 100px;
    height: 100px;
    background: rgba(240, 165, 0, 0.05);
    border-radius: 50%;
    filter: blur(40px);
  }

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .dash-table-container::-webkit-scrollbar {
    display: none;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
    background: #fafaf7;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #333;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
  }

  .dash-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [agentFeeStatus, setAgentFeeStatus] = useState(null);
  const [accessStatus, setAccessStatus] = useState(null);

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [storeRes, statsRes, ordersRes, feeStatusRes] = await Promise.all([
        storeAPI.getMyStore(),
        storeAPI.getOrderStats(),
        storeAPI.getOrders(1, 10),
        storeAPI.getAgentFeeStatus(),
      ]);

      setStoreData(storeRes.store);
      setAccessStatus(storeRes.accessStatus || null);

      setOrderStats(statsRes.stats || {
        totalOrders: 0,
        completedOrders: 0,
        processingOrders: 0,
        totalRevenue: 0,
      });
      setRecentOrders(ordersRes.orders || []);
      setAgentFeeStatus(feeStatusRes?.feeStatus || null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueActivation = () => {
    navigate('/agent/store');
  };

  const handleCopyLink = () => {
    if (storeData?.slug) {
      const storeUrl = `${window.location.origin}/store/${storeData.slug}`;
      navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    return order?.dataAmount ? `${order.dataAmount} Bundle` : (order?.planName || 'N/A');
  };

  const formatCurrency = (amount) => formatCurrencyAbbreviated(amount);

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex h-[80vh] items-center justify-center bg-[#f5f5f0]">
          <Loader2 className="w-10 h-10 text-[#f0a500] animate-spin" />
        </div>
      </AgentLayout>
    );
  }

  const showActivationBanner = !!agentFeeStatus && !['paid', 'protocol'].includes(agentFeeStatus?.status);
  const showBanBanner = accessStatus?.code === 'STORE_TEMP_BANNED' || !!storeData?.isTemporarilyBanned;
  const registrationFee = Number(agentFeeStatus?.registrationFee || 0);
  const walletBalance = Number(user?.balance || 0);
  const isWalletBalanceLow = showActivationBanner && registrationFee > 0 && walletBalance < registrationFee;
  const plansCount = storeData?.plans?.length || 0;

  return (
    <AgentLayout>
      <div className="dash-wrapper">
        <style>{styles}</style>
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <Layout size={24} />
                </div>
                <div>
                  <h2 className="dash-h2">{storeData?.name || 'My Store'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 font-mono uppercase">/{storeData?.slug}</span>
                    <button onClick={handleCopyLink} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/store/${storeData?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="dash-btn-outline"
                >
                  <ExternalLink size={16} />
                  View Store
                </a>
                <button
                  onClick={fetchDashboardData}
                  className="dash-btn-outline p-2"
                  title="Refresh Data"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:flex items-center gap-3">
              <Link to="/agent/orders" className="dash-btn-outline flex-1 sm:flex-none">
                <ShoppingBag size={14} />
                Sales History
              </Link>
              <Link to="/agent/wallet" className="dash-btn-outline flex-1 sm:flex-none">
                <CreditCard size={14} style={{ color: '#059669' }} />
                Add Funds
              </Link>
              <Link to="/agent/store" className="dash-btn-primary w-full sm:w-auto">
                <Zap size={14} style={{ color: '#f0a500' }} />
                Edit Store
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {showBanBanner && (
            <div className="dash-premium-banner" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Lock size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Access Restricted</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                    {storeData?.temporaryBanReason || 'Your store access has been suspended by admin.'}
                  </p>
                </div>
                <button onClick={handleContinueActivation} className="dash-btn-primary" style={{ background: '#fff', color: '#b91c1c' }}>
                  Open Settings
                </button>
              </div>
            </div>
          )}

          {showActivationBanner && (
            <div className="dash-premium-banner">
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <AlertCircle size={28} style={{ color: '#f0a500' }} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Setup Payment Required</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                    Complete your one-time activation fee to start selling.
                  </p>
                  {isWalletBalanceLow && (
                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#f0a500', marginTop: '6px' }}>
                      Low Balance: {formatCurrency(walletBalance)} / {formatCurrency(registrationFee)}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {isWalletBalanceLow && (
                    <Link to="/agent/wallet" className="dash-btn-outline" style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                      Add Funds
                    </Link>
                  )}
                  <button onClick={handleContinueActivation} className="dash-btn-primary" style={{ background: '#f0a500', color: '#111' }}>
                    Pay Fee Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="dash-stat-grid">
            {[
              { label: 'Total Sales', value: orderStats?.totalOrders || 0, icon: Target, color: '#3b82f6' },
              { label: 'Delivered', value: orderStats?.completedOrders || 0, icon: CheckCircle, color: '#10b981' },
              { label: 'Processing', value: orderStats?.processingOrders || 0, icon: Layers, color: '#6366f1' },
              { label: 'Revenue', value: formatCurrency(orderStats?.totalRevenue), icon: TrendingUp, color: '#a855f7' }
            ].map((stat, i) => (
              <div key={i} className="dash-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="dash-stat-label">{stat.label}</p>
                    <p className="dash-stat-value">{stat.value}</p>
                  </div>
                  <stat.icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Store Information */}
            <div className="lg:col-span-2 dash-card">
              <h3 className="dash-card-title">
                <Store size={18} style={{ color: '#f0a500' }} />
                Store Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div style={{ background: '#fafaf7', padding: '16px', borderRadius: '12px', border: '1.5px solid #e4e4de' }}>
                  <p className="dash-stat-label" style={{ marginBottom: '4px' }}>Live Catalog</p>
                  <p style={{ fontSize: '18px', fontWeight: '800', color: '#111' }}>{plansCount} Packages</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>Currently visible to customers</p>
                </div>
                <div style={{ background: '#fafaf7', padding: '16px', borderRadius: '12px', border: '1.5px solid #e4e4de' }}>
                  <p className="dash-stat-label" style={{ marginBottom: '4px' }}>Store URL</p>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>/{storeData?.slug}</p>
                  <button onClick={handleCopyLink} className="text-xs font-bold text-indigo-600 mt-1">Copy Public Link</button>
                </div>
              </div>
              <Link to="/agent/store" className="dash-btn-primary" style={{ width: 'fit-content' }}>
                Manage Catalog
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* System Health */}
            <div className="dash-card">
              <h3 className="dash-card-title">
                <Activity size={18} style={{ color: '#059669' }} />
                Network Health
              </h3>
              <div className="space-y-4">
                {[
                  { net: 'MTN Ghana', load: '12%', color: '#fbbf24' },
                  { net: 'Telecel', load: '24%', color: '#ef4444' },
                  { net: 'AirtelTigo', load: '18%', color: '#22c55e' }
                ].map((n, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#333' }}>{n.net}</span>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>Available</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: '#f0f0f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: n.load, background: n.color, borderRadius: '10px' }}></div>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    System Status: 100%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="dash-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="dash-card-title" style={{ margin: 0 }}>
                <ShoppingBag size={18} style={{ color: '#3b82f6' }} />
                Recent Sales
              </h3>
              <Link to="/agent/orders" style={{ fontSize: '11px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                View All History
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1.5px dashed #e4e4de', borderRadius: '14px' }}>
                <ShoppingBag size={40} style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>No sales recorded yet.</p>
              </div>
            ) : (
              <div className="dash-table-container">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th className="dash-th">Network</th>
                      <th className="dash-th">Recipient</th>
                      <th className="dash-th">Bundle</th>
                      <th className="dash-th">Amount</th>
                      <th className="dash-th">Status</th>
                      <th className="dash-th">Date</th>
                      <th className="dash-th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const statusColor = order.status === 'completed' 
                        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
                        : order.status === 'pending' || order.status === 'processing'
                        ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }
                        : { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' };

                      return (
                        <tr key={order._id}>
                          <td className="dash-td">
                            <span className="dash-badge" style={{ background: '#fafaf7', color: '#111', border: '1px solid #e4e4de' }}>
                              {order.network}
                            </span>
                          </td>
                          <td className="dash-td">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Phone size={12} style={{ color: '#999' }} />
                              <span style={{ fontWeight: '700' }}>{order.phoneNumber || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="dash-td font-medium">{getOrderPlanDisplay(order)}</td>
                          <td className="dash-td font-bold" style={{ color: '#059669' }}>{formatCurrency(order.amount)}</td>
                          <td className="dash-td">
                            <span className="dash-badge" style={statusColor}>{order.status}</span>
                          </td>
                          <td className="dash-td" style={{ fontSize: '11px', color: '#999' }}>{formatDate(order.createdAt)}</td>
                          <td className="dash-td text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowDetails(true);
                              }}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e4e4de', background: '#fff', cursor: 'pointer' }}
                            >
                              <Eye size={14} style={{ color: '#666' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Order Details"
        icon={<ShoppingBag size={20} style={{ color: '#3b82f6' }} />}
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Reference</p>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>#{String(selectedOrder._id).slice(-10).toUpperCase()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Order Status</p>
                <span className="dash-badge" style={{ 
                  background: selectedOrder.status === 'completed' ? '#ecfdf5' : '#fffbeb', 
                  color: selectedOrder.status === 'completed' ? '#059669' : '#d97706' 
                }}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div style={{ background: '#fafaf7', padding: '16px', borderRadius: '12px', border: '1.5px solid #e4e4de' }}>
                <p className="dash-stat-label">Customer</p>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>{selectedOrder.phoneNumber}</p>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{selectedOrder.network}</p>
              </div>
              <div style={{ background: '#fafaf7', padding: '16px', borderRadius: '12px', border: '1.5px solid #e4e4de' }}>
                <p className="dash-stat-label">Package</p>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>{getOrderPlanDisplay(selectedOrder)}</p>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{formatCurrency(selectedOrder.amount)}</p>
              </div>
            </div>

            <div style={{ borderTop: '1.5px solid #f0f0f0', paddingTop: '16px' }}>
              <div className="flex justify-between items-center py-2">
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Purchase Date</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#111' }}>{formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Net Commission</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>+{formatCurrency(selectedOrder.agentCommission || 0)}</span>
              </div>
              {selectedOrder.transactionId && (
                <div className="flex justify-between items-center py-2">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>API Transaction</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>{selectedOrder.transactionId}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="dash-btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '24px' }}
            >
              Close Details
            </button>
          </div>
        )}
      </Modal>
    </AgentLayout>
  );
}
