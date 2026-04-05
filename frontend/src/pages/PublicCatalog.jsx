import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
    AlertCircle, Smartphone, ShieldCheck, Zap,
    ArrowRight, X, Layout,
    ShoppingBag, CreditCard
} from 'lucide-react';
import { io } from 'socket.io-client';
import { store as storeAPI, publicAPI } from '../services/api';
import { getSocketBaseUrl } from '../utils/apiBaseUrl';

export default function PublicCatalog() {
    const { slug } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [store, setStore] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const normalizeNetwork = (val) =>
        (val ?? '')
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');
    const initialNetwork = searchParams.get('network');
    const [selectedNetwork, setSelectedNetwork] = useState(initialNetwork);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [networkLogos, setNetworkLogos] = useState({});
    const socketRef = useRef(null);

    const getSocialValue = (value) => {
        if (typeof value === 'string') return value.trim();
        if (typeof value?.value === 'string') return value.value.trim();
        return '';
    };

    useEffect(() => {
        fetchStoreData();
        setupSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [slug]);

    useEffect(() => {
        // keep URL in sync with selected network
        if (selectedNetwork) {
            searchParams.set('network', selectedNetwork);
            setSearchParams(searchParams, { replace: true });
        } else {
            searchParams.delete('network');
            setSearchParams(searchParams, { replace: true });
        }
    }, [selectedNetwork]);

    const setupSocket = () => {
        const socketUrl = getSocketBaseUrl();

        socketRef.current = io(socketUrl, { withCredentials: true });
        socketRef.current.on('connect', () => {
            socketRef.current.emit('join_store', slug);
        });
        socketRef.current.on('store_updated', () => {
            fetchStoreData(false);
        });
    };

    const fetchStoreData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const [storeData, plansData, systemSettings] = await Promise.all([
                storeAPI.getPublicStore(slug),
                storeAPI.getPublicPlans(slug),
                publicAPI.getSystemSettings(),
            ]);
            setStore(storeData.store);
            if (!storeData.accessStatus?.isAccessible) {
                setError(storeData.accessStatus?.message || 'Store is not available');
            } else {
                setPlans(plansData.plans || []);
            }

            const catalog = systemSettings?.settings?.networkCatalog || [];
            const mapped = catalog.reduce((acc, entry) => {
                const key = (entry.slug || entry.name || '').toString().trim().toLowerCase().replace(/\s+/g, '');
                if (key) acc[key] = entry.logoUrl;
                return acc;
            }, {});
            setNetworkLogos(mapped);
        } catch (err) {
            setError(err.message || 'Store data not found');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const primaryColor = store?.theme?.primaryColor || '#2563eb';
    const phoneContact = getSocialValue(store?.socialLinks?.phone);
    const uniqueNetworks = [...new Set(plans.map(p => p.network))];
    const normalizedSelected = selectedNetwork ? normalizeNetwork(selectedNetwork) : '';
    const filteredPlans = selectedNetwork
        ? plans.filter(p => normalizeNetwork(p.network) === normalizedSelected)
        : plans;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center animate-pulse border border-slate-200/60">
                    <ShoppingBag size={24} className="text-primary-600" style={{ color: primaryColor }} />
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Loading Catalog...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-sm w-full bg-white p-8 rounded-2xl border border-slate-200/60 text-center space-y-6">
                    <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Catalog Error</h1>
                    <p className="text-slate-600 text-sm font-medium">{error}</p>
                    <Link to={`/store/${slug}`} className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest">
                        Back to Store
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <nav className="sticky top-0 z-50 app-pro-header">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/store/${slug}`} className="flex items-center gap-3 min-w-0 hover:opacity-90 transition">
                            {store?.logo ? (
                                <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                                    <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                                    {store?.name?.[0]}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{store?.name}</p>
                                <p className="text-xs text-slate-500">Catalog workspace</p>
                            </div>
                        </Link>
                        <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">Live pricing</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {phoneContact && (
                            <a
                                href={`tel:${phoneContact}`}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <AlertCircle size={13} />
                                <span className="hidden sm:inline">Support</span>
                            </a>
                        )}
                        <Link
                            to={`/store/${slug}/track`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                        >
                            <Layout size={13} />
                            <span className="hidden sm:inline">Track</span>
                        </Link>
                        <Link to={`/store/${slug}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition">
                            <ArrowRight size={14} className="rotate-180" />
                            <span className="hidden sm:inline">Store</span>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: primaryColor }}>
                                <Layout size={15} />
                                Available bundles
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Choose Data Bundle</h2>
                            <p className="text-sm text-slate-600">Select a network and purchase instantly through secure checkout.</p>
                        </div>

                        {uniqueNetworks.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedNetwork('')}
                                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${!selectedNetwork ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    style={!selectedNetwork ? { backgroundColor: primaryColor } : {}}
                                >
                                    All
                                </button>
                                {uniqueNetworks.map(network => (
                                    <button
                                        key={network}
                                        onClick={() => setSelectedNetwork(network)}
                                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${normalizeNetwork(selectedNetwork) === normalizeNetwork(network)
                                            ? 'text-white border-transparent'
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                            }`}
                                        style={normalizeNetwork(selectedNetwork) === normalizeNetwork(network) ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {network}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredPlans.map(plan => {
                        const normalizedNetwork = (plan.network || '').toString().trim().toLowerCase().replace(/\s+/g, '');
                        const fallbackLogo = networkLogos[normalizedNetwork];
                        const logoToUse = plan.networkLogo || fallbackLogo;
                        return (
                            <article key={plan._id} className="group bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ color: primaryColor }}>
                                            {logoToUse ? (
                                                <img src={logoToUse} alt={`${plan.network} logo`} className="w-full h-full object-contain" />
                                            ) : (
                                                <Smartphone size={18} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-slate-900 line-clamp-1 text-sm">{plan.package}</h4>
                                            <p className="text-xs font-medium truncate" style={{ color: primaryColor }}>{plan.network}</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600">{plan.size || 'N/A'}</span>
                                </div>

                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mb-3.5">
                                    <p className="text-xs text-slate-500 mb-1">Price</p>
                                    <p className="text-2xl font-bold text-slate-900 leading-none">{formatCurrencyAbbreviated(plan.sellingPrice)}</p>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedPlan(plan);
                                        setShowCheckoutModal(true);
                                    }}
                                    className="w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white"
                                    style={{
                                        backgroundColor: store?.theme?.buttonBg || primaryColor,
                                        color: store?.theme?.buttonTextColor || '#ffffff'
                                    }}
                                >
                                    <ShoppingBag size={16} style={{ color: store?.theme?.buttonTextColor || '#ffffff' }} />
                                    Buy Now
                                </button>
                            </article>
                        );
                    })}
                </section>

                {filteredPlans.length === 0 && (
                    <section className="py-14 flex flex-col items-center justify-center text-slate-600 gap-3 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Smartphone size={42} className="opacity-25" />
                        <p className="font-medium text-sm">No plans available for this selection.</p>
                    </section>
                )}
            </main>

            {showCheckoutModal && selectedPlan && (
                <GuestCheckoutModal
                    plan={selectedPlan}
                    store={store}
                    primaryColor={primaryColor}
                    onClose={() => {
                        setShowCheckoutModal(false);
                        setSelectedPlan(null);
                    }}
                />
            )}
        </div>
    );
}

// --- UTILITY COMPONENTS (Aligned with AdminStore) ---

function SectionCard({ title, icon: Icon, children, primaryColor }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden transition-all">
            <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-tight">
                    {Icon && <Icon size={16} className="text-primary-500" style={{ color: primaryColor }} />}
                    {title}
                </h3>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}

function InputGroup({ label, value = '', onChange, placeholder = '', type = 'text', required = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">{label}</label>
            <input
                type={type}
                required={required}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm text-slate-900 font-medium"
            />
        </div>
    );
}

function GuestCheckoutModal({ plan, store, primaryColor, onClose }) {
    const [formData, setFormData] = useState({ email: '', phone: '', name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const paystackRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.phone) {
            setError('Please fill all required fields.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccessMessage('');
            const res = await storeAPI.purchasePublicBundle(store.slug, {
                planId: plan.planId,
                email: formData.email,
                phone: formData.phone,
                name: formData.name
            });

            const accessCode = res?.data?.accessCode;
            const reference = res?.data?.reference;

            if (res.success && accessCode && reference) {
                if (!window.PaystackPop) {
                    setError('Paystack library not loaded. Please refresh and try again.');
                    setLoading(false);
                    return;
                }

                const paystack = new window.PaystackPop();
                paystackRef.current = paystack;

                paystack.resumeTransaction(accessCode, {
                    onSuccess: async () => {
                        try {
                            const verification = await storeAPI.verifyPublicPayment({ reference });
                            if (verification?.success) {
                                setSuccessMessage('Payment successful. Your order is being processed.');
                                setTimeout(() => {
                                    onClose();
                                }, 1500);
                            } else {
                                setError(verification?.message || 'Payment verification failed.');
                            }
                        } catch (verifyErr) {
                            setError(verifyErr.message || 'Failed to verify payment.');
                        } finally {
                            setLoading(false);
                        }
                    },
                    onCancel: () => {
                        setError('Payment was cancelled.');
                        setLoading(false);
                    },
                    onError: (paystackError) => {
                        setError(paystackError?.message || 'Payment error occurred.');
                        setLoading(false);
                    },
                });
            } else {
                setError(res.message || 'Could not start payment.');
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || 'Network error. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

            <div className="relative w-full max-w-md bg-[#F8FAFC] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/60">
                <div className="px-6 py-4 bg-white border-b border-slate-200/60 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-primary-600 mb-0.5" style={{ color: primaryColor }}>
                            <ShoppingBag size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Checkout</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Confirm Purchase</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <SectionCard title="Order Summary" icon={CreditCard} primaryColor={primaryColor}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{plan.package}</h4>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">{plan.network} Network</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-slate-900">{formatCurrencyAbbreviated(plan.sellingPrice)}</p>
                                <div className="flex items-center gap-1 mt-0.5 text-green-600">
                                    <ShieldCheck size={10} />
                                    <span className="text-[8px] font-bold uppercase tracking-wider">Verified</span>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-700 text-[11px] font-bold uppercase">
                            <AlertCircle size={14} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-green-700 text-[11px] font-bold uppercase">
                            <ShieldCheck size={14} className="shrink-0" />
                            {successMessage}
                        </div>
                    )}

                    <div className="space-y-4">
                        <InputGroup
                            label="Full Name"
                            value={formData.name}
                            onChange={(v) => setFormData({ ...formData, name: v })}
                            placeholder="e.g. John Mensah"
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup
                                label="Phone Number"
                                value={formData.phone}
                                onChange={(v) => setFormData({ ...formData, phone: v })}
                                placeholder="05x xxx xxxx"
                                type="tel"
                                required
                            />
                            <InputGroup
                                label="Email Address"
                                value={formData.email}
                                onChange={(v) => setFormData({ ...formData, email: v })}
                                placeholder="mail@host.com"
                                type="email"
                                required
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        onClick={handleSubmit}
                        className="w-full py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-opacity-90 active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Zap size={14} />
                                Pay Now
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 opacity-50">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none">Secure Payment</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
