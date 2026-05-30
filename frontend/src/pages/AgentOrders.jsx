import React, { useState, useEffect } from 'react';
import { AlertCircle, Search, CheckCircle, Clock, XCircle, Filter, Layout, CreditCard, RefreshCw, ArrowRight, Eye, ShoppingBag, Loader2, Phone, Wifi } from 'lucide-react';
import { store as storeAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { useSettings } from '../context/SettingsContext';

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

  .vtu-page-container {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background-color: #ffffff;
    padding: 24px 16px;
    color: #1a1a1a;
  }

  .vtu-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .vtu-heading-section {
    background: linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%);
    border: 1.5px solid #FBCFE8;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(190,24,93,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .vtu-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .vtu-icon-box {
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

  .vtu-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .vtu-p {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0 0;
  }

  .vtu-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .vtu-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .vtu-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .vtu-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .vtu-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .vtu-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .vtu-main-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .vtu-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .vtu-input {
    background: #fafaf7;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    padding: 10px 14px;
    font-size: 14px;
    color: #111;
    transition: all 0.2s;
  }

  .vtu-input:focus {
    border-color: #BE185D;
    box-shadow: 0 0 0 3px rgba(190,24,93,0.07);
    background: #fff;
    outline: none;
  }

  .vtu-select {
    background: #fafaf7;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    padding: 10px 14px;
    font-size: 14px;
    color: #111;
    cursor: pointer;
    min-width: 140px;
    transition: all 0.2s;
  }

  .vtu-select:focus {
    border-color: #BE185D;
    outline: none;
  }

  .vtu-btn-primary {
    background: #BE185D;
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
    box-shadow: 0 4px 12px rgba(190,24,93,0.2);
  }

  .vtu-btn-primary:hover:not(:disabled) {
    background: #9D174D;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(190,24,93,0.3);
  }

  .vtu-btn-outline {
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

  .vtu-btn-outline:hover {
    border-color: #BE185D;
    background: #FDF2F8;
  }

  .vtu-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 14px;
    border: 1.5px solid #e4e4de;
    background: #fff;
  }

  .vtu-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .vtu-th {
    background: #fafaf7;
    text-align: left;
    padding: 14px 16px;
    font-weight: 800;
    color: #999;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .vtu-td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #111;
    white-space: nowrap;
  }

  .vtu-table-row {
    transition: all 0.2s;
  }

  .vtu-table-row:hover {
    background: #fafaf7;
  }

  .vtu-badge {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .badge-success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
  .badge-pending { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
  .badge-failed { background: #fff5f5; color: #b91c1c; border: 1px solid #fecaca; }
  .badge-info { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }

  @media (max-width: 768px) {
    .vtu-page-container { padding: 12px; }
    .vtu-heading-section { padding: 16px; }
    .vtu-stat-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default function AgentOrders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const networkCatalog = (settings?.networkCatalog || []).filter((n) => n?.isActive !== false);
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
  const displayedOrders = orders.filter((order) => !networkFilter || networksMatch(order.network, networkFilter));

  const limit = 20;

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, searchQuery, networkFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, networkFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await storeAPI.getOrders(currentPage, limit, statusFilter, searchQuery, networkFilter);
      setOrders(response.orders || []);
      setTotalPages(response.pagination?.pages || 1);
      setTotalOrders(response.pagination?.total || 0);
      setError('');
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `GHS ${(amount || 0).toFixed(2)}`;
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'pending': return 'badge-pending';
      case 'failed': return 'badge-failed';
      default: return 'badge-info';
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'processing': return 'badge-info';
      case 'pending': return 'badge-pending';
      case 'failed': return 'badge-failed';
      default: return 'badge-info';
    }
  };

  const stats = [
    { label: 'Total Orders', value: totalOrders, color: getColor(0) },
    { label: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: getColor(1) },
    { label: 'Store Profit', value: formatCurrency(orders.reduce((acc, o) => acc + (o.agentCommission || 0), 0)), color: getColor(2) },
    { label: 'Total Sales', value: formatCurrency(orders.reduce((acc, o) => acc + (o.amount || 0), 0)), color: getColor(3) },
  ];

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
    return order?.dataAmount ? `${order.dataAmount} Bundle` : (order?.planName || 'N/A');
  };

  return (
    <AgentLayout>
      <div className="vtu-page-container">
        <style>{styles}</style>
        <div className="vtu-content">
          {/* Heading Section */}
          <div className="vtu-heading-section">
            <div className="vtu-heading-row">
              <div className="vtu-icon-box">
                <ShoppingBag size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="vtu-h2">Customer Orders</h2>
                <p className="vtu-p">Monitor and manage all sales from your store</p>
              </div>
              <button
                onClick={fetchOrders}
                className="vtu-btn-outline"
                style={{ padding: '8px 12px' }}
                title="Refresh Orders"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="vtu-main-card" style={{ borderColor: '#fecaca', background: '#fff5f5', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
              <AlertCircle size={20} />
              <span style={{ flex: 1 }}>{error}</span>
              <XCircle size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
            </div>
          )}

          {/* Stats Grid */}
          <div className="vtu-stat-grid">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="vtu-stat-card"
                style={{
                  '--stat-bg': stat.color.bg,
                  '--stat-border': stat.color.main + '33',
                  '--stat-color': stat.color.main,
                  '--stat-glow': stat.color.glow,
                }}
              >
                <div className="vtu-stat-label">{stat.label}</div>
                <div className="vtu-stat-value">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Filters Card */}
          <div className="vtu-main-card">
            <div className="vtu-filter-bar">
              <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by customer phone or network..."
                  className="vtu-input"
                  style={{ width: '100%', paddingLeft: '40px' }}
                />
              </form>

              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="vtu-select"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="vtu-select"
                >
                  <option value="">All Networks</option>
                  {networkOptions.map((network) => (
                    <option key={network} value={network}>{network}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table Card */}
          <div className="vtu-table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px' }}>
                <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 16px', color: '#BE185D' }} />
                <p className="vtu-p">Loading your orders...</p>
              </div>
            ) : displayedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px', background: '#fafaf7' }}>
                <ShoppingBag size={48} style={{ margin: '0 auto 16px', color: '#e4e4de' }} />
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#111' }}>No orders found</p>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <table className="vtu-table">
                <thead>
                  <tr>
                    <th className="vtu-th">Order ID</th>
                    <th className="vtu-th">Customer</th>
                    <th className="vtu-th">Package</th>
                    <th className="vtu-th">Amount</th>
                    <th className="vtu-th">Profit</th>
                    <th className="vtu-th">Payment</th>
                    <th className="vtu-th">Delivery</th>
                    <th className="vtu-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map((order) => (
                    <tr key={order._id} className="vtu-table-row">
                      <td className="vtu-td font-mono" style={{ fontSize: '11px', color: '#999' }}>
                        #{order._id?.slice(-8).toUpperCase()}
                      </td>
                      <td className="vtu-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={12} style={{ color: '#999' }} />
                          <span style={{ fontWeight: '700', color: '#111' }}>{order.phoneNumber || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#666', marginTop: '2px' }}>{order.network}</div>
                      </td>
                      <td className="vtu-td">
                        <div style={{ fontWeight: '600' }}>{getOrderPlanDisplay(order)}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{formatDate(order.createdAt)}</div>
                      </td>
                      <td className="vtu-td font-bold" style={{ color: '#111' }}>{formatCurrency(order.amount)}</td>
                      <td className="vtu-td">
                        <span style={{ color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                          +{formatCurrency(order.agentCommission || 0)}
                        </span>
                      </td>
                      <td className="vtu-td">
                        <span className={`vtu-badge ${getPaymentStatusColor(order.paymentStatus || 'pending')}`}>
                          {order.paymentStatus || 'pending'}
                        </span>
                      </td>
                      <td className="vtu-td">
                        <span className={`vtu-badge ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="vtu-td text-right">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetails(true);
                          }}
                          className="vtu-btn-outline"
                          style={{ padding: '8px' }}
                        >
                          <Eye size={16} style={{ color: '#666' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {!loading && totalPages > 1 && (
              <div style={{ padding: '16px', borderTop: '1.5px solid #f0f0f0', background: '#fafaf7' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title="Detailed Order Summary"
          icon={<ShoppingBag size={20} style={{ color: '#BE185D' }} />}
          maxWidth="max-w-lg"
        >
          {selectedOrder && (
            <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Reference</p>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>#{selectedOrder._id?.toUpperCase()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Fulfillment</p>
                  <span className={`vtu-badge ${getOrderStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div style={{ background: '#fafaf7', padding: '16px', borderRadius: '12px', border: '1.5px solid #e4e4de' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Customer</p>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>{selectedOrder.phoneNumber}</p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontWeight: '700' }}>{selectedOrder.network}</p>
                </div>
                <div style={{ background: '#fafaf7', padding: '16px', borderRadius: '12px', border: '1.5px solid #e4e4de' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: '4px' }}>Plan Details</p>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>{getOrderPlanDisplay(selectedOrder)}</p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{formatCurrency(selectedOrder.amount)}</p>
                </div>
              </div>

              {isAfaOrder(selectedOrder) && selectedOrder.afaRegistration && (
                <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1.5px solid #d1fae5', marginBottom: '24px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', marginBottom: '12px' }}>AFA Registration Info</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Applicant</p>
                      <p style={{ fontSize: '12px', fontWeight: '800', color: '#111' }}>{selectedOrder.afaRegistration.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>ID Number</p>
                      <p style={{ fontSize: '12px', fontWeight: '800', color: '#111' }}>{selectedOrder.afaRegistration.idNumber}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Occupation</p>
                      <p style={{ fontSize: '12px', fontWeight: '800', color: '#111' }}>{selectedOrder.afaRegistration.occupation}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: '#666', textTransform: 'uppercase' }}>Location</p>
                      <p style={{ fontSize: '12px', fontWeight: '800', color: '#111' }}>{selectedOrder.afaRegistration.location}</p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1.5px solid #f0f0f0', paddingTop: '16px' }}>
                <div className="flex justify-between items-center py-2">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Payment Status</span>
                  <span className={`vtu-badge ${getPaymentStatusColor(selectedOrder.paymentStatus || 'pending')}`}>
                    {selectedOrder.paymentStatus || 'pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Store Commission</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>+{formatCurrency(selectedOrder.agentCommission || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Order Date</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#111' }}>{formatDate(selectedOrder.createdAt)}</span>
                </div>
                {selectedOrder.transactionId && (
                  <div className="flex justify-between items-center py-2">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Transaction ID</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>{selectedOrder.transactionId}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="vtu-btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '24px' }}
              >
                Close Summary
              </button>
            </div>
          )}
        </Modal>
      </div>
    </AgentLayout>
  );
}
