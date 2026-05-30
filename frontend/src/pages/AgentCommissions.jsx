import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Send, TrendingUp, Wallet, CheckCircle, RefreshCw, Landmark, History, PlusCircle, Smartphone, Eye, Clock, Layout, X, ArrowUpRight, ArrowDownLeft, Activity, Info, Loader2 } from 'lucide-react';
import { store as storeAPI } from '../services/api';
import { formatCurrency, formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AgentLayout from '../components/AgentLayout';
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

  .vtu-page-container {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background-color: #ffffff;
    padding: 24px 16px;
    color: #1a1a1a;
  }

  .vtu-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .vtu-heading-section {
    background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
    border: 1.5px solid #BAE6FD;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(3,105,161,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .vtu-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .vtu-icon-box {
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

  .vtu-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .vtu-p {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0 0;
  }

  .vtu-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .vtu-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .vtu-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .vtu-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .vtu-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .vtu-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .vtu-main-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .vtu-btn-primary {
    background: #0369A1;
    color: #fff;
    padding: 10px 20px;
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
    box-shadow: 0 4px 12px rgba(3,105,161,0.2);
  }

  .vtu-btn-primary:hover:not(:disabled) {
    background: #075985;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(3,105,161,0.3);
  }

  .vtu-btn-outline {
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

  .vtu-btn-outline:hover {
    border-color: #0369A1;
    background: #F0F9FF;
  }

  .vtu-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 14px;
    border: 1.5px solid #e4e4de;
    background: #fff;
  }

  .vtu-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .vtu-th {
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

  .vtu-td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #111;
  }

  .vtu-badge {
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
    .vtu-page-container { padding: 12px; }
    .vtu-heading-section { padding: 16px; }
    .vtu-stat-grid { grid-template-columns: 1fr 1fr; }
  }

  .comm-form-input { 
    width: 100%; 
    padding: 12px 14px; 
    border: 1.5px solid #e4e4de; 
    border-radius: 8px; 
    font-size: 14px; 
    font-weight: 700; 
    color: #111; 
    transition: all 0.2s ease; 
    background-color: #fff; 
    outline: none;
  }
  .comm-form-input:focus { border-color: #0369A1; box-shadow: 0 0 0 4px rgba(3,105,161,0.05); }

  .comm-form-select { 
    width: 100%; 
    padding: 12px 14px; 
    border: 1.5px solid #e4e4de; 
    border-radius: 8px; 
    font-size: 14px; 
    font-weight: 700; 
    color: #111; 
    transition: all 0.2s ease; 
    background-color: #fff; 
    appearance: none;
    outline: none;
  }
  .comm-form-select:focus { border-color: #0369A1; }
`;

export default function AgentCommissions() {
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState({
    amount: '',
    method: 'bank',
    details: {
      accountNumber: '',
      bankCode: '',
      accountName: '',
      phone: '',
      network: 'MTN',
    },
  });

  const requestedAmount = parseFloat(payoutFormData.amount) || 0;
  const feeAmount = commissionSummary?.withdrawalFeeType === 'fixed'
    ? Number(commissionSummary?.withdrawalFeeValue || 0)
    : (requestedAmount * Number(commissionSummary?.withdrawalFeeValue || 0)) / 100;
  const netAmount = requestedAmount - feeAmount;
  const minWithdrawal = Number(commissionSummary?.minWithdrawal || 0);
  const maxWithdrawal = Number(commissionSummary?.maxWithdrawal || 0);
  const availableWithdrawal = Number(commissionSummary?.availableForWithdrawal || 0);

  let payoutValidationMessage = '';
  if (requestedAmount > 0) {
    if (requestedAmount < minWithdrawal) {
      payoutValidationMessage = `Minimum withdrawal is ${formatCurrency(minWithdrawal)}.`;
    } else if (maxWithdrawal > 0 && requestedAmount > maxWithdrawal) {
      payoutValidationMessage = `Maximum withdrawal is ${formatCurrency(maxWithdrawal)}.`;
    } else if (requestedAmount > availableWithdrawal) {
      payoutValidationMessage = `Available balance is ${formatCurrency(availableWithdrawal)}.`;
    } else if (netAmount <= 0) {
      payoutValidationMessage = 'Net withdrawal amount is too small after fees.';
    }
  }

  const isPayoutInvalid = requestedAmount <= 0 || !!payoutValidationMessage;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryData, payoutsData] = await Promise.all([
        storeAPI.getCommissionSummary(),
        storeAPI.getPayouts(currentPage, 20),
      ]);
      setCommissionSummary(summaryData.summary);
      setPayouts(payoutsData.payouts || []);
      setTotalPages(payoutsData.pagination?.pages || 1);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitPayout = async (e) => {
    e.preventDefault();
    if (!payoutFormData.amount || parseFloat(payoutFormData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (payoutValidationMessage) {
      setError(payoutValidationMessage);
      return;
    }
    try {
      setPayoutSubmitting(true);
      await storeAPI.createPayout({
        amount: parseFloat(payoutFormData.amount),
        method: payoutFormData.method,
        details: payoutFormData.details,
      });
      setShowPayoutForm(false);
      setPayoutFormData({
        amount: '',
        method: 'bank',
        details: { accountNumber: '', bankCode: '', accountName: '', phone: '', network: 'MTN' },
      });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create payout request');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const stats = [
    { label: 'Total Earned', value: formatCurrencyAbbreviated(commissionSummary?.totalEarned || 0), color: getColor(1) }, // teal
    { label: 'Available', value: formatCurrencyAbbreviated(commissionSummary?.availableForWithdrawal || 0), color: getColor(7) }, // lime
    { label: 'Pending Payout', value: formatCurrencyAbbreviated(commissionSummary?.pendingWithdrawal || 0), color: getColor(3) }, // amber
    { label: 'Total Paid', value: formatCurrencyAbbreviated(commissionSummary?.totalWithdrawn || 0), color: getColor(0) }, // purple
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'pending': return 'badge-pending';
      case 'rejected': return 'badge-failed';
      case 'processing': return 'badge-info';
      default: return 'badge-info';
    }
  };

  if (loading && !commissionSummary) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 size={40} className="animate-spin text-[#0369A1]" />
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="vtu-page-container">
        <style>{styles}</style>
        <div className="vtu-content">
          {/* Header */}
          <div className="vtu-heading-section">
            <div className="vtu-heading-row">
              <div className="vtu-icon-box">
                <TrendingUp size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="vtu-h2">Store Earnings</h2>
                <p className="vtu-p">Manage your commissions and payout requests</p>
              </div>
              <button
                onClick={fetchData}
                className="vtu-btn-outline"
                style={{ padding: '8px 12px' }}
                title="Refresh"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="vtu-main-card" style={{ borderColor: '#fecaca', background: '#fff5f5', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
              <AlertCircle size={20} />
              <span style={{ flex: 1 }}>{error}</span>
              <X size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
            </div>
          )}

          {/* Stats Grid */}
          <div className="vtu-stat-grid">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="vtu-stat-card"
                style={{
                  '--stat-bg': stat.color.bg,
                  '--stat-border': stat.color.main + '33',
                  '--stat-color': stat.color.main,
                  '--stat-glow': stat.color.glow,
                }}
              >
                <div className="vtu-stat-label">{stat.label}</div>
                <div className="vtu-stat-value">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* History Card */}
          <div className="vtu-main-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1.5px solid #e4e4de', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafaf7' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} style={{ color: '#0369A1' }} />
                Withdrawal History
              </h3>
              <button
                onClick={() => setShowPayoutForm(true)}
                disabled={commissionSummary?.availableForWithdrawal <= 0}
                className="vtu-btn-primary"
              >
                <PlusCircle size={16} />
                New Withdrawal
              </button>
            </div>

            <div className="vtu-table-container" style={{ border: 'none' }}>
              <table className="vtu-table">
                <thead>
                  <tr>
                    <th className="vtu-th">Amount</th>
                    <th className="vtu-th">Method</th>
                    <th className="vtu-th">Status</th>
                    <th className="vtu-th">Date</th>
                    <th className="vtu-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout._id} className="hover:bg-slate-50 transition-colors">
                      <td className="vtu-td">
                        <div style={{ fontWeight: '800', color: '#111' }}>{formatCurrency(payout.amount)}</div>
                        <div style={{ fontSize: '11px', color: '#000' }}>Net: {formatCurrency(payout.netAmount)}</div>
                      </td>
                      <td className="vtu-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {payout.method === 'mobile_money' ? <Smartphone size={14} style={{ color: '#000' }} /> : <Landmark size={14} style={{ color: '#000' }} />}
                          <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>{payout.method === 'mobile_money' ? 'Momo' : 'Bank'}</span>
                        </div>
                      </td>
                      <td className="vtu-td">
                        <span className={`vtu-badge ${getStatusBadge(payout.status)}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="vtu-td" style={{ color: '#000', fontWeight: '600' }}>
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="vtu-td text-right">
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowPayoutDetails(true);
                          }}
                          className="vtu-btn-outline"
                          style={{ padding: '8px' }}
                        >
                          <Eye size={16} style={{ color: '#000' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '100px', background: '#fafaf7' }}>
                        <History size={48} style={{ margin: '0 auto 16px', color: '#e4e4de' }} />
                        <p style={{ fontSize: '16px', fontWeight: '800', color: '#111' }}>No withdrawal records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!loading && totalPages > 1 && (
              <div style={{ padding: '16px', borderTop: '1.5px solid #f0f0f0', background: '#fafaf7' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal Modal */}
        {showPayoutForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifycenter: 'center', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '500px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: '1.5px solid #e4e4de', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', itemsCenter: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Send size={24} style={{ color: '#0369A1' }} />
                  Withdraw Earnings
                </h3>
                <button onClick={() => setShowPayoutForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '4px' }}>Available to Withdraw</p>
                <p style={{ fontSize: '24px', fontWeight: '900', color: '#111' }}>{formatCurrencyAbbreviated(commissionSummary?.availableForWithdrawal || 0)}</p>
              </div>

              <form onSubmit={handleSubmitPayout} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label className="vtu-stat-label" style={{ marginBottom: '8px', display: 'block' }}>Withdrawal Amount (GHS)</label>
                  <input
                    type="number"
                    className="comm-form-input"
                    value={payoutFormData.amount}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                  {payoutValidationMessage && <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '6px', fontWeight: '700' }}>{payoutValidationMessage}</p>}
                </div>

                <div>
                  <label className="vtu-stat-label" style={{ marginBottom: '8px', display: 'block' }}>Payout Method</label>
                  <select
                    className="comm-form-select"
                    value={payoutFormData.method}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, method: e.target.value })}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>

                {payoutFormData.method === 'bank' ? (
                  <>
                    <div>
                      <label className="vtu-stat-label" style={{ marginBottom: '8px', display: 'block' }}>Bank Name</label>
                      <select
                        className="comm-form-select"
                        value={payoutFormData.details.bankCode}
                        onChange={(e) => setPayoutFormData({ ...payoutFormData, details: { ...payoutFormData.details, bankCode: e.target.value } })}
                      >
                        <option value="">Select Bank</option>
                        {commissionSummary?.availableBanks?.map(bank => (
                          <option key={bank.code} value={bank.code}>{bank.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="vtu-stat-label" style={{ marginBottom: '8px', display: 'block' }}>Account Number</label>
                      <input
                        type="text"
                        className="comm-form-input"
                        value={payoutFormData.details.accountNumber}
                        onChange={(e) => setPayoutFormData({ ...payoutFormData, details: { ...payoutFormData.details, accountNumber: e.target.value } })}
                        placeholder="10-digit account number"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="vtu-stat-label" style={{ marginBottom: '8px', display: 'block' }}>Network</label>
                      <select
                        className="comm-form-select"
                        value={payoutFormData.details.network}
                        onChange={(e) => setPayoutFormData({ ...payoutFormData, details: { ...payoutFormData.details, network: e.target.value } })}
                      >
                        <option value="MTN">MTN</option>
                        <option value="Vodafone">Telecel (Vodafone)</option>
                        <option value="AirtelTigo">AT (AirtelTigo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="vtu-stat-label" style={{ marginBottom: '8px', display: 'block' }}>Phone Number</label>
                      <input
                        type="text"
                        className="comm-form-input"
                        value={payoutFormData.details.phone}
                        onChange={(e) => setPayoutFormData({ ...payoutFormData, details: { ...payoutFormData.details, phone: e.target.value } })}
                        placeholder="Momo phone number"
                      />
                    </div>
                  </>
                )}

                {requestedAmount > 0 && !payoutValidationMessage && (
                  <div style={{ background: '#fafaf7', borderRadius: '12px', padding: '16px', border: '1.5px solid #e4e4de' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span style={{ fontSize: '13px', color: '#000', fontWeight: '600' }}>Withdrawal Fee</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>GHS {feeAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ height: '1px', background: '#e4e4de', margin: '8px 0' }} />
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>Net Payout</span>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#0369A1' }}>GHS {netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPayoutInvalid || payoutSubmitting}
                  className="vtu-btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                >
                  {payoutSubmitting ? <RefreshCw className="animate-spin" size={20} /> : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showPayoutDetails && selectedPayout && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifycenter: 'center', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: '1.5px solid #e4e4de' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', display: 'flex', itemsCenter: 'center', justifyContent: 'space-between', background: '#fafaf7' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', margin: 0, display: 'flex', itemsCenter: 'center', gap: '8px' }}>
                  <Activity size={20} style={{ color: '#0369A1' }} />
                  Payout Details
                </h3>
                <button onClick={() => setShowPayoutDetails(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#000', textTransform: 'uppercase', marginBottom: '4px' }}>Requested Amount</p>
                  <p style={{ fontSize: '32px', fontWeight: '900', color: '#111', margin: 0 }}>GHS {selectedPayout.amount.toFixed(2)}</p>
                  <div style={{ display: 'inline-flex', marginTop: '12px' }}>
                    <span className={`vtu-badge ${getStatusBadge(selectedPayout.status)}`}>{selectedPayout.status}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Method</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#111', textTransform: 'capitalize' }}>{selectedPayout.method?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Net Payout</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#0369A1' }}>GHS {selectedPayout.netAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Date</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>{new Date(selectedPayout.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0]">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#000' }}>Reference</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>#{selectedPayout._id?.toUpperCase()}</span>
                  </div>
                  
                  {selectedPayout.adminNote && (
                    <div style={{ marginTop: '8px', padding: '12px', background: '#FFFBEB', border: '1.5px solid #FEF3C7', borderRadius: '10px' }}>
                      <p style={{ fontSize: '10px', fontWeight: '800', color: '#B45309', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={12} /> Admin Note
                      </p>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#111', margin: 0 }}>{selectedPayout.adminNote}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowPayoutDetails(false)}
                  className="vtu-btn-primary"
                  style={{ width: '100%', marginTop: '32px', padding: '14px' }}
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
