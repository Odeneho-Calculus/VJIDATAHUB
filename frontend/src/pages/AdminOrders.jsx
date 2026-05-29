import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Edit2, Trash2, Search, ShoppingCart, CheckCircle, Clock, TrendingUp, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, processing: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [newStatus, setNewStatus] = useState('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
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
      const response = await adminAPI.getOrders(page, 10, statusFilter, networkFilter, scope);

      if (response.success) {
        setOrders(response.data?.orders || response.orders || []);
        setTotalPages(response.data?.pagination?.pages || response.pagination?.pages || 0);
        if (response.stats) {
          setStats(response.stats);
        }
      } else {
        if (!silent) toast.error(response.message || 'Failed to fetch orders', { duration: 5000 });
      }
    } catch (err) {
      if (!silent) toast.error(err?.message || 'Failed to fetch orders', { duration: 5000 });
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
      toast.error(msg, { duration: 5000 });
    } else {
      toast.success(msg, { duration: 3000 });
    }
  };

  const getFilteredOrders = () => {
    const term = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !term ||
        (order.user?.name || order.userId?.name || '').toLowerCase().includes(term) ||
        (order.user?.email || order.userId?.email || '').toLowerCase().includes(term) ||
        (order.user?.phone || order.userId?.phone || '').toLowerCase().includes(term) ||
        (order.phoneNumber || '').toLowerCase().includes(term) ||
        (order.orderNumber || '').toLowerCase().includes(term) ||
        (order.planName || '').toLowerCase().includes(term) ||
        (order.store?.name || '').toLowerCase().includes(term) ||
        (order.store?.owner?.name || '').toLowerCase().includes(term) ||
        (order.store?.owner?.email || '').toLowerCase().includes(term) ||
        (order.store?.owner?.phone || '').toLowerCase().includes(term);

      const matchesNetwork = !networkFilter || networksMatch(order.network, networkFilter);
      return matchesSearch && matchesNetwork;
    });
  };

  const statsData = stats;
  const filteredOrders = getFilteredOrders();
  const allSelected = filteredOrders.length > 0 && filteredOrders.every(order => selectedIds.has(order.id || order._id));
  const someSelected = selectedIds.size > 0;

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { backgroundColor: '#f0fdf4', color: '#166534' };
      case 'pending': return { backgroundColor: '#fffbeb', color: '#92400e' };
      case 'failed': return { backgroundColor: '#fef2f2', color: '#991b1b' };
      default: return { backgroundColor: '#f8fafc', color: '#334155' };
    }
  };

  const getOrderStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { backgroundColor: '#f0fdf4', color: '#166534' };
      case 'processing': return { backgroundColor: '#eff6ff', color: '#1e40af' };
      case 'pending': return { backgroundColor: '#fffbeb', color: '#92400e' };
      case 'failed': return { backgroundColor: '#fef2f2', color: '#991b1b' };
      default: return { backgroundColor: '#f8fafc', color: '#334155' };
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

  const handleRefund = (order) => {
    setSelectedOrder(order);
    setShowRefundConfirm(true);
    setShowDetailsModal(false);
  };

  const confirmRefund = async () => {
    if (!selectedOrder) return;

    try {
      setUpdateLoading(true);
      const response = await adminAPI.refundOrder(
        selectedOrder.id || selectedOrder._id,
        'Refund processed by admin from dashboard'
      );

      if (response.success) {
        setShowRefundConfirm(false);
        await fetchOrders();
        setSelectedOrder(null);
        showMessage('Order refunded successfully');
      } else {
        showMessage(response.message || 'Failed to refund order', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to refund order', true);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleOpenDelete = (order) => {
    setSelectedOrder(order);
    setShowDeleteConfirm(true);
  };

  const canVerifyPendingPayment = (order) => {
    if (order?.paymentMethod !== 'paystack') return false;
    return order?.paymentStatus === 'pending';
  };

  const handleVerifyPendingPayment = async (order) => {
    if (!order?._id && !order?.id) return;
    const orderId = order._id || order.id;
    try {
      setShowVerifyingModal(true);
      const response = await adminAPI.verifyPendingPayment(orderId);
      if (response.success) {
        const successText = response.message || 'Pending payment verified successfully';
        showMessage(successText);
        setVerifiedMessage(successText);
        setShowVerifiedModal(true);
      } else {
        showMessage(response.message || 'Failed to verify pending payment', true);
      }
      // Always refresh to show any status changes (e.g. if it moved to "failed")
      await fetchOrders({ silent: true });
    } catch (err) {
      showMessage(err?.message || 'Failed to verify pending payment', true);
      // Refresh even on error because backend might have updated status to failed
      await fetchOrders({ silent: true });
    } finally {
      setShowVerifyingModal(false);
    }
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f0', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .orders-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .orders-scrollable {
          flex: 1;
          overflow-y: auto;
          padding: 24px 16px;
        }
        
        .orders-max-width {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .orders-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          padding: 24px;
        }
        
        .orders-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }
        
        .orders-icon-box {
          width: 46px;
          height: 46px;
          background: #111;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f0a500;
        }
        
        .orders-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        
        .orders-subtitle {
          font-size: 14px;
          color: #666;
          margin: 4px 0 0 0;
        }
        
        .orders-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        @media (min-width: 1024px) {
          .orders-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .orders-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          transition: all 0.2s;
        }
        
        .orders-stat-card:hover {
          border-color: #111;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .orders-stat-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }
        
        .orders-stat-value {
          font-size: 24px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        
        .orders-input-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .orders-search-wrapper {
          position: relative;
        }
        
        .orders-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
        
        .orders-input {
          width: 100%;
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          color: #111;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        
        .orders-input:focus {
          outline: none;
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
        }
        
        .orders-filter-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .orders-filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .orders-chip {
          padding: 8px 16px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #e0e0d8;
          background: #fafaf7;
          color: #111;
          transition: all 0.2s;
        }
        
        .orders-chip.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        
        .orders-table-container {
          overflow-x: auto;
          margin-top: 8px;
        }
        
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        
        .orders-table th {
          padding: 16px;
          background: #fafaf7;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
        }
        
        .orders-table td {
          padding: 16px;
          border-bottom: 1.5px solid #f0f0f0;
          font-size: 14px;
          color: #111;
        }
        
        .orders-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-block;
        }
        
        .orders-btn-primary {
          background: #111;
          color: #fff;
          border: none;
          border-radius: 7px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .orders-btn-primary:hover {
          background: #222;
        }
        
        .orders-btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #e4e4de;
          background: #fff;
          color: #111;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .orders-btn-icon:hover {
          background: #fafaf7;
          border-color: #111;
        }
        
        .orders-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(0,0,0,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: orders-spin 0.8s linear infinite;
        }
        
        @keyframes orders-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      <div className="orders-container">
        <div className="orders-scrollable">
          <div className="orders-max-width">
            
            {/* Header */}
            <div className="orders-card">
              <div className="orders-header">
                <div className="orders-icon-box">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <h1 className="orders-title">{isAgentScope ? 'Agent Orders' : 'Order Management'}</h1>
                  <p className="orders-subtitle">{isAgentScope ? 'Track all orders placed by buyers through agent stores' : 'Manage all customer orders and track their status'}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="orders-stats-grid">
              {[
                { label: 'Total Orders', value: statsData.total, icon: <ShoppingCart size={16} />, color: '#eff6ff' },
                { label: 'Completed', value: statsData.completed, icon: <CheckCircle size={16} />, color: '#f0fdf4' },
                { label: 'Pending', value: statsData.pending, icon: <Clock size={16} />, color: '#fffbeb' },
                { label: 'Processing', value: statsData.processing, icon: <TrendingUp size={16} />, color: '#eff6ff' }
              ].map((stat, i) => (
                <div key={i} className="orders-stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stat.color, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '0 8px' }}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className="orders-stat-label">{stat.label}</p>
                  <p className="orders-stat-value">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="orders-card">
              <div className="orders-input-group">
                <div className="orders-search-wrapper">
                  <Search className="orders-search-icon" size={16} />
                  <input
                    type="text"
                    className="orders-input"
                    placeholder="Search by order #, user, phone, store..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <p className="orders-filter-label">Status Filter</p>
                  <div className="orders-filter-chips">
                    <div 
                      className={`orders-chip ${statusFilter === '' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('')}
                    >All Status</div>
                    {['pending', 'processing', 'completed', 'failed'].map(s => (
                      <div 
                        key={s}
                        className={`orders-chip ${statusFilter === s ? 'active' : ''}`}
                        onClick={() => setStatusFilter(s)}
                      >{s.charAt(0).toUpperCase() + s.slice(1)}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="orders-filter-label">Network Filter</p>
                  <div className="orders-filter-chips">
                    <div 
                      className={`orders-chip ${networkFilter === '' ? 'active' : ''}`}
                      onClick={() => setNetworkFilter('')}
                    >All Networks</div>
                    {networkOptions.map(n => (
                      <div 
                        key={n}
                        className={`orders-chip ${networkFilter === n ? 'active' : ''}`}
                        onClick={() => setNetworkFilter(n)}
                      >{n}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="orders-card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #e4e4de', background: '#fafaf7', borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>Order Records</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#666', fontWeight: 600 }}>{filteredOrders.length} results</p>
                  </div>
                  {someSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{selectedIds.size} selected</span>
                      <button className="orders-btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#991b1b' }} onClick={() => setShowBulkDeleteConfirm(true)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="orders-table-container">
                {loading ? (
                  <div style={{ padding: '64px', display: 'flex', justifyContent: 'center' }}>
                    <div className="orders-spinner" style={{ width: '32px', height: '32px' }}></div>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div style={{ padding: '64px', textAlign: 'center' }}>
                    <Database size={48} style={{ color: '#e4e4de', marginBottom: '16px' }} />
                    <p style={{ color: '#666', margin: 0 }}>No orders found matching your criteria</p>
                  </div>
                ) : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                        </th>
                        <th>Order</th>
                        <th>Store / Customer</th>
                        <th>Plan / Phone</th>
                        <th>Amount</th>
                        <th>Payment Status</th>
                        <th>Order Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(order => {
                        const orderId = order.id || order._id;
                        return (
                          <tr key={orderId} style={{ background: selectedIds.has(orderId) ? '#fafaf7' : 'transparent' }}>
                            <td>
                              <input type="checkbox" checked={selectedIds.has(orderId)} onChange={() => toggleSelectOne(orderId)} />
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>#{order.orderNumber?.slice(-8) || order._id?.slice(-8)}</div>
                              <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>{order.network}</div>
                            </td>
                            <td>
                              {order.storeId?.name ? (
                                <>
                                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                                    {order.storeId.owner?.name || 'Agent'}
                                    <span style={{ color: '#888', fontWeight: 500 }}> → {order.storeId.name}</span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#999' }}>
                                    Customer: {order.guestInfo?.name || order.userId?.name || order.phoneNumber || 'N/A'}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{order.isGuest ? (order.guestInfo?.name || 'Guest') : (order.userId?.name || 'User')}</div>
                                  <div style={{ fontSize: '11px', color: '#999' }}>{order.isGuest ? order.guestInfo?.email : order.userId?.email}</div>
                                </>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '13px', fontWeight: 700 }}>{getPlanDisplayValue(order)}</div>
                              <div style={{ fontSize: '11px', color: '#666' }}>{order.phoneNumber}</div>
                            </td>
                            <td style={{ fontWeight: 800 }}>GHS {formatNumberAbbreviated(order.amount)}</td>
                            <td>
                              <span className="orders-badge" style={getPaymentStatusStyle(order.paymentStatus)}>
                                {order.paymentStatus || 'pending'}
                              </span>
                            </td>
                            <td>
                              <div className="flex flex-col gap-1">
                                <span className="orders-badge" style={getOrderStatusStyle(order.status)}>
                                  {order.providerStatus || order.status}
                                </span>
                                {order.isRefunded && (
                                  <span className="orders-badge" style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '9px' }}>
                                    REFUNDED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', fontWeight: 700 }}>{new Date(order.date || order.createdAt).toLocaleDateString()}</div>
                              <div style={{ fontSize: '10px', color: '#999' }}>{new Date(order.date || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="orders-btn-icon" onClick={() => handleViewDetails(order)}><Eye size={14} /></button>
                                {canVerifyPendingPayment(order) && (
                                  <button className="orders-btn-icon" style={{ borderColor: '#f0a500', color: '#f0a500' }} onClick={() => handleVerifyPendingPayment(order)} title="Verify Payment"><CheckCircle size={14} /></button>
                                )}
                                <button className="orders-btn-icon" onClick={() => handleEditStatus(order)}><Edit2 size={14} /></button>
                                <button className="orders-btn-icon" onClick={() => handleOpenDelete(order)} style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div style={{ padding: '16px 24px', borderTop: '1.5px solid #e4e4de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>Page {page} of {totalPages}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="orders-chip" 
                      style={{ padding: '6px 12px' }} 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >Prev</button>
                    <button 
                      className="orders-chip" 
                      style={{ padding: '6px 12px' }} 
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >Next</button>
                  </div>
                </div>
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
        onRefund={handleRefund}
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
        onUpdate={handleUpdateStatus}
        loading={updateLoading}
      />

      <ConfirmDialog
        isOpen={showRefundConfirm}
        title="Refund Order"
        message="Are you sure you want to refund this order? The user's wallet will be credited."
        onConfirm={confirmRefund}
        onCancel={() => setShowRefundConfirm(false)}
        loading={updateLoading}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={updateLoading}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title="Delete Selected Orders"
        message={`Are you sure you want to delete ${selectedIds.size} selected order(s)? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        loading={updateLoading}
      />

      <VerifyingPaymentModal isOpen={showVerifyingModal} />
      <VerifiedPaymentModal
        isOpen={showVerifiedModal}
        message={verifiedMessage}
        onClose={() => setShowVerifiedModal(false)}
      />
    </div>
  );
}
