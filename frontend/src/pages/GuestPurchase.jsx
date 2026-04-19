import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Wifi, Phone, Mail, User, ArrowLeft, Layout, Zap, Check, AlertCircle, Home, Clock } from 'lucide-react';
import { guest, publicAPI } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { getNetworkStyles } from '../utils/networkStyles';
import { validatePhoneNumber } from '../utils/phoneValidation';
import {
  formatChargeDescriptor,
  getDataPurchaseChargeAmount,
  parseTransactionCharges,
} from '../utils/transactionCharges';

export default function GuestPurchase() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessStatus, setBusinessStatus] = useState(null);
  const [checkingBusinessStatus, setCheckingBusinessStatus] = useState(false);
  const [transactionCharges, setTransactionCharges] = useState(parseTransactionCharges());

  const [formData, setFormData] = useState({
    phoneNumber: '',
    email: '',
    name: '',
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (!showCheckout) {
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
        }
        setTransactionCharges(parseTransactionCharges(settingsRes?.settings?.transactionCharges));
      } catch (err) {
        console.error('Failed to check business status:', err);
        setBusinessStatus(null);
      } finally {
        setCheckingBusinessStatus(false);
      }
    };

    checkStatus();
  }, [showCheckout]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await guest.getDataPlans();
      if (response.success) {
        const allPlans = response.data || [];
        setPlans(allPlans);
        
        // Group by network
        const groupedByNetwork = {};
        allPlans.forEach(plan => {
          if (!groupedByNetwork[plan.network]) {
            groupedByNetwork[plan.network] = [];
          }
          groupedByNetwork[plan.network].push(plan);
        });
        setGrouped(groupedByNetwork);
        
        // Set initial network if not set
        const networks = Object.keys(groupedByNetwork);
        if (networks.length > 0 && !groupedByNetwork[selectedNetwork]) {
          setSelectedNetwork(networks[0]);
        }
      }
      setError('');
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err?.message || 'Failed to load data plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    setPhoneError('');
    
    if (!formData.name || !formData.phoneNumber || !formData.email) {
      return 'Name, phone number and email are required';
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      return phoneValidation.error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (businessStatus && !businessStatus.isOpen) {
      setError(businessStatus.message || 'Business is currently closed. Please try again later.');
      toast.error(businessStatus.message || 'Business is currently closed', { duration: 5000 });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError, { duration: 5000 });
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Normalize phone number
      const phoneValidation = validatePhoneNumber(formData.phoneNumber);
      const normalizedPhone = phoneValidation.formatted;

      const response = await guest.initializePurchase({
        dataPlanId: selectedPlan._id,
        phoneNumber: normalizedPhone,
        email: formData.email,
        name: formData.name || null,
      });

      if (response.success && response.data.authorizationUrl) {
        localStorage.setItem('guestOrderNumber', response.data.orderNumber);
        localStorage.setItem('guestPhoneNumber', normalizedPhone);
        window.location.href = response.data.authorizationUrl;
      } else {
        setError(response?.message || 'Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err?.message ||
        err?.error ||
        err?.details ||
        err?.response?.data?.message ||
        'Failed to process checkout'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getBundleSizeInGB = (bundle) => {
    const textCandidates = [bundle?.dataAmount, bundle?.dataSize, bundle?.name, bundle?.planName];

    for (const candidate of textCandidates) {
      if (!candidate || typeof candidate !== 'string') continue;
      const match = candidate.match(/(\d+(?:\.\d+)?)\s*(GB|MB)\b/i);
      if (!match) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value)) continue;
      return match[2].toUpperCase() === 'MB' ? value / 1024 : value;
    }

    const numericSize = Number(bundle?.dataSizeMB);
    if (Number.isFinite(numericSize) && numericSize > 0) {
      return numericSize;
    }

    return Number.POSITIVE_INFINITY;
  };

  if (showCheckout && selectedPlan) {
    const styles = getNetworkStyles(selectedPlan.network);
    const selectedPlanPrice = Number(selectedPlan.price || 0);
    const dataPurchaseCharge = getDataPurchaseChargeAmount(transactionCharges, selectedPlanPrice);
    const totalPaystackAmount = selectedPlanPrice + dataPurchaseCharge;
    const chargeDescriptor = formatChargeDescriptor(
      transactionCharges.dataPurchaseChargeType,
      transactionCharges.dataPurchaseCharge,
      'GHS'
    );
    const selectedPlanDataSize = selectedPlan?.dataSize
      || selectedPlan?.dataAmount
      || (selectedPlan?.dataSizeMB ? `${selectedPlan.dataSizeMB}GB` : '')
      || (selectedPlan?.name?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
      || 'Data';
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="sticky top-0 z-20 app-pro-header px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                setShowCheckout(false);
                setSelectedPlan(null);
                setError('');
                setBusinessStatus(null);
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold mb-2 text-sm"
            >
              <ArrowLeft size={16} />
              Back to Plans
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart size={20} />
              Complete Purchase
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Selected Plan Card */}
          <div className={`relative p-5 rounded-3xl border ${styles.border} ${styles.lightBg} overflow-hidden`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${styles.accent} ${styles.lightBg} ${styles.border} mb-2`}>
                  {selectedPlan.network}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">{selectedPlanDataSize}</h3>
                <p className="text-xs text-slate-600 mt-1">{selectedPlan.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Price</span>
                <p className={`text-2xl font-black ${styles.accent} tracking-tighter`}>GHS {selectedPlan.price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Your Information</h3>
            </div>

            <div className="p-6">
              {businessStatus && !businessStatus.isOpen && (
                <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-2xl flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 bg-orange-100 rounded-xl text-orange-600 flex-shrink-0">
                    <Clock size={16} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-black text-xs text-orange-900 uppercase tracking-tight">Business Closed</p>
                    <p className="text-[11px] font-bold text-orange-700 leading-snug">{businessStatus.message}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 mb-6">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <p className="font-bold text-rose-900 text-sm mt-1.5">{error}</p>
                </div>
              )}

              <form onSubmit={handleCheckout} className="space-y-5">

                {dataPurchaseCharge > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Plan price</span>
                      <span>GHS {selectedPlanPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-600">
                      <span>Service charge</span>
                      <span>+ GHS {dataPurchaseCharge.toFixed(2)} ({chargeDescriptor})</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex items-center justify-between text-xs font-black text-slate-900">
                      <span>Total charged</span>
                      <span>GHS {totalPaystackAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          handleInputChange({
                            target: {
                              name: 'phoneNumber',
                              value: value
                            }
                          });
                        }
                        setPhoneError(''); // Clear error on change
                      }}
                      onBlur={() => {
                        if (formData.phoneNumber) {
                          const validation = validatePhoneNumber(formData.phoneNumber);
                          if (!validation.isValid) {
                            setPhoneError(validation.error);
                          }
                        }
                      }}
                      placeholder="0241234567"
                      required
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl font-medium focus:ring-2 transition-all ${
                        phoneError
                          ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {phoneError ? (
                    <p className="text-xs text-red-500 font-semibold mt-1.5">{phoneError}</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1.5">Data will be sent to this number</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">For order confirmation and tracking</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. John Mensah"
                      required
                      className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    checkingBusinessStatus ||
                    (businessStatus && !businessStatus.isOpen)
                  }
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-100 hover:bg-gradient-to-br hover:from-blue-600 hover:to-purple-600 hover:shadow-blue-200 transition-all font-black text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingBusinessStatus
                    ? 'Checking availability...'
                    : submitting
                    ? 'Processing...'
                    : dataPurchaseCharge > 0
                      ? `Pay GHS ${totalPaystackAmount.toFixed(2)}`
                      : `Pay GHS ${selectedPlanPrice.toFixed(2)}`
                  }
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500">
                  Secured by <span className="font-bold text-blue-600">Paystack</span>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/guest/track-order"
              className="text-sm text-blue-600 hover:text-blue-700 font-bold underline"
            >
              Track your order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading data plans...</p>
        </div>
      </div>
    );
  }

  const availableNetworks = Object.keys(grouped);
  const currentBundles = grouped[selectedNetwork] || [];
  const sortedCurrentBundles = [...currentBundles].sort((a, b) => {
    const sizeDiff = getBundleSizeInGB(a) - getBundleSizeInGB(b);
    if (sizeDiff !== 0) return sizeDiff;

    return Number(a?.price || 0) - Number(b?.price || 0);
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top Header */}
      <div className="sticky top-0 z-20 app-pro-header px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-blue-600 min-w-0">
              <Wifi size={16} className="flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Guest Purchase</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/guest/track-order"
                className="text-xs font-bold text-slate-600 hover:text-blue-600 uppercase tracking-wider whitespace-nowrap"
              >
                Track Order
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
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Buy Data Bundles
            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-full uppercase tracking-widest">
              Guest
            </span>
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <p className="font-bold text-rose-900 text-sm mt-1.5">{error}</p>
          </div>
        )}

        {/* Network Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layout size={18} className="text-blue-500" />
              Select Network
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {availableNetworks.map(network => {
              const styles = getNetworkStyles(network);
              const isSelected = selectedNetwork === network;
              return (
                <button
                  key={network}
                  onClick={() => setSelectedNetwork(network)}
                  className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden group ${
                    isSelected
                      ? `bg-white ${styles.border} shadow-lg ${styles.ring.replace('ring-', 'shadow-')} ${styles.accent} ring-4 ${styles.ring}`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-slate-900'
                  }`}
                >
                  <Wifi size={24} className={isSelected ? styles.accent : 'text-slate-400 group-hover:text-blue-400 transition-colors'} />
                  <span className="font-black text-[10px] uppercase tracking-widest w-full text-center">{network}</span>
                  {isSelected && (
                    <div className={`absolute top-0 right-0 p-1 ${styles.bg} ${styles.text} rounded-bl-xl`}>
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bundles Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[400px]">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${getNetworkStyles(selectedNetwork).lightBg} ${getNetworkStyles(selectedNetwork).accent} rounded-xl`}>
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedNetwork}</p>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Available Offers</h3>
              </div>
            </div>
          </div>

          <div className="p-6">
            {currentBundles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Wifi size={40} />
                </div>
                <div>
                  <p className="text-slate-600 font-bold text-lg">No bundles found</p>
                  <p className="text-slate-400 text-sm">Please check back later or try another network.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {sortedCurrentBundles.map(bundle => {
                  const styles = getNetworkStyles(bundle.network);
                  const displayDataSize = bundle?.dataAmount
                    || bundle?.dataSize
                    || (bundle?.dataSizeMB ? `${bundle.dataSizeMB}GB` : '')
                    || (bundle?.name?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
                    || 'Data';
                  return (
                    <div
                      key={bundle._id}
                      onClick={() => bundle.inStock && handlePlanSelect(bundle)}
                      className={`group relative overflow-hidden p-3 sm:p-4 rounded-2xl border ring-1 ring-slate-200/60 transition-all duration-300 bg-white ${
                        bundle.inStock
                          ? `border-slate-200/80 shadow-[0_8px_22px_rgba(2,6,23,0.12),0_2px_6px_rgba(2,6,23,0.06)] hover:shadow-[0_18px_36px_rgba(2,6,23,0.18),0_6px_14px_rgba(6,95,130,0.14)] ${styles.hoverBorder} hover:-translate-y-0.5 cursor-pointer`
                          : 'opacity-60 cursor-not-allowed border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className={`pointer-events-none absolute -right-7 -top-7 h-16 w-16 rounded-full ${styles.lightBg} blur-xl`} />

                      {/* Status & Network Badge */}
                      <div className="relative flex justify-between items-start mb-2 sm:mb-3">
                        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          bundle.inStock
                            ? `${styles.lightBg} ${styles.accent} ${styles.border.replace('border-', 'border-opacity-30 border-')}`
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {bundle.network}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles.lightBg} ${styles.accent} ${styles.border.replace('border-', 'border-opacity-30 border-')}`}>
                          {displayDataSize}
                        </span>
                        {!bundle.inStock && (
                          <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                            <AlertCircle size={10} />
                            Out
                          </span>
                        )}
                      </div>

                      {/* Action Section */}
                      <div className="space-y-2 pt-2.5 border-t border-slate-100">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                          <span className={`text-sm sm:text-base font-black ${styles.accent} tracking-tighter`}>
                            {formatCurrencyAbbreviated(bundle.price)}
                          </span>
                        </div>

                        <button
                          className={`w-full py-2 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[10px] sm:text-[11px] uppercase tracking-widest ${
                            bundle.inStock
                              ? `bg-slate-900 text-white shadow-lg shadow-slate-100 group-hover:bg-gradient-to-br ${styles.gradient} group-hover:shadow-blue-200 group-hover:scale-[1.02]`
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <ShoppingCart size={14} strokeWidth={3} />
                          BUY NOW
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
