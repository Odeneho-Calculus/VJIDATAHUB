import React, { useState, useEffect } from 'react';
import { Eye, Download, Lock, RotateCcw, X, Copy, Check, RotateCw, Wallet, ArrowUpRight, ArrowDownLeft, Gift, Search, Filter, Calendar, Layout, CreditCard, ChevronRight, Hash, AlertCircle, ShoppingBag, ReceiptText, RefreshCw } from 'lucide-react';
import { formatCurrencyAbbreviated, formatNumberAbbreviated } from '../utils/formatCurrency';
import { wallet, purchases } from '../services/api';
import UserLayout from '../components/UserLayout';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';

export default function Transactions() {
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [perPage, setPerPage] = useState(10);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationTx, setVerificationTx] = useState(null);
  const [copied, setCopied] = useState(false);

  const [verifying, setVerifying] = useState(false);

  // Alert State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = (type, message, title = '') => {
    setAlertConfig({ isOpen: true, type, message, title });
  };

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllTransactions();
    setIsRefreshing(false);
  };

  const fetchAllTransactions = async () => {
    try {
      setLoading(true);
      const [walletRes, ordersRes, balanceRes] = await Promise.all([
        wallet.getTransactions(100, 0),
        purchases.getOrders(100, 0),
        wallet.getBalance(),
      ]);

      const walletTransactions = walletRes.success ? walletRes.transactions || [] : [];
      const ordersList = ordersRes.success ? ordersRes.data?.orders || [] : [];
      const currentBalance = balanceRes.success ? balanceRes.balance || 0 : 0;

      const combined = [
        ...walletTransactions.map(tx => {
          const desc = tx.description?.toLowerCase() || '';
          let type = 'Wallet Top-up';

          if (desc.includes('data purchase')) {
            type = 'Data Purchase';
          } else if (tx.type === 'referral_bonus') {
            type = 'Referral Bonus';
          }

          return {
            id: tx._id,
            type,
            description: tx.description || 'Transaction',
            amount: tx.amount,
            date: tx.createdAt,
            status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
            statusRaw: tx.status,
            reference: tx.reference,
            paystackReference: tx.paystackReference,
            paymentStatus: tx.paymentStatus,
            txType: tx.type,
            createdAt: tx.createdAt,
            balanceAfter: 0,
          };
        }),
        ...ordersList.map(order => ({
          id: order.id,
          type: 'Data Purchase',
          description: `${order.dataAmount} ${order.network} to ${order.phoneNumber}`,
          amount: -order.amount,
          date: order.date || order.createdAt,
          status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
          statusRaw: order.status,
          paymentStatus: order.paymentStatus,
          balanceAfter: 0,
          paymentMethod: order.paymentMethod,
          reference: order.transactionReference,
          paystackReference: order.paystackReference,
          txType: 'data_purchase',
          createdAt: order.date || order.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let runningBalance = currentBalance;
      const withBalances = combined.map(tx => {
        const balanceAfter = runningBalance;
        runningBalance = runningBalance - tx.amount;
        return {
          ...tx,
          balanceAfter,
        };
      });

      setTransactions(withBalances);
    } catch (error) {
      setError('Failed to load transactions');
      console.error(error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

  const getResolvedPaymentStatus = (tx) => {
    if (tx?.paymentStatus) return normalizeStatus(tx.paymentStatus);
    const status = normalizeStatus(tx?.statusRaw || tx?.status);
    if (status === 'successful' || status === 'completed' || status === 'success') return 'completed';
    if (status === 'failed' || status === 'cancelled') return 'failed';
    return 'pending';
  };

  const getResolvedOrderStatus = (tx) => {
    if (tx?.type !== 'Data Purchase') return 'n/a';
    return normalizeStatus(tx?.statusRaw || tx?.status) || 'pending';
  };

  const getStatusStyles = (status) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'success' || s === 'successful')
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (s === 'pending' || s === 'waiting')
      return 'bg-amber-50 text-amber-600 border-amber-100';
    if (s === 'failed' || s === 'rejected')
      return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  const openVerificationModal = (tx, e) => {
    if (e) e.stopPropagation();
    setVerificationTx(tx);
    setVerifyModalOpen(true);
    setCopied(false);
  };

  const handleCopyReference = () => {
    if (!verificationTx) return;
    const reference = verificationTx.reference || verificationTx.paystackReference;
    if (reference) {
      navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmVerify = async () => {
    if (!verificationTx) return;

    const reference = verificationTx.reference || verificationTx.paystackReference;
    if (!reference) {
      showAlert('error', 'No reference found for this transaction');
      return;
    }

    setVerifying(true);
    try {
      let response;
      if (verificationTx.txType === 'wallet_topup' || verificationTx.txType === 'credit') {
        response = await wallet.verifyPayment({ reference });
      } else if (verificationTx.txType === 'data_purchase' || verificationTx.txType === 'debit') {
        response = await purchases.verifyPurchase({ reference });
      } else {
        response = { success: false, message: 'Unknown transaction type for verification' };
      }

      if (response.success) {
        setVerifyModalOpen(false);
        setVerificationTx(null);
        await fetchAllTransactions();
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

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'data-purchase' && tx.type !== 'Data Purchase') return false;
    if (activeTab === 'topup' && tx.type !== 'Wallet Top-up') return false;
    if (activeTab === 'bonus' && tx.type !== 'Referral Bonus') return false;

    if (statusFilter !== 'all') {
      const s = tx.statusRaw?.toLowerCase();
      if (statusFilter === 'completed' && !(s === 'completed' || s === 'success' || s === 'successful')) return false;
      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'failed' && s !== 'failed') return false;
    }
    return true;
  });

  const paginatedTransactions = filteredTransactions.slice(0, perPage);

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'Data Purchase': return <ArrowDownLeft size={16} />;
      case 'Wallet Top-up': return <ArrowUpRight size={16} />;
      case 'Referral Bonus': return <Gift size={16} />;
      default: return <CreditCard size={16} />;
    }
  };

  const totalSpent = transactions
    .filter(t => t.type === 'Data Purchase' && (t.statusRaw === 'completed' || t.statusRaw === 'successful'))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  const totalTopUp = transactions
    .filter(t => (t.type === 'Wallet Top-up' || t.txType === 'referral_bonus') && (t.statusRaw === 'completed' || t.statusRaw === 'successful'))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col">
          {/* Sticky Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 pb-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <ReceiptText size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transactions</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      History • {transactions.length} Records
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-slate-600 hover:text-blue-600 group active:scale-95"
                  >
                    <RotateCw size={20} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  </button>
                  <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
                    <Download size={16} strokeWidth={3} />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {/* Error Message */}
            {error && (
              <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="group bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Layout size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume</p>
                    <p className="text-2xl font-black text-slate-900">{transactions.length}</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="group bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">
                    <ArrowDownLeft size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spending</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">GH₵ {formatCurrencyAbbreviated(totalSpent)}</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div className="group bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <ArrowUpRight size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Top-up</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">GH₵ {formatCurrencyAbbreviated(totalTopUp)}</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>

            {/* Filtering & Navigation */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden mb-8">
              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex overflow-x-auto scrollbar-hide p-1 gap-1">
                  {[
                    { id: 'all', label: 'All Activity', icon: Layout },
                    { id: 'data-purchase', label: 'Data Purchase', icon: ShoppingBag },
                    { id: 'topup', label: 'Wallet Top-ups', icon: CreditCard },
                    { id: 'bonus', label: 'Commissions', icon: Gift }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm shadow-blue-100 ring-1 ring-slate-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                    >
                      <tab.icon size={14} strokeWidth={activeTab === tab.id ? 3 : 2} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex h-11 items-center gap-2 px-4 bg-slate-100/50 rounded-2xl border border-slate-200/40 focus-within:bg-white focus-within:border-blue-400 transition-all w-full sm:w-64 group">
                    <Search size={16} className="text-slate-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      placeholder="Search history..."
                      className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-600 placeholder:text-slate-400 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2 px-4 h-11 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer"
                    >
                      <option value="all">Status</option>
                      <option value="completed">Success</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 h-11 px-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 border-r border-slate-200 pr-3">View</span>
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer"
                  >
                    <option value={5}>5 Rows</option>
                    <option value={10}>10 Rows</option>
                    <option value={20}>20 Rows</option>
                    <option value={50}>50 Rows</option>
                  </select>
                </div>
              </div>

              {/* Transactions List */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ReceiptText size={20} className="text-blue-600/50" />
                    </div>
                  </div>
                  <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-widest">Fetching records...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm border-dashed">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                    <Search size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">No Transactions Found</h3>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Adjust your filters or check back later</p>
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment Status</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Order Status</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paginatedTransactions.map(tx => (
                          <tr
                            key={tx.id}
                            onClick={() => { setSelectedTx(tx); setShowDetails(true); }}
                            className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${tx.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                  }`}>
                                  {getTransactionIcon(tx.type)}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{tx.type}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {formatDate(tx.date)} • {formatTime(tx.date)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(getResolvedPaymentStatus(tx))}`}>
                                {getResolvedPaymentStatus(tx)}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              {getResolvedOrderStatus(tx) === 'n/a' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-100">
                                  N/A
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(getResolvedOrderStatus(tx))}`}>
                                  {getResolvedOrderStatus(tx)}
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-bold text-slate-600 max-w-xs truncate">{tx.description}</p>
                              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter mt-0.5">Ref: {tx.reference?.slice(-12) || 'N/A'}</p>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <p className={`text-base font-black tracking-tight ${tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {tx.amount >= 0 ? '+' : ''}{formatNumberAbbreviated(tx.amount)}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                Bal: GH₵ {formatCurrencyAbbreviated(tx.balanceAfter)}
                              </p>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2 px-1">
                                {getResolvedPaymentStatus(tx) === 'pending' && (tx.txType === 'wallet_topup' || tx.type === 'Data Purchase') && (
                                  <button
                                    onClick={(e) => openVerificationModal(tx, e)}
                                    className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95 border border-amber-100"
                                    title="Verify Payment"
                                  >
                                    <RotateCw size={14} strokeWidth={3} />
                                  </button>
                                )}
                                <button className="p-2.5 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm active:scale-95">
                                  <ChevronRight size={16} strokeWidth={3} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {paginatedTransactions.map(tx => (
                      <div
                        key={tx.id}
                        onClick={() => { setSelectedTx(tx); setShowDetails(true); }}
                        className="p-5 active:bg-slate-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${tx.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                              }`}>
                              {getTransactionIcon(tx.type)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 tracking-tight">{tx.type}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {formatDate(tx.date)}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(getResolvedPaymentStatus(tx))}`}>
                                  Pay: {getResolvedPaymentStatus(tx)}
                                </span>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getResolvedOrderStatus(tx) === 'n/a' ? 'bg-slate-50 text-slate-500 border-slate-100' : getStatusStyles(getResolvedOrderStatus(tx))}`}>
                                  Order: {getResolvedOrderStatus(tx) === 'n/a' ? 'N/A' : getResolvedOrderStatus(tx)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-black tracking-tighter ${tx.amount >= 0 ? 'text-emerald-500' : 'text-slate-900'}`}>
                              {tx.amount >= 0 ? '+' : ''}{formatNumberAbbreviated(tx.amount)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              Bal: GH₵ {formatCurrencyAbbreviated(tx.balanceAfter)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-1">
                          <p className="text-[11px] font-bold text-slate-500 truncate max-w-[200px]">{tx.description}</p>
                          <div className="flex gap-2">
                            {getResolvedPaymentStatus(tx) === 'pending' && (tx.txType === 'wallet_topup' || tx.type === 'Data Purchase') && (
                              <button
                                onClick={(e) => openVerificationModal(tx, e)}
                                className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"
                              >
                                <RotateCw size={14} />
                              </button>
                            )}
                            <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                              <ChevronRight size={16} strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Details Modal */}
          <Modal
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            title="Transaction Details"
            icon={ReceiptText}
            footer={
              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
              >
                Close Record
              </button>
            }
          >
            {selectedTx && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-100 ${selectedTx.amount >= 0 ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                    {React.cloneElement(getTransactionIcon(selectedTx.type), { size: 32, strokeWidth: 1.5 })}
                  </div>
                  <p className={`text-2xl font-black tracking-tight ${selectedTx.amount >= 0 ? 'text-emerald-500' : 'text-slate-900'}`}>
                    {selectedTx.amount >= 0 ? '+' : ''}GH₵ {formatCurrencyAbbreviated(Math.abs(selectedTx.amount))}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{selectedTx.type}</p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(getResolvedPaymentStatus(selectedTx))}`}>
                      Payment: {getResolvedPaymentStatus(selectedTx)}
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getResolvedOrderStatus(selectedTx) === 'n/a' ? 'bg-slate-50 text-slate-500 border-slate-100' : getStatusStyles(getResolvedOrderStatus(selectedTx))}`}>
                      Order: {getResolvedOrderStatus(selectedTx) === 'n/a' ? 'N/A' : getResolvedOrderStatus(selectedTx)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {[
                    { label: 'Reference', value: selectedTx.reference || 'N/A', mono: true, icon: Hash },
                    { label: 'Description', value: selectedTx.description },
                    { label: 'Date', value: formatDate(selectedTx.date), icon: Calendar },
                    { label: 'Time', value: formatTime(selectedTx.date), icon: RotateCw },
                    { label: 'Balance After', value: `GH₵ ${formatCurrencyAbbreviated(selectedTx.balanceAfter)}`, bold: true, icon: Wallet },
                    { label: 'Method', value: selectedTx.paymentMethod || 'Wallet', icon: CreditCard }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
                      <div className="flex items-center gap-2 text-slate-400">
                        {item.icon && <item.icon size={12} className="group-hover:text-blue-500 transition-colors" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className={`text-[11px] font-bold text-right max-w-[60%] truncate ${item.mono ? 'font-mono' : ''} ${item.bold ? 'text-blue-600 text-sm font-black' : 'text-slate-700'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-[0.98]">
                  <Download size={14} strokeWidth={3} />
                  Download Receipt
                </button>
              </div>
            )}
          </Modal>

          {/* Verification Modal */}
          <Modal
            isOpen={verifyModalOpen}
            onClose={() => setVerifyModalOpen(false)}
            title="Verify Payment"
            icon={RefreshCw}
            footer={
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setVerifyModalOpen(false)}
                  className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"
                  disabled={verifying}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmVerify}
                  disabled={verifying}
                  className="flex-[2] py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifying ? (
                    <RotateCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={14} strokeWidth={3} />
                      Finalize Verification
                    </>
                  )}
                </button>
              </div>
            }
          >
            {verificationTx && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-slate-500 leading-relaxed">
                    Please confirm the transaction reference for manual verification.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 text-center">Reference ID</p>
                  <div className="flex flex-col items-center gap-4">
                    <code className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 break-all w-full text-center shadow-sm">
                      {verificationTx.reference || verificationTx.paystackReference || 'N/A'}
                    </code>
                    <button
                      onClick={handleCopyReference}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                        }`}
                    >
                      {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Reference'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Alert Modal */}
          <AlertModal
            isOpen={alertConfig.isOpen}
            onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
          />
        </div>
      </div>
    </UserLayout>
  );
}