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
  TrendingUp,
  Loader2,
  Phone,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { publicAPI } from '../services/api';
import PurchaseModal from '../components/PurchaseModal';
import PurchaseVerificationModal from '../components/PurchaseVerificationModal';
import UserLayout from '../components/UserLayout';
import { getNetworkStyles } from '../utils/networkStyles';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-icon-box {
    width: 46px;
    height: 46px;
    background: #111;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f0a500;
    flex-shrink: 0;
  }

  .dash-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: #d4d4ce;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
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
    background: rgba(240, 165, 0, 0.05);
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
    border-color: #111;
    box-shadow: 0 12px 30px rgba(0,0,0,0.08);
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
    padding: 16px;
    border-radius: 14px;
    border: 1.5px solid #e4e4de;
    background: #fafaf7;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .dash-network-btn.active {
    background: #111;
    border-color: #111;
    color: #fff;
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  }

  .dash-network-btn:not(.active):hover {
    border-color: #111;
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
    background: #111;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .dash-filter-btn:not(.active) {
    color: #64748b;
  }

  .dash-filter-btn:not(.active):hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [loading, bundles, searchParams, initializedFromParams, flattenNetworkBundles]);

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

  const getBundleSizeInGB = (bundle) => {
    const textCandidates = [bundle?.dataSize, bundle?.dataAmount, bundle?.name, bundle?.planName];

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

  const sortedCurrentBundles = [...currentBundles].sort((a, b) => {
    const sizeDiff = getBundleSizeInGB(a) - getBundleSizeInGB(b);
    if (sizeDiff !== 0) return sizeDiff;

    return Number(getDisplayPrice(a) || 0) - Number(getDisplayPrice(b) || 0);
  });

  const offerTypes = hasOfferTypeGroups
    ? ['All', ...Object.keys(selectedNetworkEntry || {})]
    : [];

  return (
    <UserLayout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>
        
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <Wifi size={24} />
                </div>
                <div>
                  <h2 className="dash-h2">Data Marketplace</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 font-mono uppercase">Buy Data Bundles</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDataPlans}
                  className="dash-btn-outline p-2"
                  title="Refresh Plans"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Available Balance</p>
                  <p className="dash-stat-value">{formatCurrencyAbbreviated(user?.balance || 0)}</p>
                </div>
                <CreditCard size={18} style={{ color: '#10b981' }} />
              </div>
            </div>
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">System Status</p>
                  <p className="dash-stat-value">Active</p>
                </div>
                <Activity size={18} style={{ color: '#3b82f6' }} />
              </div>
            </div>
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Network Health</p>
                  <p className="dash-stat-value">100%</p>
                </div>
                <ShieldCheck size={18} style={{ color: '#f0a500' }} />
              </div>
            </div>
            <div className="dash-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="dash-stat-label">Secure Access</p>
                  <p className="dash-stat-value">Verified</p>
                </div>
                <CheckCircle2 size={18} style={{ color: '#a855f7' }} />
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="dash-premium-banner" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <CheckCircle size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Success</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                    {successMessage} {successDetails && `Order #${successDetails.order?.orderNumber} • ${successDetails.order?.dataAmount}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="dash-premium-banner" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
              <div className="dash-banner-accent"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <AlertCircle size={28} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Error</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Network Selection */}
          <div className="dash-card">
            <h3 className="dash-card-title">
              <Layout size={18} style={{ color: '#3b82f6' }} />
              Select Network
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {availableNetworks.map(network => {
                const isSelected = selectedNetwork === network;
                return (
                  <button
                    key={network}
                    onClick={() => setSelectedNetwork(network)}
                    className={`dash-network-btn group ${isSelected ? 'active' : ''}`}
                  >
                    <Wifi size={24} className={isSelected ? 'text-[#f0a500]' : 'text-slate-400 group-hover:text-blue-400'} />
                    <span className="font-black text-[10px] uppercase tracking-widest">{network}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Offer Filters */}
          {offerTypes.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Offer Categories</h3>
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
                <Zap size={18} style={{ color: '#f0a500' }} />
                {selectedNetwork} Bundles
              </h3>
            </div>

            {currentBundles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1.5px dashed #e4e4de', borderRadius: '14px' }}>
                <Wifi size={40} style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#999' }}>No bundles found for this network.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sortedCurrentBundles.map(bundle => {
                  const displayDataSize = bundle?.dataSize
                    || bundle?.dataAmount
                    || (bundle?.dataSizeMB ? `${bundle.dataSizeMB}GB` : '')
                    || (bundle?.name?.match(/\d+(?:\.\d+)?\s*GB/i)?.[0] ?? '')
                    || 'Data';
                  
                  return (
                    <div
                      key={bundle._id}
                      onClick={() => bundle.inStock && handlePurchaseClick(bundle)}
                      className={`dash-plan-card group ${!bundle.inStock ? 'out-of-stock' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 text-[9px] font-black uppercase text-slate-400 border border-slate-100">{bundle.network}</span>
                        {!bundle.inStock && (
                           <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">OUT OF STOCK</span>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="text-xl font-black text-[#111] leading-tight mb-1">{displayDataSize}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={10} strokeWidth={3} />
                          {bundle.validity || 'Instantly Active'}
                        </p>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-[#f5f5f0]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-[#059669]">{formatCurrencyAbbreviated(getDisplayPrice(bundle))}</span>
                            {isQualifiedAgent() && bundle.agentPrice && (
                              <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Agent Rate</span>
                            )}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#111] group-hover:text-white transition-all">
                            <ChevronRight size={12} strokeWidth={3} />
                          </div>
                        </div>
                        
                        <button
                          disabled={!bundle.inStock}
                          className={`w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${bundle.inStock
                            ? 'bg-[#111] text-white group-hover:bg-[#333]'
                            : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Buy Bundle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
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
    </UserLayout>
  );
}