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
    AlertCircle,
    CheckCircle,
    TrendingUp as TrendingIcon,
    Package,
    Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import upgradeService from '../services/upgradeService';
import { formatCurrency } from '../utils/formatCurrency';
import { toast } from 'react-hot-toast';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .agent-page-container {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background-color: #ffffff;
    padding: 24px 16px;
  }

  .agent-content {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .agent-main-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    padding: 24px;
  }

  .agent-heading-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
  }

  .agent-icon-box {
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

  .agent-h2 {
    font-size: 28px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .agent-p {
    font-size: 15px;
    color: #000;
    margin: 4px 0 0 0;
    line-height: 1.5;
  }

  .agent-benefit-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 16px;
  }

  @media (min-width: 640px) {
    .agent-benefit-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .agent-benefit-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 20px;
    transition: all 0.2s;
  }

  .agent-benefit-card:hover {
    border-color: #111;
    transform: translateY(-2px);
  }

  .agent-benefit-icon {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .agent-btn-primary {
    background: #111;
    color: #fff;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
  }

  .agent-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .agent-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .agent-btn-primary {
      padding: 8px 16px;
      font-size: 13px;
    }
    .agent-h2 {
      font-size: 22px;
    }
  }

  .agent-premium-banner {
    background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%);
    color: #fff;
    border-radius: 14px;
    padding: 28px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  }

  .agent-banner-accent {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 120px;
    height: 120px;
    background: rgba(240, 165, 0, 0.1);
    border-radius: 50%;
    filter: blur(40px);
  }

  .agent-price-tag {
    font-size: 36px;
    font-weight: 800;
    color: #f0a500;
    letter-spacing: -0.02em;
  }

  .agent-method-item {
    background: rgba(255,255,255,0.06);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s;
  }

  .agent-method-item:hover {
    background: rgba(255,255,255,0.1);
    border-color: #f0a500;
  }

  .agent-success-modal {
    background: #fff;
    border-radius: 24px;
    padding: 40px;
    text-align: center;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 30px 60px rgba(0,0,0,0.2);
  }
