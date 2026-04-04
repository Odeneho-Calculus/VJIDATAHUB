import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    Store,
    TrendingUp,
    Zap,
    CheckCircle2,
    Wallet,
    ArrowRight,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import upgradeService from '../services/upgradeService';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'react-hot-toast';

export default function BecomeAgent() {
    const navigate = useNavigate();
    const { user, setUser, logout } = useAuth();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            console.log('Fetching upgrade status...');
            const res = await upgradeService.getUpgradeStatus();
            console.log('Upgrade status response (data only):', res);

            // Since upgradeService already returns response.data, 'res' is the actual data object
            if (res) {
                setStatus(res);
            }
        } catch (error) {
            console.error('Error fetching upgrade status:', error);
            toast.error('Failed to load upgrade status');
        } finally {
            setLoading(false);
        }
    };

    // Robust check for already active agent
    const isAlreadyAgent =
        user?.role === 'agent' ||
        status?.role === 'agent' ||
        status?.agentFeeStatus === 'paid' ||
        status?.agentFeeStatus === 'protocol';

    const handleWalletUpgrade = async () => {
        if (isAlreadyAgent) {
            toast.error('You are already an active agent');
            return;
        }

        if (!user || user.balance < registrationFee) {
            toast.error('Insufficient wallet balance');
            return;
        }

        setIsProcessing(true);
        try {
            const res = await upgradeService.initializeUpgrade('wallet');
            if (res.success) {
                setShowSuccess(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Upgrade failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogoutAndLogin = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
        );
    }

    const benefits = [
        {
            title: 'Your Own Mini-Store',
            desc: 'Get a personalized link to sell data bundles to anyone.',
            icon: Store,
            color: 'text-blue-600 bg-blue-50'
        },
        {
            title: 'Earn Commissions',
            desc: 'Make profit on every bundle sold through your store.',
            icon: TrendingUp,
            color: 'text-green-600 bg-green-50'
        },
        {
            title: 'Agent Pricing',
            desc: 'Buy bundles at lower rates for your personal use too.',
            icon: Zap,
            color: 'text-amber-600 bg-amber-50'
        },
        {
            title: 'Professional Dashboard',
            desc: 'Track orders, earnings, and manage your inventory easily.',
            icon: ShieldCheck,
            color: 'text-purple-600 bg-purple-50'
        }
    ];

    const registrationFee = settings?.registrationFee ?? status?.registrationFee ?? 0;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
                        <ShieldCheck size={12} />
                        Agent Program
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Become an <span className="text-primary-600">Agent</span>
                    </h1>
                    <p className="text-slate-600 mt-2 text-sm md:text-base">
                        Start your own VTU business today. Reach more customers and earn passive income with exclusive rates.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                {/* Benefits Section */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-100 hover:shadow-sm transition-all group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${benefit.color}`}>
                                <benefit.icon size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm mb-1">{benefit.title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{benefit.desc}</p>
                        </div>
                    ))}

                    <div className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={18} className="text-slate-400 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-slate-700">Quick Start Guide</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Once activated, you'll get access to your agent dashboard where you can customize your store and start selling immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing & Action Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Activation Fee</p>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-black tracking-tight text-primary-400">
                                    {registrationFee === 0 ? 'FREE' : formatCurrency(registrationFee)}
                                </h2>
                                <span className="text-xs text-slate-400">one-time payment</span>
                            </div>
                            {isAlreadyAgent && (
                                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                                    <CheckCircle2 size={12} strokeWidth={3} />
                                    Activated
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                <CheckCircle2 size={14} className="text-primary-400" />
                                Instant store creation
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                <CheckCircle2 size={14} className="text-primary-400" />
                                Lifetime access to agent rates
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                                <CheckCircle2 size={14} className="text-primary-400" />
                                24/7 Priority support access
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</p>

                            <button
                                onClick={handleWalletUpgrade}
                                disabled={isProcessing || isAlreadyAgent}
                                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary-500/50 transition-all group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-white/10 text-white rounded-lg flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                                        <Wallet size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">
                                            {isAlreadyAgent ? 'Account Already Active' : 'Wallet Balance'}
                                        </p>
                                        <p className="text-[10px] text-slate-400">Balance: {formatCurrency(user?.balance || 0)}</p>
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-slate-500 group-hover:text-primary-400" />
                            </button>
                        </div>
                    </div>

                    {registrationFee > (user?.balance || 0) && !isAlreadyAgent && (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700 leading-tight">
                                Your wallet balance is insufficient for this upgrade. Please top up your wallet.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                    <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
                                <CheckCircle2 size={48} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Successfully Upgraded!</h3>
                                <p className="text-slate-500 font-bold text-sm tracking-tight leading-relaxed">
                                    Your account has been upgraded to Agent. Please log in again to activate your new dashboard and features.
                                </p>
                            </div>
                            <button
                                onClick={handleLogoutAndLogin}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition shadow-xl active:scale-95"
                            >
                                Okay, Logout & Login
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center max-w-xs text-center">
                        <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-4" />
                        <h3 className="font-black text-slate-900 tracking-tight">Activating Account</h3>
                        <p className="text-xs text-slate-500 mt-2">Setting up your agent store. Please don't close this window.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
