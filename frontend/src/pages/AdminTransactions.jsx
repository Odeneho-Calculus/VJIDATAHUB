import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Trash2, AlertCircle, Eye, Database, TrendingUp, CheckCircle, Search } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import { TransactionDetailsModal } from '../components/AdminTransactionModals';
import { VerifyingPaymentModal, VerifiedPaymentModal } from '../components/AdminVerifyPaymentFeedbackModal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPage(newPage);
    }
  };

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
    <div className="tx-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .tx-page-container {
          font-family: 'DM Sans', sans-serif;
        }

        .tx-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tx-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 1100px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .tx-heading-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .tx-icon-box {
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
          width: 100%;
          margin-bottom: 24px;
        }

        @media (min-width: 1024px) {
          .tx-stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        .tx-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tx-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tx-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
        }

        .tx-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .tx-search-box {
          position: relative;
          width: 100%;
        }

        .tx-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .tx-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
          outline: none;
        }

        .tx-btn-primary {
          background: #111;
          color: #fff;
          border-radius: 7px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .tx-btn-primary:hover {
          background: #222;
        }

        .tx-filter-btn {
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          border: 1.5px solid #e4e4de;
          background: #fafaf7;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tx-filter-btn.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .tx-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }

        .tx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .tx-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11.5px;
          text-transform: uppercase;
        }

        .tx-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .tx-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10.5px;
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
        }

        .tx-btn-icon:hover {
          background: #111;
          color: #fff;
        }

        .tx-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(17,17,17,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: tx-spin 0.8s linear infinite;
        }

        @keyframes tx-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="tx-content">
        <div className="tx-main-card">
          <div className="tx-heading-section">
            <div className="tx-icon-box">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="tx-h2">{isAgentScope ? 'Agent Histories' : 'Manage Transactions'}</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>Track and monitor all financial activities</p>
            </div>
          </div>

          {error && <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}
          {success && <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#047857', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {success}</div>}

          <div className="tx-stats-grid">
            <div className="tx-stat-card">
              <span className="tx-stat-label">Total</span>
              <span className="tx-stat-value">{stats.total}</span>
            </div>
            <div className="tx-stat-card">
              <span className="tx-stat-label">Successful</span>
              <span className="tx-stat-value" style={{ color: '#059669' }}>{stats.successful}</span>
            </div>
            <div className="tx-stat-card">
              <span className="tx-stat-label">Pending</span>
              <span className="tx-stat-value" style={{ color: '#f0a500' }}>{stats.pending}</span>
            </div>
            <div className="tx-stat-card">
              <span className="tx-stat-label">Amount</span>
              <span className="tx-stat-value">GHS {formatNumberAbbreviated(stats.totalAmount)}</span>
            </div>
          </div>

          <div className="tx-controls">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="tx-search-box" style={{ flex: '1', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  className="tx-input"
                  placeholder="Search user or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="tx-btn-primary" onClick={handleRefresh}>
                <RotateCcw size={16} /> Refresh
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#333', textTransform: 'uppercase' }}>Filter:</span>
              <button className={`tx-filter-btn ${typeFilter === '' ? 'active' : ''}`} onClick={() => setTypeFilter('')}>All</button>
              {['data_purchase', 'wallet_funding', 'refund'].map(type => (
                <button
                  key={type}
                  className={`tx-filter-btn ${typeFilter === type ? 'active' : ''}`}
                  onClick={() => setTypeFilter(type)}
                >
                  {typeLabels[type] || type}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="pendingVerify"
                  checked={pendingVerificationOnly}
                  onChange={(e) => setPendingVerificationOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#111' }}
                />
                <label htmlFor="pendingVerify" style={{ fontSize: '12.5px', fontWeight: '700', color: '#333' }}>Pending Verification</label>
              </div>
            </div>
          </div>

          <div className="tx-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="tx-spinner"></div></div>
            ) : (
              <table className="tx-table">
                <thead>
                  <tr>
                    <th className="tx-th">User</th>
                    <th className="tx-th">Type</th>
                    <th className="tx-th">Amount</th>
                    <th className="tx-th">Status</th>
                    <th className="tx-th">Date</th>
                    <th className="tx-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx._id}>
                      <td className="tx-td" style={{ whiteSpace: 'nowrap' }}>
                        {tx.storeName ? (
                          <>
                            <div style={{ fontWeight: '700', color: '#111' }}>
                              {tx.agentName || 'Agent'}
                              <span style={{ color: '#888', fontWeight: '500' }}> → {tx.storeName}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              Customer: {tx.userId?.name || tx.guestInfo?.name || tx.userId?.phone || tx.guestInfo?.phone || 'N/A'}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontWeight: '700', color: '#111' }}>
                            {tx.userId?.name || tx.guestId?.name || tx.guestInfo?.name || 'Unknown'}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>{tx.reference}</div>
                        {(tx.userId?.phone || tx.guestId?.phone || tx.guestInfo?.phone) && !tx.storeName && (
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {tx.userId?.phone || tx.guestId?.phone || tx.guestInfo?.phone}
                          </div>
                        )}
                      </td>
                      <td className="tx-td" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>{typeLabels[tx.type] || tx.type}</span>
                      </td>
                      <td className="tx-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700' }}>GHS {Number(tx.amount || 0).toFixed(2)}</div>
                      </td>
                      <td className="tx-td" style={{ whiteSpace: 'nowrap' }}>
                        <span className="tx-badge" style={{
                          background: tx.status === 'successful' || tx.status === 'completed' ? '#ecfdf5' : 
                                      tx.status === 'pending' || tx.status === 'processing' ? '#fffbeb' : '#fff5f5',
                          color: tx.status === 'successful' || tx.status === 'completed' ? '#059669' : 
                                 tx.status === 'pending' || tx.status === 'processing' ? '#f0a500' : '#b91c1c'
                        }}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="tx-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px' }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="tx-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="tx-btn-icon" onClick={() => handleViewDetails(tx)}><Eye size={14} /></button>
                          {canVerifyPendingPayment(tx) && (
                            <button className="tx-btn-icon" style={{ borderColor: '#f0a500', color: '#f0a500' }} onClick={() => handleVerifyPendingPayment(tx)} title="Verify Payment"><CheckCircle size={14} /></button>
                          )}
                          <button className="tx-btn-icon" onClick={() => handleOpenDelete(tx)}><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && pagination.pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button
                className="tx-btn-primary"
                style={{ padding: '8px 14px', fontSize: '13px', opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#333', minWidth: '80px', textAlign: 'center' }}>
                Page {page} of {pagination.pages}
              </span>
              <button
                className="tx-btn-primary"
                style={{ padding: '8px 14px', fontSize: '13px', opacity: page >= pagination.pages ? 0.5 : 1, cursor: page >= pagination.pages ? 'not-allowed' : 'pointer' }}
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </div>
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
