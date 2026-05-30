import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Package, ShoppingCart, Home } from 'lucide-react';
import { guest } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function GuestVerifyPayment() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed
  const [message, setMessage] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);

  const verifyPayment = async () => {
    const reference = searchParams.get('reference');

    if (!reference) {
      setStatus('failed');
      setMessage('Invalid payment reference');
      return;
    }

    try {
      const response = await guest.verifyPayment({ reference });

      if (response.success) {
        setStatus('success');
        setMessage(response.message || 'Payment verified successfully!');
        setOrderDetails(response.data?.order || null);

        // Clear saved order info
        localStorage.removeItem('guestOrderNumber');
      } else {
        setStatus('failed');
        setMessage(response.message || 'Payment verification failed');
        setOrderDetails(response.data?.order || null);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage(error?.message || 'An error occurred while verifying payment');
    }
  };

  useEffect(() => {
    verifyPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden">
          {status === 'verifying' && (
            <div className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
                  <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-black text-black tracking-tight mb-2">
                Verifying Payment...
              </h2>
              <p className="text-sm text-black">
                Please wait while we confirm your payment
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-black text-green-600 tracking-tight mb-2">
                Payment Successful!
              </h2>
              <p className="text-sm text-black mb-6">{message}</p>

              {orderDetails && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 text-left">
                  <h3 className="text-sm font-black text-black uppercase tracking-widest mb-3">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-xs text-black">Order Number:</span>{' '}
                      <span className="font-bold text-black">{orderDetails.orderNumber}</span>
                    </p>
                    <p>
                      <span className="text-xs text-black">Network:</span>{' '}
                      <span className="font-bold text-black">{orderDetails.network}</span>
                    </p>
                    <p>
                      <span className="text-xs text-black">Data:</span>{' '}
                      <span className="font-bold text-black">{orderDetails.dataAmount || orderDetails.planName}</span>
                    </p>
                    <p>
                      <span className="text-xs text-black">Phone Number:</span>{' '}
                      <span className="font-bold text-black">{orderDetails.phoneNumber}</span>
                    </p>
                    <p>
                      <span className="text-xs text-black">Amount:</span>{' '}
                      <span className="font-black text-green-600 text-lg">
                        {formatCurrencyAbbreviated(orderDetails.amount)}
                      </span>
                    </p>
                    {orderDetails.providerMessage && (
                      <p className="pt-2 border-t border-green-200">
                        <span className="text-xs text-black">Status:</span>{' '}
                        <span className="font-bold text-green-700 text-xs">
                          {orderDetails.providerMessage}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  to="/guest/track-order"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-slate-100 hover:shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Track Order
                </Link>
                <Link
                  to="/guest/purchase"
                  className="w-full bg-white border border-slate-300 text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy More Data
                </Link>
                <Link
                  to="/"
                  className="w-full text-sm text-black hover:text-black font-bold underline inline-flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Homepage
                </Link>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h2 className="text-xl font-black text-red-600 tracking-tight mb-2">
                Payment Failed
              </h2>
              <p className="text-sm text-black mb-6">{message}</p>

              {orderDetails && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 text-left">
                  <h3 className="text-sm font-black text-black uppercase tracking-widest mb-3">Order Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-xs text-black">Order Number:</span>{' '}
                      <span className="font-bold text-black">{orderDetails.orderNumber}</span>
                    </p>
                    {orderDetails.errorMessage && (
                      <p className="text-red-600 pt-2 border-t border-red-200">
                        {orderDetails.errorMessage}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-black mt-3">
                    Please contact support with this order number if you were charged
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  to="/guest/purchase"
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-slate-100 hover:shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Try Again
                </Link>
                <Link
                  to="/guest/track-order"
                  className="w-full bg-white border border-slate-300 text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Track Orders
                </Link>
                <Link
                  to="/"
                  className="w-full text-sm text-black hover:text-black font-bold underline inline-flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Homepage
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
