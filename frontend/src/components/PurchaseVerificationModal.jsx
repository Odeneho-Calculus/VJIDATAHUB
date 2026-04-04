import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader, Wallet } from 'lucide-react';
import { purchases } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function PurchaseVerificationModal({ isOpen, reference, onClose, onSuccess, onError }) {
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [refunded, setRefunded] = useState(false);
  const [refundMessage, setRefundMessage] = useState(null);

  useEffect(() => {
    if (!isOpen || !reference) return;

    const verifyPurchase = async () => {
      try {
        setStatus('verifying');
        setError(null);
        setRefunded(false);
        setRefundMessage(null);
        
        const result = await purchases.verifyPurchase({ reference });
        
        if (result.success) {
          setOrderDetails(result.data);
          setStatus('success');
          setTimeout(() => {
            if (onSuccess) onSuccess(result);
            onClose();
          }, 2000);
        } else {
          setStatus('failed');
          setError(result.message || 'Payment verification failed');
          if (result.refunded) {
            setRefunded(true);
            setRefundMessage(result.refundMessage || null);
            if (onSuccess) onSuccess({ ...result, walletBalance: result.wallet?.balance });
          } else {
            if (onError) onError(result);
          }
        }
      } catch (err) {
        setStatus('failed');
        setError(err?.message || 'Payment verification failed');
        if (onError) onError(err);
      }
    };

    verifyPurchase();
  }, [isOpen, reference, onClose, onSuccess, onError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {status === 'verifying' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl max-w-lg w-full p-8 bg-white border-2 border-slate-200">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader size={64} className="text-blue-600 mb-4 animate-spin" />
              <h3 className="text-xl font-bold mb-2 text-slate-900">Verifying Payment</h3>
              <p className="mb-4 text-slate-600">Please wait while we verify your payment...</p>
              <p className="text-sm text-slate-600">Reference: {reference}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl max-w-lg w-full p-8 bg-white border-2 border-slate-200">
            <div className="flex flex-col items-center justify-center text-center">
              <CheckCircle size={64} className="text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2 text-slate-900">Data Bundle Purchased!</h3>
              {orderDetails?.order && (
                <div className="mb-4 text-left w-full">
                  <p className="mb-2 text-slate-600">
                    <strong>Order Number:</strong> {orderDetails.order.orderNumber}
                  </p>
                  <p className="mb-2 text-slate-600">
                    <strong>Data:</strong> {orderDetails.order.dataAmount} {orderDetails.order.network}
                  </p>
                  <p className="mb-2 text-slate-600">
                    <strong>Phone:</strong> {orderDetails.order.phoneNumber}
                  </p>
                  <p className="mb-2 text-slate-600">
                    <strong>Amount:</strong> {formatCurrencyAbbreviated(orderDetails.order.amount)}
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-600">Reference: {reference}</p>
            </div>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-xl max-w-lg w-full p-8 bg-white border-2 border-slate-200">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle size={64} className="text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-2 text-slate-900">
                {refunded ? 'Order Failed — Refunded' : 'Payment Failed'}
              </h3>
              <p className="mb-4 text-slate-600 text-sm leading-relaxed">
                {error || 'Unable to verify your payment'}
              </p>
              {refunded && refundMessage && (
                <div className="w-full mb-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left">
                  <Wallet size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">{refundMessage}</p>
                </div>
              )}
              {refunded && !refundMessage && (
                <div className="w-full mb-4 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left">
                  <Wallet size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">Your payment has been automatically refunded to your wallet.</p>
                </div>
              )}
              {!refunded && (
                <div className="w-full mb-4 flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 text-left">
                  <AlertCircle size={18} className="text-orange-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-orange-800">If you were charged, please contact support with your reference: <span className="font-mono font-black">{reference}</span></p>
                </div>
              )}
              <button
                onClick={onClose}
                className={`mt-2 px-6 py-3 rounded-xl font-semibold text-sm transition ${
                  refunded
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {refunded ? 'Got it' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
