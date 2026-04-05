import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
    Search, ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle,
    ShoppingBag, Globe2, Phone, Calendar, Database, Sparkles, ChevronRight
} from 'lucide-react';
import { store as storeAPI } from '../services/api';

export default function PublicTrackOrder() {
    const { slug } = useParams();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [orders, setOrders] = useState([]);
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingStore, setFetchingStore] = useState(true);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const getSocialValue = (value) => {
        if (typeof value === 'string') return value.trim();
        if (typeof value?.value === 'string') return value.value.trim();
        return '';
    };

    useEffect(() => {
        fetchStoreInfo();
    }, [slug]);

    const fetchStoreInfo = async () => {
        try {
            const response = await storeAPI.getPublicStore(slug);
            if (response.success) {
                setStore(response.store);
            }
        } catch (err) {
            console.error('Failed to fetch store info', err);
        } finally {
            setFetchingStore(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!phoneNumber) return;

        try {
            setLoading(true);
            setError('');
            const response = await storeAPI.trackGuestOrders(slug, phoneNumber);
            if (response.success) {
                setOrders(response.orders);
                setSearched(true);
            } else {
                setError(response.message || 'Failed to fetch orders');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching orders');
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = store?.theme?.primaryColor || '#2563eb';
    const secondaryColor = store?.theme?.secondaryColor || '#64748b';
    const phoneContact = getSocialValue(store?.socialLinks?.phone);

    const hexToRgba = (hex, alpha = 1) => {
        if (!hex) return `rgba(37,99,235,${alpha})`;
        let normalized = hex.replace('#', '').trim();
        if (normalized.length === 3) {
            normalized = normalized.split('').map((char) => char + char).join('');
        }
        const parsed = parseInt(normalized, 16);
        if (isNaN(parsed) || normalized.length !== 6) {
            return `rgba(37,99,235,${alpha})`;
        }
        const red = (parsed >> 16) & 255;
        const green = (parsed >> 8) & 255;
        const blue = parsed & 255;
        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    };

    const statusColors = {
        completed: 'bg-green-100 text-green-700 border-green-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        failed: 'bg-rose-100 text-rose-700 border-rose-200',
        processing: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    const paymentStatusColors = {
        completed: 'bg-green-100 text-green-700 border-green-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        failed: 'bg-rose-100 text-rose-700 border-rose-200',
    };

    const statusIcons = {
        completed: CheckCircle2,
        pending: Clock,
        failed: XCircle,
        processing: Database,
    };

    if (fetchingStore) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 selection:bg-slate-200 text-slate-900">
            <style>{`
        @keyframes mesh {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10%, 10%) scale(1.1); }
          66% { transform: translate(-5%, 5%) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
                .mesh-gradient {
                    filter: blur(120px);
                    opacity: 0.18;
          animation: mesh 20s infinite alternate linear;
        }
      `}</style>

            {/* Background Mesh Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full mesh-gradient"
                    style={{ backgroundColor: primaryColor }}
                ></div>
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full mesh-gradient"
                    style={{ backgroundColor: secondaryColor, animationDelay: '-5s' }}
                ></div>
            </div>

            <nav className="sticky top-0 z-50 app-pro-header">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to={`/store/${slug}`} className="flex items-center gap-3 min-w-0 hover:opacity-90 transition">
                            {store?.logo ? (
                                <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                                    <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {store?.name?.[0]}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">{store?.name}</h1>
                                <p className="text-xs text-slate-500">Order Tracking</p>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {phoneContact && (
                            <a
                                href={`tel:${phoneContact}`}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Phone size={13} />
                                <span className="hidden sm:inline">Support</span>
                            </a>
                        )}
                        <Link
                            to={`/store/${slug}/catalog`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                        >
                            <Search size={13} />
                            <span className="hidden sm:inline">Catalog</span>
                        </Link>
                        <Link
                            to={`/store/${slug}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                        >
                            <ArrowLeft size={13} />
                            <span className="hidden sm:inline">Store</span>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 w-40 h-40 bg-slate-100 rounded-full blur-3xl opacity-60"></div>

                    <div className="relative text-center max-w-xl mx-auto space-y-6">
                        <div className="space-y-2.5">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto shadow-md" style={{ backgroundColor: primaryColor }}>
                                <Search size={22} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Track Your Orders</h2>
                            <p className="text-slate-600 text-sm">Enter the phone number used during checkout to retrieve your order records.</p>
                        </div>

                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Phone size={18} className="text-slate-600" />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="e.g. 0534359912"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all text-base font-semibold text-slate-900 placeholder:text-slate-400"
                                    style={{ focusBorderColor: primaryColor }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !phoneNumber}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-semibold text-sm shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 20px -8px ${hexToRgba(primaryColor, 0.45)}` }}
                            >
                                {loading ? 'Searching...' : 'Search Orders'}
                            </button>
                        </form>

                        {error && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2.5 text-sm font-medium">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {searched && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                            <h3 className="text-sm font-semibold text-slate-700">Purchase History ({orders.length})</h3>
                            {orders.length > 0 && <span className="text-xs text-slate-500">Showing records for {phoneNumber}</span>}
                        </div>

                        {orders.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
                                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-600">
                                    <Database size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-slate-900">No Orders Found</p>
                                    <p className="text-slate-600 text-sm">We could not find any orders matching this phone number.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {orders.map((order) => {
                                    const StatusIcon = statusIcons[order.status] || Clock;
                                    return (
                                        <div
                                            key={order._id}
                                            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row items-center gap-4"
                                        >
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-900 font-bold text-sm uppercase flex-shrink-0" style={{ color: primaryColor, backgroundColor: hexToRgba(primaryColor, 0.12) }}>
                                                {order.network?.charAt(0)}
                                            </div>

                                            <div className="flex-1 text-center sm:text-left space-y-1.5">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                                                    <h4 className="font-bold text-slate-900 text-base">{order.planName}</h4>
                                                    <span className="text-xs text-slate-500 hidden sm:inline">•</span>
                                                    <span className="text-xs font-medium text-slate-500">{order.phoneNumber}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={12} />
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} />
                                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Sparkles size={12} style={{ color: primaryColor }} />
                                                        {formatCurrencyAbbreviated(order.amount)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <div className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg border text-[11px] font-semibold capitalize flex items-center justify-center gap-1.5 ${paymentStatusColors[order.paymentStatus] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    Pay: {order.paymentStatus || 'pending'}
                                                </div>
                                                <div className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg border text-[11px] font-semibold capitalize flex items-center justify-center gap-1.5 ${statusColors[order.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    <StatusIcon size={14} />
                                                    {order.status}
                                                </div>
                                                <div className="hidden sm:flex w-8 h-8 rounded-full border border-slate-200 items-center justify-center text-slate-500 group-hover:text-slate-900 group-hover:bg-slate-50 transition-all">
                                                    <ChevronRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
