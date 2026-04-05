import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Wifi,
  Check,
  CreditCard,
  RefreshCw,
  Layout,
  Zap,
  TrendingUp
} from 'lucide-react';
import { dataplans, publicAPI } from '../services/api';
import PurchaseModal from '../components/PurchaseModal';
import PurchaseVerificationModal from '../components/PurchaseVerificationModal';
import UserLayout from '../components/UserLayout';
import { getNetworkStyles } from '../utils/networkStyles';

export default function BuyData() {
  const { user, updateBalance } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState('MTN');
  const [bundles, setBundles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [successDetails, setSuccessDetails] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [initializedFromParams, setInitializedFromParams] = useState(false);

  const [selectedOfferType, setSelectedOfferType] = useState('All');

  const isGroupedNetworkEntry = (entry) => {
    return !!entry && typeof entry === 'object' && !Array.isArray(entry);
  };

  const flattenNetworkBundles = (networkEntry) => {
    if (!networkEntry) return [];
    if (Array.isArray(networkEntry)) return networkEntry;
    if (isGroupedNetworkEntry(networkEntry)) {
      return Object.values(networkEntry).flat();
    }
    return [];
  };

  const fetchDataPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await publicAPI.getActivePlans(500, 0);
      if (response.success) {
        const grouped = response.grouped || {};
        setBundles(grouped);

        const networks = Object.keys(grouped);
        if (networks.length > 0) {
          if (!grouped[selectedNetwork]) {
            setSelectedNetwork(networks[0]);
          }
        }
      }
    } catch (error) {
      setError('Failed to load data plans');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    fetchDataPlans();
  }, [fetchDataPlans]);

  useEffect(() => {
    setSelectedOfferType('All');
  }, [selectedNetwork]);

  useEffect(() => {
    if (!loading && !initializedFromParams) {
      const planId = searchParams.get('planId');
      const network = searchParams.get('network');

      if (planId && network && bundles[network]) {
        setSelectedNetwork(network);
        const bundle = flattenNetworkBundles(bundles[network]).find(b => b._id === planId);
        if (bundle) {
          setSelectedBundle(bundle);
          setShowPurchaseModal(true);
          setInitializedFromParams(true);
        }
      } else if (planId && network && Object.keys(bundles).length > 0) {
        const allBundles = Object.values(bundles).flatMap((entry) => flattenNetworkBundles(entry));
        const foundBundle = allBundles.find(b => b._id === planId);
        if (foundBundle && foundBundle.network === network) {
          setSelectedNetwork(network);
          setSelectedBundle(foundBundle);
          setShowPurchaseModal(true);
          setInitializedFromParams(true);
        }
      }
    }
  }, [loading, bundles, searchParams, initializedFromParams]);

  useEffect(() => {
    const pending = localStorage.getItem('pendingPurchaseVerification');
    if (pending) {
      const { reference, orderId } = JSON.parse(pending);
      setVerificationData({ reference, orderId });
      setShowVerificationModal(true);
    }
  }, []);

  const handlePurchaseClick = (bundle) => {
    if (bundle.inStock) {
      setSelectedBundle(bundle);
      setShowPurchaseModal(true);
      setError('');
    }
  };

  const handlePurchaseSuccess = (data) => {
    setShowPurchaseModal(false);
    setSuccessMessage('Purchase completed successfully!');
    setSuccessDetails(data);

    if (updateBalance && data.wallet) {
      updateBalance(data.wallet.balance);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      setSuccessDetails(null);
    }, 8000);

    fetchDataPlans();
  };

  const handleVerificationSuccess = (result) => {
    setShowVerificationModal(false);
    setVerificationData(null);
    localStorage.removeItem('pendingPurchaseVerification');

    // Refund case: provider failed but money was credited back to wallet
    if (result.refunded) {
      if (updateBalance && result.walletBalance != null) {
        updateBalance(result.walletBalance);
      }
      // Don't show "Purchase completed" banner — the modal already showed the refund info
      return;
    }

    setSuccessMessage('Purchase completed successfully!');
    setSuccessDetails(result.data);

    if (updateBalance && result.data?.order) {
      updateBalance(result.data.order.balance);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      setSuccessDetails(null);
    }, 8000);

    fetchDataPlans();
  };

  const handleVerificationError = () => {
    localStorage.removeItem('pendingPurchaseVerification');
    setError('Payment verification failed. Please check your transactions.');
  };

  // Helper function to check if user qualifies for agent pricing
  const isQualifiedAgent = () => {
    return user?.agentFeeStatus === 'paid' || user?.agentFeeStatus === 'protocol';
  };

  // Helper function to check if user qualifies for vendor pricing
  const isQualifiedVendor = () => {
    return user?.role === 'vendor';
  };

  // Helper function to get the correct price based on user role and status
  const getDisplayPrice = (bundle) => {
    if (isQualifiedAgent() && bundle.agentPrice) {
      return bundle.agentPrice;
    }
    if (isQualifiedVendor() && bundle.vendorPrice) {
      return bundle.vendorPrice;
    }
    return bundle.sellingPrice;
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-slate-400 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-slate-600">Loading data plans...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  const availableNetworks = Object.keys(bundles);
  const selectedNetworkEntry = bundles[selectedNetwork];
  const hasOfferTypeGroups = isGroupedNetworkEntry(selectedNetworkEntry);
  const currentBundles = hasOfferTypeGroups
    ? (selectedOfferType === 'All'
      ? Object.values(selectedNetworkEntry || {}).flat()
      : selectedNetworkEntry?.[selectedOfferType] || [])
    : flattenNetworkBundles(selectedNetworkEntry);

  const offerTypes = hasOfferTypeGroups
    ? ['All', ...Object.keys(selectedNetworkEntry || {})]
    : [];

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50/50">
        {/* Top Header - Glassmorphism */}
        <div className="sticky top-0 z-20 app-pro-header px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-600 min-w-0">
                <Wifi size={16} className="flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Data Marketplace</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-xs">
                  <CreditCard size={14} />
                  <span>GH₵ {formatCurrencyAbbreviated(user?.balance) || '0'}</span>
                </div>
                <button
                  onClick={fetchDataPlans}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Refresh Plans"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2">
              Buy Data Bundles
              <span className="text-[10px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-full uppercase tracking-widest">
                Live
              </span>
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Mobile Balance Card */}
          <div className="md:hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-100 text-white">
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1">Available Balance</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black tracking-tight">GH₵ {formatCurrencyAbbreviated(user?.balance) || '0'}</span>
              <span className="text-blue-200 text-xs font-bold mb-1.5 flex items-center gap-1">
                <TrendingUp size={12} />
                Instantly Active
              </span>
            </div>
          </div>

          {/* Messages */}
          {(successMessage || error) && (
            <div className="space-y-4">
              {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-emerald-900 text-sm">{successMessage}</p>
                    {successDetails && (
                      <p className="text-emerald-700 text-xs mt-0.5 font-medium opacity-80">
                        Order #{successDetails.order?.orderNumber} • {successDetails.order?.dataAmount}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <p className="font-bold text-rose-900 text-sm mt-1.5">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Network Selection */}
          <div className="space-y-6">
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
                    className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden group ${isSelected
                      ? `bg-white ${styles.border} shadow-lg ${styles.ring.replace('ring-', 'shadow-')} ${styles.accent} ring-4 ${styles.ring}`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-slate-900'
                      }`}
                  >
                    <Wifi size={24} className={isSelected ? styles.accent : 'text-slate-400 group-hover:text-blue-400 transition-colors'} />
                    <span className="font-black text-xs uppercase tracking-widest">{network}</span>
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

          {/* Offer Filters */}
          {offerTypes.length > 0 && (
            <div className="p-2 bg-slate-100/50 rounded-2xl flex gap-1 overflow-x-auto scrollbar-hide">
              {offerTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedOfferType(type)}
                  className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedOfferType === type
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentBundles.map(bundle => {
                    const styles = getNetworkStyles(bundle.network);
                    return (
                      <div
                        key={bundle._id}
                        onClick={() => bundle.inStock && handlePurchaseClick(bundle)}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 bg-white ${bundle.inStock
                          ? `border-slate-200/60 shadow-sm hover:shadow-xl ${styles.hoverBorder} hover:-translate-y-1 cursor-pointer`
                          : 'opacity-60 cursor-not-allowed border-slate-100 bg-slate-50'
                          }`}
                      >
                        {/* Status & Network Badge */}
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${bundle.inStock
                            ? `${styles.lightBg} ${styles.accent} ${styles.border.replace('border-', 'border-opacity-30 border-')}`
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            {bundle.network}
                          </span>
                          {!bundle.inStock && (
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                              <AlertCircle size={10} />
                              Out
                            </span>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="text-center mb-3">
                          <p className="text-2xl font-black text-slate-900 tracking-tight mb-0.5 select-none">
                            {bundle.dataSize}
                          </p>
                        </div>

                        {/* Action Section */}
                        <div className="space-y-2 pt-3 border-t border-slate-50">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                              {isQualifiedAgent() && bundle.agentPrice && (
                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Agent Rate</span>
                              )}
                              {isQualifiedVendor() && bundle.vendorPrice && (
                                <span className="text-[8px] font-bold text-purple-600 uppercase tracking-widest">Vendor Rate</span>
                              )}
                            </div>
                            <span className={`text-base font-black ${styles.accent} tracking-tighter`}>{formatCurrencyAbbreviated(getDisplayPrice(bundle))}</span>
                          </div>

                          <button
                            className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[11px] uppercase tracking-widest ${bundle.inStock
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

        {/* Purchase Modal */}
        <PurchaseModal
          bundle={selectedBundle}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          userBalance={user?.balance || 0}
          user={user}
          onPurchaseSuccess={handlePurchaseSuccess}
        />

        {/* Verification Modal */}
        {verificationData && (
          <PurchaseVerificationModal
            isOpen={showVerificationModal}
            reference={verificationData.reference}
            onClose={() => {
              setShowVerificationModal(false);
              setVerificationData(null);
            }}
            onSuccess={handleVerificationSuccess}
            onError={handleVerificationError}
          />
        )}
      </div>
    </UserLayout >
  );
}