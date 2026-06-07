import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Edit2, Trash2, Search, ShoppingCart, CheckCircle, Clock, TrendingUp, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { OrderDetailsModal, OrderStatusModal } from '../components/AdminOrderModals';
import { VerifyingPaymentModal, VerifiedPaymentModal } from '../components/AdminVerifyPaymentFeedbackModal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';
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

export default function AdminOrders() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope') === 'agent' ? 'agent' : '';
  const isAgentScope = scope === 'agent';
  const pageTheme = getColor(isAgentScope ? 7 : 6);
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

  // Derive network options dynamically from actual orders
  // This ensures filters always match the active VTU provider's networks
  const dynamicNetworks = Array.from(
    new Set(
      orders
        .map((order) => order?.network)
        .filter(Boolean)
    )
  );
  const networkOptions = dynamicNetworks;

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

  // When VTU provider changes, clear network filter and refresh orders
  useEffect(() => {
    setNetworkFilter('');
    setPage(1);
    fetchOrders({ silent: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.vtuProvider]);

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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
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
          box-shadow: 0 8px 40px rgba(0,0,0,0.06);
          padding: 24px;
          transition: all 0.2s;
        }
        
        .orders-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .orders-icon-box {
          width: 46px;
          height: 46px;
          background: ${pageTheme.main};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 8px 20px ${pageTheme.glow};
        }
        
        .orders-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }
        
        .orders-subtitle {
          font-size: 14px;
          color: #000;
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
            gap: 16px;
          }
        }
        
        .orders-stat-card {
          background: var(--stat-bg, #fff);
          border: 1.5px solid var(--stat-border, #e4e4de);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.2s;
        }
        
        .orders-stat-card:hover {
          border-color: var(--stat-color, #d4d4ce);
          box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
        }
        
        .orders-stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .orders-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
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
          color: #000;
        }
        
        .orders-input {
          width: 100%;
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 12px;
          padding: 12px 14px 12px 40px;
          font-size: 14px;
          color: #111;
          transition: all 0.2s;
          box-sizing: border-box;
          font-weight: 600;
        }
        
        .orders-input:focus {
          outline: none;
          border-color: ${pageTheme.main};
          box-shadow: 0 0 0 4px ${pageTheme.glow};
          background: #fff;
        }
        
        .orders-filter-label {
          font-size: 10px;
          font-weight: 800;
          color: #000;
          letter-spacing: 0.1em;
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
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #e4e4de;
          background: #fff;
          color: #000;
          transition: all 0.2s;
        }
        
        .orders-chip:hover {
          border-color: ${pageTheme.main}88;
          background: ${pageTheme.soft};
          color: ${pageTheme.main};
        }
        
        .orders-chip.active {
          background: ${pageTheme.main};
          color: #fff;
          border-color: ${pageTheme.main};
          box-shadow: 0 4px 12px ${pageTheme.glow};
        }
        
        .orders-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }
        
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        
        .orders-table th {
          padding: 12px 16px;
          background: #fafaf7;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11px;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        
        .orders-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          color: #444;
          white-space: nowrap;
          vertical-align: middle;
        }
        
        .orders-table tr {
          transition: all 0.2s;
        }
        
        .orders-table tr:hover {
          background: #fafaf7;
        }
        
        .orders-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .orders-btn-primary {
          background: ${pageTheme.main};
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px ${pageTheme.glow};
        }
        
        .orders-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .orders-btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e4e4de;
          background: #fff;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .orders-btn-icon:hover {
          background: #0F6E56;
          color: #fff;
          border-color: #0F6E56;
          transform: translateY(-1px);
        }
        
        .orders-spinner {
          width: 18px;
          height: 18px;
          border: 3px solid ${pageTheme.soft};
          border-top-color: ${pageTheme.main};
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
            <div className="orders-card !p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="orders-header">
                  <div className="orders-icon-box" style={{ background: pageTheme.main, boxShadow: `0 8px 20px ${pageTheme.glow}` }}>
                    <ShoppingCart size={22} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: pageTheme.main }}>{isAgentScope ? 'Agent Operations' : 'Management Center'}</span>
                    </div>
                    <h1 className="orders-title !text-lg sm:!text-2xl">{isAgentScope ? 'Agent Orders' : 'Order Management'}</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="orders-stats-grid">
              {[
                { label: 'Total Orders', value: statsData.total, icon: ShoppingCart, color: getColor(4) }, // Pink
                { label: 'Completed', value: statsData.completed, icon: CheckCircle, color: getColor(1) }, // Teal
                { label: 'Pending', value: statsData.pending, icon: Clock, color: getColor(3) }, // Amber
                { label: 'Processing', value: statsData.processing, icon: TrendingUp, color: getColor(2) } // Blue
              ].map((stat, i) => (
                <div 
                  key={i} 
                  className="orders-stat-card"
                  style={{
                    '--stat-color': stat.color.main + '66',
                    '--stat-glow': stat.color.glow,
                    '--stat-bg': stat.color.soft,
                    '--stat-border': stat.color.main + '33',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="orders-stat-label" style={{ color: stat.color.main }}>{stat.label}</p>
                      <p className="orders-stat-value">{stat.value}</p>
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

            {/* Controls */}
            <div className="orders-card">
              <div className="orders-input-group">
                <div>
                  <p className="orders-filter-label" style={{ color: pageTheme.main }}>Quick Search</p>
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
                </div>

                <div>
                  <p className="orders-filter-label" style={{ color: pageTheme.main }}>Status Filter</p>
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
                  <p className="orders-filter-label" style={{ color: pageTheme.main }}>Network Filter</p>
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
              <div style={{ padding: '20px 24px', borderBottom: '1.5px solid #e4e4de', background: '#fafaf7', borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: pageTheme.soft, color: pageTheme.main,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Database size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#111' }}>Order Records</h2>
                      <p style={{ margin: 0, fontSize: '11px', color: '#000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filteredOrders.length} matching entries</p>
                    </div>
                  </div>
                  {someSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: pageTheme.main }}>{selectedIds.size} selected</span>
                      <button className="orders-btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#DC2626', boxShadow: '0 4px 12px rgba(220,38,38,0.2)' }} onClick={() => setShowBulkDeleteConfirm(true)}>
                        <Trash2 size={13} strokeWidth={2.5} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="orders-table-container">
                {loading ? (
                  <div style={{ padding: '64px', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="orders-spinner" style={{ width: '32px', height: '32px' }}></div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#000' }}>Fetching records...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div style={{ padding: '64px', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fafaf7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1.5px dashed #e4e4de' }}>
                      <Database size={32} style={{ color: '#e4e4de' }} />
                    </div>
                    <p style={{ color: '#000', margin: 0, fontWeight: 700, fontSize: '14px' }}>No orders found matching your criteria</p>
                  </div>
                ) : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                        </th>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Plan / Phone</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, idx) => {
                        const orderId = order.id || order._id;
                        const c = getColor(idx);
                        const isSelected = selectedIds.has(orderId);
                        
                        return (
                          <tr key={orderId} style={{ background: isSelected ? pageTheme.soft : 'transparent' }}>
                            <td>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(orderId)} />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  width: 28, height: 28, borderRadius: 6, 
                                  background: c.soft, color: c.main, 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                  fontWeight: 700, fontSize: 10, 
                                  border: `1px solid ${c.main}33`, 
                                  flexShrink: 0
                                }}>
                                  {order.network?.charAt(0).toUpperCase() || 'O'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 700, color: '#333' }}>#{order.orderNumber?.slice(-8).toUpperCase() || order._id?.slice(-8).toUpperCase()}</span>
                                  <span style={{ fontSize: '11px', color: '#666' }}>{order.network || 'Generic'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#333' }}>
                                  {order.storeId?.name 
                                    ? (order.storeId.owner?.name || 'Agent')
                                    : (order.isGuest ? (order.guestInfo?.name || 'Guest') : (order.userId?.name || 'Direct'))
                                  }
                                </span>
                                {order.storeId?.name && (
                                  <span style={{ fontSize: '11px', color: '#666' }}>{order.storeId.name}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#333' }}>{getPlanDisplayValue(order)}</span>
                                <span style={{ fontSize: '11px', color: '#666' }}>{order.phoneNumber}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#333' }}>GHS {formatNumberAbbreviated(order.amount)}</span>
                            </td>
                            <td>
                              <span className="orders-badge"
                                    style={getPaymentStatusStyle(order.paymentStatus)}>
                                {order.paymentStatus || 'pending'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="orders-badge"
                                      style={getOrderStatusStyle(order.status)}>
                                  {order.providerStatus || order.status}
                                </span>
                                {order.isRefunded && (
                                  <span className="orders-badge" style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '9px', border: '1px solid #ffedd5' }}>
                                    REFUNDED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#333', fontSize: '12px' }}>{new Date(order.date || order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span style={{ fontSize: '11px', color: '#666' }}>{new Date(order.date || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button className="orders-btn-icon" onClick={() => handleViewDetails(order)} title="View Details">
                                  <Eye size={14} />
                                </button>
                                {canVerifyPendingPayment(order) && (
                                  <button className="orders-btn-icon" style={{ color: '#d97706' }} onClick={() => handleVerifyPendingPayment(order)} title="Verify Payment">
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                                <button className="orders-btn-icon" onClick={() => handleEditStatus(order)} title="Edit Status">
                                  <Edit2 size={14} />
                                </button>
                                <button className="orders-btn-icon" onClick={() => handleOpenDelete(order)} style={{ color: '#dc2626' }} title="Delete Order">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) }
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                  isLoading={loading}
                />
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
        themeColor={pageTheme}
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
        themeColor={pageTheme}
      />

      <ConfirmDialog
        isOpen={showRefundConfirm}
        title="Refund Order"
        message="Are you sure you want to refund this order? The user's wallet will be credited."
        onConfirm={confirmRefund}
        onCancel={() => setShowRefundConfirm(false)}
        loading={updateLoading}
        themeColor={pageTheme}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={updateLoading}
        themeColor={pageTheme}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title="Delete Selected Orders"
        message={`Are you sure you want to delete ${selectedIds.size} selected order(s)? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        loading={updateLoading}
        themeColor={pageTheme}
      />

      <VerifyingPaymentModal isOpen={showVerifyingModal} themeColor={pageTheme} />
      <VerifiedPaymentModal
        isOpen={showVerifiedModal}
        message={verifiedMessage}
        onClose={() => setShowVerifiedModal(false)}
        themeColor={pageTheme}
      />
    </div>
  );
}
