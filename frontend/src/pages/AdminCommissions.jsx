import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Eye, RotateCw, HandCoins, Check, CircleDollarSign, Clock, XCircle, Send, X, AlertCircle, CheckCircle, Search, Filter, Calendar, ChevronRight, Hash, User, Mail, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import { useSidebar } from '../hooks/useSidebar';
import { adminStore } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

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
const pageTheme = getColor(2); // blue

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  .comm-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #ffffff;
    min-height: 100vh;
    color: #1a1a1a;
  }

  .comm-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .comm-header {
    background: linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%);
    border: 1.5px solid ${pageTheme.main}33;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px ${pageTheme.glow};
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .comm-h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: #111;
  }

  .comm-icon-box {
    width: 46px;
    height: 46px;
    background: ${pageTheme.main};
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px ${pageTheme.glow};
  }

  .comm-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .comm-btn-outline {
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

  .comm-btn-outline:hover {
    border-color: ${pageTheme.main};
    background: ${pageTheme.soft};
  }

  .comm-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  @media (min-width: 768px) {
    .comm-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .comm-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
    min-width: 0;
  }

  .comm-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .comm-stat-label {
    font-size: 10px;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .comm-stat-value {
    font-size: 18px;
    font-weight: 800;
    color: #111;
  }

  .comm-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .comm-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 14px;
    border: 1.5px solid #e4e4de;
    background: #fff;
  }

  .comm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .comm-th {
    background: #fafaf7;
    text-align: left;
    padding: 14px 16px;
    font-weight: 800;
    color: #000;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .comm-td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #111;
  }

  .comm-table-row {
    transition: all 0.2s;
    cursor: pointer;
  }

  .comm-table-row:hover {
    background: #fafaf7;
  }

  .badge-premium {
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

  .comm-mobile-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 16px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  }

  .comm-mobile-card:hover {
    border-color: var(--card-color, #111);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px var(--card-glow, rgba(0,0,0,0.06));
  }

  .filter-tab {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    transition: all 0.2s;
    cursor: pointer;
    border: 1.5px solid transparent;
  }

  .comm-pagination {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    padding: 16px;
  }

  .comm-page-btn {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    background: #fff;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    color: #555;
  }

  .comm-page-btn.active {
    background: #1D4ED8;
    color: #fff;
    border-color: #1D4ED8;
    box-shadow: 0 4px 12px rgba(29,78,216,0.2);
  }

  .comm-page-btn:not(.active):hover {
    border-color: #1D4ED8;
    color: #1D4ED8;
  }

  @media (max-width: 768px) {
    .comm-content { padding: 12px; }
    .comm-header { padding: 16px; }
  }
`;


export default function AdminCommissions() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDangerous: false,
    confirmText: 'Confirm',
    onConfirm: null,
  });

  const openConfirm = useCallback(({ title, message, isDangerous = false, confirmText = 'Confirm', onConfirm }) => {
    setConfirmState({ isOpen: true, title, message, isDangerous, confirmText, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [filter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const data = await adminStore.getCommissionPayouts(page, 20, filter === 'all' ? '' : filter);
      setPayouts(data?.payouts || []);
      setTotalPages(data?.pagination?.pages || 0);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (payout, action) => {
    setSelectedPayout(payout);
    setModalAction(action);
    setFormData({});
    setShowModal(true);
  };

  const showApproveForm = () => {
    setModalAction('approve');
    setFormData({});
  };

  const showMarkPaidForm = () => {
    setModalAction('markPaid');
    setFormData({});
  };

  const showRejectForm = () => {
    setModalAction('reject');
    setFormData({ adminNote: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPayout(null);
    setModalAction(null);
    setFormData({});
  };

  const requestApprovePayout = () => {
    if (!selectedPayout || !selectedPayout._id) {
      showMessage('Invalid payout selected', true);
      return;
    }
    openConfirm({
      title: 'Approve Payout',
      message: `Approve this ${selectedPayout.method === 'mobile_money' ? 'mobile money' : 'bank'} payout request for ${selectedPayout.agentId?.name || 'this agent'}?`,
      isDangerous: false,
      confirmText: 'Yes, Approve',
      onConfirm: handleApprovePayout,
    });
  };

  const requestMarkAsPaid = (payout = selectedPayout) => {
    if (!payout || !payout._id) {
      showMessage('Invalid payout selected', true);
      return;
    }
    openConfirm({
      title: 'Mark as Paid',
      message: `Mark this payout of ${formatCurrencyAbbreviated(Number(payout.netAmount || 0))} as paid for ${payout.agentId?.name || 'this agent'}?`,
      isDangerous: false,
      confirmText: 'Yes, Mark Paid',
      onConfirm: () => handleMarkAsPaid(payout),
    });
  };

  const requestRejectPayout = () => {
    if (!selectedPayout || !selectedPayout._id) {
      showMessage('Invalid payout selected', true);
      return;
    }
    openConfirm({
      title: 'Reject Payout',
      message: `Reject this request and return ${formatCurrencyAbbreviated(Number(selectedPayout.amount || 0))} to ${selectedPayout.agentId?.name || 'this agent'}'s available commission balance?`,
      isDangerous: true,
      confirmText: 'Yes, Reject',
      onConfirm: handleRejectPayout,
    });
  };

  const handleApprovePayout = async () => {
    if (!selectedPayout || !selectedPayout._id) {
      showMessage('Invalid payout selected', true);
      return;
    }
    try {
      setSubmitting(true);
      await adminStore.approveMobileMoneyPayout(selectedPayout._id, {
        requiresOtp: formData.requiresOtp || false,
        otpCode: formData.otpCode || '',
      });
      closeModal();
      await fetchPayouts();
      showMessage('Payout approval initiated');
    } catch (err) {
      showMessage(err?.message || 'Failed to approve payout', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (payout = selectedPayout) => {
    if (!payout || !payout._id) {
      showMessage('Invalid payout selected', true);
      return;
    }
    try {
      setSubmitting(true);
      await adminStore.markPayoutAsPaid(payout._id, {
        adminNote: formData.adminNote || '',
      });
      closeModal();
      await fetchPayouts();
      showMessage('Payout marked as paid');
    } catch (err) {
      showMessage(err?.message || 'Failed to mark payout as paid', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout || !selectedPayout._id) {
      showMessage('Invalid payout selected', true);
      return;
    }

    try {
      setSubmitting(true);
      await adminStore.rejectCommissionPayout(selectedPayout._id, {
        adminNote: formData.adminNote || '',
      });
      closeModal();
      await fetchPayouts();
      showMessage('Payout rejected and commission restored');
    } catch (err) {
      showMessage(err?.message || 'Failed to reject payout', true);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = useMemo(
    () => payouts.reduce((sum, payout) => sum + (payout.amount || 0), 0),
    [payouts]
  );
  const totalNetAmount = useMemo(
    () => payouts.reduce((sum, payout) => sum + (payout.netAmount || 0), 0),
    [payouts]
  );
  const pendingCount = useMemo(
    () => payouts.filter((payout) => payout.status === 'pending').length,
    [payouts]
  );

  return (
    <div className="comm-wrapper">
      <style>{styles}</style>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="comm-content">
            {/* ── Header Section ── */}
            <div className="comm-header">
              <div className="comm-heading-row">
                <div className="comm-icon-box">
                  <HandCoins size={24} />
                </div>
                <div>
                  <h2 className="comm-h2">Agent Withdrawals</h2>
                  <p className="text-sm font-medium" style={{ color: pageTheme.main }}>Review and process agent commission payout requests</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-2">
                <button onClick={fetchPayouts} className="comm-btn-outline">
                  <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <CheckCircle size={20} className="flex-shrink-0" />
                <p className="font-medium">{success}</p>
              </div>
            )}

            {/* ── Stats Grid ── */}
            <div className="comm-stat-grid">
              <StatCard
                title="Requests On Page"
                value={payouts.length}
                icon={Hash}
                index={0}
              />
              <StatCard
                title="Pending Requests"
                value={pendingCount}
                icon={Clock}
                index={1}
              />
              <StatCard
                title="Gross Amount"
                value={formatCurrencyAbbreviated(totalAmount)}
                icon={Banknote}
                index={2}
              />
              <StatCard
                title="Net Amount"
                value={formatCurrencyAbbreviated(totalNetAmount)}
                icon={CreditCard}
                index={3}
              />
            </div>

            {/* ── Filter Bar ── */}
            <div className="comm-card">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-blue-600" />
                  <span className="text-sm font-bold text-black uppercase tracking-wider">Filter by Status</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['all', 'pending', 'processing', 'paid', 'rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilter(status);
                        setPage(1);
                      }}
                      className={`filter-tab capitalize ${filter === status
                          ? 'bg-[#1D4ED8] text-white shadow-lg shadow-blue-600/20'
                          : 'bg-gray-100 text-black hover:bg-gray-200 border-gray-200'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Data Table ── */}
            <div className="comm-table-container">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RotateCw size={40} className="text-blue-600 animate-spin" />
                  <p className="text-black font-medium">Loading payout requests...</p>
                </div>
              ) : payouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-black">
                    <HandCoins size={32} />
                  </div>
                  <p className="text-black font-medium text-lg">No payout requests found</p>
                </div>
              ) : (
                <>
            {/* ── Table Layout ── */}
                  <div className="comm-table-container">
                    <table className="comm-table">
                      <thead>
                        <tr>
                          <th className="comm-th">Agent Details</th>
                          <th className="comm-th hidden sm:table-cell">Payment Method</th>
                          <th className="comm-th">Amount</th>
                          <th className="comm-th hidden md:table-cell text-center">Status</th>
                          <th className="comm-th hidden lg:table-cell text-right">Date</th>
                          <th className="comm-th text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((payout, idx) => (
                          <tr
                            key={payout._id}
                            className="comm-table-row"
                            onClick={() => openModal(payout, 'details')}
                          >
                            <td className="comm-td">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${getColor(idx).bg} ${getColor(idx).main}`} style={{ color: getColor(idx).main }}>
                                  {payout.agentId?.name?.slice(0, 2).toUpperCase() || 'AG'}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-black truncate">{payout.agentId?.name || 'N/A'}</p>
                                  <div className="flex items-center gap-2 md:hidden">
                                    <StatusBadge status={payout.status} compact />
                                  </div>
                                  <p className="text-[10px] text-black font-medium truncate md:block hidden">{payout.agentId?.email || 'N/A'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="comm-td hidden sm:table-cell">
                              <div className="flex items-center gap-2 text-black font-medium capitalize">
                                {payout.method === 'mobile_money' ? <ShieldCheck size={14} className="text-blue-600" /> : <Banknote size={14} className="text-emerald-600" />}
                                <span className="truncate">{payout.method === 'mobile_money' ? 'Mobile' : 'Bank'}</span>
                              </div>
                            </td>
                            <td className="comm-td">
                              <p className="font-bold text-black leading-none">{formatCurrencyAbbreviated(Number(payout.amount || 0))}</p>
                              <p className="text-[10px] font-bold text-blue-600 mt-1">Net: {formatCurrencyAbbreviated(Number(payout.netAmount || 0))}</p>
                            </td>
                            <td className="comm-td hidden md:table-cell text-center">
                              <StatusBadge status={payout.status} />
                            </td>
                            <td className="comm-td hidden lg:table-cell text-right">
                              <p className="font-bold text-black text-xs">{new Date(payout.createdAt).toLocaleDateString()}</p>
                              <p className="text-[10px] text-black font-medium">{new Date(payout.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="comm-td text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => openModal(payout, 'details')}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye size={15} />
                                </button>
                                <div className="hidden sm:flex items-center gap-1.5">
                                  {payout.status === 'pending' && (
                                    <button
                                      onClick={() => openModal(payout, 'approve')}
                                      className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                      title="Approve"
                                    >
                                      <Check size={15} />
                                    </button>
                                  )}
                                  {(payout.status === 'pending' || payout.status === 'processing') && (
                                    <button
                                      onClick={() => openModal(payout, 'reject')}
                                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                  isLoading={loading}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {showModal && selectedPayout && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <HandCoins size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-black tracking-tight">
                    {modalAction === 'approve' ? 'Approve' : modalAction === 'markPaid' ? 'Paid' : modalAction === 'reject' ? 'Reject' : 'Details'}
                  </h2>
                  <p className="text-[10px] text-black font-bold uppercase tracking-wider">#{selectedPayout._id?.slice(-8)}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-black transition-colors">
                <X size={18} />
              </button>
            </div>

            {modalAction === 'reject' && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50/50 p-3 text-[11px] text-red-700 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p className="font-bold leading-relaxed uppercase tracking-tight">Restores commission to agent balance</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Agent Name" value={selectedPayout.agentId?.name || 'N/A'} colorIdx={0} />
                <DetailRow label="Method" value={selectedPayout.method === 'mobile_money' ? 'Mobile' : 'Bank'} colorIdx={1} />
                <DetailRow label="Gross" value={formatCurrencyAbbreviated(Number(selectedPayout.amount || 0))} colorIdx={3} />
                <DetailRow label="Net Payout" value={<span className="text-blue-600">{formatCurrencyAbbreviated(Number(selectedPayout.netAmount || 0))}</span>} colorIdx={2} />
                <DetailRow label="Status" value={<StatusBadge status={selectedPayout.status} />} colorIdx={4} />
                <DetailRow label="Requested" value={new Date(selectedPayout.createdAt).toLocaleDateString()} colorIdx={6} />
                <DetailRow label="Admin Note" value={selectedPayout.adminNote || '---'} fullWidth colorIdx={7} />
              </div>

              {selectedPayout.details && typeof selectedPayout.details === 'object' && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black mb-3 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-blue-600" />
                    Account Details
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedPayout.details).map(([key, value], i) => (
                      <DetailRow
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}
                        value={value == null || value === '' ? 'N/A' : String(value)}
                        colorIdx={i + 2}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {modalAction === 'details' && (
              <div className="flex gap-2">
                {selectedPayout.status === 'pending' && (
                  <button onClick={showApproveForm} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Approve</button>
                )}
                {(selectedPayout.status === 'pending' || selectedPayout.status === 'processing') && (
                  <button onClick={showRejectForm} className="flex-1 px-4 py-2.5 border-2 border-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50">Reject</button>
                )}
                {selectedPayout.status === 'processing' && (
                  <button onClick={showMarkPaidForm} className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800">Paid</button>
                )}
              </div>
            )}

            {modalAction === 'approve' && selectedPayout.method === 'mobile_money' && (
              <div className="mb-4 space-y-3">
                <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.requiresOtp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requiresOtp: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-[10px] font-black text-black uppercase">Require OTP</span>
                </label>
                {formData.requiresOtp && (
                  <input
                    type="text"
                    value={formData.otpCode || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, otpCode: e.target.value }))}
                    placeholder="OTP Code"
                    className="w-full px-4 py-3 bg-white border-2 border-blue-50 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-bold transition-colors"
                  />
                )}
              </div>
            )}

            {(modalAction === 'markPaid' || modalAction === 'reject') && (
              <div className="mb-4">
                <textarea
                  rows="3"
                  value={formData.adminNote || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminNote: e.target.value }))}
                  placeholder={modalAction === 'reject' ? "Reason for rejection..." : "Add note..."}
                  className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:outline-none text-xs font-bold transition-colors resize-none ${modalAction === 'reject' ? 'border-red-50 focus:border-red-500' : 'border-blue-50 focus:border-blue-500'}`}
                />
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {(modalAction === 'approve' || modalAction === 'markPaid' || modalAction === 'reject') && (
                <button onClick={() => setModalAction('details')} disabled={submitting} className="px-4 py-2.5 bg-gray-100 text-black rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors">Back</button>
              )}
              <button 
                onClick={closeModal} 
                disabled={submitting} 
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  modalAction === 'details' ? 'bg-[#1D4ED8] text-white shadow-lg shadow-blue-600/20' : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                Close
              </button>
              {(modalAction === 'approve' || modalAction === 'markPaid' || modalAction === 'reject') && (
                <button
                  onClick={modalAction === 'approve' ? requestApprovePayout : modalAction === 'markPaid' ? () => requestMarkAsPaid(selectedPayout) : () => requestRejectPayout()}
                  disabled={submitting || (modalAction === 'approve' && formData.requiresOtp && !formData.otpCode)}
                  className={`flex-[2] px-4 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50 transition-all ${modalAction === 'reject' ? 'bg-red-600 text-white' : 'bg-[#1D4ED8] text-white'}`}
                >
                  {submitting ? '...' : modalAction === 'approve' ? 'Approve' : modalAction === 'markPaid' ? 'Paid' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDangerous={confirmState.isDangerous}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        onConfirm={() => {
          closeConfirm();
          confirmState.onConfirm?.();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function StatCard({ title, value, icon: Icon, index }) {
  const c = getColor(index);
  return (
    <div
      className="comm-stat-card"
      style={{
        '--stat-bg': c.soft,
        '--stat-border': c.bg,
        '--stat-color': c.main,
        '--stat-glow': c.glow,
        padding: '12px'
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-110 shadow-sm flex-shrink-0"
          style={{ background: c.bg, color: c.main }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="comm-stat-label" style={{ margin: 0 }}>{title}</p>
          <p className="comm-stat-value" style={{ margin: 0 }}>{value}</p>
        </div>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 self-start mt-1" style={{ background: c.main }} />
      </div>
    </div>
  );
}

function StatusBadge({ status, compact = false }) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return (
    <span className={`badge-premium badge-success ${compact ? 'px-1.5 py-0.5' : ''}`}>
      <CheckCircle size={compact ? 10 : 12} />
      {!compact && 'Paid'}
    </span>
  );
  if (s === 'processing') return (
    <span className={`badge-premium badge-info ${compact ? 'px-1.5 py-0.5' : ''}`}>
      <RotateCw size={compact ? 10 : 12} className="animate-spin" />
      {!compact && 'Processing'}
    </span>
  );
  if (s === 'rejected') return (
    <span className={`badge-premium badge-failed ${compact ? 'px-1.5 py-0.5' : ''}`}>
      <XCircle size={compact ? 10 : 12} />
      {!compact && 'Rejected'}
    </span>
  );
  return (
    <span className={`badge-premium badge-pending ${compact ? 'px-1.5 py-0.5' : ''}`}>
      <Clock size={compact ? 10 : 12} />
      {!compact && 'Pending'}
    </span>
  );
}

function DetailRow({ label, value, fullWidth = false, colorIdx = 2 }) {
  const c = getColor(colorIdx);
  return (
    <div className={`${fullWidth ? 'col-span-2' : ''} p-2.5 rounded-xl border transition-colors`} style={{ background: c.soft, borderColor: c.bg + '88' }}>
      <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: c.main }}>{label}</p>
      <div className="font-bold text-black break-words text-xs sm:text-sm">{value}</div>
    </div>
  );
}
