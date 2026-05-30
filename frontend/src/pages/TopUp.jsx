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
  Activity,
  Database,
  ShieldCheck,
  Zap,
  X,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { wallet, publicAPI } from '../services/api';
import UserLayout from '../components/UserLayout';
import {
  formatChargeDescriptor,
  getWalletFundingChargeAmount,
  parseTransactionCharges,
} from '../utils/transactionCharges';

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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #ffffff;
    min-height: 100vh;
    color: #1a1a1a;
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
    background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
    border: 1.5px solid #BAE6FD;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(3,105,161,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .dash-h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: #111;
  }

  .dash-icon-box {
    width: 46px;
    height: 46px;
    background: #0369A1;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(3,105,161,0.25);
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-btn-outline {
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

  .dash-btn-outline:hover {
    border-color: #0369A1;
    background: #F0F9FF;
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
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #000;
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
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 20px 0;
  }

  .dash-premium-banner {
    background: linear-gradient(135deg, #0369A1 0%, #075985 100%);
    border-radius: 14px;
    padding: 24px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }

  .dash-banner-accent {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 120px;
    height: 120px;
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
    pointer-events: none;
  }

  .dash-input {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #111;
    transition: all 0.2s;
    outline: none;
  }

  .dash-input:focus {
    border-color: #0369A1;
    box-shadow: 0 0 0 4px rgba(3,105,161,0.05);
  }

  .dash-input:focus::placeholder {
    color: transparent;
  }
`;

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
  const [transactionCharges, setTransactionCharges] = useState(parseTransactionCharges());
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
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
    cancelled: 'bg-slate-100 text-black',
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

  const isCreditTransaction = (tx) => {
    if (tx?.type === 'admin_adjustment') return tx.amount > 0;
    return ['wallet_topup', 'wallet_funding', 'refund', 'purchase_refund', 'referral_bonus'].includes(tx?.type);
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setTxLoading(true);
      const offset = (page - 1) * TX_LIMIT;
      const res = await wallet.getTransactions(TX_LIMIT, offset);
      setTransactions(res?.transactions || []);
      setTxTotal(res?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch wallet transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100, 200, 500];
  const parsedAmount = Number(amount || 0);
  const walletFundingCharge = getWalletFundingChargeAmount(transactionCharges, parsedAmount);
  const totalAmountCharged = parsedAmount + walletFundingCharge;
  const walletChargeDescriptor = formatChargeDescriptor(
    transactionCharges.walletFundingChargeType,
    transactionCharges.walletFundingCharge,
    'GHS'
  );

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
      <style>{styles}</style>
      <div className="dash-wrapper">
        <div className="dash-content">
          {/* Header */}
          <div className="dash-header">
            <div className="flex items-center justify-between">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <Wallet size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Wallet Center</span>
                  </div>
                  <h2 className="dash-h2">Wallet Top-up</h2>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="dash-btn-outline"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="dash-stat-card" style={{ '--stat-color': getColor(6).main, '--stat-glow': getColor(6).glow, '--stat-bg': getColor(6).soft, '--stat-border': getColor(6).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(6).main }}>Current Balance</p>
                  <p className="dash-stat-value">
                    {formatCurrencyAbbreviated(Number(user?.balance || 0))}
                  </p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(6).soft, color: getColor(6).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="dash-stat-card" style={{ '--stat-color': getColor(1).main, '--stat-glow': getColor(1).glow, '--stat-bg': getColor(1).soft, '--stat-border': getColor(1).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(1).main }}>Funding Status</p>
                  <p className="dash-stat-value">
                    {businessStatus?.isOpen ? 'Available' : 'Unavailable'}
                  </p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(1).soft, color: getColor(1).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="dash-stat-card" style={{ '--stat-color': getColor(3).main, '--stat-glow': getColor(3).glow, '--stat-bg': getColor(3).soft, '--stat-border': getColor(3).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(3).main }}>Funding Records</p>
                  <p className="dash-stat-value">{txTotal}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(3).soft, color: getColor(3).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={18} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="p-4 rounded-2xl flex items-start gap-3 border border-orange-200 bg-orange-50 text-orange-700">
              <Clock size={20} className="flex-shrink-0" />
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Business Closed</p>
                <p className="text-sm font-medium opacity-90">{businessStatus.message || 'Business is currently closed.'}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl flex items-start gap-3 border border-red-200 bg-red-50 text-red-700">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Error</p>
                <p className="text-sm font-medium opacity-90">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl flex items-start gap-3 border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Success</p>
                <p className="text-sm font-medium opacity-90">{success}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="dash-card">
                <h3 className="dash-card-title">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  Quick Amounts
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => {
                        setAmount(quickAmount.toString());
                        setError(null);
                      }}
                      disabled={loading || (businessStatus && !businessStatus.isOpen)}
                      className="py-3 px-4 rounded-xl font-black text-sm transition-all border-2"
                      style={{
                        backgroundColor: amount === quickAmount.toString() ? getColor(6).main : '#fff',
                        color: amount === quickAmount.toString() ? '#fff' : '#111',
                        borderColor: amount === quickAmount.toString() ? getColor(6).main : '#e4e4de',
                      }}
                    >
                      GH₵ {quickAmount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="dash-card">
                <h3 className="dash-card-title">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                    <CreditCard size={16} />
                  </div>
                  Fund Wallet
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2 ml-1">
                      Enter Amount (GHS)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-black font-black group-focus-within:text-sky-600 transition-colors pointer-events-none z-10">
                        GH₵
                      </div>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError(null);
                        }}
                        placeholder="0.00"
                        disabled={loading}
                        className="w-full !pl-16 pr-4 py-4 dash-input text-lg font-black"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm text-sky-600 flex-shrink-0 flex items-center justify-center">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-sky-900 uppercase tracking-tight">Secure Payment</p>
                      <p className="text-[11px] font-medium text-sky-700 mt-0.5 leading-relaxed">
                        Funds are processed instantly via Paystack encrypted gateway.
                      </p>
                    </div>
                  </div>

                  {walletFundingCharge > 0 && parsedAmount > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-black">
                        <span>Base Amount</span>
                        <span className="text-black">GHS {parsedAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-amber-600">
                        <span>Service Fee ({walletChargeDescriptor})</span>
                        <span>+ GHS {walletFundingCharge.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-slate-200" />
                      <div className="flex items-center justify-between text-sm font-black text-black">
                        <span>Total Payable</span>
                        <span className="text-lg text-sky-600">GHS {totalAmountCharged.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleTopUp}
                    disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                    className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-sky-600/20"
                    style={{
                      backgroundColor: getColor(6).main,
                      color: '#fff',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap size={20} fill="currentColor" />
                        Proceed to Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="dash-card">
            <div className="flex items-center justify-between">
              <h3 className="dash-card-title mb-0">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <History size={16} />
                </div>
                Transaction History
              </h3>
              <div className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-wider text-black">
                {txTotal} Total
              </div>
            </div>

            {txLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-black">
                <Loader size={32} className="animate-spin text-sky-500" />
                <p className="text-xs font-bold uppercase tracking-widest">Fetching Records...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-100 rounded-3xl">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-black">
                  <Database size={24} />
                </div>
                <p className="text-xs font-bold text-black uppercase tracking-widest">No Transactions Found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-4 text-left text-[10px] font-black text-black uppercase tracking-widest">Reference</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-black uppercase tracking-widest">Type</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-black uppercase tracking-widest">Amount</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-black uppercase tracking-widest">Status</th>
                        <th className="px-4 py-4 text-right text-[10px] font-black text-black uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.map((tx) => {
                        const isCredit = isCreditTransaction(tx);
                        return (
                          <tr key={tx._id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4">
                              <p className="text-xs font-black text-black">{tx.reference || '---'}</p>
                              <p className="text-[10px] font-bold text-black mt-1">
                                {new Date(tx.createdAt).toLocaleDateString()} &bull; {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-[11px] font-bold text-black bg-slate-100 px-2 py-1 rounded-md">
                                {typeLabelMap[tx.type] || tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className={`text-xs font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1.5`}>
                                {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${statusBadgeMap[getResolvedTransactionStatus(tx)] || 'bg-slate-100 text-black'}`}>
                                {getResolvedTransactionStatus(tx)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => { setSelectedTx(tx); setShowTxDetails(true); }}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-black hover:text-sky-600 hover:border-sky-200 hover:shadow-sm transition-all flex items-center justify-center ml-auto"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {transactions.map((tx) => {
                    const isCredit = isCreditTransaction(tx);
                    return (
                      <div key={tx._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs font-black text-black">{tx.reference || '---'}</p>
                            <p className="text-[10px] font-bold text-black mt-0.5">{typeLabelMap[tx.type] || tx.type}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${statusBadgeMap[getResolvedTransactionStatus(tx)] || 'bg-slate-100 text-black'}`}>
                            {getResolvedTransactionStatus(tx)}
                          </span>
                        </div>
                        <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-1">
                          <p className="text-[10px] font-bold text-black">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                          <div className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1`}>
                            {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <Pagination
                    currentPage={txPage}
                    totalPages={Math.ceil(txTotal / TX_LIMIT)}
                    onPageChange={(page) => setTxPage(page)}
                    isLoading={txLoading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        accessCode={paymentData?.accessCode}
        reference={paymentData?.reference}
        amount={Number.parseFloat(amount)}
        themeColor={getColor(6)}
      />

      {showTxDetails && selectedTx && (
        <Modal
          isOpen={showTxDetails}
          onClose={() => setShowTxDetails(false)}
          title="Transaction Details"
          icon={<History size={22} strokeWidth={2.5} />}
          themeColor={getColor(6)}
          maxWidth="max-w-lg"
        >
          {(() => {
            const c = getColor(6);
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border-1.5 transition-all duration-300" style={{ background: c.soft, borderColor: `${c.main}20` }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: c.main }}>Amount</p>
                    <p className={`text-xl font-black ${isCreditTransaction(selectedTx) ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isCreditTransaction(selectedTx) ? '+' : '-'}{formatCurrency(Math.abs(selectedTx.amount))}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border-1.5 transition-all duration-300" style={{ background: c.soft, borderColor: `${c.main}20` }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: c.main }}>Status</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${statusBadgeMap[getResolvedTransactionStatus(selectedTx)] || 'bg-slate-100 text-black'}`}>
                      {getResolvedTransactionStatus(selectedTx)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-6 rounded-[24px] border-1.5 bg-white transition-all duration-300" style={{ borderColor: `${c.main}10` }}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-black">Type</span>
                    <span className="font-black text-[#111] uppercase tracking-tight">{typeLabelMap[selectedTx.type] || selectedTx.type}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-black">Date</span>
                    <span className="font-black text-[#111]">{new Date(selectedTx.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-black">Payment Ref</span>
                    <span className="font-black text-[#111] font-mono text-xs">{selectedTx.paymentReference || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-black">Transaction ID</span>
                    <span className="font-black text-[#111] font-mono text-xs">{selectedTx.reference || 'N/A'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowTxDetails(false)}
                  className="w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
                  style={{ 
                    background: c.main,
                    boxShadow: `0 8px 25px ${c.glow}`
                  }}
                >
                  Close Record
                </button>
              </div>
            );
          })()}
        </Modal>
      )}
    </UserLayout>
  );
}
