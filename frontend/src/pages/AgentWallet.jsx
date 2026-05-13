import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
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
          <div className="dash-header">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <Wallet size={24} />
                </div>
                <div>
                  <h2 className="dash-h2">Wallet Center</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 font-mono uppercase">Fund wallet & view history</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchTransactions(txPage)}
                  className="dash-btn-outline p-2"
                  title="Refresh wallet"
                >
                  <RefreshCw size={18} className={txLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <StatsCard title="Current Balance" value={user?.balance || 0} icon={Wallet} color="#f0a500" />
            <StatsCard title="Recent Credits" value={getTotalCredits()} icon={ArrowDownCircle} color="#10b981" />
            <StatsCard title="Pending" value={getPendingTransactions()} icon={Clock} isRaw color="#3b82f6" />
            <StatsCard title="Transactions" value={txTotal} icon={TrendingUp} isRaw color="#a855f7" />
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="dash-premium-banner" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Clock size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Business Closed</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                    {businessStatus.message || 'We are currently closed. Please try again during business hours.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="dash-premium-banner" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <AlertCircle size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Error</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="dash-premium-banner" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <CheckCircle2 size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Success</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>{success}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 dash-card">
              <h3 className="dash-card-title">
                <Zap size={18} style={{ color: '#f0a500' }} />
                Quick Amounts
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={loading || (businessStatus && !businessStatus.isOpen)}
                    className={`py-3 rounded-xl transition text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 border-1.5 ${
                      amount === quickAmount.toString()
                      ? 'bg-[#111] text-white border-[#111] shadow-lg'
                      : 'bg-[#fafaf7] text-slate-600 border-[#e4e4de] hover:border-slate-400'
                    }`}
                  >
                    GH₵ {quickAmount}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 dash-card">
              <h3 className="dash-card-title">
                <CreditCard size={18} style={{ color: '#3b82f6' }} />
                Fund Agent Wallet
              </h3>

              <div className="mb-8 flex flex-col gap-3">
                <label className="dash-stat-label ml-1">Amount (GHS)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">GHS</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    placeholder="0.00"
                    disabled={loading}
                    className="w-full pl-16 pr-5 py-5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl text-[#111] font-black text-2xl focus:outline-none focus:border-[#111] transition-all"
                  />
                </div>
              </div>

              {walletFundingCharge > 0 && parsedAmount > 0 && (
                <div className="mb-8 p-5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Deposit Amount</span>
                    <span className="text-slate-900 font-black">GHS {parsedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-[#f0a500] uppercase tracking-wider">
                    <span>Transaction Fee</span>
                    <span className="font-black">+ GHS {walletFundingCharge.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-[#e4e4de] my-1" />
                  <div className="flex justify-between items-center text-lg font-black text-[#111]">
                    <span>Total Charged</span>
                    <span>GHS {totalAmountCharged.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleTopUp}
                disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                className="dash-btn-primary w-full !py-5 !rounded-xl !text-sm !font-black uppercase tracking-widest shadow-xl shadow-slate-200"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    <CreditCard size={20} />
                    Proceed to Payment
                  </>
                )}
              </button>

              <p className="text-[10px] text-center mt-5 text-slate-400 font-bold uppercase tracking-[0.2em]">
                Securely powered by Paystack
              </p>
            </div>
          </div>

          {/* Transaction History Section */}
          <div className="dash-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="dash-card-title" style={{ margin: 0 }}>
                <Activity size={18} style={{ color: '#3b82f6' }} />
                Transaction History
              </h3>
            </div>
            
            <div className="dash-table-container">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-th">Transaction</th>
                    <th className="dash-th">Amount</th>
                    <th className="dash-th">Balance</th>
                    <th className="dash-th">Status</th>
                    <th className="dash-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const status = getResolvedTransactionStatus(tx);
                    const statusColor = status === 'completed' || status === 'successful'
                      ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
                      : status === 'pending' || status === 'processing'
                      ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }
                      : { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' };

                    return (
                      <tr key={tx._id}>
                        <td className="dash-td">
                          <div>
                            <p style={{ fontWeight: '700', color: '#111' }}>{typeLabelMap[tx.type] || 'Transaction'}</p>
                            <p style={{ fontSize: '10px', color: '#999' }}>{new Date(tx.createdAt).toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="dash-td font-black" style={{ color: isCreditTransaction(tx) ? '#059669' : '#111' }}>
                          {isCreditTransaction(tx) ? '+' : '-'}{formatCurrencyAbbreviated(Math.abs(tx.amount))}
                        </td>
                        <td className="dash-td font-bold" style={{ color: '#666' }}>{formatCurrencyAbbreviated(tx.balanceAfter)}</td>
                        <td className="dash-td">
                          <span className="dash-badge" style={statusColor}>{status}</span>
                        </td>
                        <td className="dash-td text-right">
                          <button
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowTxDetails(true);
                            }}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e4e4de', background: '#fff', cursor: 'pointer' }}
                          >
                            <Eye size={14} style={{ color: '#666' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && !txLoading && (
                    <tr>
                      <td colSpan="5" className="dash-td py-20 text-center">
                        <History size={40} style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>No transaction history found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4 mt-6">
              <button
                disabled={txPage <= 1 || txLoading}
                onClick={() => setTxPage(p => p - 1)}
                className="dash-btn-outline !py-2.5 !px-5 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {txPage}</span>
              <button
                disabled={!txHasMore || txLoading}
                onClick={() => setTxPage(p => p + 1)}
                className="dash-btn-outline !py-2.5 !px-5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[#111]/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowTxDetails(false)}
          />
          <div className="relative bg-white rounded-[24px] shadow-2xl max-w-lg w-full overflow-hidden border border-[#e4e4de] animate-in fade-in zoom-in duration-300" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <div className="px-8 py-6 border-b border-[#f0f0f0] flex items-center justify-between bg-[#fafaf7]">
              <div className="flex items-center gap-3">
                <div className="dash-icon-box" style={{ width: '40px', height: '40px' }}>
                  <Clock size={20} />
                </div>
                <h3 className="text-lg font-black text-[#111] tracking-tight">Transaction Receipt</h3>
              </div>
              <button
                onClick={() => setShowTxDetails(false)}
                className="p-2 hover:bg-[#e4e4de] rounded-full transition-colors"
              >
                <Check size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="dash-stat-label" style={{ marginBottom: '4px' }}>Status</p>
                  <span className="dash-badge" style={
                    getResolvedTransactionStatus(selectedTx) === 'completed' || getResolvedTransactionStatus(selectedTx) === 'successful'
                      ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
                      : getResolvedTransactionStatus(selectedTx) === 'pending' || getResolvedTransactionStatus(selectedTx) === 'processing'
                      ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }
                      : { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' }
                  }>
                    {getResolvedTransactionStatus(selectedTx)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="dash-stat-label" style={{ marginBottom: '4px' }}>Amount</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: isCreditTransaction(selectedTx) ? '#059669' : '#111' }}>
                    {isCreditTransaction(selectedTx) ? '+' : '-'}{formatCurrencyAbbreviated(Math.abs(selectedTx.amount))}
                  </p>
                </div>
              </div>

              <div className="p-5 bg-[#fafaf7] rounded-2xl border border-[#e4e4de] space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="dash-stat-label">Transaction Type</span>
                  <span style={{ fontWeight: '800', color: '#111' }}>{typeLabelMap[selectedTx.type] || selectedTx.type}</span>
                </div>
                <div className="flex justify-between items-start text-sm">
                  <span className="dash-stat-label">Description</span>
                  <span style={{ fontWeight: '700', color: '#111' }} className="text-right max-w-[60%]">{selectedTx.description || 'No description available'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="dash-stat-label">Timestamp</span>
                  <span style={{ fontWeight: '700', color: '#111' }}>{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="dash-stat-label">Reference</span>
                   <span style={{ fontWeight: '700', color: '#111', fontFamily: 'monospace' }}>#{String(selectedTx.reference || selectedTx._id).slice(-10).toUpperCase()}</span>
                </div>
              </div>

              <button
                onClick={() => setShowTxDetails(false)}
                className="dash-btn-primary w-full py-4 text-xs uppercase tracking-widest"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}

// --- MICRO UTILS ---

function StatsCard({ title, value, icon: Icon, isRaw = false, color = '#111' }) {
  return (
    <div className="dash-stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="dash-stat-label">{title}</p>
          <p className="dash-stat-value">
            {isRaw ? value : formatCurrencyAbbreviated(Number(value || 0))}
          </p>
        </div>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
    </div>
  );
}
