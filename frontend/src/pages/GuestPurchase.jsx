import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Wifi, Phone, ArrowLeft, Layout, Zap, Check, AlertCircle, Home, Clock, Loader2, ChevronRight, CreditCard } from 'lucide-react';
import { guest, publicAPI } from '../services/api';
// import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { getNetworkStyles } from '../utils/networkStyles';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { useSettings } from '../context/SettingsContext';
import {
  // formatChargeDescriptor,
  getDataPurchaseChargeAmount,
  parseTransactionCharges,
} from '../utils/transactionCharges';

/* ── Homepage multi-colour palette ── */
// const palette = [
//   { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' },   // purple
//   { main: '#0F6E56', bg: '#D1FAE5', soft: '#ECFDF5', glow: 'rgba(15,110,86,0.15)' },    // teal
//   { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF', glow: 'rgba(29,78,216,0.15)' },    // blue
//   { main: '#B45309', bg: '#FEF3C7', soft: '#FFFBEB', glow: 'rgba(180,83,9,0.15)' },     // amber
//   { main: '#BE185D', bg: '#FCE7F3', soft: '#FDF2F8', glow: 'rgba(190,24,93,0.15)' },    // pink
//   { main: '#DC2626', bg: '#FEE2E2', soft: '#FFF5F5', glow: 'rgba(220,38,38,0.15)' },    // coral/red
//   { main: '#0369A1', bg: '#E0F2FE', soft: '#F0F9FF', glow: 'rgba(3,105,161,0.15)' },    // sky
//   { main: '#4D7C0F', bg: '#ECFCCB', soft: '#F7FEE7', glow: 'rgba(77,124,15,0.15)' },    // lime/green
// ];

