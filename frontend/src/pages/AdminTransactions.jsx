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
  const [totalPages, setTotalPages] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingVerificationOnly, setPendingVerificationOnly] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSelectDeleteConfirm, setShowSelectDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [verifyingId, setVerifyingId] = useState(null);
  const [showVerifyingModal, setShowVerifyingModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState('Payment verified successfully.');
  // eslint-disable-next-line no-unused-vars
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTransactions = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await adminAPI.getTransactions(page, 10, typeFilter, statusFilter, scope);

      if (response.success) {
        setTransactions(response.transactions || []);
        setTotalPages(response.pagination?.pages || 0);
      } else {
        setError(response.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch transactions');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, typeFilter, statusFilter, scope]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, searchTerm, pendingVerificationOnly]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
    } else {
      setSuccess(msg);
    }
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

    // Payment verification should be driven by paymentStatus, not fulfillment status.
    // Data orders can remain status='pending' while provider sync is still in progress.
    if (typeof transaction?.paymentStatus === 'string') {
      return transaction.paymentStatus === 'pending';
    }

    // Legacy fallback for records missing paymentStatus.
    return transaction?.status === 'pending';
  };

  const handleVerifyPendingPayment = async (transaction) => {
    if (!transaction?._id) return;

    try {
      setVerifyingId(transaction._id);
      setShowVerifyingModal(true);
      const response = await adminAPI.verifyPendingPayment(transaction._id);

      if (response.success) {
        const successText = response.message || 'Pending payment verified successfully';
        showMessage(successText);
        setVerifiedMessage(successText);
        setShowVerifiedModal(true);
        await fetchTransactions({ silent: true });
      } else {
        showMessage(response.message || 'Failed to verify pending payment', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to verify pending payment', true);
    } finally {
      setShowVerifyingModal(false);
      setVerifyingId(null);
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

  const toggleSelectAll = () => {
    if (filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedIds.has(tx._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx._id)));
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

  const confirmDeleteSelected = async () => {
    try {
      setDeleteLoading(true);
      const ids = Array.from(selectedIds);
      const response = await adminAPI.bulkDeleteTransactionsByIds(ids);

      if (response.success) {
        setShowSelectDeleteConfirm(false);
        setSelectedIds(new Set());
        await fetchTransactions();
        showMessage(`${response.deletedCount} transaction(s) deleted`);
      } else {
        showMessage(response.message || 'Failed to delete transactions', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete transactions', true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusColors = {
    successful: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
  };

  const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

  const getResolvedPaymentStatus = (tx) => {
    if (tx?.paymentStatus) return normalizeStatus(tx.paymentStatus);
    const status = normalizeStatus(tx?.status);
    if (status === 'successful' || status === 'completed' || status === 'success') return 'completed';
    if (status === 'failed' || status === 'cancelled') return 'failed';
    return 'pending';
  };

  const getResolvedOrderStatus = (tx) => {
    if (!['data_purchase', 'checker_purchase'].includes(normalizeStatus(tx?.type))) return 'n/a';
    return normalizeStatus(tx?.status) || 'pending';
  };

  const typeLabels = {
    data_purchase: 'Data Purchase',
    checker_purchase: 'Checker Purchase',
    wallet_funding: 'Wallet Funding',
    wallet_topup: 'Wallet Funding',
    refund: 'Refund',
    purchase_refund: 'Refund',
    referral_bonus: 'Referral Bonus',
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      !searchTerm ||
      tx.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPendingVerification =
      !pendingVerificationOnly || canVerifyPendingPayment(tx);

    return matchesSearch && matchesPendingVerification;
  });

  const allSelected = filteredTransactions.length > 0 && filteredTransactions.every(tx => selectedIds.has(tx._id));
  const someSelected = selectedIds.size > 0;

  const successCount = filteredTransactions.filter(t => getResolvedPaymentStatus(t) === 'completed').length;
  const pendingCount = filteredTransactions.filter(t => getResolvedPaymentStatus(t) === 'pending').length;
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
            {/* Page Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-5 sm:px-6 sm:py-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                {isAgentScope ? 'Agent Histories' : 'Manage Transactions'}
              </h1>
              <p className="text-sm text-slate-500">
                {isAgentScope ? 'Track transaction history for all agent accounts and store sales' : 'Monitor and manage all transactions, payments, and refunds'}
              </p>
            </div>

            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm flex items-center gap-3">
                <CheckCircle size={18} className="flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Total Transactions</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{filteredTransactions.length}</p>
              </div>

              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Successful</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{successCount}</p>
              </div>

              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Pending</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">{pendingCount}</p>
              </div>

              <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-700" />
                  </div>
                </div>
                <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">Total Amount</p>
                <p className="text-xl sm:text-3xl font-bold text-slate-900">GHS {formatNumberAbbreviated(totalAmount)}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
              {/* Search & Refresh Row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by user name, email, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-0 text-sm hover:border-slate-300"
                  />
                </div>
                <button
                  onClick={handleRefresh}
                  className="px-4 sm:px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                >
                  <RotateCcw size={16} />
                  Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Type</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setTypeFilter(''); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${typeFilter === ''
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                      All Types
                    </button>
                    {['data_purchase', 'checker_purchase', 'wallet_funding', 'refund'].map(type => (
                      <button
                        key={type}
                        onClick={() => { setTypeFilter(type); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${typeFilter === type
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                          }`}
                      >
                        {typeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setStatusFilter(''); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${statusFilter === ''
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                      All Status
                    </button>
                    {['successful', 'pending', 'failed', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setPage(1); }}
                        className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${statusFilter === status
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                          }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Verification</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setPendingVerificationOnly((prev) => !prev);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap border ${pendingVerificationOnly
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                      Pending Verifications
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Section Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">Transaction Records</h2>
                <p className="text-xs text-slate-500 mt-0.5">{filteredTransactions.length} result{filteredTransactions.length !== 1 ? 's' : ''}</p>
              </div>
              {someSelected && (
                <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-blue-50 flex items-center justify-between gap-2">
                  <span className="text-sm text-blue-700 font-medium">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowSelectDeleteConfirm(true)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Trash2 size={13} />
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-blue-700 mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm">Loading transactions...</p>
                  </div>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No transactions found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your filters or search</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="pl-4 sm:pl-6 pr-2 py-4 w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              className="rounded border-slate-300 accent-slate-900"
                            />
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">User</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Type</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Amount</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Payment Status</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Order Status</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Date</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTransactions.map((tx) => (
                          <tr
                            key={tx._id}
                            className={`hover:bg-slate-50 transition ${selectedIds.has(tx._id) ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                          >
                            <td className="pl-4 sm:pl-6 pr-2 py-4 whitespace-nowrap w-10">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(tx._id)}
                                onChange={() => toggleSelectOne(tx._id)}
                                className="rounded border-slate-300 accent-slate-900"
                              />
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {tx.isGuest
                                      ? tx.guestInfo?.name || tx.guestInfo?.email || 'Guest User'
                                      : tx.userId?.name || 'Unknown'}
                                  </p>
                                  {tx.isGuest && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-300">
                                      GUEST
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {tx.isGuest
                                    ? tx.guestInfo?.email || tx.guestInfo?.phone || 'N/A'
                                    : tx.userId?.email || 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{typeLabels[tx.type] || tx.type || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 font-medium">#{tx._id?.slice(-8)}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <p className={`text-sm font-black ${['wallet_topup', 'wallet_funding', 'deposit', 'refund', 'referral_bonus'].includes(tx.type) ? 'text-green-600' : 'text-blue-600'}`}>
                                {['wallet_topup', 'wallet_funding', 'deposit', 'refund', 'referral_bonus'].includes(tx.type) ? '+' : '-'}
                                {tx.currency || 'GHS'} {formatNumberAbbreviated(Math.abs(Number(tx.amount || 0)))}
                              </p>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${statusColors[getResolvedPaymentStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                                {getResolvedPaymentStatus(tx)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              {getResolvedOrderStatus(tx) === 'n/a' ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-slate-100 text-slate-500">
                                  N/A
                                </span>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${statusColors[getResolvedOrderStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                                  {getResolvedOrderStatus(tx)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <p className="text-xs font-bold text-slate-900">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1 items-center">
                                <button
                                  onClick={() => handleViewDetails(tx)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4 text-cyan-600" />
                                </button>
                                {canVerifyPendingPayment(tx) && (
                                  <button
                                    onClick={() => handleVerifyPendingPayment(tx)}
                                    disabled={verifyingId === tx._id}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Verify Pending Payment"
                                  >
                                    <RotateCcw className={`w-4 h-4 text-emerald-600 ${verifyingId === tx._id ? 'animate-spin' : ''}`} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenDelete(tx)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <p className="text-sm text-slate-600">
                      Page {page} of {totalPages} • {filteredTransactions.length} transactions
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionDetailsModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        typeLabels={typeLabels}
        statusColors={statusColors}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Transaction"
        message={selectedTransaction ? `Delete transaction ID ${selectedTransaction._id?.slice(-8)}? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedTransaction(null);
        }}
      />

      <ConfirmDialog
        isOpen={showSelectDeleteConfirm}
        title="Delete Selected"
        message={`Delete ${selectedIds.size} selected transaction(s)? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDeleteSelected}
        onCancel={() => setShowSelectDeleteConfirm(false)}
      />

      <VerifyingPaymentModal isOpen={showVerifyingModal} />
      <VerifiedPaymentModal
        isOpen={showVerifiedModal}
        onClose={() => setShowVerifiedModal(false)}
        message={verifiedMessage}
      />
    </div>
  );
}
