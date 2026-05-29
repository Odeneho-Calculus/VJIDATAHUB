import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { wallet } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function PaymentModal({ isOpen, onClose, accessCode, reference, amount, onSuccess, onVerify, successMessage, themeColor }) {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const paystackRef = useRef(null);
  const initializedRef = useRef(false);

  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }
    if (!accessCode || initializedRef.current) return;

    let isMounted = true;

    const initializePayment = async () => {
      try {
        initializedRef.current = true;
        console.log('Initializing Paystack with accessCode:', accessCode);

        if (!window.PaystackPop) {
          console.error('PaystackPop NOT found on window');
          if (isMounted) {
            setStatus('failed');
            setError('Paystack library not loaded. Please refresh the page.');
          }
          return;
        }

        console.log('Creating PaystackPop instance...');
        const paystack = new window.PaystackPop();
        paystackRef.current = paystack;

        paystack.resumeTransaction(accessCode, {
          onSuccess: async () => {
            if (!isMounted) return;
            setStatus('verifying');
            try {
              const verifyFn = onVerify || wallet.verifyPayment;
              const result = await verifyFn({ reference });

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
                  setError(result.message || 'Payment verification failed');
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
  }, [isOpen, accessCode, reference, onClose, onSuccess, onVerify]);

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
                {status === 'pending' ? 'Gateway Sync' : 'Verifying'}
              </h3>
              <p className="text-slate-500 font-bold text-sm tracking-tight leading-snug max-w-[240px] mx-auto">
                {status === 'pending'
                  ? 'Initializing secure Paystack session for your top-up...'
                  : 'Transaction authorized! We are confirming your wallet credit...'}
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
              <h3 className="text-2xl font-black text-[#111] tracking-tight uppercase leading-none">Top-up Successful!</h3>
              <p className="text-slate-500 font-bold text-sm tracking-tight">
                {successMessage || `Your wallet has been credited with ${formatCurrencyAbbreviated(amount)}`}
              </p>
            </div>
            <div className="p-4 bg-[#fafaf7] rounded-2xl border-1.5 border-[#e4e4de]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Reference</p>
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
              <p className="text-slate-500 font-bold text-sm tracking-tight">Checkout session closed. No funds were debited from your account.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-[#111] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition shadow-xl active:scale-95"
            >
              Close Window
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
              <h3 className="text-2xl font-black text-[#111] tracking-tight uppercase leading-none">Payment Failed</h3>
              <p className="text-rose-500 font-bold text-sm tracking-tight leading-snug">{error || 'Unable to process your top-up request at this time.'}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-700 transition shadow-xl shadow-rose-200 active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