// const getColor = (index) => palette[index % palette.length];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #ffffff;
    min-height: 100vh;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
    border: 1.5px solid #A7F3D0;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(15,110,86,0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  @media (min-width: 640px) {
    .dash-header {
      padding: 24px;
      gap: 16px;
    }
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-icon-box {
    width: 36px;
    height: 36px;
    background: #0F6E56;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(15,110,86,0.25);
  }

  @media (min-width: 640px) {
    .dash-icon-box {
      width: 46px;
      height: 46px;
    }
  }

  .dash-h2 {
    font-size: 20px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  @media (min-width: 640px) {
    .dash-h2 {
      font-size: 26px;
    }
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .dash-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
    background: #111;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .dash-btn-outline {
    background: #fff;
    color: #111;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: 1.5px solid #e4e4de;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    background: #fafaf7;
    border-color: #d4d4ce;
  }

  .dash-premium-banner {
    background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%);
    color: #fff;
    border-radius: 14px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  }

  .dash-banner-accent {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 100px;
    height: 100px;
    background: rgba(15, 110, 86, 0.08);
    border-radius: 50%;
    filter: blur(40px);
  }

  .dash-plan-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }

  .dash-plan-card:hover {
    transform: translateY(-4px);
    border-color: var(--plan-color, #111);
    box-shadow: 0 12px 30px var(--plan-glow, rgba(0,0,0,0.08));
  }

  .dash-plan-card.out-of-stock {
    opacity: 0.6;
    filter: grayscale(1);
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
    border-color: #e4e4de !important;
  }

  .dash-network-btn {
    padding: 10px 20px;
    border-radius: 12px;
    border: 1.5px solid #e4e4de;
    background: #fafaf7;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .dash-network-btn.active {
    background: #0F6E56;
    border-color: #0F6E56;
    color: #fff;
    box-shadow: 0 4px 12px rgba(15,110,86,0.2);
  }

  .dash-network-btn:not(.active):hover {
    border-color: #0F6E56;
    background: #fff;
  }

  .dash-filter-btn {
    padding: 8px 20px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .dash-filter-btn.active {
    background: #0F6E56;
    color: #fff;
    box-shadow: 0 4px 12px rgba(15,110,86,0.2);
  }

  .dash-filter-btn:not(.active) {
    color: #000;
  }

  .dash-filter-btn:not(.active):hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

export default function GuestPurchase() {
  const { settings } = useSettings();
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

  const [selectedOfferType, setSelectedOfferType] = useState('All');

  const activeProviderAbbr = settings?.vtuProvider
    ? String(settings.vtuProvider).toUpperCase()
    : 'TP';

  const [formData, setFormData] = useState({
    phoneNumber: '',
  });

  const generateEmail = (phone) => `${phone}@vjidatahub.com`;
  const generateName = (phone) => {
    const lastFourDigits = phone.slice(-4);
    return `Guest${lastFourDigits}`;
  };

  useEffect(() => {
    fetchPlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedOfferType('All');
  }, [selectedNetwork]);

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
        
        // Group by network and offerType
        const groupedData = {};
        allPlans.forEach(plan => {
          if (!groupedData[plan.network]) {
            groupedData[plan.network] = {};
          }
          const offerType = plan.offerType || 'Others';
          if (!groupedData[plan.network][offerType]) {
            groupedData[plan.network][offerType] = [];
          }
          groupedData[plan.network][offerType].push(plan);
        });
        setGrouped(groupedData);
        
        // Set initial network if not set
        const networks = Object.keys(groupedData);
        if (networks.length > 0 && !groupedData[selectedNetwork]) {
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

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ phoneNumber: value });
      setPhoneError('');
    }
  };

  const validateForm = () => {
    setPhoneError('');
    
    if (!formData.phoneNumber) {
      return 'Phone number is required';
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      return phoneValidation.error;
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

      const generatedEmail = generateEmail(normalizedPhone);
      const generatedName = generateName(normalizedPhone);

      const response = await guest.initializePurchase({
        dataPlanId: selectedPlan._id,
        phoneNumber: normalizedPhone,
        email: generatedEmail,
        name: generatedName,
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

  if (loading) {
    return (
      <div className="dash-wrapper flex items-center justify-center">
        <style>{styles}</style>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0F6E56] mx-auto mb-4" />
          <p className="font-bold text-gray-900">Loading data plans...</p>
        </div>
      </div>
    );
  }

  if (showCheckout && selectedPlan) {
    const selectedPlanPrice = Number(selectedPlan.price || 0);
    const dataPurchaseCharge = getDataPurchaseChargeAmount(transactionCharges, selectedPlanPrice);
    const totalPaystackAmount = selectedPlanPrice + dataPurchaseCharge;
    // const chargeDescriptor = formatChargeDescriptor(
    //   transactionCharges.dataPurchaseChargeType,
    //   transactionCharges.dataPurchaseCharge,
    //   'GHS'
    // );
    const selectedPlanDataSize = selectedPlan?.dataSize
      || selectedPlan?.dataAmount
      || (selectedPlan?.dataSizeMB ? `${selectedPlan.dataSizeMB}GB` : '')
      || (selectedPlan?.name?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
      || 'Data';

    return (
      <div className="dash-wrapper">
        <style>{styles}</style>
        <div className="dash-content">
          <div className="dash-header" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', borderColor: '#BAE6FD' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="dash-heading-row">
                <div className="dash-icon-box" style={{ background: '#0369A1', boxShadow: '0 4px 16px rgba(3,105,161,0.25)' }}>
                  <ShoppingCart size={20} strokeWidth={2.5} />
                </div>
                <h2 className="dash-h2">Complete Purchase</h2>
              </div>
              <button
                onClick={() => {
                  setShowCheckout(false);
                  setSelectedPlan(null);
                  setError('');
                  setBusinessStatus(null);
                }}
                className="dash-btn-outline text-xs sm:text-sm px-3 py-2"
              >
                <ArrowLeft size={14} className="sm:hidden" />
                <ArrowLeft size={16} className="hidden sm:block" />
                <span className="hidden sm:inline">Back to Plans</span>
                <span className="sm:hidden">Back</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Plan Summary */}
              <div className="dash-card py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0369A1] shadow-sm">
                      <Zap size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Selected Plan</p>
                      <p className="font-bold text-gray-900 leading-none">{selectedPlan.network} {selectedPlanDataSize}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-1">{selectedPlan.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Price</p>
                    <p className="text-lg font-black text-gray-900 leading-none">GHS {selectedPlanPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Business Status */}
              {businessStatus && !businessStatus.isOpen && (
                <div className="dash-card" style={{ background: '#FFF7ED', borderColor: '#FFEDD5' }}>
                  <div className="flex items-start gap-3 text-orange-700">
                    <Clock size={20} />
                    <div>
                      <p className="font-bold">Business Closed</p>
                      <p className="text-sm">{businessStatus.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="dash-card" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
                  <div className="flex items-start gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <p className="font-bold">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Form */}
            <div className="dash-card">
              <h3 className="dash-card-title">
                <Phone size={18} className="text-[#0369A1]" />
                Enter Phone Number
              </h3>
              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="0241234567"
                      required
                      className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:bg-white transition-all font-bold ${
                        phoneError ? 'border-red-400' : 'border-gray-100 focus:border-blue-400'
                      }`}
                    />
                  </div>
                  {phoneError && <p className="text-[10px] font-bold text-red-500 ml-1">{phoneError}</p>}
                </div>

                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auto-generated Details</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-bold text-gray-700">
                      {formData.phoneNumber ? generateEmail(formData.phoneNumber) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-bold text-gray-700">
                      {formData.phoneNumber ? generateName(formData.phoneNumber) : '—'}
                    </span>
                  </div>
                </div>

                {dataPurchaseCharge > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-600">
                      <span>Plan price</span>
                      <span>GHS {selectedPlanPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-amber-600">
                      <span>Service charge</span>
                      <span>+ GHS {dataPurchaseCharge.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span>GHS {totalPaystackAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || checkingBusinessStatus || (businessStatus && !businessStatus.isOpen)}
                  className="dash-btn-primary w-full py-4 rounded-xl text-sm uppercase tracking-widest shadow-lg shadow-gray-200 mt-4 disabled:opacity-50"
                  style={{ background: '#0369A1' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Pay GHS {totalPaystackAmount.toFixed(2)}
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">
                  Secured by <span className="text-[#00C5FF]">Paystack</span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const availableNetworks = Object.keys(grouped);
  const selectedNetworkEntry = grouped[selectedNetwork] || {};
  const currentBundles = selectedOfferType === 'All'
    ? Object.values(selectedNetworkEntry).flat()
    : selectedNetworkEntry[selectedOfferType] || [];

  const sortedCurrentBundles = [...currentBundles].sort((a, b) => {
    const sizeDiff = getBundleSizeInGB(a) - getBundleSizeInGB(b);
    if (sizeDiff !== 0) return sizeDiff;

    return Number(a?.price || 0) - Number(b?.price || 0);
  });

  const offerTypes = ['All', ...Object.keys(selectedNetworkEntry)];

  return (
    <div className="dash-wrapper">
      <style>{styles}</style>
      <div className="dash-content">
        <div className="dash-header">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="dash-heading-row">
              <div className="dash-icon-box">
                <Wifi size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="dash-h2">Buy Data Bundles</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-[#0F6E56] text-white rounded-full uppercase tracking-widest">
                    Guest Mode
                  </span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border"
                    style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      borderColor: '#FDE68A',
                    }}
                    title="Active VTU Provider"
                  >
                    {activeProviderAbbr}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/guest/track-order" className="dash-btn-outline">
                <Clock size={16} />
                Track Order
              </Link>
              <Link to="/" className="dash-btn-outline">
                <Home size={16} />
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="dash-card" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
            <div className="flex items-start gap-3 text-red-700">
              <AlertCircle size={20} />
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Network Selection */}
        <div className="dash-card">
          <h3 className="dash-card-title">
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: '#DBEAFE', color: '#1D4ED8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Layout size={15} strokeWidth={2.5} />
            </div>
            Select Network
          </h3>
          <div className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 scrollbar-hide">
            {availableNetworks.map((network) => {
              const isSelected = selectedNetwork === network;
              const netStyles = getNetworkStyles(network);
              const c = netStyles.palette;
              return (
                <button
                  key={network}
                  onClick={() => setSelectedNetwork(network)}
                  className={`dash-network-btn group ${isSelected ? 'active' : ''}`}
                  style={isSelected ? {
                    background: c.isGradient ? c.gradient : c.main,
                    borderColor: c.isGradient ? 'transparent' : c.main,
                    boxShadow: `0 10px 20px ${c.glow}`
                  } : {}}
                >
                  <Wifi size={18} className={isSelected ? 'text-white' : 'text-black'} />
                  <span className="font-black text-[10px] uppercase tracking-widest" style={isSelected ? { color: '#fff' } : {}}>{network}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Offer Filters */}
        {offerTypes.length > 1 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Offer Categories</h3>
            <div className="p-1.5 bg-white border-1.5 border-[#e4e4de] rounded-xl flex gap-1 overflow-x-auto scrollbar-hide">
              {offerTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedOfferType(type)}
                  className={`dash-filter-btn ${selectedOfferType === type ? 'active' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bundles Grid */}
        <div className="dash-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="dash-card-title" style={{ margin: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#FCE7F3', color: '#BE185D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={15} strokeWidth={2.5} />
              </div>
              {selectedNetwork} Data Plans
            </h3>
          </div>

          {currentBundles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <Wifi size={48} className="mb-4" />
              <p className="font-bold">No plans available for {selectedNetwork}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sortedCurrentBundles.map((bundle) => {
                const displayDataSize = bundle?.dataAmount
                  || bundle?.dataSize
                  || (bundle?.dataSizeMB ? `${bundle.dataSizeMB}GB` : '')
                  || (bundle?.name?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
                  || 'Data';
                const netStyles = getNetworkStyles(bundle.network || selectedNetwork);
                const c = netStyles.palette;

                return (
                  <div
                    key={bundle._id}
                    onClick={() => bundle.inStock && handlePlanSelect(bundle)}
                    className={`dash-plan-card group ${!bundle.inStock ? 'out-of-stock' : ''}`}
                    style={{
                      '--plan-color': c.main + '66',
                      '--plan-glow': c.glow,
                      background: c.gradient || c.main
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase border" style={{ background: 'rgba(255,255,255,0.2)', color: c.text, borderColor: 'rgba(255,255,255,0.3)' }}>{bundle.network}</span>
                      {!bundle.inStock && (
                         <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">OUT OF STOCK</span>
                      )}
                    </div>

                    <div className="mb-4">
                      <h4 className="text-xl font-black leading-tight mb-1" style={{ color: c.text }}>{displayDataSize}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: c.text === '#ffffff' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}>
                        <Clock size={10} strokeWidth={3} />
                        {bundle.validity || 'Instantly Active'}
                      </p>
                    </div>

                    <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black" style={{ color: c.text }}>GHS {bundle.price.toFixed(2)}</span>
                        </div>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(255,255,255,0.2)', color: c.text }}>
                          <ChevronRight size={12} strokeWidth={3} />
                        </div>
                      </div>

                      <button
                        disabled={!bundle.inStock}
                        className="w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        style={bundle.inStock
                          ? { background: c.text === '#ffffff' ? '#ffffff' : '#000000', color: c.text === '#ffffff' ? c.main : '#ffffff' }
                          : { background: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.3)' }
                        }
                      >
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
  );
}
