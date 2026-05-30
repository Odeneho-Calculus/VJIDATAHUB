import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Trash2, AlertCircle, Eye, Database, TrendingUp, CheckCircle, Search, ShoppingBag, Wallet, ChevronDown } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { TransactionDetailsModal } from '../components/AdminTransactionModals';
import { VerifyingPaymentModal, VerifiedPaymentModal } from '../components/AdminVerifyPaymentFeedbackModal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

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

export default function AdminTransactions() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope') === 'agent' ? 'agent' : '';
  const isAgentScope = scope === 'agent';
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [stats, setStats] = useState({ total: 0, successful: 0, pending: 0, totalAmount: 0 });
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingVerificationOnly, setPendingVerificationOnly] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVerifyingModal, setShowVerifyingModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState('Payment verified successfully.');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTransactions = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await adminAPI.getTransactions(page, 10, typeFilter, '', scope);

      if (response.success) {
        setTransactions(response.transactions || []);
        if (response.stats) {
          setStats(response.stats);
        }
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch transactions');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, typeFilter, scope]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, scope]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3000);
  };

  const handleRefresh = async () => {
    try {
      await fetchTransactions();
      showMessage('Transactions refreshed successfully');
    } catch (err) {
      showMessage(err?.message || 'Refresh failed', true);
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowViewModal(true);
  };

  const handleOpenDelete = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteConfirm(true);
  };

  const canVerifyPendingPayment = (transaction) => {
    const supportedTypes = ['wallet_topup', 'wallet_funding', 'data_purchase'];
    if (!supportedTypes.includes(transaction?.type)) return false;
    if (typeof transaction?.paymentStatus === 'string') {
      return transaction.paymentStatus === 'pending';
    }
    return transaction?.status === 'pending';
  };

  const handleVerifyPendingPayment = async (transaction) => {
    if (!transaction?._id) return;
    try {
      setShowVerifyingModal(true);
      const response = await adminAPI.verifyPendingPayment(transaction._id);
      if (response.success) {
        const successText = response.message || 'Pending payment verified successfully';
        showMessage(successText);
        setVerifiedMessage(successText);
        setShowVerifiedModal(true);
      } else {
        showMessage(response.message || 'Failed to verify pending payment', true);
      }
      // Always refresh to show any status changes (e.g. if it moved to "failed")
      await fetchTransactions({ silent: true });
    } catch (err) {
      showMessage(err?.message || 'Failed to verify pending payment', true);
      // Refresh even on error because backend might have updated status to failed
      await fetchTransactions({ silent: true });
    } finally {
      setShowVerifyingModal(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedTransaction) return;
    try {
      setDeleteLoading(true);
      const response = await adminAPI.deleteTransaction(selectedTransaction._id);
      if (response.success) {
        setShowDeleteConfirm(false);
        setSelectedTransaction(null);
        await fetchTransactions();
        showMessage('Transaction deleted successfully');
      } else {
        showMessage(response.message || 'Failed to delete transaction', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete transaction', true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const typeLabels = {
    data_purchase: 'Data',
    checker_purchase: 'Checker',
    wallet_funding: 'Funding',
    wallet_topup: 'Topup',
    refund: 'Refund',
    purchase_refund: 'Refund',
    referral_bonus: 'Bonus',
    afa_purchase: 'AFA Reg',
    afa_registration: 'AFA Reg',
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      !searchTerm ||
      tx.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.userId?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPendingVerification = !pendingVerificationOnly || canVerifyPendingPayment(tx);
    return matchesSearch && matchesPendingVerification;
  });



  const statusColors = {
    successful: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-amber-100 text-amber-700',
    failed: 'bg-rose-100 text-rose-700',
    cancelled: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="tx-page-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .tx-page-container {
          font-family: 'DM Sans', sans-serif;
          background-color: #f5f5f0;
          min-height: 100vh;
          display: flex;
          width: 100%;
          overflow-x: hidden;
        }

        .tx-content {
          flex: 1;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }

        .tx-header {
          background: linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%);
          border: 1.5px solid #FECACA;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 8px 40px rgba(220,38,38,0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tx-heading-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tx-icon-box {
          width: 46px;
          height: 46px;
          background: #DC2626;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(220,38,38,0.25);
        }

        .tx-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .tx-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 768px) {
          .tx-stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        .tx-stat-card {
          background: var(--stat-bg, #fff);
          border: 1.5px solid var(--stat-border, #e4e4de);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.2s;
        }

        .tx-stat-card:hover {
          border-color: var(--stat-color, #d4d4ce);
          box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
        }

        .tx-stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tx-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
        }

        .tx-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tx-btn-outline {
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

        .tx-btn-outline:hover {
          border-color: #DC2626;
          background: #FFF5F5;
        }

        .tx-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          transition: all 0.2s;
          background: transparent;
          cursor: pointer;
        }

        .tx-tab.active {
          background: #DC2626;
          color: #fff;
          box-shadow: 0 4px 12px rgba(220,38,38,0.25);
        }

        .tx-tab:not(.active):hover {
          background: #FFF5F5;
          color: #DC2626;
        }

        .tx-input {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #111;
          transition: all 0.2s;
          outline: none;
        }

        .tx-input:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 4px rgba(220,38,38,0.05);
        }

        .tx-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
          background: #fff;
        }

        .tx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .tx-th {
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

        .tx-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
          white-space: nowrap;
        }

        .tx-table-row {
          transition: all 0.2s;
          cursor: pointer;
        }

        .tx-table-row:hover {
          background: #fafaf7;
        }

        .tx-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .tx-btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #e4e4de;
          background: #fff;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tx-btn-icon:hover {
          border-color: #DC2626;
          color: #fff;
          background: #DC2626;
          transform: translateY(-1px);
        }

        .tx-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(220,38,38,0.1);
          border-top-color: #DC2626;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .tx-content { padding: 12px; }
          .tx-header { padding: 16px; }
          .tx-stats-grid { grid-template-columns: 1fr 1fr; }
          .tx-h2 { font-size: 20px; }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="tx-content">
        {/* Header Card */}
        <div className="tx-header">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="tx-heading-row">
              <div className="tx-icon-box">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600/80">Management Console</span>
                </div>
                <h2 className="tx-h2">{isAgentScope ? 'Agent Histories' : 'Manage Transactions'}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="tx-btn-outline"
                title="Refresh History"
              >
                <RotateCcw size={18} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {error && <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '7px', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}
        {success && <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#047857', borderRadius: '7px', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {success}</div>}

        <div className="tx-stats-grid">
          <div className="tx-stat-card" style={{ '--stat-color': getColor(4).main, '--stat-glow': getColor(4).glow, '--stat-bg': getColor(4).soft, '--stat-border': getColor(4).main + '33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="tx-stat-label" style={{ color: getColor(4).main }}>Total Transactions</p>
                <p className="tx-stat-value">{stats.total}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(4).soft, color: getColor(4).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} />
              </div>
            </div>
          </div>
          <div className="tx-stat-card" style={{ '--stat-color': getColor(1).main, '--stat-glow': getColor(1).glow, '--stat-bg': getColor(1).soft, '--stat-border': getColor(1).main + '33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="tx-stat-label" style={{ color: getColor(1).main }}>Successful</p>
                <p className="tx-stat-value">{stats.successful}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(1).soft, color: getColor(1).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={18} />
              </div>
            </div>
          </div>
          <div className="tx-stat-card" style={{ '--stat-color': getColor(3).main, '--stat-glow': getColor(3).glow, '--stat-bg': getColor(3).soft, '--stat-border': getColor(3).main + '33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="tx-stat-label" style={{ color: getColor(3).main }}>Pending</p>
                <p className="tx-stat-value">{stats.pending}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(3).soft, color: getColor(3).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={18} />
              </div>
            </div>
          </div>
          <div className="tx-stat-card" style={{ '--stat-color': getColor(2).main, '--stat-glow': getColor(2).glow, '--stat-bg': getColor(2).soft, '--stat-border': getColor(2).main + '33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="tx-stat-label" style={{ color: getColor(2).main }}>Total Amount</p>
                <p className="tx-stat-value">GHS {formatNumberAbbreviated(stats.totalAmount)}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(2).soft, color: getColor(2).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Transaction List */}
        <div className="tx-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {/* Search row - Full width */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#DC2626' }} />
              <input
                className="tx-input"
                style={{ paddingLeft: '34px', width: '100%', height: '40px', fontSize: '12px' }}
                placeholder="Search user or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Controls row - Horizontal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: '1', position: 'relative' }}>
                <select
                  className="tx-input"
                  style={{ width: '100%', height: '40px', appearance: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', paddingRight: '30px' }}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">Activities</option>
                  <option value="data_purchase">Data</option>
                  <option value="wallet_funding">Funding</option>
                  <option value="refund">Refunds</option>
                </select>
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#DC2626' }}>
                  <ChevronDown size={14} />
                </div>
              </div>

              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '0 12px', height: '40px', background: '#fafaf7', 
                border: '1.5px solid #e4e4de', borderRadius: '10px',
                flexShrink: 0
              }}>
                <input
                  type="checkbox"
                  id="pendingVerify"
                  checked={pendingVerificationOnly}
                  onChange={(e) => setPendingVerificationOnly(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#DC2626', cursor: 'pointer' }}
                />
                <label htmlFor="pendingVerify" style={{ fontSize: '9px', fontWeight: '800', color: '#666', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Pending
                </label>
              </div>
            </div>
          </div>

          <div className="tx-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="tx-spinner"></div></div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                  <Search size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">No Transactions Found</h3>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Adjust your filters or check back later</p>
              </div>
            ) : (
              <table className="tx-table">
                <thead>
                  <tr>
                    <th className="tx-th">User Details</th>
                    <th className="tx-th">Category</th>
                    <th className="tx-th">Amount</th>
                    <th className="tx-th">Status</th>
                    <th className="tx-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx._id} className="tx-table-row">
                      <td className="tx-td">
                        <div style={{ fontWeight: '700', color: '#111' }}>
                          {tx.storeName ? (
                            <>
                              {tx.agentName || 'Agent'}
                              <span style={{ color: '#888', fontWeight: '500' }}> → {tx.storeName}</span>
                            </>
                          ) : (
                            tx.userId?.name || tx.guestId?.name || tx.guestInfo?.name || 'Unknown'
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{tx.reference}</div>
                      </td>
                      <td className="tx-td">
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>{typeLabels[tx.type] || tx.type}</span>
                      </td>
                      <td className="tx-td" style={{ fontWeight: '800', color: '#111' }}>GHS {Number(tx.amount || 0).toFixed(2)}</td>
                      <td className="tx-td">
                        <span className="tx-badge" style={{
                          background: tx.status === 'successful' || tx.status === 'completed' ? '#ecfdf5' : 
                                      tx.status === 'pending' || tx.status === 'processing' ? '#fffbeb' : '#fff5f5',
                          color: tx.status === 'successful' || tx.status === 'completed' ? '#059669' : 
                                 tx.status === 'pending' || tx.status === 'processing' ? '#f0a500' : '#b91c1c',
                          border: `1px solid ${tx.status === 'successful' || tx.status === 'completed' ? '#059669' : 
                                 tx.status === 'pending' || tx.status === 'processing' ? '#f0a500' : '#b91c1c'}22`
                        }}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="tx-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="tx-btn-icon" onClick={() => handleViewDetails(tx)} title="View"><Eye size={14} /></button>
                          {canVerifyPendingPayment(tx) && (
                            <button className="tx-btn-icon" style={{ borderColor: '#f0a500', color: '#f0a500' }} onClick={() => handleVerifyPendingPayment(tx)} title="Verify Payment"><CheckCircle size={14} /></button>
                          )}
                          <button className="tx-btn-icon" onClick={() => handleOpenDelete(tx)} title="Delete"><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

          {/* Pagination */}
          {!loading && pagination.pages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              onPageChange={(newPage) => setPage(newPage)}
              isLoading={loading}
            />
          )}
        </div>

      <TransactionDetailsModal 
        isOpen={showViewModal} 
        onClose={() => setShowViewModal(false)} 
        transaction={selectedTransaction} 
        typeLabels={typeLabels}
        statusColors={statusColors}
      />
      <VerifyingPaymentModal isOpen={showVerifyingModal} />
      <VerifiedPaymentModal isOpen={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} message={verifiedMessage} />
      <ConfirmDialog 
        isOpen={showDeleteConfirm} 
        onCancel={() => setShowDeleteConfirm(false)} 
        onConfirm={confirmDelete} 
        title="Delete Transaction" 
        message="Delete this transaction permanently?" 
        isDangerous={true} 
        loading={deleteLoading} 
      />
    </div>
  );
}
