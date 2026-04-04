import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { purchases } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function PurchasePaymentModal({ isOpen, onClose, accessCode, reference, amount, onSuccess }) {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const paystackRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !accessCode) return;

    let isMounted = true;

    const initializePayment = async () => {
      try {
        if (!window.PaystackPop) {
          if (isMounted) {
            setStatus('failed');
            setError('Paystack library not loaded. Please refresh the page.');
          }
          return;
        }

        const paystack = new window.PaystackPop();
        paystackRef.current = paystack;

        paystack.resumeTransaction(accessCode, {
          onSuccess: async () => {
            if (!isMounted) return;
            setStatus('verifying');
            try {
              const result = await purchases.verifyPurchase({ reference });

              if (isMounted) {
                if (result.success) {
                  setStatus('success');
                  setTimeout(() => {
                    if (isMounted) {
                      onSuccess(result);
                      onClose();
                    }
                  }, 2000);
                } else {
                  setStatus('failed');
                  setError('Payment verification failed');
                }
              }
            } catch (err) {
              if (isMounted) {
                setStatus('failed');
                setError(err.message || 'Payment verification failed');
              }
            }
          },
          onCancel: () => {
            if (isMounted) {
              setStatus('cancelled');
            }
          },
          onError: (error) => {
            if (isMounted) {
              setStatus('failed');
              setError(error?.message || 'Payment error occurred');
            }
          },
        });
      } catch (err) {
        if (isMounted) {
          setStatus('failed');
          setError(err.message || 'Failed to initialize payment');
        }
      }
    };

    initializePayment();

    return () => {
      isMounted = false;
      if (paystackRef.current?.cancelTransaction) {
        paystackRef.current.cancelTransaction(reference);
      }
    };
  }, [isOpen, accessCode, reference, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />

      {(status === 'pending' || status === 'verifying') && (
        <div className="relative w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-primary-50 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                {status === 'pending' ? 'Connecting Gateway' : 'Verifying Payment'}
              </h3>
              <p className="text-slate-500 font-bold text-sm tracking-tight leading-snug">
                {status === 'pending'
                  ? 'Please wait while we initialize the secure Paystack checkout...'
                  : 'Transaction authorized! We are confirming your payment status...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="relative w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-8 sm:p-10 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2 animate-bounce">
              <CheckCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Purchase Successful!</h3>
              <p className="text-slate-500 font-bold text-sm tracking-tight">Your data bundle has been successfuly purchased for {formatCurrencyAbbreviated(amount)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Reference</p>
              <p className="text-xs font-mono font-bold text-slate-600">{reference}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="relative w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Payment Cancelled</h3>
              <p className="text-slate-500 font-bold text-sm tracking-tight">You cancelled the checkout process. No funds were debited.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition shadow-lg active:scale-95"
            >
              Back to Store
            </button>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="relative w-full max-w-md bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Payment Failed</h3>
              <p className="text-rose-500 font-bold text-sm tracking-tight">{error || 'Unable to process your payment'}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition shadow-lg shadow-rose-200 active:scale-95"
            >
              Retry Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
