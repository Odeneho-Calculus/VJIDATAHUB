import React, { useState, useEffect } from 'react';
import { AlertCircle, Search, CheckCircle, Clock, XCircle, Filter, Layout, CreditCard, RefreshCw, ArrowRight, Eye, ShoppingBag, Loader2, Phone, Wifi } from 'lucide-react';
import { store as storeAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { useSettings } from '../context/SettingsContext';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .vtu-page-container {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background-color: #f5f5f0;
    padding: 24px 16px;
  }

  .vtu-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .vtu-heading-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
  }

  .vtu-icon-box {
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

  .vtu-main-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    padding: 24px;
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
    border-color: #111;
    box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
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
  }

  .vtu-btn-primary {
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

  .vtu-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
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

  .vtu-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  .vtu-table-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }

  .vtu-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .vtu-th {
    background: #fafaf7;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #333;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .vtu-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
    white-space: nowrap;
  }

  .vtu-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  @media (max-width: 640px) {
    .vtu-h2 {
      font-size: 22px;
    }
    .vtu-btn-primary, .vtu-btn-outline {
      padding: 6px 12px;
      font-size: 12px;
    }
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
      case 'completed':
        return { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' };
      case 'pending':
        return { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };
      case 'failed':
        return { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' };
      default:
        return { background: '#f3f4f6', color: '#4b5563' };
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' };
      case 'processing':
        return { background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' };
      case 'pending':
        return { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };
      case 'failed':
        return { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' };
      default:
        return { background: '#f3f4f6', color: '#4b5563' };
    }
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

  return (
    <AgentLayout>
      <div className="vtu-page-container">
        <style>{styles}</style>
        <div className="vtu-content">
          {/* Heading Section */}
          <div className="vtu-heading-section">
            <div className="vtu-icon-box">
              <ShoppingBag size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="vtu-h2">Customer Orders</h2>
              <p className="vtu-p">Monitor and manage all sales from your store</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="vtu-badge" style={{ background: '#111', color: '#f0a500' }}>{totalOrders} Total</span>
              <button
                onClick={fetchOrders}
                className="vtu-btn-outline p-2"
                title="Refresh Orders"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
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

          {/* Filters Card */}
          <div className="vtu-main-card">
            <div className="vtu-filter-bar">
              <form onSubmit={handleSearch} style={{ flex: 1, position: 'relative' }}>
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

          {/* Orders Table Card */}
          <div className="vtu-main-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '100px' }}>
                <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 16px', color: '#f0a500' }} />
                <p className="vtu-p">Loading your orders...</p>
              </div>
            ) : displayedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px', background: '#fafaf7' }}>
                <ShoppingBag size={48} style={{ margin: '0 auto 16px', color: '#e4e4de' }} />
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#111' }}>No orders found</p>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="vtu-table-container" style={{ border: 'none' }}>
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
                    {displayedOrders.map((order) => {
                      const deliveryStyle = getOrderStatusColor(order.status);
                      const paymentStyle = getPaymentStatusColor(order.paymentStatus || 'pending');

                      return (
                        <tr key={order._id} className="hover:bg-slate-50 transition-colors">
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
                            <span className="vtu-badge" style={paymentStyle}>{order.paymentStatus || 'pending'}</span>
                          </td>
                          <td className="vtu-td">
                            <span className="vtu-badge" style={deliveryStyle}>{order.status}</span>
                          </td>
                          <td className="vtu-td text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowDetails(true);
                              }}
                              style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #e4e4de', background: '#fff', cursor: 'pointer' }}
                            >
                              <Eye size={16} style={{ color: '#666' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
          icon={<ShoppingBag size={20} style={{ color: '#111' }} />}
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
                  <span className="vtu-badge" style={getOrderStatusColor(selectedOrder.status)}>
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

              <div style={{ borderTop: '1.5px solid #f0f0f0', paddingTop: '16px' }}>
                <div className="flex justify-between items-center py-2">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#666' }}>Payment Status</span>
                  <span className="vtu-badge" style={getPaymentStatusColor(selectedOrder.paymentStatus || 'pending')}>{selectedOrder.paymentStatus || 'pending'}</span>
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
