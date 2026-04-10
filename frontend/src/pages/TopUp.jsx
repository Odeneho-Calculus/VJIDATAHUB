import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  CreditCard,
  Loader,
  Clock,
  Wallet,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layout,
  History,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import Modal from '../components/Modal';
import { wallet, publicAPI } from '../services/api';
import UserLayout from '../components/UserLayout';

export default function TopUp() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [businessStatus, setBusinessStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletFundingCharge, setWalletFundingCharge] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showTxDetails, setShowTxDetails] = useState(false);

  const TX_LIMIT = 10;

  const typeLabelMap = {
    wallet_topup: 'Wallet Funding',
    wallet_funding: 'Wallet Funding',
    data_purchase: 'Data Purchase',
    checker_purchase: 'Checker Purchase',
    refund: 'Refund',
    purchase_refund: 'Refund',
    referral_bonus: 'Referral Bonus',
    admin_adjustment: 'Admin Adjustment',
  };

  const statusBadgeMap = {
    completed: 'bg-emerald-100 text-emerald-700',
    successful: 'bg-emerald-100 text-emerald-700',
    processing: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-rose-100 text-rose-700',
    cancelled: 'bg-slate-100 text-slate-700',
  };

  const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

  const getResolvedPaymentStatus = (tx) => {
    if (tx?.paymentStatus) return normalizeStatus(tx.paymentStatus);
    const raw = normalizeStatus(tx?.status);
    if (raw === 'completed' || raw === 'successful' || raw === 'success') return 'completed';
    if (raw === 'failed' || raw === 'cancelled') return 'failed';
    return 'pending';
  };

  const getResolvedTransactionStatus = (tx) => {
    const txType = normalizeStatus(tx?.type);
    if (['data_purchase', 'checker_purchase'].includes(txType)) {
      return normalizeStatus(tx?.status) || 'pending';
    }
    return getResolvedPaymentStatus(tx);
  };

  const isCreditTransaction = (tx) =>
    ['wallet_topup', 'wallet_funding', 'refund', 'purchase_refund', 'referral_bonus'].includes(tx?.type);

  const fetchTransactions = async (page = 1) => {
    try {
      setTxLoading(true);
      const offset = (page - 1) * TX_LIMIT;
      const res = await wallet.getTransactions(TX_LIMIT, offset);
      setTransactions(res?.transactions || []);
      setTxHasMore(!!(res?.pagination?.hasMore));
      setTxTotal(res?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  const checkStatus = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        publicAPI.getBusinessStatus(),
        publicAPI.getSystemSettings(),
      ]);

      if (statusRes.success && statusRes.data) {
        setBusinessStatus(statusRes.data);
      }

      if (settingsRes?.settings?.transactionCharges?.walletFundingCharge !== undefined) {
        setWalletFundingCharge(Number(settingsRes.settings.transactionCharges.walletFundingCharge) || 0);
      }
    } catch (err) {
      console.error('Failed to check business status:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    fetchTransactions(txPage);
  }, [txPage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshUser(), checkStatus(), fetchTransactions(txPage)]);
    setIsRefreshing(false);
  };

  const handleTopUp = async () => {
    const parsedAmount = Number.parseFloat(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (businessStatus && !businessStatus.isOpen) {
      setError(businessStatus.message || 'Business is currently closed. Please try again during business hours.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await wallet.initializePayment({ amount: parsedAmount });

      if (result.success) {
        setPaymentData(result.data);
        setShowPaymentModal(true);
      } else {
        setError(result.message || 'Failed to initialize payment');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing your payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (result) => {
    setSuccess(`Successfully topped up GHS ${Number.parseFloat(amount).toFixed(2)}! Your new balance is GHS ${Number(result.balance || 0).toFixed(2)}`);
    setAmount('');
    await refreshUser();
    await fetchTransactions(1);
    setTxPage(1);
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        <div className="sticky top-0 z-20 app-pro-header px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-primary-600 mb-1">
                <Layout size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Wallet Center</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Wallet Top-up</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-60"
              title="Refresh wallet"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-200/70 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2 sm:mb-3">
                <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <p className="text-xs text-slate-600 mb-1">Current Balance</p>
              <p className="text-base sm:text-2xl font-bold text-slate-900 break-words">
                {formatCurrencyAbbreviated(Number(user?.balance || 0))}
              </p>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-indigo-200/70 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 sm:mb-3">
                <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <p className="text-xs text-slate-600 mb-1">Funding Status</p>
              <p className="text-base sm:text-xl font-bold text-slate-900">
                {businessStatus?.isOpen ? 'Available' : 'Unavailable'}
              </p>
            </div>
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 border border-orange-300 bg-white text-orange-700">
              <Clock size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Business Closed</p>
                <p className="text-sm">{businessStatus.message || 'Business is currently closed.'}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 border border-rose-300 bg-white text-rose-700">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 border border-emerald-300 bg-white text-emerald-700">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Success</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-sm mb-3 text-slate-900">Quick Amounts</h2>
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => {
                        setAmount(quickAmount.toString());
                        setError(null);
                      }}
                      disabled={loading || (businessStatus && !businessStatus.isOpen)}
                      className={`py-2 rounded-lg sm:rounded-xl transition text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${amount === quickAmount.toString()
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                        }`}
                    >
                      GH₵ {quickAmount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-base sm:text-lg mb-4 sm:mb-5 text-slate-900 flex items-center gap-2">
                  <Wallet size={18} className="text-blue-600 sm:w-5 sm:h-5" />
                  Fund Wallet
                </h2>

                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold mb-2 text-slate-900">Amount (GHS)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold whitespace-nowrap text-slate-900">GH₵</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter amount"
                      disabled={loading}
                      min="0.01"
                      step="0.01"
                      className="flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        appearance: 'textfield',
                      }}
                    />
                  </div>
                </div>

                <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border border-slate-100 bg-slate-50 px-3.5 sm:px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Instant Processing</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Your wallet will be credited immediately after a successful payment via Paystack.
                      </p>
                    </div>
                  </div>
                </div>

                {walletFundingCharge > 0 && Number(amount || 0) > 0 && (
                  <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border border-slate-100 bg-slate-50 px-3.5 sm:px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Amount to credit</span>
                      <span>GHS {Number(amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-600">
                      <span>Service charge</span>
                      <span>+ GHS {walletFundingCharge.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>Total charged</span>
                      <span>GHS {(Number(amount || 0) + walletFundingCharge).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTopUp}
                  disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                  className="w-full text-sm font-bold py-2.5 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-primary-600 text-white rounded-lg sm:rounded-xl hover:bg-primary-700 transition-all"
                  title={businessStatus && !businessStatus.isOpen ? 'Business is currently closed' : ''}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Proceed to Payment
                    </>
                  )}
                </button>

                <p className="text-xs text-center mt-3 sm:mt-4 text-slate-600">
                  Your transaction is secure and encrypted with Paystack
                </p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <History size={18} className="text-primary-600" />
                Wallet Transaction History
              </h3>
              <span className="text-xs font-semibold text-slate-600">Page {txPage} &bull; {txTotal} total</span>
            </div>

            {txLoading ? (
              <div className="py-10 flex items-center justify-center text-slate-600">
                <Loader size={18} className="animate-spin mr-2" />
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">No wallet transactions yet.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[660px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Payment Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Transaction Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => {
                        const isCredit = isCreditTransaction(tx);
                        const amountTone = isCredit ? 'text-emerald-600' : 'text-rose-600';
                        const amountIcon = isCredit ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />;
                        return (
                          <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{tx.reference || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{typeLabelMap[tx.type] || tx.type || '-'}</td>
                            <td className={`px-4 py-3 text-sm font-bold ${amountTone} whitespace-nowrap`}>
                              <span className="inline-flex items-center gap-1">
                                {amountIcon}
                                {isCredit ? '+' : '-'}{formatCurrency(Math.abs(Number(tx.amount || 0)))}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeMap[getResolvedPaymentStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                                {getResolvedPaymentStatus(tx)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeMap[getResolvedTransactionStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                                {getResolvedTransactionStatus(tx)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString()}{' '}
                              {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => { setSelectedTx(tx); setShowTxDetails(true); }}
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye size={16} strokeWidth={2.5} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const isCredit = isCreditTransaction(tx);
                    return (
                      <div key={tx._id} className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[52%]">{tx.reference || '-'}</p>
                          <div className="flex flex-col gap-1 items-end">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadgeMap[getResolvedPaymentStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                              Pay: {getResolvedPaymentStatus(tx)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadgeMap[getResolvedTransactionStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                              Tx: {getResolvedTransactionStatus(tx)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{typeLabelMap[tx.type] || tx.type || '-'}</p>
                        <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(Math.abs(Number(tx.amount || 0)))}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString()}{' '}
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <button
                          onClick={() => { setSelectedTx(tx); setShowTxDetails(true); }}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View Details
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage === 1 || txLoading}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setTxPage((p) => p + 1)}
                    disabled={!txHasMore || txLoading}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={showTxDetails}
        onClose={() => setShowTxDetails(false)}
        title="Transaction Details"
        icon={<History size={20} className="text-primary-600" />}
        maxWidth="max-w-lg"
      >
        {selectedTx && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-1">Reference</p>
                <p className="font-mono text-xs sm:text-sm font-bold text-slate-900 uppercase break-all">{selectedTx.reference || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-1">Status</p>
                <div className="flex flex-col gap-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeMap[getResolvedPaymentStatus(selectedTx)] || 'bg-slate-100 text-slate-700'}`}>
                    Payment: {getResolvedPaymentStatus(selectedTx)}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeMap[getResolvedTransactionStatus(selectedTx)] || 'bg-slate-100 text-slate-700'}`}>
                    Transaction: {getResolvedTransactionStatus(selectedTx)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em] leading-none">Transaction Value</p>
                <div className={`flex items-center gap-1.5 font-bold text-base sm:text-lg ${isCreditTransaction(selectedTx) ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isCreditTransaction(selectedTx) ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                  {isCreditTransaction(selectedTx) ? '+' : '-'}{formatCurrency(Math.abs(Number(selectedTx.amount || 0)))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs gap-3">
                  <span className="font-semibold text-slate-500 uppercase">Type</span>
                  <span className="font-semibold text-slate-900 uppercase text-right">{typeLabelMap[selectedTx.type] || selectedTx.type}</span>
                </div>
                <div className="flex justify-between items-center text-xs gap-3">
                  <span className="font-semibold text-slate-500 uppercase">Description</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[62%] break-words">{selectedTx.description || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center py-2 border-b border-slate-50 gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Date &amp; Time</span>
                <span className="text-xs font-semibold text-slate-900 text-right">{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
              {selectedTx.paymentMethod && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50 gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Method</span>
                  <span className="text-xs font-semibold text-slate-900 uppercase text-right">{selectedTx.paymentMethod}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowTxDetails(false)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold uppercase text-[11px] tracking-[0.12em] hover:bg-slate-200 transition-all"
            >
              Close Details
            </button>
          </div>
        )}
      </Modal>

      {paymentData && (
        <PaymentModal
          key={paymentData?.reference}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentData(null);
          }}
          accessCode={paymentData?.accessCode}
          reference={paymentData?.reference}
          amount={parseFloat(amount)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </UserLayout>
  );
}
