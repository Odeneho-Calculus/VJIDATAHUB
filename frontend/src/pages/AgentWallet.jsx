import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  CreditCard,
  Loader,
  Clock,
  Wallet,
  Layout as LayoutIcon,
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
  ChevronRight,
  Loader2,
  CheckCircle
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import AgentLayout from '../components/AgentLayout';
import Modal from '../components/Modal';
import { wallet as walletAPI, publicAPI } from '../services/api';
import {
  formatChargeDescriptor,
  getWalletFundingChargeAmount,
  parseTransactionCharges,
} from '../utils/transactionCharges';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
    min-height: 100vh;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .dash-header {
      padding: 24px;
    }
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .dash-icon-box {
    width: 40px;
    height: 40px;
    background: #111;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f0a500;
    flex-shrink: 0;
  }

  .dash-h2 {
    font-size: 18px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (min-width: 768px) {
    .dash-h2 {
      font-size: 26px;
    }
    .dash-icon-box {
      width: 46px;
      height: 46px;
    }
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .dash-stat-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: #d4d4ce;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
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

  .dash-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .dash-btn-outline {
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

  .dash-btn-outline:hover {
    background: #fafaf7;
    border-color: #d4d4ce;
  }

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .dash-table-container::-webkit-scrollbar {
    display: none;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
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

  .dash-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
  }

  .dash-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

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
  const [transactionCharges, setTransactionCharges] = useState(parseTransactionCharges());

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
  const getResolvedTransactionStatus = (transaction) => {
    const transactionType = normalizeStatus(transaction?.type);

    if (['data_purchase', 'checker_purchase'].includes(transactionType)) {
      return normalizeStatus(transaction?.status) || 'pending';
    }

    return getResolvedPaymentStatus(transaction);
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
        const [statusRes, settingsRes] = await Promise.all([
          publicAPI.getBusinessStatus(),
          publicAPI.getSystemSettings(),
        ]);

        if (statusRes.success && statusRes.data) {
          setBusinessStatus(statusRes.data);
        }

        setTransactionCharges(parseTransactionCharges(settingsRes?.settings?.transactionCharges));
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
  const parsedAmount = Number(amount || 0);
  const walletFundingCharge = getWalletFundingChargeAmount(transactionCharges, parsedAmount);
  const totalAmountCharged = parsedAmount + walletFundingCharge;
  const walletChargeDescriptor = formatChargeDescriptor(
    transactionCharges.walletFundingChargeType,
    transactionCharges.walletFundingCharge,
    'GHS'
  );

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
      const result = await walletAPI.initializePayment({ amount: parsedAmount });

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
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>
        
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header !p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-10 !h-10">
                  <LayoutIcon size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="dash-h2 !text-base sm:!text-xl">Wallet Center</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase truncate">Fund wallet & view history</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fetchTransactions(txPage)}
                  className="p-1.5 text-slate-400 hover:text-[#f0a500] transition-colors"
                  title="Refresh wallet"
                >
                  <RefreshCw size={16} className={txLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <StatsCard title="Current Balance" value={user?.balance || 0} icon={Wallet} />
            <StatsCard title="Recent Credits" value={getTotalCredits()} icon={ArrowDownCircle} />
            <StatsCard title="Pending" value={getPendingTransactions()} icon={Clock} isRaw />
            <StatsCard title="Transactions" value={txTotal} icon={TrendingUp} isRaw />
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="dash-card flex items-start gap-3 py-4 border-orange-200 bg-orange-50 text-orange-700">
              <Clock size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Business Closed</p>
                <p className="text-xs">{businessStatus.message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="dash-card flex items-start gap-3 py-4 border-rose-200 bg-rose-50 text-rose-700">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Error</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="dash-card flex items-start gap-3 py-4 border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Success</p>
                <p className="text-xs">{success}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="dash-card !p-5">
                <h3 className="dash-card-title !mb-4 !text-xs uppercase tracking-widest">Quick Amounts</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount.toString())}
                      disabled={loading || (businessStatus && !businessStatus.isOpen)}
                      className={`py-2.5 rounded-xl transition text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${
                        amount === quickAmount.toString()
                        ? 'bg-[#111] text-white shadow-md'
                        : 'bg-[#fafaf7] text-slate-600 border border-[#e4e4de] hover:border-slate-400'
                      }`}
                    >
                      GH₵ {quickAmount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="dash-card !p-5">
                <h3 className="dash-card-title !mb-6">
                  <Wallet size={18} className="text-[#f0a500]" />
                  Fund Agent Wallet
                </h3>

                <div className="mb-6 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Amount (GHS)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">GHS</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError(null);
                      }}
                      placeholder="0.00"
                      disabled={loading}
                      className="w-full pl-14 pr-4 py-4 bg-[#fafaf7] border-2 border-[#e4e4de] rounded-xl text-[#111] font-black text-xl focus:outline-none focus:border-[#111] transition-all"
                    />
                  </div>
                </div>

                {walletFundingCharge > 0 && parsedAmount > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 border border-[#e4e4de] rounded-xl space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span>Credit</span>
                      <span>GHS {parsedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-[#f0a500] uppercase">
                      <span>Fee</span>
                      <span>+ GHS {walletFundingCharge.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-[#e4e4de]" />
                    <div className="flex justify-between text-base font-black text-[#111]">
                      <span>Total Charged</span>
                      <span>GHS {totalAmountCharged.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTopUp}
                  disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                  className="dash-btn-primary w-full !py-4 !rounded-xl !text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                  Proceed to Payment
                </button>

                <p className="text-[10px] text-center mt-4 text-slate-400 font-bold uppercase tracking-widest">
                  Securely powered by Paystack
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[#f0a500]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Transaction History</h3>
            </div>
            
            <div className="dash-table-container">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-th">Transaction</th>
                    <th className="dash-th">Amount</th>
                    <th className="dash-th">Balance</th>
                    <th className="dash-th">Status</th>
                    <th className="dash-th text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td className="dash-td">
                        <p className="font-bold text-slate-900">{typeLabelMap[tx.type] || 'Transaction'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.createdAt).toLocaleString()}</p>
                      </td>
                      <td className={`dash-td font-black ${isCreditTransaction(tx) ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isCreditTransaction(tx) ? '+' : '-'}{formatCurrencyAbbreviated(Math.abs(tx.amount))}
                      </td>
                      <td className="dash-td font-bold text-slate-600">{formatCurrencyAbbreviated(tx.balanceAfter)}</td>
                      <td className="dash-td">
                        <span className={`dash-badge ${statusBadgeMap[getResolvedTransactionStatus(tx)] || 'bg-slate-100 text-slate-700'}`}>
                          {getResolvedTransactionStatus(tx)}
                        </span>
                      </td>
                      <td className="dash-td text-right">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setShowTxDetails(true);
                          }}
                          className="p-2 text-slate-400 hover:text-[#111] hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && !txLoading && (
                    <tr>
                      <td colSpan="5" className="dash-td py-12 text-center text-slate-400 font-bold uppercase text-xs">No transaction history found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
              <button
                disabled={txPage <= 1 || txLoading}
                onClick={() => setTxPage(p => p - 1)}
                className="dash-btn-outline !py-2 !px-4 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page {txPage}</span>
              <button
                disabled={!txHasMore || txLoading}
                onClick={() => setTxPage(p => p + 1)}
                className="dash-btn-outline !py-2 !px-4 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentData={paymentData}
        onSuccess={handlePaymentSuccess}
      />

      {showTxDetails && selectedTx && (
        <Modal
          isOpen={showTxDetails}
          onClose={() => setShowTxDetails(false)}
          title="Transaction Receipt"
        >
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start border-b border-[#f0f0f0] pb-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference</p>
                <p className="font-bold text-sm text-slate-900 break-all">#{selectedTx.reference || selectedTx._id}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className={`dash-badge ${statusBadgeMap[getResolvedTransactionStatus(selectedTx)]} !px-3 !py-1`}>
                  {getResolvedTransactionStatus(selectedTx)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#fafaf7] rounded-xl border border-[#e4e4de]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                <p className={`font-black text-lg ${isCreditTransaction(selectedTx) ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isCreditTransaction(selectedTx) ? '+' : '-'}{formatCurrencyAbbreviated(Math.abs(selectedTx.amount))}
                </p>
              </div>
              <div className="p-4 bg-[#fafaf7] rounded-xl border border-[#e4e4de]">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Balance</p>
                <p className="font-black text-slate-900 text-lg">{formatCurrencyAbbreviated(selectedTx.balanceAfter)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <DetailRow label="Type" value={typeLabelMap[selectedTx.type] || selectedTx.type} />
              <DetailRow label="Description" value={selectedTx.description || 'No description available'} />
              <DetailRow label="Date" value={new Date(selectedTx.createdAt).toLocaleString()} />
              {selectedTx.paymentReference && <DetailRow label="Paystack Ref" value={selectedTx.paymentReference} />}
            </div>

            <button
              onClick={() => setShowTxDetails(false)}
              className="dash-btn-primary w-full py-4 mt-2 !rounded-xl"
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </AgentLayout>
  );
}

// --- MICRO UTILS ---

function StatsCard({ title, value, icon: Icon, isRaw = false }) {
  return (
    <div className="dash-stat-card">
      <div className="flex items-center justify-between mb-1">
        <span className="dash-stat-label">{title}</span>
        {Icon && <Icon size={14} className="text-slate-300" />}
      </div>
      <div className="dash-stat-value">
        {isRaw ? value : formatCurrencyAbbreviated(Number(value || 0))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-slate-900 text-right ml-4">{value}</span>
    </div>
  );
}
