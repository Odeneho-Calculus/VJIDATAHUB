import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  CreditCard,
  Loader,
  Clock,
  Wallet,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layout,
} from 'lucide-react';
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
  const [walletFundingCharge, setWalletFundingCharge] = useState(0);

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  const checkStatus = async () => {
    try {
      const [statusRes, settingsRes] = await Promise.all([
        publicAPI.getBusinessStatus(),
        publicAPI.getSystemSettings(),
      ]);

      if (statusRes.success && statusRes.data) {
        setBusinessStatus(statusRes.data);
      }

      if (settingsRes?.settings?.transactionCharges?.walletFundingCharge !== undefined) {
        setWalletFundingCharge(Number(settingsRes.settings.transactionCharges.walletFundingCharge) || 0);
      }
    } catch (err) {
      console.error('Failed to check business status:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    await checkStatus();
    setIsRefreshing(false);
  };

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
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        <div className="sticky top-0 z-20 app-pro-header px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-primary-600 mb-1">
                <Layout size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Wallet Center</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Wallet Top-up</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-60"
              title="Refresh wallet"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-200/70 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2 sm:mb-3">
                <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <p className="text-xs text-slate-600 mb-1">Current Balance</p>
              <p className="text-base sm:text-2xl font-bold text-slate-900 break-words">
                {formatCurrencyAbbreviated(Number(user?.balance || 0))}
              </p>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-indigo-200/70 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 sm:mb-3">
                <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <p className="text-xs text-slate-600 mb-1">Funding Status</p>
              <p className="text-base sm:text-xl font-bold text-slate-900">
                {businessStatus?.isOpen ? 'Available' : 'Unavailable'}
              </p>
            </div>
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 border border-orange-300 bg-white text-orange-700">
              <Clock size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Business Closed</p>
                <p className="text-sm">{businessStatus.message || 'Business is currently closed.'}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 border border-rose-300 bg-white text-rose-700">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start gap-2.5 sm:gap-3 border border-emerald-300 bg-white text-emerald-700">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Success</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-sm mb-3 text-slate-900">Quick Amounts</h2>
                <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => {
                        setAmount(quickAmount.toString());
                        setError(null);
                      }}
                      disabled={loading || (businessStatus && !businessStatus.isOpen)}
                      className={`py-2 rounded-lg sm:rounded-xl transition text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${amount === quickAmount.toString()
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
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-base sm:text-lg mb-4 sm:mb-5 text-slate-900 flex items-center gap-2">
                  <Wallet size={18} className="text-blue-600 sm:w-5 sm:h-5" />
                  Fund Wallet
                </h2>

                <div className="mb-4 sm:mb-6">
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
                      className="flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        appearance: 'textfield',
                      }}
                    />
                  </div>
                </div>

                <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border border-slate-100 bg-slate-50 px-3.5 sm:px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Instant Processing</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Your wallet will be credited immediately after a successful payment via Paystack.
                      </p>
                    </div>
                  </div>
                </div>

                {walletFundingCharge > 0 && Number(amount || 0) > 0 && (
                  <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border border-slate-100 bg-slate-50 px-3.5 sm:px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Amount to credit</span>
                      <span>GHS {Number(amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-600">
                      <span>Service charge</span>
                      <span>+ GHS {walletFundingCharge.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>Total charged</span>
                      <span>GHS {(Number(amount || 0) + walletFundingCharge).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTopUp}
                  disabled={loading || !amount || (businessStatus && !businessStatus.isOpen)}
                  className="w-full text-sm font-bold py-2.5 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-primary-600 text-white rounded-lg sm:rounded-xl hover:bg-primary-700 transition-all"
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

                <p className="text-xs text-center mt-3 sm:mt-4 text-slate-600">
                  Your transaction is secure and encrypted with Paystack
                </p>
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