`;

export default function BecomeAgent() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
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
            const res = await upgradeService.getUpgradeStatus();
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

    const isAlreadyAgent =
        user?.role === 'agent' ||
        status?.role === 'agent' ||
        status?.agentFeeStatus === 'paid' ||
        status?.agentFeeStatus === 'protocol';

    const registrationFee = settings?.registrationFee ?? status?.registrationFee ?? 0;

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
            <div className="flex h-[80vh] items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 text-[#f0a500] animate-spin" />
            </div>
        );
    }

    const benefits = [
        {
            title: 'Your Own Mini-Store',
            desc: 'Get a personalized link to sell data bundles to anyone effortlessly.',
            icon: Store,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            title: 'Earn Commissions',
            desc: 'Make significant profit on every bundle sold through your store.',
            icon: TrendingIcon,
            color: 'bg-emerald-50 text-emerald-600'
        },
        {
            title: 'Agent Pricing',
            desc: 'Access exclusive, lower rates for both business and personal use.',
            icon: Zap,
            color: 'bg-amber-50 text-amber-600'
        },
        {
            title: 'Professional Dashboard',
            desc: 'Advanced tools to track orders, earnings, and manage your inventory.',
            icon: Shield,
            color: 'bg-purple-50 text-purple-600'
        }
    ];

    return (
        <div className="agent-page-container">
            <style>{styles}</style>
            <div className="agent-content">
                {/* Heading Area */}
                <div className="agent-heading-section">
                    <div className="agent-icon-box">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <h2 className="agent-h2">Become an <span style={{ color: '#f0a500' }}>Agent</span></h2>
                        <p className="agent-p">Start your own VTU business today with exclusive rates.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Benefits Grid */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="agent-benefit-grid">
                            {benefits.map((benefit, idx) => (
                                <div key={idx} className="agent-benefit-card">
                                    <div className={`agent-benefit-icon ${benefit.color}`}>
                                        <benefit.icon size={20} />
                                    </div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111', marginBottom: '6px' }}>
                                        {benefit.title}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#000', lineHeight: '1.4' }}>
                                        {benefit.desc}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="agent-main-card" style={{ borderStyle: 'dashed', background: '#fafaf7' }}>
                            <div className="flex items-start gap-4">
                                <AlertCircle size={20} style={{ color: '#000', marginTop: '2px' }} />
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#333' }}>Quick Start Guide</h4>
                                    <p style={{ fontSize: '13px', color: '#000', marginTop: '4px' }}>
                                        Once activated, your account role will change immediately. You will need to re-login to synchronize your new permissions and access the agent dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activation Card */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="agent-premium-banner">
                            <div className="agent-banner-accent"></div>
                            
                            <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                                Activation Fee
                            </p>
                            
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <span className="agent-price-tag">
                                        {registrationFee === 0 ? 'FREE' : formatCurrency(registrationFee)}
                                    </span>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>One-time payment</p>
                                </div>
                                {isAlreadyAgent && (
                                    <div className="bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircle size={14} />
                                        Activated
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-sm text-black font-medium">
                                    <CheckCircle2 size={16} style={{ color: '#f0a500' }} />
                                    Instant store link generation
                                </div>
                                <div className="flex items-center gap-3 text-sm text-black font-medium">
                                    <CheckCircle2 size={16} style={{ color: '#f0a500' }} />
                                    Lifetime access to agent rates
                                </div>
                                <div className="flex items-center gap-3 text-sm text-black font-medium">
                                    <CheckCircle2 size={16} style={{ color: '#f0a500' }} />
                                    24/7 Priority system support
                                </div>
                            </div>

                            <div style={{ paddingTop: '24px', borderTop: '1.5px solid rgba(255,255,255,0.1)' }}>
                                <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    Payment Method
                                </p>
                                
                                <button
                                    onClick={handleWalletUpgrade}
                                    disabled={isProcessing || isAlreadyAgent}
                                    className="agent-method-item w-full"
                                >
                                    <div className="flex items-center gap-3">
                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Wallet size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p style={{ fontSize: '14px', fontWeight: '700' }}>
                                                {isAlreadyAgent ? 'Account Active' : 'Wallet Balance'}
                                            </p>
                                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                                Balance: {formatCurrency(user?.balance || 0)}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                </button>
                            </div>
                        </div>

                        {registrationFee > (user?.balance || 0) && !isAlreadyAgent && (
                            <div className="agent-main-card" style={{ background: '#fffbeb', borderColor: '#fef3c7', padding: '16px' }}>
                                <div className="flex gap-3">
                                    <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                                    <p style={{ fontSize: '12px', color: '#92400e', fontWeight: '500', lineHeight: '1.4' }}>
                                        Insufficient balance. Please top up your wallet with at least {formatCurrency(registrationFee - (user?.balance || 0))} to proceed.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showSuccess && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="agent-success-modal animate-in zoom-in-95 duration-300 relative">
                        <div style={{ width: '80px', height: '80px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#059669' }}>
                            <CheckCircle2 size={40} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#111', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                            UPGRADE SUCCESSFUL!
                        </h3>
                        <p style={{ fontSize: '14px', color: '#000', fontWeight: '500', marginBottom: '32px', lineHeight: '1.5' }}>
                            Your account is now an Agent account. Please log in again to activate your new features and dashboard.
                        </p>
                        <button onClick={handleLogoutAndLogin} className="agent-btn-primary" style={{ padding: '14px' }}>
                            Okay, Logout & Login
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
                    <div className="agent-main-card flex flex-col items-center max-w-xs text-center p-8">
                        <Loader2 className="w-12 h-12 text-[#f0a500] animate-spin mb-4" />
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111' }}>Activating Account</h3>
                        <p className="agent-p" style={{ fontSize: '12px' }}>Setting up your agent store and dashboard. Please wait...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
