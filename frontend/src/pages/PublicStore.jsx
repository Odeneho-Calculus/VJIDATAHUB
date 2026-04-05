import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, MessageCircle, Phone, ShieldCheck, Zap,
  ArrowRight, X, ChevronRight, CheckCircle2, Layout, Sparkles,
  ShoppingBag, Activity, Globe2, Lock, Mail, Facebook, Instagram, Twitter, Smartphone, Headphones
} from 'lucide-react';
import { io } from 'socket.io-client';
import { store as storeAPI, publicAPI } from '../services/api';
import { getSocketBaseUrl } from '../utils/apiBaseUrl';

export default function PublicStore() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const socketRef = useRef(null);
  const fabRef = useRef(null);
  const [networkCatalog, setNetworkCatalog] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setShowFabMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchStoreData();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [slug]);

  const setupSocket = () => {
    const socketUrl = getSocketBaseUrl();

    socketRef.current = io(socketUrl, {
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_store', slug);
    });

    socketRef.current.on('store_updated', (data) => {
      setIsUpdating(true);
      if (data.type === 'branding') {
        setStore(data.store);
      } else {
        fetchStoreData(false);
      }
      setTimeout(() => setIsUpdating(false), 2000);
    });
  };

  const fetchStoreData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [storeData, systemSettings] = await Promise.all([
        storeAPI.getPublicStore(slug),
        publicAPI.getSystemSettings()
      ]);

      setStore(storeData.store);

      const catalog = systemSettings?.settings?.networkCatalog || [];
      const normalize = (v = '') => v.toString().trim().toLowerCase().replace(/\s+/g, '');
      const normalizedCatalog = catalog
        .filter((n) => n && n.isActive !== false)
        .map((n) => ({
          name: n.name,
          slug: n.slug || n.name,
          logoUrl: n.logoUrl,
          normalized: normalize(n.slug || n.name),
        }));
      setNetworkCatalog(normalizedCatalog);

      if (!storeData.accessStatus?.isAccessible) {
        setError(storeData.accessStatus?.message || 'Store is not available');
      }
    } catch (err) {
      setError(err.message || 'Store not found');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const primaryColor = store?.theme?.primaryColor || '#2563eb';
  const secondaryColor = store?.theme?.secondaryColor || '#64748b';

  const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return `rgba(37,99,235,${alpha})`;
    let normalized = hex.replace('#', '').trim();
    if (normalized.length === 3) {
      normalized = normalized.split('').map((char) => char + char).join('');
    }
    const parsed = Number.parseInt(normalized, 16);
    if (Number.isNaN(parsed) || normalized.length !== 6) {
      return `rgba(37,99,235,${alpha})`;
    }

    const red = (parsed >> 16) & 255;
    const green = (parsed >> 8) & 255;
    const blue = parsed & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}</style>
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center animate-[float_3s_ease-in-out_infinite] border border-slate-200/60">
            <ShoppingBag size={24} className="text-primary-600" style={{ color: primaryColor }} />
          </div>
        </div>
        <div className="mt-6 space-y-1.5 text-center">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest animate-pulse">Establishing Connection</p>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white p-8 rounded-2xl border border-slate-200/60 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Access Restricted</h1>
            <p className="text-slate-600 text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }


  const hasSocialMedia = store?.hasSocialLinks;
  const getSocialValue = (link) => {
    if (!link) return '';
    if (typeof link === 'string') return link.trim();
    if (typeof link?.value === 'string') return link.value.trim();
    return '';
  };

  const normalizeWhatsAppValue = (value = '') => {
    let normalized = value.trim().replace(/\s+/g, '');
    const waPrefixPattern = /^(https?:\/\/)?(www\.)?wa\.me\//i;

    while (waPrefixPattern.test(normalized)) {
      normalized = normalized.replace(waPrefixPattern, '');
    }

    return normalized;
  };

  const footerSocialLinks = [
    {
      id: 'whatsapp',
      icon: MessageCircle,
      value: normalizeWhatsAppValue(getSocialValue(store?.socialLinks?.whatsapp)),
      href: (value) => `https://wa.me/${value}`,
      label: 'WhatsApp'
    },
    {
      id: 'phone',
      icon: Phone,
      value: getSocialValue(store?.socialLinks?.phone),
      href: (value) => `tel:${value}`,
      label: 'Phone'
    },
    {
      id: 'email',
      icon: Mail,
      value: getSocialValue(store?.socialLinks?.email),
      href: (value) => `mailto:${value}`,
      label: 'Email'
    },
    {
      id: 'facebook',
      icon: Facebook,
      value: getSocialValue(store?.socialLinks?.facebook),
      href: (value) => value,
      label: 'Facebook'
    },
    {
      id: 'instagram',
      icon: Instagram,
      value: getSocialValue(store?.socialLinks?.instagram),
      href: (value) => value,
      label: 'Instagram'
    },
    {
      id: 'twitter',
      icon: Twitter,
      value: getSocialValue(store?.socialLinks?.twitter),
      href: (value) => value,
      label: 'Twitter'
    },
  ].filter((social) => social.value);

  const defaultFeatureIcons = [Zap, ShieldCheck, Globe2];
  const featureIconMap = {
    layout: Layout,
    zap: Zap,
    'shield-check': ShieldCheck,
    globe: Globe2,
    sparkles: Sparkles,
    activity: Activity,
    smartphone: Smartphone,
  };

  const configuredFeatures = (store?.content?.features || []).filter((feature) => {
    const hasTitle = typeof feature?.title === 'string' && feature.title.trim().length > 0;
    const hasDescription = typeof feature?.description === 'string' && feature.description.trim().length > 0;
    return hasTitle || hasDescription;
  });

  const displayFeatures = configuredFeatures;

  const handleNetworkClick = (networkSlug) => {
    navigate(`/store/${slug}/catalog?network=${encodeURIComponent(networkSlug)}`);
  };

  const renderFeatureIcon = (feature, index) => {
    const iconKey = typeof feature?.icon === 'string' ? feature.icon.trim().toLowerCase() : '';
    if (iconKey && featureIconMap[iconKey]) {
      const SelectedIcon = featureIconMap[iconKey];
      return <SelectedIcon size={20} />;
    }

    const FallbackIcon = defaultFeatureIcons[index % defaultFeatureIcons.length] || Layout;
    return <FallbackIcon size={20} />;
  };

  const phoneContact = getSocialValue(store?.socialLinks?.phone);
  const emailContact = getSocialValue(store?.socialLinks?.email);
  const storePlans = Array.isArray(store?.plans) ? store.plans : [];
  const fallbackTotalPlans = storePlans.length;
  const fallbackTotalNetworks = new Set(
    storePlans
      .map((plan) => plan?.network || plan?.planId?.network || plan?.planId?.isp)
      .filter(Boolean)
  ).size;
  const totalPlans = Number.isFinite(store?.totalPlans) ? store.totalPlans : fallbackTotalPlans;
  const totalNetworks = Number.isFinite(store?.totalNetworks) ? store.totalNetworks : fallbackTotalNetworks;
  const heroImage = (store?.content?.heroImage || '').trim();
  const heroSlogan = (store?.description || store?.content?.heroSubtitle || '').trim();
  const hasHeroImage = Boolean(heroImage);
  const heroOverlayStyle = hasHeroImage
    ? {
      backgroundImage: `linear-gradient(108deg, rgba(2, 6, 23, 0.92) 0%, ${hexToRgba(primaryColor, 0.72)} 45%, ${hexToRgba(secondaryColor, 0.36)} 100%)`,
    }
    : {
      backgroundImage: `linear-gradient(108deg, ${hexToRgba(primaryColor, 0.94)} 0%, ${hexToRgba(secondaryColor, 0.82)} 100%)`,
    };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-slate-200">
      <style>{`
        @keyframes mesh {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(8%, 8%) scale(1.08); }
          66% { transform: translate(-4%, 5%) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes seaWaveDrift {
          0% { transform: translateX(-55%) translateY(0); }
          50% { transform: translateX(-10%) translateY(-2%); }
          100% { transform: translateX(35%) translateY(0); }
        }
        @keyframes seaWaveSheen {
          0% { opacity: 0.25; transform: translateX(-40%); }
          50% { opacity: 0.55; }
          100% { opacity: 0.25; transform: translateX(40%); }
        }
        @keyframes shorelineWave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .mesh-gradient {
          filter: blur(120px);
          opacity: 0.2;
          animation: mesh 24s infinite alternate linear;
        }
        .hero-wave-btn {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .hero-wave-btn::before {
          content: '';
          position: absolute;
          left: -35%;
          right: -35%;
          bottom: -55%;
          height: 150%;
          background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.32) 0%, rgba(56, 189, 248, 0.14) 42%, rgba(56, 189, 248, 0) 72%);
          border-radius: 42%;
          animation: seaWaveDrift 7s ease-in-out infinite;
          z-index: -1;
          pointer-events: none;
        }
        .hero-wave-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.36) 34%, transparent 68%);
          animation: seaWaveSheen 5.2s ease-in-out infinite;
          z-index: -1;
          pointer-events: none;
        }
        .hero-wave-btn--light::before {
          background: radial-gradient(ellipse at center, rgba(2, 132, 199, 0.28) 0%, rgba(2, 132, 199, 0.1) 40%, rgba(2, 132, 199, 0) 72%);
        }
        .shoreline-wave {
          position: absolute;
          left: 0;
          width: 200%;
          height: 100%;
          will-change: transform;
        }
        .shoreline-wave--back {
          animation: shorelineWave 14s linear infinite;
          opacity: 0.55;
        }
        .shoreline-wave--front {
          animation: shorelineWave 8s linear infinite reverse;
          opacity: 0.9;
        }
      `}</style>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-[-18%] left-[-12%] w-[46%] h-[46%] rounded-full mesh-gradient"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute bottom-[-22%] right-[-14%] w-[52%] h-[52%] rounded-full mesh-gradient"
          style={{ backgroundColor: secondaryColor, animationDelay: '-6s' }}
        />
      </div>

      {isUpdating && (
        <div className="fixed top-20 right-4 sm:right-6 z-[60] animate-in slide-in-from-right-10">
          <div className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold">Store updated</span>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 app-pro-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/store/${slug}`} className="flex items-center gap-3 min-w-0 hover:opacity-90 transition">
              {store.logo ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                  <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {store.name?.[0]}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{store.name}</h1>
                <p className="text-[11px] text-slate-500 font-medium truncate">Public agent storefront</p>
              </div>
            </Link>

            <div className="hidden xl:flex items-center gap-2 ml-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                <ShieldCheck size={12} />
                Secure Checkout
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/store/${slug}/catalog`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <Layout size={14} />
              <span className="hidden sm:inline">Catalog</span>
            </Link>
            <Link
              to={`/store/${slug}/track`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              <Activity size={14} />
              <span className="hidden sm:inline">Track</span>
            </Link>
            {phoneContact && (
              <a
                href={`tel:${phoneContact}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: primaryColor }}
              >
                <Phone size={14} />
                <span className="hidden md:inline">Support</span>
              </a>
            )}
          </div>
        </div>
      </nav>

      <main className="pb-14">
        <section className="relative overflow-hidden border-b border-slate-200 min-h-[360px] sm:min-h-[460px] lg:min-h-[540px]">
          {hasHeroImage && (
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-[70%_center] sm:object-[62%_center] lg:object-center"
            />
          )}
          <div className="absolute inset-0" style={heroOverlayStyle} />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 10% 20%, ${hexToRgba(primaryColor, 0.25)} 0%, transparent 48%), radial-gradient(circle at 85% 80%, ${hexToRgba(secondaryColor, 0.22)} 0%, transparent 42%)`,
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-9 lg:py-12">
            <div className="max-w-3xl space-y-3 sm:space-y-4">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/12 border border-white/25 backdrop-blur-sm text-white/95 w-fit">
                  <Sparkles size={12} className="text-amber-300" />
                  <span className="text-[9px] sm:text-[10px] font-semibold tracking-wide">{store.content?.heroBadge || 'Trusted digital connectivity shop'}</span>
                </div>

                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight max-w-3xl">
                  {store.name}
                </h2>

                {heroSlogan && (
                  <p className="text-xs sm:text-sm lg:text-base text-slate-100 max-w-2xl leading-snug">
                    {heroSlogan}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:max-w-md pt-1">
                  <Link
                    to={`/store/${slug}/catalog`}
                    className="hero-wave-btn hero-wave-btn--light inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 h-10 sm:h-11 rounded-lg bg-white text-slate-900 text-xs sm:text-sm font-semibold whitespace-nowrap hover:bg-slate-100 transition"
                  >
                    Browse Plans
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={`/store/${slug}/track`}
                    className="hero-wave-btn inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 h-10 sm:h-11 rounded-lg border border-white/40 bg-white/10 text-white text-xs sm:text-sm font-semibold whitespace-nowrap hover:bg-white/20 transition"
                  >
                    Track Order
                    <ArrowRight size={14} />
                  </Link>
                </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-12 sm:h-16 overflow-hidden z-20">
            <svg
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              className="shoreline-wave shoreline-wave--back bottom-0"
            >
              <path
                d="M0,72 C100,94 220,24 340,46 C470,72 560,118 690,98 C810,80 920,26 1040,44 C1120,56 1160,70 1200,78 L1200,120 L0,120 Z"
                fill="rgba(241, 245, 249, 0.55)"
              />
            </svg>
            <svg
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              className="shoreline-wave shoreline-wave--front bottom-[-6px]"
            >
              <path
                d="M0,84 C120,118 230,34 350,58 C480,84 570,112 700,94 C820,78 920,30 1040,52 C1120,66 1160,84 1200,92 L1200,120 L0,120 Z"
                fill="rgba(248, 250, 252, 0.96)"
              />
            </svg>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 h-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Networks</p>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Pick a network catalog</h3>
                  </div>
                  <Link
                    to={`/store/${slug}/catalog`}
                    className="text-sm font-semibold"
                    style={{ color: primaryColor }}
                  >
                    View all bundles
                  </Link>
                </div>

                {networkCatalog.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {networkCatalog.map((net) => (
                      <button
                        key={net.name}
                        onClick={() => handleNetworkClick(net.name)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left bg-white"
                      >
                        <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {net.logoUrl ? (
                            <img src={net.logoUrl} alt={`${net.name} logo`} className="w-full h-full object-contain" />
                          ) : (
                            <Smartphone size={20} className="text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{net.name}</p>
                          <p className="text-xs text-slate-500">Open plans</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 ml-auto" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm text-slate-600">No active network catalog available right now.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-4 space-y-5">
              {displayFeatures.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Store Highlights</h3>
                    <span className="text-xs font-semibold text-slate-500">Professional service</span>
                  </div>
                  <div className="space-y-2.5">
                    {displayFeatures.slice(0, 4).map((feat, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0" style={{ color: primaryColor }}>
                            {renderFeatureIcon(feat, idx)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{feat.title || 'Feature'}</h4>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{feat.description || ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-base font-bold text-slate-900">Store Snapshot</h3>
                  <span className="text-xs font-semibold" style={{ color: primaryColor }}>Live</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">Networks</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{totalNetworks}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">Plans</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{totalPlans}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">Store Status</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">Live</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-cyan-50 p-2.5">
                    <p className="text-[9px] text-cyan-700 uppercase tracking-wide font-semibold">Support</p>
                    <p className="text-sm font-bold text-cyan-900 mt-0.5">24/7</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
                <h3 className="text-base font-bold text-slate-900">Need Help?</h3>
                <p className="text-xs text-slate-600 mt-0.5">{phoneContact ? 'Talk to the store agent or track an existing order in seconds.' : 'Track your order or browse our catalog.'}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Link
                    to={`/store/${slug}/track`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Track order
                    <ArrowRight size={12} />
                  </Link>
                  <Link
                    to={`/store/${slug}/catalog`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Browse bundles
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {store?.hasSocialLinks && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col gap-3 items-center" ref={fabRef}>
          <div className={`flex flex-col gap-2.5 transition-all duration-300 ${showFabMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {[
              {
                id: 'wa',
                icon: MessageCircle,
                color: '#25D366',
                val: normalizeWhatsAppValue(getSocialValue(store.socialLinks?.whatsapp)),
                href: `https://wa.me/${normalizeWhatsAppValue(getSocialValue(store.socialLinks?.whatsapp))}`
              },
              { id: 'tel', icon: Phone, color: primaryColor, val: phoneContact, href: `tel:${phoneContact}` },
              { id: 'email', icon: Mail, color: primaryColor, val: emailContact, href: `mailto:${emailContact}` }
            ].filter(s => s.val).map((soc, i) => (
              <a
                key={soc.id}
                href={soc.href}
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-center hover:scale-105 transition-all"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <soc.icon size={19} style={{ color: soc.color }} />
              </a>
            ))}
          </div>

          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all relative"
            style={{ backgroundColor: primaryColor, boxShadow: `0 16px 30px -14px ${primaryColor}` }}
          >
            {showFabMenu ? <X size={22} /> : <Headphones size={22} />}
            {!showFabMenu && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />}
          </button>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-bold text-slate-900">{store.name}</h3>
            <p className="text-xs text-slate-600">Fast, reliable and affordable data bundles from a trusted agent storefront.</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <ShieldCheck size={12} />
              <span>Secure, verified payments</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <div>
              <p className="text-lg font-bold text-slate-900">{totalNetworks}</p>
              <p className="text-[11px] text-slate-600">Active Networks</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{totalPlans}</p>
              <p className="text-[11px] text-slate-600">Available Plans</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          {hasSocialMedia && footerSocialLinks.length > 0 && (
            <div className="flex items-center gap-2.5">
              {footerSocialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href(social.value)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all"
                  style={{ color: primaryColor }}
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

// --- UTILITY COMPONENTS (Retained for sanity) ---

function EliteFeature({ text, primaryColor }) {
  return (
    <div className="flex items-center gap-2 group/feat">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center border border-slate-100 group-hover/feat:bg-primary-600 transition-colors"
        style={{ '--primary-600': primaryColor }}
      >
        <CheckCircle2 size={10} className="text-slate-600 group-hover/feat:text-white" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600 group-hover/feat:text-slate-900 transition-colors">{text}</span>
    </div>
  );
}
