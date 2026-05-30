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
  Activity,
  CheckCircle2,
  Eye,
  ShoppingBag,
  Zap,
  ChevronRight,
  Loader2,
  CheckCircle,
  X,
  XCircle,
  Phone
} from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import AgentLayout from '../components/AgentLayout';
import Modal from '../components/Modal';
import { wallet as walletAPI, publicAPI } from '../services/api';
import {
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
    background: linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%);
    border: 1.5px solid #FECACA;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(220,38,38,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
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

  .dash-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .dash-p {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0 0;
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
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
    background: #DC2626;
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
    box-shadow: 0 4px 12px rgba(220,38,38,0.2);
  }

  .dash-btn-primary:hover:not(:disabled) {
    background: #B91C1C;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(220,38,38,0.3);
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
    border-color: #DC2626;
    background: #FFF5F5;
  }

  .dash-input {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 700;
    color: #111;
    transition: all 0.2s;
    outline: none;
  }

  .dash-input:focus {
    border-color: #DC2626;
    box-shadow: 0 0 0 4px rgba(220,38,38,0.05);
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
    color: #000;
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

  .dash-badge {
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

  @media (max-width: 768px) {
    .dash-wrapper { padding: 12px; }
    .dash-header { padding: 16px; }
    .dash-stat-grid { grid-template-columns: 1fr 1fr; }
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

  const stats = [
    { label: 'Current Balance', value: formatCurrencyAbbreviated(user?.balance || 0), color: getColor(1) }, // teal
    { label: 'Total Funded', value: formatCurrencyAbbreviated(user?.totalFunded || 0), color: getColor(0) }, // purple
    { label: 'Total Spent', value: formatCurrencyAbbreviated(user?.totalSpent || 0), color: getColor(2) }, // blue
    { label: 'Bonus Earnings', value: formatCurrencyAbbreviated(user?.referralEarnings || 0), color: getColor(3) }, // amber
  ];

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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
      case 'successful':
      case 'success':
        return 'badge-success';
      case 'pending':
      case 'processing':
        return 'badge-pending';
      case 'failed':
      case 'cancelled':
        return 'badge-failed';
      default:
        return 'badge-info';
    }
  };

  return (
    <AgentLayout>
      <div className="dash-wrapper">
        <style>{styles}</style>
        <div className="dash-content">
          {/* Header */}
          <div className="dash-header">
            <div className="dash-heading-row">
              <div className="dash-icon-box">
                <Wallet size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="dash-h2">My Wallet</h2>
                <p className="dash-p">Manage your funds and view transaction history</p>
              </div>
              <button
                onClick={() => {
                  refreshUser();
                  fetchTransactions(txPage);
                }}
                className="dash-btn-outline"
                style={{ padding: '8px 12px' }}
                title="Refresh Wallet"
              >
                <RefreshCw size={18} className={txLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="dash-stat-grid">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="dash-stat-card"
                style={{
                  '--stat-bg': stat.color.bg,
                  '--stat-border': stat.color.main + '33',
                  '--stat-color': stat.color.main,
                  '--stat-glow': stat.color.glow,
                }}
              >
                <div className="dash-stat-label">{stat.label}</div>
                <div className="dash-stat-value">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Up Section */}
            <div className="dash-card">
              <h3 className="dash-card-title">
                <ArrowUpCircle size={20} style={{ color: '#DC2626' }} />
                Fund Wallet
              </h3>

              {error && (
                <div style={{ background: '#FFF5F5', border: '1.5px solid #FECACA', color: '#DC2626', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {success && (
                <div style={{ background: '#ECFDF5', border: '1.5px solid #D1FAE5', color: '#059669', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#000', textTransform: 'uppercase' }}>Amount to Fund</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#111' }}>GHS</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="dash-input"
                      style={{ width: '100%', paddingLeft: '54px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className="dash-btn-outline"
                      style={{ padding: '8px' }}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                {amount && (
                  <div style={{ background: '#fafaf7', border: '1.5px solid #e4e4de', borderRadius: '12px', padding: '16px' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ fontSize: '13px', color: '#000' }}>Subtotal</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#111' }}>GHS {parsedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ fontSize: '13px', color: '#000' }}>Charges</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#111' }}>GHS {walletFundingCharge.toFixed(2)}</span>
                    </div>
                    <div style={{ height: '1.5px', background: '#e4e4de', margin: '12px 0' }} />
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>Total Payable</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#DC2626' }}>GHS {totalAmountCharged.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTopUp}
                  disabled={loading || !amount}
                  className="dash-btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Initialize Funding'}
                </button>
              </div>
            </div>

            {/* Transactions History */}
            <div className="dash-card">
              <h3 className="dash-card-title">
                <History size={20} style={{ color: '#DC2626' }} />
                Recent Activity
              </h3>

              <div className="dash-table-container">
                {txLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#DC2626' }} />
                    <p style={{ fontSize: '13px', color: '#000' }}>Fetching transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#fafaf7' }}>
                    <Activity size={40} style={{ margin: '0 auto 12px', color: '#e4e4de' }} />
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>No transactions yet</p>
                    <p style={{ fontSize: '12px', color: '#000' }}>Your financial activity will appear here.</p>
                  </div>
                ) : (
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th className="dash-th">Type</th>
                        <th className="dash-th">Amount</th>
                        <th className="dash-th">Status</th>
                        <th className="dash-th text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => {
                        const status = getResolvedTransactionStatus(tx);
                        return (
                          <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                            <td className="dash-td">
                              <div style={{ fontWeight: '700', color: '#111', fontSize: '13px' }}>{typeLabelMap[tx.type] || 'Transaction'}</div>
                              <div style={{ fontSize: '11px', color: '#000' }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="dash-td">
                              <span style={{ fontWeight: '800', color: isCreditTransaction(tx) ? '#059669' : '#DC2626' }}>
                                {isCreditTransaction(tx) ? '+' : ''}{tx.amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="dash-td">
                              <span className={`dash-badge ${getStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                            </td>
                            <td className="dash-td text-right">
                              <button
                                onClick={() => {
                                  setSelectedTx(tx);
                                  setShowTxDetails(true);
                                }}
                                className="dash-btn-outline"
                                style={{ padding: '6px' }}
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {txHasMore && (
                <button
                  onClick={() => setTxPage(prev => prev + 1)}
                  className="dash-btn-outline"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  Load More History
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Details Modal */}
        <Modal
          isOpen={showTxDetails}
          onClose={() => setShowTxDetails(false)}
          title="Transaction Details"
          icon={<Activity size={20} style={{ color: '#DC2626' }} />}
          maxWidth="max-w-md"
        >
          {selectedTx && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#fafaf7', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1.5px solid #e4e4de' }}>
                <p style={{ fontSize: '11px', fontWeight: '800', color: '#000', textTransform: 'uppercase', marginBottom: '4px' }}>Amount</p>
                <p style={{ fontSize: '28px', fontWeight: '900', color: selectedTx.amount > 0 ? '#059669' : '#DC2626' }}>
                  GHS {Math.abs(selectedTx.amount).toFixed(2)}
                </p>
                <div style={{ display: 'inline-flex', marginTop: '8px' }}>
                  <span className={`dash-badge ${getStatusBadgeClass(getResolvedTransactionStatus(selectedTx))}`}>
                    {getResolvedTransactionStatus(selectedTx)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Type</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>{typeLabelMap[selectedTx.type] || 'Transaction'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Date</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
                {selectedTx.description && (
                  <div className="flex justify-between items-start py-2 border-b border-[#f0f0f0]">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Description</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#111', textAlign: 'right', maxWidth: '60%' }}>{selectedTx.description}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Reference</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>#{selectedTx._id?.toUpperCase()}</span>
                </div>
              </div>

              <button
                onClick={() => setShowTxDetails(false)}
                className="dash-btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '12px' }}
              >
                Close Details
              </button>
            </div>
          )}
        </Modal>

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentData={paymentData}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </AgentLayout>
  );
}
