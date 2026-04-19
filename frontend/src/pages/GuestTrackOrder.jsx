import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Phone, Search, CheckCircle, Clock, XCircle, AlertCircle, ShoppingCart, Home } from 'lucide-react';
import { guest } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function GuestTrackOrder() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState([]);
  const [guestInfo, setGuestInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Check if user just completed a purchase
    const savedPhone = localStorage.getItem('guestPhoneNumber');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number starting with 0');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSearched(true);

      const response = await guest.trackOrders(phoneNumber);

      if (response.success) {
        setOrders(response.data.orders || []);
        setGuestInfo(response.data.guestInfo || null);
        
        if (response.data.orders.length === 0) {
          setError('No orders found for this phone number');
        }
      }
    } catch (err) {
      console.error('Error tracking orders:', err);
      setError(err?.message || 'Failed to track orders');
      setOrders([]);
      setGuestInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'processing':
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCheckerOrder = (order) => {
    const kind = String(order?.orderKind || '').toLowerCase();
    const network = String(order?.network || '').toLowerCase();
    return kind === 'checker' || network === 'checker' || Boolean(order?.checkerDetails?.checkerType);
  };

  const getOrderPlanDisplay = (order) => {
    if (isCheckerOrder(order)) {
      return order?.planName || order?.checkerDetails?.checkerType || 'Checker';
    }
    return order?.dataAmount || order?.planName || 'N/A';
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top Header */}
      <div className="sticky top-0 z-20 app-pro-header px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-blue-600 min-w-0">
              <Package size={16} className="flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Track Order</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/guest/purchase"
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Buy Data"
              >
                <ShoppingCart size={20} />
              </Link>
              <Link
                to="/"
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Home"
              >
                <Home size={20} />
              </Link>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Track Your Orders</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Search Form */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Enter Phone Number</h3>
            <p className="text-xs text-slate-600 mt-1">Use the number you used to purchase data</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 10) {
                        setPhoneNumber(value);
                      }
                    }}
                    placeholder="0241234567"
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-100 hover:shadow-blue-200 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Search size={16} />
                  {loading ? 'Searching' : 'Search'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <p className="font-bold text-yellow-900 text-sm mt-1.5">{error}</p>
          </div>
        )}

        {/* Guest Info */}
        {guestInfo && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {guestInfo.name && (
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Name</span>
                  <span className="font-bold text-slate-900">{guestInfo.name}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Email</span>
                <span className="font-bold text-slate-900 text-xs break-all">{guestInfo.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Phone</span>
                <span className="font-bold text-slate-900">{guestInfo.phone}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Total Orders</span>
                <span className="font-bold text-blue-600 text-lg">{guestInfo.totalPurchases}</span>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {searched && orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Your Orders</h2>
            {orders.map((order) => (
              <div
                key={order.orderNumber}
                className="bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-sm">{order.orderNumber}</h3>
                      <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex-shrink-0 ${
                        getPaymentStatusColor(
                          order.paymentStatus || 'pending'
                        )
                      }`}
                    >
                      Pay: {order.paymentStatus || 'pending'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex-shrink-0 ${
                        getStatusColor(
                          order.status
                        )
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plan</p>
                      <p className="font-bold text-slate-900 text-sm leading-tight">{getOrderPlanDisplay(order)}</p>
                      <p className="text-xs text-slate-600 leading-tight">{isCheckerOrder(order) ? 'CHECKER' : order.network}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
                      <p className="font-bold text-slate-900 text-sm">{order.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Amount</p>
                      <p className="font-black text-blue-600 text-lg">
                        GH₵ {formatCurrencyAbbreviated(order.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Payment</p>
                      <p className="font-bold text-slate-900 text-sm capitalize">
                        {order.paymentMethod}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-1 ${
                          order.paymentStatus === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : order.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {order.providerMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-xs text-green-700 leading-relaxed">
                        <span className="font-bold">Message:</span> {order.providerMessage}
                      </p>
                    </div>
                  )}

                  {order.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700 leading-relaxed">
                        <span className="font-bold">Error:</span> {order.errorMessage}
                      </p>
                    </div>
                  )}

                  {order.completedAt && (
                    <div className="mt-3 text-xs text-slate-500">
                      Completed {formatDate(order.completedAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {searched && orders.length === 0 && !loading && !error && (
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={40} className="text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-900 mb-2">No orders found</p>
            <p className="text-sm text-slate-600 mb-6">
              We couldn't find any orders for this phone number
            </p>
            <Link
              to="/guest/purchase"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-slate-100 hover:shadow-blue-200"
            >
              <ShoppingCart size={16} />
              Buy Data Bundle
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
