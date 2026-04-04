import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { CreditCard, Loader, Clock, Wallet, ArrowUpRight, ArrowDownLeft, RotateCw, AlertCircle, CheckCircle2, ArrowLeft, Zap, ReceiptText, Smartphone } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
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

  useEffect(() => {
    checkStatus();
  }, []);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    await checkStatus();
    setIsRefreshing(false);
  };

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  const handleTopUp = async () => {
    if (!amount || amount <= 0) {
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
      const result = await wallet.initializePayment({ amount: parseFloat(amount) });

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
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col">
          {/* Sticky Header */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 pb-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <Wallet size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wallet Top-up</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Fund Account • Secure Gateway
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-slate-600 hover:text-blue-600 group active:scale-95"
                  >
                    <RotateCw size={20} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Status Messages */}
            {businessStatus && !businessStatus.isOpen && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 animate-in fade-in slide-in-from-top-4">
                <Clock size={20} />
                <p className="text-sm font-bold">{businessStatus.message || 'Business is currently closed.'}</p>
              </div>
            )}

            {error && (
              <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in fade-in slide-in-from-top-4">
                <CheckCircle2 size={20} />
                <p className="text-sm font-bold">{success}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Balance & Quick Select */}
              <div className="md:col-span-5 space-y-6">
                <div className="group bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Zap size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Balance</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrencyAbbreviated(user?.balance) || '0'}</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Smartphone size={20} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Quick Select</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {quickAmounts.map(amt => (
                      <button
                        key={amt}
                        onClick={() => {
                          setAmount(amt.toString());
                          setError(null);
                        }}
                        disabled={loading || (businessStatus && !businessStatus.isOpen)}
                        className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${amount === amt.toString()
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 ring-2 ring-blue-600 ring-offset-2'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 active:scale-95 border border-slate-100'
                          } disabled:opacity-50 disabled:grayscale`}
                      >
                        GH₵ {amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Custom Amount Input */}
              <div className="md:col-span-7">
                <div className="bg-white p-8 sm:p-10 rounded-[3rem] border border-slate-200/60 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-colors"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <CreditCard size={28} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Custom Amount</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Enter amount to fund</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                          <span className="text-lg font-black text-slate-300">GH₵</span>
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
                          min="1"
                          step="0.01"
                          className="w-full pl-16 pr-6 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-3xl font-black text-slate-900 placeholder:text-slate-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none disabled:opacity-50"
                        />
                      </div>

                      <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Instant Processing</p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Your wallet will be credited immediately after a successful payment via Paystack.</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleTopUp}
                        disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                        className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group/btn"
                      >
                        {loading ? (
                          <RotateCw size={20} className="animate-spin" />
                        ) : (
                          <>
                            <Zap size={20} className="group-hover/btn:fill-white transition-all shadow-sm" />
                            Proceed to Gateway
                          </>
                        )}
                      </button>

                      <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        SECURED BY <span className="text-slate-900">PAYSTACK</span> GATEWAY
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
        />
      )}
    </UserLayout>
  );
}
