import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  CreditCard,
  Loader,
  Clock,
  Wallet,
  Layout,
  RefreshCw,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  AlertCircle,
  CheckCircle2,
  Eye,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import AgentLayout from '../components/AgentLayout';
import Modal from '../components/Modal';
import { wallet as walletAPI, publicAPI } from '../services/api';

export default function AgentWallet() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [businessStatus, setBusinessStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txTotal, setTxTotal] = useState(0);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showTxDetails, setShowTxDetails] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(false);

  const TX_LIMIT = 10;

  const typeLabelMap = {
    wallet_topup: 'Wallet Funding',
    wallet_funding: 'Wallet Funding',
    data_purchase: 'Data Purchase',
    checker_purchase: 'Checker Purchase',
    refund: 'Refund',
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
  const getResolvedPaymentStatus = (transaction) => {
    if (transaction?.paymentStatus) return normalizeStatus(transaction.paymentStatus);
    const rawStatus = normalizeStatus(transaction?.status);
    if (rawStatus === 'completed' || rawStatus === 'successful' || rawStatus === 'success') return 'completed';
    if (rawStatus === 'failed' || rawStatus === 'cancelled') return 'failed';
    return 'pending';
  };
  const getResolvedOrderStatus = (transaction) => {
    if (!['data_purchase', 'checker_purchase'].includes(normalizeStatus(transaction?.type))) return 'n/a';
    return normalizeStatus(transaction?.status) || 'pending';
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setTxLoading(true);
      const offset = (page - 1) * TX_LIMIT;
      const txRes = await walletAPI.getTransactions(TX_LIMIT, offset);
      const txList = txRes?.transactions || [];
      const pagination = txRes?.pagination || {};

      setTransactions(txList);
      setTxHasMore(!!pagination.hasMore);
      setTxTotal(pagination.total || 0);
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await publicAPI.getBusinessStatus();
        if (response.success && response.data) {
          setBusinessStatus(response.data);
        }
      } catch (err) {
        console.error('Failed to check business status:', err);
      }
    };

    checkStatus();
  }, []);

  useEffect(() => {
    fetchTransactions(txPage);
  }, [txPage]);

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  const handleTopUp = async () => {
    if (!amount || Number(amount) <= 0) {
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
      const result = await walletAPI.initializePayment({ amount: parseFloat(amount) });

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
    setSuccess(`Successfully topped up GHS ${amount}! Your new balance is GHS ${result.balance}`);
    setAmount('');
    await refreshUser();
    await fetchTransactions(1);
    setTxPage(1);
    setTimeout(() => setSuccess(null), 5000);
  };

  const isCreditTransaction = (transaction) => {
    return ['wallet_topup', 'wallet_funding', 'refund', 'referral_bonus'].includes(transaction?.type);
  };

  const getTotalCredits = () => transactions
    .filter((transaction) => isCreditTransaction(transaction))
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction?.amount || 0)), 0);

  const getPendingTransactions = () => transactions
    .filter((transaction) => transaction?.status === 'pending').length;

  return (
    <AgentLayout>
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        <div className="sticky top-0 z-20 app-pro-header px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary-600 mb-1">
                <Layout size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Wallet Center</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Agent Wallet</h1>
            </div>
            <button
              onClick={() => fetchTransactions(txPage)}
              className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Refresh wallet"
            >
              <RefreshCw size={18} className={txLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-blue-200/70 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <Wallet size={18} />
              </div>
              <p className="text-xs text-slate-600 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrencyAbbreviated(Number(user?.balance || 0))}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/70 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <ArrowDownCircle size={18} />
              </div>
              <p className="text-xs text-slate-600 mb-1">Recent Credits</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrencyAbbreviated(getTotalCredits())}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Clock size={18} />
              </div>
              <p className="text-xs text-slate-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{getPendingTransactions()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-indigo-200/70 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <TrendingUp size={18} />
              </div>
              <p className="text-xs text-slate-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-slate-900">{txTotal}</p>
            </div>
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="p-4 rounded-2xl flex items-start gap-3 border border-orange-300 bg-white text-orange-700">
              <Clock size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Business Closed</p>
                <p className="text-sm">{businessStatus.message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl flex items-start gap-3 border border-rose-300 bg-white text-rose-700">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl flex items-start gap-3 border border-emerald-300 bg-white text-emerald-700">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Success</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-sm mb-4 text-slate-900">Quick Amounts</h2>
                <div className="grid grid-cols-2 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount.toString())}
                      disabled={loading || (businessStatus && !businessStatus.isOpen)}
                      className={`py-2.5 rounded-xl transition text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${amount === quickAmount.toString()
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
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-lg mb-5 text-slate-900 flex items-center gap-2">
                  <Wallet size={20} className="text-blue-600" />
                  Fund Agent Wallet
                </h2>

                <div className="mb-6">
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
                      min="1"
                      step="0.01"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        appearance: 'textfield',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleTopUp}
                  disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                  className="w-full text-sm font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all"
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

                <p className="text-xs text-center mt-4 text-slate-600">
                  Your transaction is secure and encrypted with Paystack
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-primary-600" />
                Wallet Transaction History
              </h3>
              <span className="text-xs font-semibold text-slate-600">Page {txPage}</span>
            </div>

            {txLoading ? (
              <div className="py-10 flex items-center justify-center text-slate-600">
                <Loader size={18} className="animate-spin mr-2" />
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-600">No wallet transactions yet.</div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                  <table className="w-full min-w-[720px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reference</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Type</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Payment Status</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Order Status</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((transaction) => {
                        const isCredit = isCreditTransaction(transaction);
                        const amountTone = isCredit ? 'text-emerald-600' : 'text-rose-600';
                        const amountPrefixIcon = isCredit ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />;

                        return (
                          <tr key={transaction._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">{transaction.reference || '-'}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">{typeLabelMap[transaction.type] || transaction.type || '-'}</td>
                            <td className={`px-5 py-4 text-sm font-bold ${amountTone} whitespace-nowrap`}>
                              <span className="inline-flex items-center gap-1">
                                {amountPrefixIcon}
                                {isCredit ? '+' : '-'}GH₵{formatCurrencyAbbreviated(Math.abs(Number(transaction.amount || 0)))}
                              </span>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeMap[getResolvedPaymentStatus(transaction)] || 'bg-slate-100 text-slate-700'}`}>
                                  {getResolvedPaymentStatus(transaction)}
                                </span>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                {getResolvedOrderStatus(transaction) === 'n/a' ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                                    N/A
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadgeMap[getResolvedOrderStatus(transaction)] || 'bg-slate-100 text-slate-700'}`}>
                                    {getResolvedOrderStatus(transaction)}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                {new Date(transaction.createdAt).toLocaleDateString()} {' '}
                                {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-5 py-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setSelectedTx(transaction);
                                    setShowTxDetails(true);
                                  }}
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

                  <div className="md:hidden divide-y divide-slate-100">
                    {transactions.map((transaction) => {
                      const isCredit = isCreditTransaction(transaction);
                      return (
                        <div key={transaction._id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{transaction.reference || '-'}</p>
                            <div className="flex flex-col gap-1 items-end">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadgeMap[getResolvedPaymentStatus(transaction)] || 'bg-slate-100 text-slate-700'}`}>
                                Pay: {getResolvedPaymentStatus(transaction)}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getResolvedOrderStatus(transaction) === 'n/a' ? 'bg-slate-100 text-slate-500' : (statusBadgeMap[getResolvedOrderStatus(transaction)] || 'bg-slate-100 text-slate-700')}`}>
                                Order: {getResolvedOrderStatus(transaction) === 'n/a' ? 'N/A' : getResolvedOrderStatus(transaction)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600">{typeLabelMap[transaction.type] || transaction.type || '-'}</p>
                          <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isCredit ? '+' : '-'}GH₵{formatCurrencyAbbreviated(Math.abs(Number(transaction.amount || 0)))}
                          </p>
                          <p className="text-xs text-slate-600">
                            {new Date(transaction.createdAt).toLocaleDateString()} {' '}
                            {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setTxPage((prev) => Math.max(1, prev - 1))}
                      disabled={txPage === 1 || txLoading}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setTxPage((prev) => prev + 1)}
                      disabled={!txHasMore || txLoading}
                      className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

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
              onRefresh={() => { refreshUser(); fetchTransactions(1); }}
            />
          )}

          {/* Transaction Details Modal */}
          <Modal
            isOpen={showTxDetails}
            onClose={() => setShowTxDetails(false)}
            title="Transaction Details"
            icon={<History size={20} className="text-primary-600" />}
            maxWidth="max-w-lg"
          >
            {selectedTx && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Reference</p>
                    <p className="font-mono text-sm font-bold text-slate-900 uppercase">{selectedTx.reference || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status</p>
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBadgeMap[getResolvedPaymentStatus(selectedTx)] || 'bg-slate-100 text-slate-700'}`}>
                        Payment: {getResolvedPaymentStatus(selectedTx)}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getResolvedOrderStatus(selectedTx) === 'n/a' ? 'bg-slate-100 text-slate-500' : (statusBadgeMap[getResolvedOrderStatus(selectedTx)] || 'bg-slate-100 text-slate-700')}`}>
                        Order: {getResolvedOrderStatus(selectedTx) === 'n/a' ? 'N/A' : getResolvedOrderStatus(selectedTx)}
                      </span>
                    </div>
                  </div>
                </div>

              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100/60 shadow-inner">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/40">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Transaction Value</p>
                  <div className={`flex items-center gap-1.5 font-black text-lg ${isCreditTransaction(selectedTx) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isCreditTransaction(selectedTx) ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    {isCreditTransaction(selectedTx) ? '+' : '-'}{formatCurrencyAbbreviated(Math.abs(selectedTx.amount))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase">Type</span>
                    <span className="font-bold text-slate-900 uppercase">{typeLabelMap[selectedTx.type] || selectedTx.type}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase">Description</span>
                    <span className="font-bold text-slate-900 text-right">{selectedTx.description || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date & Time</span>
                  <span className="text-xs font-bold text-slate-900">{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
                {selectedTx.paymentMethod && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Method</span>
                    <span className="text-xs font-bold text-slate-900 uppercase">{selectedTx.paymentMethod}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowTxDetails(false)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Close Details
              </button>
            </div>
          )}
        </Modal>
      </div>
    </AgentLayout>
  );
}
