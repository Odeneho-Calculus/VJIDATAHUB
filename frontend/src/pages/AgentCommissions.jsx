import React, { useState, useEffect } from 'react';
import { AlertCircle, Send, TrendingUp, Wallet, CheckCircle, RefreshCw, Landmark, History, PlusCircle, Smartphone, Eye, Clock, Layout } from 'lucide-react';
import { store as storeAPI } from '../services/api';
import { formatCurrency, formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AgentLayout from '../components/AgentLayout';
import Pagination from '../components/Pagination';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .comm-wrapper { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .comm-container { background-color: #f5f5f0; min-height: 100vh; }
  .comm-content { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
  .comm-header { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); margin-bottom: 24px; }
  .comm-title { font-size: 26px; font-weight: 800; color: #111; margin: 0; }
  .comm-subtitle { font-size: 14px; color: #666; margin: 8px 0 0 0; }
  .comm-error { background-color: #fff5f5; border: 1.5px solid #fecaca; border-radius: 7px; color: #b91c1c; padding: 14px 16px; font-size: 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .comm-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .comm-stat-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 20px; transition: all 0.2s ease; }
  .comm-stat-card:hover { border-color: #d4d4ce; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
  .comm-stat-icon { width: 36px; height: 36px; background-color: rgba(240,165,0,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #f0a500; margin-bottom: 12px; }
  .comm-stat-label { font-size: 11px; color: #999; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
  .comm-stat-value { font-size: 24px; font-weight: 800; color: #111; }
  .comm-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 0; box-shadow: 0 8px 40px rgba(0,0,0,0.10); margin-bottom: 24px; overflow: hidden; }
  .comm-card-header { padding: 20px; border-bottom: 1.5px solid #e4e4de; display: flex; align-items: center; justify-content: space-between; background-color: #fafaf7; }
  .comm-card-title { font-size: 16px; font-weight: 700; color: #111; margin: 0; display: flex; align-items: center; gap: 8px; }
  .comm-table { width: 100%; border-collapse: collapse; }
  .comm-table th { text-align: left; padding: 12px 20px; font-size: 13px; font-weight: 700; color: #333; background-color: #fafaf7; border-bottom: 1.5px solid #e4e4de; }
  .comm-table td { padding: 12px 20px; border-bottom: 1px solid #eee; font-size: 14px; color: #111; }
  .comm-table tbody tr:hover { background-color: #f9f9f7; }
  .comm-btn-primary { background-color: #111; color: #fff; border: none; border-radius: 7px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; }
  .comm-btn-primary:hover { background-color: #333; transform: translateY(-1px); }
  .comm-btn-primary:disabled { background-color: #ccc; cursor: not-allowed; transform: none; }
  .comm-badge { display: inline-flex; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: capitalize; }
  .comm-badge-pending { background-color: #fef3c7; color: #92400e; }
  .comm-badge-paid { background-color: #dcfce7; color: #166534; }
  .comm-badge-rejected { background-color: #fee2e2; color: #991b1b; }
  .comm-badge-processing { background-color: #dbeafe; color: #1e40af; }
  .comm-modal-overlay { position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
  .comm-modal { background-color: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); max-width: 500px; width: 100%; padding: 24px; max-height: 90vh; overflow-y: auto; border: 1.5px solid #e4e4de; position: relative; }
  .comm-modal-title { font-size: 20px; font-weight: 800; color: #111; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; }
  .comm-form-label { display: block; font-size: 12px; font-weight: 700; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
  .comm-form-input { width: 100%; padding: 12px 14px; border: 1.5px solid #e4e4de; border-radius: 8px; font-size: 14px; font-weight: 500; color: #111; transition: all 0.2s ease; background-color: #fafaf7; }
  .comm-form-input:focus { outline: none; border-color: #111; background-color: #fff; }
  .comm-form-select { width: 100%; padding: 12px 14px; border: 1.5px solid #e4e4de; border-radius: 8px; font-size: 14px; font-weight: 500; color: #111; transition: all 0.2s ease; background-color: #fafaf7; appearance: none; }
  .comm-form-select:focus { outline: none; border-color: #111; background-color: #fff; }
  @media (max-width: 768px) { .comm-content { padding: 16px 12px; } .comm-stat-grid { grid-template-columns: repeat(2, 1fr); } }
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
      payoutValidationMessage = 'Net withdrawal amount is too small after fees. Increase the requested amount.';
    }
  }

  const isPayoutInvalid = requestedAmount <= 0 || Boolean(payoutValidationMessage);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchData = async () => {
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
  };

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

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading commissions...</p>
          </div>
        </div>
      </AgentLayout>
    );
  }

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <AgentLayout>
      <div className="comm-wrapper comm-container">
        <style>{styles}</style>
        <div className="comm-content">
          {/* Header */}
          <div className="comm-header">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="comm-title">Your Earnings</h1>
                <p className="comm-subtitle">Manage your commissions and payout requests</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-700">
                  <Clock size={16} className="text-slate-500" />
                  {todayLabel}
                </div>
                <button
                  onClick={fetchData}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
                  title="Refresh"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="comm-error">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="comm-stat-grid">
            {[
              { label: 'Total Earnings', value: (commissionSummary?.totalEarned || 0), icon: TrendingUp, color: '#f0a500' },
              { label: 'Withdrawable', value: (commissionSummary?.availableForWithdrawal || 0), icon: Wallet, color: '#10b981' },
              { label: 'Pending Payout', value: (commissionSummary?.pendingWithdrawal || 0), icon: Send, color: '#f59e0b' },
              { label: 'Total Paid', value: (commissionSummary?.totalWithdrawn || 0), icon: CheckCircle, color: '#8b5cf6' }
            ].map((stat, i) => (
              <div key={i} className="comm-stat-card">
                <div className="comm-stat-icon" style={{ backgroundColor: `${stat.color}26`, color: stat.color }}>
                  <stat.icon size={18} />
                </div>
                <p className="comm-stat-label">{stat.label}</p>
                <div className="comm-stat-value">{formatCurrencyAbbreviated(stat.value)}</div>
              </div>
            ))}
          </div>

          {/* History Card */}
          <div className="comm-card">
            <div className="comm-card-header">
              <h3 className="comm-card-title">
                <History size={18} />
                Withdrawal History
              </h3>
              <button
                onClick={() => setShowPayoutForm(true)}
                disabled={commissionSummary?.availableForWithdrawal <= 0}
                className="comm-btn-primary"
              >
                <PlusCircle size={16} />
                New Withdrawal
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="comm-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th className="text-right">Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout._id}>
                      <td>
                        <div className="font-bold">{formatCurrency(payout.amount)}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Net: {formatCurrency(payout.netAmount)}</div>
                      </td>
                      <td className="capitalize">
                        {payout.method === 'mobile_money' ? 'Momo' : 'Bank'}
                      </td>
                      <td>
                        <span className={`comm-badge comm-badge-${payout.status}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="text-right text-slate-600 font-medium">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowPayoutDetails(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-20 text-slate-500 italic">
                        No withdrawal records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!loading && totalPages > 1 && (
              <div className="p-6 bg-slate-50 border-t border-slate-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>

        {/* New Withdrawal Modal */}
        {showPayoutForm && (
          <div className="comm-modal-overlay">
            <div className="comm-modal animate-in fade-in zoom-in-95 duration-200">
              <div className="comm-modal-title">
                <Send size={22} />
                Withdraw Earnings
              </div>
              <form onSubmit={handleSubmitPayout} className="space-y-5">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="comm-form-label mb-1">Available to Withdraw</p>
                  <p className="text-2xl font-extrabold text-slate-900">{formatCurrencyAbbreviated(commissionSummary?.availableForWithdrawal || 0)}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="comm-form-label">Amount (GHS)</label>
                    <input
                      type="number"
                      value={payoutFormData.amount}
                      onChange={(e) => setPayoutFormData({ ...payoutFormData, amount: e.target.value })}
                      className="comm-form-input w-full"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                    {payoutValidationMessage && (
                      <p className="text-[11px] text-red-600 mt-1 font-bold">{payoutValidationMessage}</p>
                    )}
                  </div>

                  <div>
                    <label className="comm-form-label">Method</label>
                    <div className="relative">
                      <select
                        value={payoutFormData.method}
                        onChange={(e) => setPayoutFormData({ ...payoutFormData, method: e.target.value })}
                        className="comm-form-select w-full"
                      >
                        <option value="bank">Bank Transfer</option>
                        <option value="mobile_money">Mobile Money</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        {payoutFormData.method === 'bank' ? <Landmark size={16} /> : <Smartphone size={16} />}
                      </div>
                    </div>
                  </div>

                  {payoutFormData.method === 'bank' ? (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="col-span-2">
                        <label className="comm-form-label">Account Name</label>
                        <input
                          type="text"
                          value={payoutFormData.details.accountName}
                          onChange={(e) => setPayoutFormData({
                            ...payoutFormData,
                            details: { ...payoutFormData.details, accountName: e.target.value }
                          })}
                          className="comm-form-input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="comm-form-label">Account Number</label>
                        <input
                          type="text"
                          value={payoutFormData.details.accountNumber}
                          onChange={(e) => setPayoutFormData({
                            ...payoutFormData,
                            details: { ...payoutFormData.details, accountNumber: e.target.value }
                          })}
                          className="comm-form-input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="comm-form-label">Bank Code</label>
                        <input
                          type="text"
                          value={payoutFormData.details.bankCode}
                          onChange={(e) => setPayoutFormData({
                            ...payoutFormData,
                            details: { ...payoutFormData.details, bankCode: e.target.value }
                          })}
                          className="comm-form-input w-full"
                          placeholder="e.g., 033"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="col-span-2">
                        <label className="comm-form-label">Account Name</label>
                        <input
                          type="text"
                          value={payoutFormData.details.accountName}
                          onChange={(e) => setPayoutFormData({
                            ...payoutFormData,
                            details: { ...payoutFormData.details, accountName: e.target.value }
                          })}
                          className="comm-form-input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="comm-form-label">Phone Number</label>
                        <input
                          type="text"
                          value={payoutFormData.details.phone}
                          onChange={(e) => setPayoutFormData({
                            ...payoutFormData,
                            details: { ...payoutFormData.details, phone: e.target.value }
                          })}
                          className="comm-form-input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="comm-form-label">Network</label>
                        <select
                          value={payoutFormData.details.network}
                          onChange={(e) => setPayoutFormData({
                            ...payoutFormData,
                            details: { ...payoutFormData.details, network: e.target.value }
                          })}
                          className="comm-form-select w-full"
                        >
                          <option value="MTN">MTN</option>
                          <option value="Vodafone">Telecel (Vodafone)</option>
                          <option value="AirtelTigo">AirtelTigo</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPayoutForm(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutSubmitting || isPayoutInvalid}
                    className="comm-btn-primary flex-1 justify-center"
                  >
                    {payoutSubmitting ? 'Processing...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payout Details Modal */}
        {showPayoutDetails && selectedPayout && (
          <div className="comm-modal-overlay">
            <div className="comm-modal animate-in fade-in zoom-in-95 duration-200">
              <div className="comm-modal-title">
                <Layout size={22} />
                Payout Details
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="comm-form-label">Amount</p>
                    <p className="text-lg font-extrabold text-slate-900">{formatCurrency(selectedPayout.amount)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="comm-form-label">Net Amount</p>
                    <p className="text-lg font-extrabold text-slate-900 text-green-700">{formatCurrency(selectedPayout.netAmount)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="comm-form-label">Status</p>
                    <span className={`comm-badge comm-badge-${selectedPayout.status} px-4 py-1.5 text-sm`}>
                      {selectedPayout.status}
                    </span>
                  </div>

                  <div>
                    <p className="comm-form-label">Payment Method</p>
                    <p className="font-bold text-slate-900 capitalize">{selectedPayout.method.replace('_', ' ')}</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <p className="comm-form-label border-b border-slate-200 pb-2">Destination Account</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500 font-medium">Name</p>
                        <p className="font-bold">{selectedPayout.details?.accountName || 'N/A'}</p>
                      </div>
                      {selectedPayout.method === 'bank' ? (
                        <>
                          <div>
                            <p className="text-slate-500 font-medium">Account #</p>
                            <p className="font-bold">{selectedPayout.details?.accountNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium">Bank Code</p>
                            <p className="font-bold">{selectedPayout.details?.bankCode || 'N/A'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-slate-500 font-medium">Phone</p>
                            <p className="font-bold">{selectedPayout.details?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-medium">Network</p>
                            <p className="font-bold">{selectedPayout.details?.network || 'N/A'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedPayout.adminNote && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="comm-form-label text-blue-700">Admin Note</p>
                      <p className="text-sm font-medium text-blue-900 mt-1">{selectedPayout.adminNote}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setShowPayoutDetails(false);
                      setSelectedPayout(null);
                    }}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AgentLayout>
  );
}
