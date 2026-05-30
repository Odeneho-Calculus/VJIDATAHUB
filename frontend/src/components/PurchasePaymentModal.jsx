import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { purchases } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function PurchasePaymentModal({ isOpen, onClose, accessCode, reference, amount, onSuccess, verifyPayment, themeColor }) {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const paystackRef = useRef(null);

  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

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
              const verifyHandler = verifyPayment || purchases.verifyPurchase;
              const result = await verifyHandler({ reference });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessCode, reference, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px]" onClick={onClose} />

      {(status === 'pending' || status === 'verifying') && (
        <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-10 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-[6px] rounded-full" style={{ borderColor: c.soft }} />
              <div className="absolute inset-0 border-[6px] border-t-transparent rounded-full animate-spin" style={{ borderColor: c.main, borderTopColor: 'transparent' }} />
              <div className="absolute inset-4 rounded-full animate-pulse" style={{ background: c.glow }} />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black text-[#111] tracking-tight uppercase leading-none">
                {status === 'pending' ? 'Gateway Sync' : 'Finalizing'}
              </h3>
              <p className="text-black font-bold text-sm tracking-tight leading-snug max-w-[240px] mx-auto">
                {status === 'pending'
                  ? 'Initializing secure Paystack session for your transaction...'
                  : 'Authorized! We are confirming your payment status with the bank...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-10 text-center space-y-5">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce transition-all duration-500"
              style={{ background: '#ecfdf5', color: '#10b981', boxShadow: '0 8px 30px rgba(16,185,129,0.2)' }}
            >
              <CheckCircle size={56} strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-[#111] tracking-tight uppercase leading-none">Payment Success!</h3>
              <p className="text-black font-bold text-sm tracking-tight">Your purchase of {formatCurrencyAbbreviated(amount)} has been confirmed and processed.</p>
            </div>
            <div className="p-4 bg-[#fafaf7] rounded-2xl border-1.5 border-[#e4e4de]">
              <p className="text-[10px] font-black text-black uppercase tracking-widest mb-1">Transaction Ref</p>
              <p className="text-xs font-mono font-black text-[#111]">{reference}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-10 text-center space-y-7">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{ background: '#fffbeb', color: '#f59e0b', boxShadow: '0 8px 30px rgba(245,158,11,0.2)' }}
            >
              <AlertCircle size={56} strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-[#111] tracking-tight uppercase leading-none">Cancelled</h3>
              <p className="text-black font-bold text-sm tracking-tight">Checkout session closed. No funds were debited from your account.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-[#111] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition shadow-xl active:scale-95"
            >
              Return to Portal
            </button>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="p-10 text-center space-y-7">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{ background: '#fef2f2', color: '#ef4444', boxShadow: '0 8px 30px rgba(239,68,68,0.2)' }}
            >
              <AlertCircle size={56} strokeWidth={2.5} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-[#111] tracking-tight uppercase leading-none">Payment Error</h3>
              <p className="text-rose-500 font-bold text-sm tracking-tight leading-snug">{error || 'Unable to finalize your transaction at this time.'}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition shadow-xl shadow-rose-200 active:scale-95"
            >
              Retry Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
