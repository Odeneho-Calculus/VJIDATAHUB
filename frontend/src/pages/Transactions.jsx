import React, { useState, useEffect } from 'react';
import { Eye, Download, Lock, RotateCcw, X, Copy, Check, RotateCw, Wallet, ArrowUpRight, ArrowDownLeft, Gift, Search, Filter, Calendar, Layout, CreditCard, ChevronRight, Hash, AlertCircle, ShoppingBag, ReceiptText, RefreshCw, Activity, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrencyAbbreviated, formatNumberAbbreviated } from '../utils/formatCurrency';
import { wallet, purchases, checkers as checkersAPI } from '../services/api';
import UserLayout from '../components/UserLayout';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import Pagination from '../components/Pagination';

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
    background-color: #f5f5f0;
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
    background: linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%);
    border: 1.5px solid #FECACA;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(220,38,38,0.08);
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
    background: #DC2626;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(220,38,38,0.25);
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
    border-color: #DC2626;
    background: #FFF5F5;
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
    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
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

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 14px;
    border: 1.5px solid #e4e4de;
    background: #fff;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
    background: #fafaf7;
    text-align: left;
    padding: 14px 16px;
    font-weight: 800;
    color: #999;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #111;
  }

  .dash-table-row {
    transition: all 0.2s;
    cursor: pointer;
  }

  .dash-table-row:hover {
    background: #fafaf7;
  }

  .badge-premium {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-success { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
  .badge-pending { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
  .badge-failed { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
  .badge-info { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }

  .dash-tab {
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

  .dash-tab.active {
    background: #DC2626;
    color: #fff;
    box-shadow: 0 4px 12px rgba(220,38,38,0.25);
  }

  .dash-tab:not(.active):hover {
    background: #FFF5F5;
    color: #DC2626;
  }

  .dash-input {
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

  .dash-input:focus {
    border-color: #DC2626;
    box-shadow: 0 0 0 4px rgba(220,38,38,0.05);
  }

  .dash-mobile-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 20px;
    transition: all 0.2s;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  }

  .dash-mobile-card:hover {
    border-color: var(--card-color, #111);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px var(--card-glow, rgba(0,0,0,0.06));
  }

  @media (max-width: 768px) {
    .dash-wrapper { padding: 12px; }
    .dash-header { padding: 16px; }
    .dash-premium-banner { padding: 20px; }
    .dash-stat-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default function Transactions() {
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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

      const isCheckerOrder = (order) => {
        const kind = String(order?.orderKind || '').toLowerCase();
        const network = String(order?.network || '').toLowerCase();
        return kind === 'checker' || network === 'checker' || Boolean(order?.checkerDetails?.checkerType);
      };

      const combined = [
        ...walletTransactions.map(tx => {
          const desc = tx.description?.toLowerCase() || '';
          let type = 'Wallet Top-up';

          if (tx.type === 'checker_purchase' || desc.includes('checker purchase')) {
            type = 'Checker Purchase';
          } else if (tx.type === 'data_purchase' || desc.includes('data purchase')) {
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
        ...ordersList.map(order => {
          const checkerOrder = isCheckerOrder(order);
          const planLabel = checkerOrder
            ? (order.planName || order?.checkerDetails?.checkerType || 'Checker')
            : (order.dataAmount || order.planName || 'N/A');
          return {
            id: order.id,
            type: checkerOrder ? 'Checker Purchase' : 'Data Purchase',
            description: checkerOrder
              ? `${planLabel} checker to ${order.phoneNumber}`
              : `${planLabel} ${order.network} to ${order.phoneNumber}`,
            amount: -order.amount,
            date: order.date || order.createdAt,
            status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
            statusRaw: order.status,
            paymentStatus: order.paymentStatus,
            balanceAfter: 0,
            paymentMethod: order.paymentMethod,
            reference: order.transactionReference,
            paystackReference: order.paystackReference,
            txType: checkerOrder ? 'checker_purchase' : 'data_purchase',
            createdAt: order.date || order.createdAt,
          };
        }),
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
    if (!['Data Purchase', 'Checker Purchase'].includes(tx?.type)) return 'n/a';
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
      } else if (verificationTx.txType === 'checker_purchase') {
        response = await checkersAPI.verifyCheckerPurchase({ reference });
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

  const isCreditTransaction = (tx) => {
    if (tx.txType === 'admin_adjustment') return tx.amount > 0;
    return ['Wallet Top-up', 'Referral Bonus', 'Refund'].includes(tx.type);
  };

  const [txPage, setTxPage] = useState(1);
  const TX_LIMIT = 10;

  const filteredTransactions = transactions.filter(tx => {
    // Tab filtering
    if (activeTab === 'purchase' && !['Data Purchase', 'Checker Purchase'].includes(tx.type)) return false;
    if (activeTab === 'top_up' && tx.type !== 'Wallet Top-up') return false;
    if (activeTab === 'bonus' && tx.type !== 'Referral Bonus') return false;

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        tx.description?.toLowerCase().includes(query) ||
        tx.type?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query) ||
        tx.amount.toString().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Status filtering
    if (statusFilter !== 'all') {
      const s = tx.statusRaw?.toLowerCase();
      if (statusFilter === 'completed' && !(s === 'completed' || s === 'success' || s === 'successful')) return false;
      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'failed' && s !== 'failed') return false;
    }
    return true;
  });

  const paginatedTransactions = filteredTransactions.slice((txPage - 1) * TX_LIMIT, txPage * TX_LIMIT);

  const getTransactionIcon = (type, amount) => {
    if (type === 'Wallet Top-up' || type === 'Referral Bonus' || (type === 'Transaction' && amount > 0)) return <ArrowUpRight size={16} />;
    return <ArrowDownLeft size={16} />;
  };

  const totalSpent = transactions
    .filter(t => ['Data Purchase', 'Checker Purchase'].includes(t.type) && (t.statusRaw === 'completed' || t.statusRaw === 'successful'))
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
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>
        
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <ReceiptText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600/80">Full Financial Records</span>
                  </div>
                  <h2 className="dash-h2">Transaction History</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="dash-btn-outline p-2"
                  title="Refresh History"
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button className="dash-btn-outline">
                  <Download size={16} />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="dash-stat-card" style={{ '--stat-color': getColor(4).main, '--stat-glow': getColor(4).glow, '--stat-bg': getColor(4).soft, '--stat-border': getColor(4).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(4).main }}>Total Spent</p>
                  <p className="dash-stat-value">{formatCurrencyAbbreviated(totalSpent)}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(4).soft, color: getColor(4).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowDownLeft size={18} />
                </div>
              </div>
            </div>
            <div className="dash-stat-card" style={{ '--stat-color': getColor(1).main, '--stat-glow': getColor(1).glow, '--stat-bg': getColor(1).soft, '--stat-border': getColor(1).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(1).main }}>Total Funding</p>
                  <p className="dash-stat-value">{formatCurrencyAbbreviated(totalTopUp)}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(1).soft, color: getColor(1).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </div>
            <div className="dash-stat-card" style={{ '--stat-color': getColor(2).main, '--stat-glow': getColor(2).glow, '--stat-bg': getColor(2).soft, '--stat-border': getColor(2).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(2).main }}>Record Count</p>
                  <p className="dash-stat-value">{transactions.length}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(2).soft, color: getColor(2).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} />
                </div>
              </div>
            </div>
            <div className="dash-stat-card" style={{ '--stat-color': getColor(7).main, '--stat-glow': getColor(7).glow, '--stat-bg': getColor(7).soft, '--stat-border': getColor(7).main + '33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label" style={{ color: getColor(7).main }}>System Integrity</p>
                  <p className="dash-stat-value">Verified</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: getColor(7).soft, color: getColor(7).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Transaction List */}
          <div className="dash-card">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                {[
                  { id: 'all', label: 'All Activities', icon: ReceiptText },
                  { id: 'top_up', label: 'Funding', icon: ArrowUpRight },
                  { id: 'purchase', label: 'Spendings', icon: ShoppingBag },
                  { id: 'bonus', label: 'Rewards', icon: Gift },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`dash-tab whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative group w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="dash-input pl-10 w-full"
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="dash-input text-[10px] font-black uppercase tracking-widest py-2 px-3 h-11"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    className="dash-input text-[10px] font-black uppercase tracking-widest py-2 px-3 h-11"
                  >
                    <option value={10}>10 Rows</option>
                    <option value={20}>20 Rows</option>
                    <option value={50}>50 Rows</option>
                  </select>
                </div>
              </div>
            </div>

              {/* Transactions List */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-red-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ReceiptText size={20} className="text-red-600/50" />
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
                <>
                  <div className="dash-table-container hidden md:block">
                    {/* Desktop Table View */}
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th className="dash-th">Type</th>
                          <th className="dash-th text-center">Payment</th>
                          <th className="dash-th text-center">Order</th>
                          <th className="dash-th">Description</th>
                          <th className="dash-th text-center">Amount</th>
                          <th className="dash-th text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTransactions.map(tx => (
                          <tr
                            key={tx.id}
                            onClick={() => { setSelectedTx(tx); setShowDetails(true); }}
                            className="dash-table-row"
                          >
                            <td className="dash-td whitespace-nowrap">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${tx.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                  }`}>
                                  {getTransactionIcon(tx.type, tx.amount)}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-[#111] uppercase tracking-tight">{tx.type}</p>
                                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                    {formatDate(tx.date)} &bull; {formatTime(tx.date)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="dash-td text-center whitespace-nowrap">
                              <span className={`badge-premium ${getStatusStyles(getResolvedPaymentStatus(tx))}`}>
                                {getResolvedPaymentStatus(tx)}
                              </span>
                            </td>
                            <td className="dash-td text-center whitespace-nowrap">
                              {getResolvedOrderStatus(tx) === 'n/a' ? (
                                <span className="badge-premium bg-slate-50 text-slate-600 border-slate-100">
                                  N/A
                                </span>
                              ) : (
                                <span className={`badge-premium ${getStatusStyles(getResolvedOrderStatus(tx))}`}>
                                  {getResolvedOrderStatus(tx)}
                                </span>
                              )}
                            </td>
                            <td className="dash-td min-w-[200px]">
                              <p className="text-sm font-bold text-slate-600 truncate">{tx.description}</p>
                              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-tighter mt-0.5">Ref: {tx.reference || 'N/A'}</p>
                            </td>
                            <td className="dash-td text-center whitespace-nowrap">
                              <p className={`text-base font-black tracking-tight ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.amount >= 0 ? '+' : '-'}{formatNumberAbbreviated(Math.abs(tx.amount))}
                              </p>
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">
                                Bal: GH₵ {formatCurrencyAbbreviated(tx.balanceAfter)}
                              </p>
                            </td>
                            <td className="dash-td text-right">
                              <div className="flex items-center justify-end gap-2 px-1">
                                {getResolvedPaymentStatus(tx) === 'pending' && (tx.txType === 'wallet_topup' || tx.type === 'Data Purchase' || tx.type === 'Checker Purchase') && (
                                  <button
                                    onClick={(e) => openVerificationModal(tx, e)}
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-100"
                                    title="Verify Payment"
                                  >
                                    <RotateCw size={14} strokeWidth={3} />
                                  </button>
                                )}
                                <button className="p-2 rounded-lg hover:bg-[#fafaf7] text-slate-300 hover:text-[#111] transition-all">
                                  <ChevronRight size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-slate-100">
                    {paginatedTransactions.map(tx => {
                      const isCredit = isCreditTransaction(tx);
                      return (
                        <div
                          key={tx.id}
                          onClick={() => { setSelectedTx(tx); setShowDetails(true); }}
                          className="dash-mobile-card mb-3"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                {getTransactionIcon(tx.type, tx.amount)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 tracking-tight">{tx.type}</p>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
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
                              <p className={`text-lg font-black tracking-tighter ${isCredit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isCredit ? '+' : '-'}{formatNumberAbbreviated(Math.abs(tx.amount))}
                              </p>
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                Bal: GH₵ {formatCurrencyAbbreviated(tx.balanceAfter)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-1">
                            <p className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{tx.description}</p>
                            <div className="flex gap-2">
                              {getResolvedPaymentStatus(tx) === 'pending' && (tx.txType === 'wallet_topup' || tx.type === 'Data Purchase' || tx.type === 'Checker Purchase') && (
                                <button
                                  onClick={(e) => openVerificationModal(tx, e)}
                                  className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100"
                                >
                                  <RotateCw size={14} />
                                </button>
                              )}
                              <div className={`w-8 h-8 bg-[#111] text-white rounded-xl flex items-center justify-center`}>
                                <ChevronRight size={16} strokeWidth={3} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 px-4 pb-6">
                    <Pagination
                      currentPage={txPage}
                      totalPages={Math.ceil(filteredTransactions.length / TX_LIMIT)}
                      onPageChange={(page) => setTxPage(page)}
                      isLoading={loading}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Transaction Details Modal */}
          <Modal
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            title="Transaction Details"
            icon={ReceiptText}
            themeColor={getColor(5)}
            footer={
              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-4 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98] shadow-xl"
                style={{
                  background: getColor(5).main,
                  boxShadow: `0 8px 25px ${getColor(5).glow}`
                }}
              >
                Close Record
              </button>
            }
          >
            {selectedTx && (
              <div className="space-y-6">
                <div className="rounded-3xl p-4 border-1.5 flex flex-col items-center text-center transition-all duration-300" style={{ background: getColor(5).soft, borderColor: `${getColor(5).main}20` }}>
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-2 border border-slate-100" style={{ color: getColor(5).main }}>
                    {React.cloneElement(getTransactionIcon(selectedTx.type), { size: 24, strokeWidth: 1.5 })}
                  </div>
                  <p className={`text-xl font-black tracking-tight ${selectedTx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedTx.amount >= 0 ? '+' : '-'}{formatCurrencyAbbreviated(Math.abs(selectedTx.amount))}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-0.5" style={{ color: getColor(5).main }}>{selectedTx.type}</p>

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
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
                      <div className="flex items-center gap-2 text-slate-600">
                        {item.icon && <item.icon size={12} className="group-hover:text-red-500 transition-colors" style={{ color: i === 4 ? getColor(5).main : undefined }} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className={`text-[11px] font-bold text-right max-w-[60%] truncate ${item.mono ? 'font-mono' : ''} ${item.bold ? 'text-sm font-black' : 'text-slate-700'}`} style={{ color: item.bold ? getColor(5).main : undefined }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button 
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all active:scale-[0.98]"
                  style={{ '--hover-color': getColor(5).main }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = getColor(5).main; e.currentTarget.style.color = getColor(5).main; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                >
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
                  className="flex-[2] py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 text-center">Reference ID</p>
                  <div className="flex flex-col items-center gap-4">
                    <code className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 break-all w-full text-center shadow-sm">
                      {verificationTx.reference || verificationTx.paystackReference || 'N/A'}
                    </code>
                    <button
                      onClick={handleCopyReference}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200 hover:border-red-400'
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
    </UserLayout>
  );
}