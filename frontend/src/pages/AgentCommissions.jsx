import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Send, TrendingUp, Wallet, CheckCircle, Layout, RefreshCw, Landmark, History, PlusCircle, Smartphone, Eye } from 'lucide-react';
import { store as storeAPI } from '../services/api';
import { formatCurrency, formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AgentLayout from '../components/AgentLayout';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';


export default function AgentCommissions() {
  const navigate = useNavigate();
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayouts, setTotalPayouts] = useState(0);
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
      setTotalPayouts(payoutsData.pagination?.total || 0);
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Top Header - Glassmorphism */}
        <div className="sticky top-0 z-20 app-pro-header px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary-600 mb-1">
                <Layout size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Earnings Summary</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Your Earnings
                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                  Latest Update
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100 bg-white shadow-sm"
                title="Refresh Earnings"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-in fade-in zoom-in-95">
              <AlertCircle size={20} />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          )}

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Earnings', value: (commissionSummary?.totalEarned || 0), icon: TrendingUp, color: 'blue' },
              { label: 'Withdrawable', value: (commissionSummary?.availableForWithdrawal || 0), icon: Wallet, color: 'emerald' },
              { label: 'Pending Withdrawal', value: (commissionSummary?.pendingWithdrawal || 0), icon: Send, color: 'amber' },
              { label: 'Already Paid', value: (commissionSummary?.totalWithdrawn || 0), icon: CheckCircle, color: 'purple' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="text-xl font-black text-slate-900 tracking-tight">{formatCurrencyAbbreviated(stat.value)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Withdrawal History Section */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                      <History size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-[9px] tracking-widest text-slate-500 uppercase leading-none mb-1">Payout Records</h3>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">Withdrawal History</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPayoutForm(true)}
                    disabled={commissionSummary?.availableForWithdrawal <= 0}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200 transition-all active:scale-[0.98]"
                  >
                    <PlusCircle size={14} />
                    New Withdrawal
                  </button>
                </div>

                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-4 px-6 font-bold text-[10px] uppercase text-slate-500 tracking-wider whitespace-nowrap">Amount</th>
                        <th className="py-4 px-4 font-bold text-[10px] uppercase text-slate-500 tracking-wider whitespace-nowrap">Method</th>
                        <th className="py-4 px-4 font-bold text-[10px] uppercase text-slate-500 tracking-wider whitespace-nowrap">Status</th>
                        <th className="py-4 px-4 text-right font-bold text-[10px] uppercase text-slate-500 tracking-wider whitespace-nowrap">Date</th>
                        <th className="py-4 px-6 text-right font-bold text-[10px] uppercase text-slate-500 tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payouts.map(payout => (
                        <tr key={payout._id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap">
                            <p className="font-black text-slate-900 text-sm">{formatCurrency(payout.amount)}</p>
                            <p className="text-[9px] text-slate-500 font-bold">Net: {formatCurrency(payout.netAmount)}</p>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                              {payout.method === 'mobile_money' ? 'Momo' : 'Bank'}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                              payout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                payout.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                              }`}>
                              {payout.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-600">
                              {new Date(payout.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedPayout(payout);
                                setShowPayoutDetails(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {payouts.length === 0 && (
                    <div className="text-center py-20 bg-slate-50/30">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 border border-slate-100">
                        <History size={24} />
                      </div>
                      <p className="text-slate-600 font-bold">No withdrawal records found.</p>
                    </div>
                  )}
                </div>

                {/* Pagination Container */}
                {!loading && totalPages > 1 && (
                  <div className="p-8 bg-slate-50/30 border-t border-slate-100">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Withdrawal Modal */}
      <Modal
        isOpen={showPayoutForm}
        onClose={() => setShowPayoutForm(false)}
        title="Withdraw Earnings"
        icon={<Send size={20} className="text-primary-600" />}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitPayout} className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border border-primary-100/50 shadow-sm">
              <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Available to Withdraw</p>
              <p className="text-2xl font-black text-primary-900 leading-none">{formatCurrencyAbbreviated(commissionSummary?.availableForWithdrawal || 0)}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Amount (GH₵)
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600 group-focus-within:text-primary-600 transition-colors">GH₵</span>
                  <input
                    type="number"
                    value={payoutFormData.amount}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, amount: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all text-sm font-bold"
                    placeholder="0.00"
                    step="0.01"
                    min={commissionSummary?.minWithdrawal}
                    max={commissionSummary?.availableForWithdrawal}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Method
                </label>
                <div className="relative">
                  <select
                    value={payoutFormData.method}
                    onChange={(e) => setPayoutFormData({ ...payoutFormData, method: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                    {payoutFormData.method === 'bank' ? <Landmark size={16} className="text-slate-600" /> : <Smartphone size={16} className="text-slate-600" />}
                  </div>
                </div>
              </div>
            </div>

            {payoutFormData.method === 'bank' && (
              <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="col-span-full">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Account Name</label>
                    <input
                      type="text"
                      value={payoutFormData.details.accountName}
                      onChange={(e) => setPayoutFormData({
                        ...payoutFormData,
                        details: { ...payoutFormData.details, accountName: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300"
                      placeholder="Account Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1">Account Number</label>
                    <input
                      type="text"
                      value={payoutFormData.details.accountNumber}
                      onChange={(e) => setPayoutFormData({
                        ...payoutFormData,
                        details: { ...payoutFormData.details, accountNumber: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300"
                      placeholder="Account Number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1">Bank Code</label>
                    <input
                      type="text"
                      value={payoutFormData.details.bankCode}
                      onChange={(e) => setPayoutFormData({
                        ...payoutFormData,
                        details: { ...payoutFormData.details, bankCode: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300"
                      placeholder="Bank Code (e.g., 033)"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {payoutFormData.method === 'mobile_money' && (
              <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="col-span-full">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Account Name</label>
                    <input
                      type="text"
                      value={payoutFormData.details.accountName}
                      onChange={(e) => setPayoutFormData({
                        ...payoutFormData,
                        details: { ...payoutFormData.details, accountName: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300"
                      placeholder="Name on Mobile Money Account"
                      required
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
                    <input
                      type="text"
                      value={payoutFormData.details.phone}
                      onChange={(e) => setPayoutFormData({
                        ...payoutFormData,
                        details: { ...payoutFormData.details, phone: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300"
                      placeholder="024XXXXXXX"
                      required
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 ml-1">Network</label>
                    <select
                      value={payoutFormData.details.network}
                      onChange={(e) => setPayoutFormData({
                        ...payoutFormData,
                        details: { ...payoutFormData.details, network: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                      required
                    >
                      <option value="MTN">MTN</option>
                      <option value="Telecel">Telecel</option>
                      <option value="AirtelTigo">AirtelTigo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {payoutFormData.amount && parseFloat(payoutFormData.amount) > 0 && (
              <div className="p-4 bg-primary-50/30 rounded-2xl border border-dashed border-primary-200/50 text-[11px]">
                <div className="flex justify-between text-slate-600 font-bold mb-1">
                  <span className="uppercase tracking-tight">Requested Amount</span>
                  <span>{formatCurrency(requestedAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-500 font-bold mb-2">
                  <span className="uppercase tracking-tight">Fee ({commissionSummary?.withdrawalFeeType === 'fixed' ? 'Fixed' : commissionSummary?.withdrawalFeeValue + '%'})</span>
                  <span>- {formatCurrency(feeAmount)}</span>
                </div>
                <div className="pt-2 border-t border-primary-100 flex justify-between font-black text-slate-900 text-sm">
                  <span className="uppercase tracking-widest text-[10px]">Net Amount</span>
                  <span>{formatCurrency(netAmount)}</span>
                </div>
                {payoutValidationMessage && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                    {payoutValidationMessage}
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
                LIMIT: {formatCurrencyAbbreviated(commissionSummary?.minWithdrawal)} - {formatCurrencyAbbreviated(commissionSummary?.maxWithdrawal)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isPayoutInvalid || payoutSubmitting}
              className="flex-[2] px-6 py-3.5 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 transition shadow-lg shadow-primary-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              {payoutSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={() => setShowPayoutForm(false)}
              className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Payout Details Modal */}
      <Modal
        isOpen={showPayoutDetails}
        onClose={() => setShowPayoutDetails(false)}
        title="Withdrawal Details"
        icon={<History size={20} className="text-primary-600" />}
        maxWidth="max-w-lg"
      >
        {selectedPayout && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ID</p>
                <p className="font-mono text-sm font-bold text-slate-900 uppercase">#{selectedPayout._id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedPayout.status === 'paid' ? 'bg-green-100 text-green-700' :
                  selectedPayout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    selectedPayout.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                  }`}>
                  {selectedPayout.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested Amount</p>
                <p className="text-xl font-black text-slate-900">{formatCurrency(selectedPayout.amount)}</p>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Settlement Net</p>
                <p className="text-xl font-black text-emerald-700">{formatCurrency(selectedPayout.netAmount)}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Destination</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Method</span>
                  <span className="text-slate-900 font-bold uppercase">{selectedPayout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}</span>
                </div>
                {selectedPayout.details && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Account Name</span>
                      <span className="text-slate-900 font-bold">{selectedPayout.details.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Account Number</span>
                      <span className="text-slate-900 font-mono font-bold tracking-tight">{selectedPayout.details.accountNumber}</span>
                    </div>
                    {selectedPayout.details.bankName && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-bold uppercase text-[10px]">Bank</span>
                        <span className="text-slate-900 font-bold">{selectedPayout.details.bankName}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center px-2 py-2 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested On</span>
              <span className="text-xs font-bold text-slate-900">{new Date(selectedPayout.createdAt).toLocaleString()}</span>
            </div>

            <button
              onClick={() => setShowPayoutDetails(false)}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </AgentLayout>
  );
}

