import React, { useState, useEffect } from 'react';
import { X, Wallet, CreditCard, Loader, Clock, Zap, Smartphone, CheckCircle } from 'lucide-react';
import { purchases, publicAPI } from '../services/api';
import PurchasePaymentModal from './PurchasePaymentModal';
import Modal from './Modal';
import { getNetworkStyles } from '../utils/networkStyles';
import { formatCurrencyAbbreviated, formatNumberAbbreviated } from '../utils/formatCurrency';

export default function PurchaseModal({ bundle, isOpen, onClose, userBalance, user, onPurchaseSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [businessStatus, setBusinessStatus] = useState(null);
  const [checkingBusinessStatus, setCheckingBusinessStatus] = useState(false);
  const [dataPurchaseCharge, setDataPurchaseCharge] = useState(0);

  // Helper function to check if user qualifies for agent pricing
  const isQualifiedAgent = () => {
    return user?.agentFeeStatus === 'paid' || user?.agentFeeStatus === 'protocol';
  };

  // Helper function to check if user qualifies for vendor pricing
  const isQualifiedVendor = () => {
    return user?.role === 'vendor';
  };

  // Helper function to get the correct price based on user role and status
  const getDisplayPrice = () => {
    if (isQualifiedAgent() && bundle?.agentPrice) {
      return bundle.agentPrice;
    }
    if (isQualifiedVendor() && bundle?.vendorPrice) {
      return bundle.vendorPrice;
    }
    return bundle?.sellingPrice || 0;
  };

  useEffect(() => {
    if (!isOpen) {
      setBusinessStatus(null);
      return;
    }

    const checkStatus = async () => {
      try {
        setCheckingBusinessStatus(true);
        const [statusRes, settingsRes] = await Promise.all([
          publicAPI.getBusinessStatus(),
          publicAPI.getSystemSettings(),
        ]);
        if (statusRes.success && statusRes.data) {
          setBusinessStatus(statusRes.data);
          if (!statusRes.data.isOpen) {
            setError(statusRes.data.message || 'Business is currently closed');
          }
        } else {
          setBusinessStatus(null);
          setError(statusRes.message || 'Failed to check business status');
        }
        if (settingsRes?.settings?.transactionCharges?.dataPurchaseCharge !== undefined) {
          setDataPurchaseCharge(Number(settingsRes.settings.transactionCharges.dataPurchaseCharge) || 0);
        }
      } catch (err) {
        console.error('Failed to check business status:', err);
        setBusinessStatus(null);
      } finally {
        setCheckingBusinessStatus(false);
      }
    };

    checkStatus();
  }, [isOpen]);

  if (!isOpen || !bundle) return null;

  const ns = getNetworkStyles(bundle.network);

  const handleWalletPurchase = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await purchases.buyDataBundle({
        dataPlanId: bundle._id,
        phoneNumber,
        paymentMethod: 'wallet',
      });

      if (response.success) {
        onPurchaseSuccess(response.data);
        setPhoneNumber('');
        onClose();
      } else {
        setError(response.message || 'Purchase failed');
      }
    } catch (err) {
      setError(err?.message || 'An error occurred during purchase');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackPurchase = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    try {
      setPaystackLoading(true);
      setError('');

      const response = await purchases.buyDataBundle({
        dataPlanId: bundle._id,
        phoneNumber,
        paymentMethod: 'paystack',
      });

      if (response.success) {
        setPaymentData(response.data);
        setShowPaymentModal(true);
      } else {
        setError(response.message || 'Payment initialization failed');
        setPaystackLoading(false);
      }
    } catch (err) {
      setError(err?.message || 'An error occurred');
      setPaystackLoading(false);
    }
  };

  const handlePaymentSuccess = (result) => {
    setShowPaymentModal(false);
    setPaymentData(null);
    onPurchaseSuccess(result.data);
    setPhoneNumber('');
    onClose();
  };

  const displayPrice = getDisplayPrice();
  const canAfford = userBalance >= displayPrice;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Purchase Data Bundle"
        icon={<Zap size={20} className={ns.accent} />}
        maxWidth="max-w-md"
      >
        <div className="space-y-5">
          <div className={`bg-gradient-to-br ${ns.cardGradient} p-4 rounded-3xl border ${ns.cardBorder} shadow-sm relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${ns.blobBg} rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700`} />
            <div className="flex justify-between items-start gap-4 sticky z-10">
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">{bundle.dataSize}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black ${ns.accent} uppercase tracking-widest`}>{bundle.network}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{bundle.planName}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${ns.accent} leading-none`}>{formatCurrencyAbbreviated(displayPrice)}</p>
                {isQualifiedAgent() && bundle?.agentPrice && (
                  <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Agent Rate (Fee Paid)</p>
                )}
                {isQualifiedVendor() && bundle?.vendorPrice && (
                  <p className="text-[8px] font-bold text-purple-600 uppercase tracking-widest mt-1">Vendor Rate</p>
                )}
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Validity: {bundle.validity}</p>
              </div>
            </div>
          </div>

          {businessStatus && !businessStatus.isOpen && (
            <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                <Clock size={16} strokeWidth={2.5} />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-xs text-orange-900 uppercase tracking-tight">Business Closed</p>
                <p className="text-[11px] font-bold text-orange-700 leading-snug">{businessStatus.message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl text-rose-600 text-xs font-black uppercase tracking-tight text-center animate-in shake duration-500">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Phone Number</label>
            <div className="relative group">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter 10-digit number"
                className={`w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none ${ns.focusBorder} focus:bg-white transition-all text-sm font-bold placeholder:text-slate-300`}
              />
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl border border-slate-100 text-slate-400 ${ns.focusGroupText} transition-colors`}>
                <Smartphone size={16} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  setPaymentMethod('wallet');
                  setError('');
                }}
                className={`relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${paymentMethod === 'wallet'
                  ? ns.selectedOption
                  : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                disabled={loading || paystackLoading || (businessStatus && !businessStatus.isOpen)}
              >
                <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'wallet' ? ns.selectedIcon : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                  <Wallet size={20} strokeWidth={2.5} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Agent Wallet</p>
                  <p className={`text-[11px] font-bold ${paymentMethod === 'wallet' ? ns.accent : 'text-slate-400'}`}>
                    Balance: {formatCurrencyAbbreviated(userBalance)} • Cost: {formatCurrencyAbbreviated(displayPrice)}
                  </p>
                </div>
                {paymentMethod === 'wallet' && (
                  <div className="absolute right-4">
                    {canAfford ? (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <CheckCircle size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-1 bg-rose-50 text-rose-600 rounded-lg uppercase tracking-tight border border-rose-100">
                        Insufficient
                      </span>
                    )}
                  </div>
                )}
              </button>

              <button
                onClick={() => {
                  setPaymentMethod('paystack');
                  setError('');
                }}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group ${paymentMethod === 'paystack'
                  ? ns.selectedOption
                  : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                disabled={loading || paystackLoading || (businessStatus && !businessStatus.isOpen)}
              >
                <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'paystack' ? ns.selectedIcon : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                  <CreditCard size={20} strokeWidth={2.5} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Paystack Online</p>
                  <p className="text-[11px] font-bold text-slate-400">Card, Bank, or Momo</p>
                </div>
              </button>
            </div>
          </div>

          {paymentMethod === 'paystack' && dataPurchaseCharge > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Plan price</span>
                <span>{formatCurrencyAbbreviated(displayPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-600">
                <span>Service charge</span>
                <span>+ {formatCurrencyAbbreviated(dataPurchaseCharge)}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between text-xs font-black text-slate-900">
                <span>Total charged</span>
                <span>{formatCurrencyAbbreviated(displayPrice + dataPurchaseCharge)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={paymentMethod === 'wallet' ? handleWalletPurchase : handlePaystackPurchase}
              disabled={
                !phoneNumber.trim() ||
                loading ||
                paystackLoading ||
                (paymentMethod === 'wallet' && !canAfford) ||
                (businessStatus && !businessStatus.isOpen) ||
                checkingBusinessStatus
              }
              className={`flex-[2] py-4 ${ns.buttonBg} ${ns.buttonText} rounded-2xl font-black uppercase text-xs tracking-widest ${ns.buttonHover} shadow-xl ${ns.buttonShadow} disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3`}
            >
              {loading || paystackLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Processing Transaction...
                </>
              ) : (
                <>
                  <Zap size={16} strokeWidth={2.5} />
                  {paymentMethod === 'paystack' && dataPurchaseCharge > 0
                    ? `Pay ${formatCurrencyAbbreviated(displayPrice + dataPurchaseCharge)}`
                    : `Authorize ${formatCurrencyAbbreviated(displayPrice)}`}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {paymentData && (
        <PurchasePaymentModal
          key={paymentData?.reference}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentData(null);
            setPaystackLoading(false);
          }}
          accessCode={paymentData?.accessCode}
          reference={paymentData?.reference}
          amount={displayPrice}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
