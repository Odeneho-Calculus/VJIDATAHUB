import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { getNetworkStyles } from '../utils/networkStyles';
import {
  Check,
  Copy,
  TrendingUp,
  Clock,
  Zap,
  Share2,
  Layout,
  RefreshCw,
  ExternalLink,
  Target,
  CheckCircle,
  Layers,
  CreditCard,
  ChevronRight,
  ShoppingBag,
  Eye,
  Mail,
  Phone,
  User,
  Activity,
  Loader2,
  AlertCircle,
  Lock,
  Wallet,
  Store
} from 'lucide-react';
import { wallet, purchases, publicAPI } from '../services/api';
import UserLayout from '../components/UserLayout';


/* ── Homepage multi-colour palette ── */
const palette = [
  { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' },   // purple
  { main: '#0F6E56', bg: '#D1FAE5', soft: '#ECFDF5', glow: 'rgba(15,110,86,0.15)' },    // teal
  { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF', glow: 'rgba(29,78,216,0.15)' },    // blue
  { main: '#B45309', bg: '#FEF3C7', soft: '#FFFBEB', glow: 'rgba(180,83,9,0.15)' },     // amber
  { main: '#BE185D', bg: '#FCE7F3', soft: '#FDF2F8', glow: 'rgba(190,24,93,0.15)' },    // pink
  { main: '#DC2626', bg: '#FEE2E2', soft: '#FFF5F5', glow: 'rgba(220,38,38,0.15)' },    // coral/red
  { main: '#0369A1', bg: '#E0F2FE', soft: '#F0F9FF', glow: 'rgba(3,105,161,0.15)' },    // sky
  { main: '#4D7C0F', bg: '#ECFCCB', soft: '#F7FEE7', glow: 'rgba(77,124,15,0.15)' },    // lime/green
];

const getColor = (index) => palette[index % palette.length];



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
    background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
    border: 1.5px solid #DDD6FE;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(124,58,237,0.08);
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
    background: #7C3AED;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(124,58,237,0.25);
  }

  .dash-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .dash-p {
    font-size: 14px;
    color: #000;
    margin: 4px 0 0 0;
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

  @media (max-width: 640px) {
    .dash-btn-primary, .dash-btn-outline {
      padding: 6px 12px;
      font-size: 12px;
    }
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
    background: rgba(124, 58, 237, 0.08);
    border-radius: 50%;
    filter: blur(40px);
  }

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .dash-table-container::-webkit-scrollbar {
    display: none;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
    background: #fafaf7;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #333;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
  }

  .dash-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .dash-bundle-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 14px;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
  }
  .dash-bundle-card:hover {
    border-color: var(--bundle-color, #d4d4ce);
    box-shadow: 0 8px 30px var(--bundle-glow, rgba(0,0,0,0.06));
    transform: translateY(-2px);
  }
`;

export default function Dashboard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [dataBundles, setDataBundles] = useState([]);
  const [loadingBundles, setLoadingBundles] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [stats, setStats] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [referralSettings, setReferralSettings] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchActiveBundles = useCallback(async () => {
    try {
      const response = await publicAPI.getActivePlans(10, 0);
      if (response.success && response.plans) {
        setDataBundles(response.plans.slice(0, 6));
      }
    } catch (err) {
      console.error('Failed to fetch bundles:', err);
    }
  }, []);

  const fetchTransactionsAndStats = useCallback(async () => {
    try {
      const [transactionsRes, purchasesRes] = await Promise.all([
        wallet.getTransactions(10, 0),
        purchases.list(10, 0),
      ]);

      const walletTransactions = transactionsRes.success ? transactionsRes.transactions || [] : [];
      const purchasesList = purchasesRes.success ? purchasesRes.purchases || [] : [];

      const getTransactionType = (tx) => {
        if (tx.type === 'wallet_topup') return 'Wallet Top-up';
        if (tx.type === 'referral_bonus') return 'Referral Bonus';
        if (tx.type === 'wallet_funding') {
          const desc = tx.description?.toLowerCase() || '';
          if (desc.includes('data purchase')) return 'Data Purchase';
          if (desc.includes('top-up') || desc.includes('topup')) return 'Wallet Top-up';
          return 'Wallet Transaction';
        }
        return 'Transaction';
      };

      const combined = [
        ...walletTransactions.map(tx => ({
          id: tx._id,
          type: getTransactionType(tx),
          description: tx.description || 'Transaction',
          amount: tx.amount,
          date: new Date(tx.createdAt),
          dateStr: formatDate(new Date(tx.createdAt)),
          status: tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
          statusRaw: tx.status,
          rawAmount: tx.amount,
        })),
        ...purchasesList.map(purchase => ({
          id: purchase._id,
          type: 'Data Purchase',
          description: `${purchase.gb}GB ${purchase.network} to ${purchase.recipient}`,
          amount: -purchase.price,
          date: new Date(purchase.createdAt),
          dateStr: formatDate(new Date(purchase.createdAt)),
          status: purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1),
          statusRaw: purchase.status,
          rawAmount: -purchase.price,
          network: purchase.network,
          phoneNumber: purchase.recipient,
          dataAmount: purchase.gb + 'GB'
        })),
      ]
        .sort((a, b) => b.date - a.date)
        .slice(0, 6)
        .map(({ dateStr, ...rest }) => ({ ...rest, date: dateStr }));

      setRecentTransactions(combined);

      const statColors = [
        { label: 'Total Spent', value: formatCurrencyAbbreviated(user?.totalSpent || 0), icon: Target, color: getColor(0) },
        { label: 'Data Used', value: `${user?.dataUsed || 0}GB`, icon: Layers, color: getColor(1) },
        { label: 'Referral Earnings', value: formatCurrencyAbbreviated(user?.referralEarnings || 0), icon: TrendingUp, color: getColor(2) },
        { label: 'Wallet Balance', value: formatCurrencyAbbreviated(user?.balance || 0), icon: CreditCard, color: getColor(3) },
      ];

      setStats(statColors);
    } catch (err) {
      console.error('Failed to fetch transactions and stats:', err);
      setRecentTransactions([]);
    }
  }, [user]);

  const fetchReferralSettings = useCallback(async () => {
    try {
      const response = await publicAPI.getReferralSettings();
      if (response.success) {
        setReferralSettings(response.settings);
      }
    } catch (err) {
      console.error('Failed to fetch referral settings:', err);
    }
  }, []);

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoadingData(true);
        await Promise.all([
          fetchActiveBundles(),
          fetchTransactionsAndStats(),
        ]);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoadingData(false);
        setLoadingBundles(false);
      }
    };

    initializeDashboard();
    fetchReferralSettings();
  }, [fetchActiveBundles, fetchTransactionsAndStats, fetchReferralSettings]);

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const memberIdSource = user?.id || user?._id || '';
  const memberId = memberIdSource ? memberIdSource.slice(-6).toUpperCase() : 'N/A';

  return (
    <UserLayout>
      <div className="dash-wrapper">
        <style>{styles}</style>
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <Layout size={24} />
                </div>
                <div>
                  <h2 className="dash-h2">Welcome back, {user?.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-black font-mono uppercase">Member ID: {memberId}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLoadingData(true);
                    fetchTransactionsAndStats();
                    fetchActiveBundles();
                  }}
                  className="dash-btn-outline p-2"
                  title="Refresh Data"
                >
                  <RefreshCw size={18} className={loadingData ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:flex items-center gap-3">
              <Link to="/orders" className="dash-btn-outline flex-1 sm:flex-none">
                <ShoppingBag size={14} />
                Order History
              </Link>
              <Link to="/topup" className="dash-btn-outline flex-1 sm:flex-none">
                <CreditCard size={14} style={{ color: '#0F6E56' }} />
                Fund Wallet
              </Link>
              <Link to="/buy-data" className="dash-btn-primary w-full sm:w-auto" style={{ background: '#7C3AED', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                <Zap size={14} style={{ color: '#fff' }} />
                Buy Data
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="dash-stat-grid">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="dash-stat-card"
                style={{
                  '--stat-color': stat.color.main + '66',
                  '--stat-glow': stat.color.glow,
                  '--stat-bg': stat.color.soft,
                  '--stat-border': stat.color.main + '33',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="dash-stat-label" style={{ color: stat.color.main }}>{stat.label}</p>
                    <p className="dash-stat-value">{stat.value}</p>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: stat.color.soft,
                    color: stat.color.main,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${stat.color.glow}`,
                  }}>
                    <stat.icon size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Details */}
            <div className="lg:col-span-2 dash-card">
              <h3 className="dash-card-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#DBEAFE', color: '#1D4ED8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={15} strokeWidth={2.5} />
                </div>
                Account Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div style={{ background: '#F5F3FF', padding: '16px', borderRadius: '12px', border: '1.5px solid #DDD6FE' }}>
                  <p className="dash-stat-label" style={{ marginBottom: '4px', color: '#7C3AED' }}>Email Address</p>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#111' }} className="truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone size={10} style={{ color: '#7C3AED' }} />
                    <span style={{ fontSize: '12px', color: '#000' }}>{user?.phone || 'No phone set'}</span>
                  </div>
                </div>
                <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '12px', border: '1.5px solid #A7F3D0' }}>
                  <p className="dash-stat-label" style={{ marginBottom: '4px', color: '#0F6E56' }}>Referral Program</p>
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: '15px', fontWeight: '800', color: '#111', fontFamily: 'monospace' }}>{user?.referralCode}</p>
                    <button onClick={copyReferralCode} className="text-xs font-bold" style={{ color: '#0F6E56' }}>{copied ? 'Copied!' : 'Copy Code'}</button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#0F6E56', fontWeight: '700', marginTop: '4px' }}>
                    Earn GH₵ {referralSettings?.amountPerReferral || '0.00'} per invite
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Status */}
            <div className="dash-card">
              <h3 className="dash-card-title">
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#FEF3C7', color: '#B45309',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wallet size={15} strokeWidth={2.5} />
                </div>
                Wallet Status
              </h3>
              <div className="space-y-4">
                <div style={{ background: '#7C3AED', padding: '20px', borderRadius: '14px', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(124,58,237,0.3)' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(25px)' }}></div>
                  <p className="dash-stat-label" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Available Balance</p>
                  <p style={{ fontSize: '24px', fontWeight: '800' }}>{formatCurrencyAbbreviated(user?.balance || 0)}</p>
                  <Link to="/topup" className="flex items-center gap-1 text-[10px] font-bold mt-3 uppercase tracking-widest" style={{ color: '#EDE9FE' }}>
                    Quick Topup <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#e4e4de]" style={{ background: '#FFFBEB' }}>
                   <span className="text-xs font-bold" style={{ color: '#B45309' }}>Total Spent</span>
                   <span className="text-sm font-black text-black">{formatCurrencyAbbreviated(user?.totalSpent || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Bundles */}
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
                Featured Bundles
              </h3>
              <Link to="/buy-data" style={{ fontSize: '11px', fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                View All
              </Link>
            </div>

            {loadingBundles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {dataBundles.map((bundle) => {
                  const netStyles = getNetworkStyles(bundle.network);
                  const c = netStyles.palette;
                  return (
                    <Link
                      key={bundle._id}
                      to={`/buy-data?planId=${bundle._id}&planName=${encodeURIComponent(bundle.planName)}&dataSize=${encodeURIComponent(bundle.dataSize)}&price=${bundle.sellingPrice}&network=${bundle.network}`}
                      className="dash-bundle-card group"
                      style={{
                        '--bundle-color': c.main + '66',
                        '--bundle-glow': c.glow,
                        background: c.gradient || c.main,
                        border: 'none',
                        padding: '16px'
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase border" style={{ background: 'rgba(255,255,255,0.2)', color: c.text, borderColor: 'rgba(255,255,255,0.3)' }}>{bundle.network}</span>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-xl font-black leading-tight mb-1" style={{ color: c.text }}>{bundle.dataSize}</h4>
                        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: c.text === '#ffffff' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}>
                          <Clock size={10} strokeWidth={3} />
                          {bundle.validity || 'Instantly Active'}
                        </p>
                      </div>

                      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-black" style={{ color: c.text }}>{formatCurrencyAbbreviated(bundle.sellingPrice)}</span>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(255,255,255,0.2)', color: c.text }}>
                            <ChevronRight size={12} strokeWidth={3} />
                          </div>
                        </div>

                        <div
                          className="w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-center"
                          style={{ 
                            background: c.text === '#ffffff' ? '#ffffff' : '#000000', 
                            color: c.text === '#ffffff' ? c.main : '#ffffff', 
                            boxShadow: `0 4px 12px ${c.glow}` 
                          }}
                        >
                          Buy Bundle
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions Section */}
          <div className="dash-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="dash-card-title" style={{ margin: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#DBEAFE', color: '#1D4ED8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Activity size={15} strokeWidth={2.5} />
                </div>
                Recent Transactions
              </h3>
              <Link to="/transactions" style={{ fontSize: '11px', fontWeight: '800', color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                View All History
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1.5px dashed #e4e4de', borderRadius: '14px' }}>
                <ShoppingBag size={40} style={{ color: '#e4e4de', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#000' }}>No transactions yet.</p>
              </div>
            ) : (
              <div className="dash-table-container">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th className="dash-th">Type</th>
                      <th className="dash-th">Amount</th>
                      <th className="dash-th">Status</th>
                      <th className="dash-th">Date</th>
                      <th className="dash-th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => {
                      const statusColor = tx.statusRaw === 'completed' || tx.statusRaw === 'success'
                        ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
                        : tx.statusRaw === 'pending' || tx.statusRaw === 'processing'
                        ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }
                        : { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' };

                      return (
                        <tr key={tx.id}>
                          <td className="dash-td">
                            <div>
                              <p style={{ fontWeight: '700', color: '#111' }}>{tx.type}</p>
                              <p style={{ fontSize: '10px', color: '#000' }} className="truncate max-w-[200px]">{tx.description}</p>
                            </div>
                          </td>
                          <td className="dash-td font-bold" style={{ color: tx.rawAmount < 0 ? '#b91c1c' : '#059669' }}>
                            {tx.rawAmount < 0 ? '-' : '+'}{formatCurrencyAbbreviated(Math.abs(tx.rawAmount))}
                          </td>
                          <td className="dash-td">
                            <span className="dash-badge" style={statusColor}>{tx.status}</span>
                          </td>
                          <td className="dash-td" style={{ fontSize: '11px', color: '#000' }}>{tx.date}</td>
                          <td className="dash-td text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(tx);
                                setShowDetails(true);
                              }}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e4e4de', background: '#fff', cursor: 'pointer' }}
                            >
                              <Eye size={14} style={{ color: '#000' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[#111]/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDetails(false)}
          />
          <div className="relative bg-white rounded-[24px] shadow-2xl max-w-lg w-full overflow-hidden border border-[#e4e4de] animate-in fade-in zoom-in duration-300" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <div className="px-8 py-6 border-b border-[#f0f0f0] flex items-center justify-between bg-[#fafaf7]">
              <div className="flex items-center gap-3">
                <div className="dash-icon-box" style={{ width: '40px', height: '40px', background: '#1D4ED8', boxShadow: '0 4px 12px rgba(29,78,216,0.25)' }}>
                  <Clock size={20} />
                </div>
                <h3 className="text-lg font-black text-[#111] tracking-tight">Transaction Details</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-[#e4e4de] rounded-full transition-colors"
              >
                <Check size={20} className="text-black" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="dash-stat-label" style={{ marginBottom: '4px' }}>Status</p>
                  <span className="dash-badge" style={
                    selectedOrder.statusRaw === 'completed' || selectedOrder.statusRaw === 'success'
                      ? { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }
                      : selectedOrder.statusRaw === 'pending' || selectedOrder.statusRaw === 'processing'
                      ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' }
                      : { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' }
                  }>
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="dash-stat-label" style={{ marginBottom: '4px' }}>Amount</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: selectedOrder.rawAmount < 0 ? '#b91c1c' : '#059669' }}>
                    {selectedOrder.rawAmount < 0 ? '-' : '+'}{formatCurrencyAbbreviated(Math.abs(selectedOrder.rawAmount))}
                  </p>
                </div>
              </div>

              <div className="p-5 bg-[#fafaf7] rounded-2xl border border-[#e4e4de] space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="dash-stat-label">Transaction Type</span>
                  <span style={{ fontWeight: '800', color: '#111' }}>{selectedOrder.type}</span>
                </div>
                <div className="flex justify-between items-start text-sm">
                  <span className="dash-stat-label">Description</span>
                  <span style={{ fontWeight: '700', color: '#111' }} className="text-right max-w-[60%]">{selectedOrder.description}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="dash-stat-label">Timestamp</span>
                  <span style={{ fontWeight: '700', color: '#111' }}>{selectedOrder.date}</span>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="dash-btn-primary w-full py-4 text-xs uppercase tracking-widest"
                style={{ background: '#7C3AED', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
