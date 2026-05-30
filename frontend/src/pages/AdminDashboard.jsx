import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Activity,
  ShoppingCart,
  Gift,
  DollarSign,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  Store,
  HandCoins,
  Package,
  History,
  ArrowRight,
  ShieldCheck,
  Database,
  Wallet,
  Settings2,
} from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
// import { useSettings } from '../context/SettingsContext';
import { admin as adminAPI } from '../services/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .dash-wrapper { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .dash-container { background-color: #ffffff; }
  .dash-content { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
  
  .dash-header { 
    background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%); 
    border: 1.5px solid #DDD6FE; 
    border-radius: 14px; 
    padding: 24px; 
    box-shadow: 0 8px 40px rgba(124,58,237,0.08); 
    margin-bottom: 24px; 
  }
  
  .dash-title { font-size: 28px; font-weight: 800; color: #111; margin: 0; letter-spacing: -0.02em; }
  .dash-subtitle { font-size: 14px; color: #666; margin: 8px 0 0 0; }
  .dash-error { background-color: #fff5f5; border: 1.5px solid #fecaca; border-radius: 7px; color: #b91c1c; padding: 14px 16px; font-size: 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .dash-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
  
  @media (min-width: 768px) {
    .dash-stat-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
  }

  .dash-stat-card { 
    background: var(--stat-bg, #fff); 
    border: 1.5px solid var(--stat-border, #e4e4de); 
    border-radius: 14px; 
    padding: 20px; 
    cursor: pointer; 
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .dash-stat-card:hover { 
    border-color: var(--stat-color, #d4d4ce); 
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.10)); 
    transform: translateY(-2px);
  }
  
  .dash-stat-icon { 
    width: 36px; 
    height: 36px; 
    background: var(--stat-bg, #f0f0ed); 
    border-radius: 8px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    color: var(--stat-main, #111);
    box-shadow: 0 2px 8px var(--stat-glow, rgba(0,0,0,0.05));
  }
  
  .dash-stat-label { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
  .dash-stat-value { font-size: 22px; font-weight: 800; color: #111; white-space: nowrap; overflow: visible; text-overflow: unset; }
  .dash-stat-meta { font-size: 11px; font-weight: 700; color: #999; margin-top: 4px; }
  
  .dash-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.06); margin-bottom: 24px; }
  .dash-card-title { font-size: 16px; font-weight: 800; color: #111; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px; }
  
  .dash-info-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .dash-info-item:last-child { border-bottom: none; }
  
  .dash-action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 640px) {
    .dash-action-grid { grid-template-columns: repeat(4, 1fr); }
  }
  
  .dash-action-btn { 
    padding: 12px; 
    border: 1.5px solid #e4e4de; 
    border-radius: 9px; 
    background-color: #fff; 
    font-size: 13px; 
    font-weight: 700; 
    cursor: pointer; 
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .dash-action-btn:hover { 
    background-color: #fafaf7; 
    border-color: #d4d4ce; 
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .dash-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #EDE9FE;
    border-top-color: #7C3AED;
    border-radius: 50%;
    margin: 0 auto 16px;
    animation: dash-spin 0.8s linear infinite;
  }

  @keyframes dash-spin {
    to { transform: rotate(360deg); }
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
`;

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


export default function AdminDashboard() {
  const navigate = useNavigate();
  const { sidebarOpen, closeSidebar } = useSidebar();
  // const { settings } = useSettings();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
        <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="dash-spinner" />
            <p style={{ color: '#666', fontSize: '14px', fontWeight: 600 }}>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalUsers = Number(stats?.totalUsers || 0);
  const activeUsers = Number(stats?.activeUsers || 0);
  const totalTransactions = Number(stats?.totalTransactions || 0);
  const totalPurchases = Number(stats?.totalPurchases || 0);
  const totalAdmins = Number(stats?.totalAdmins || 0);
  const totalBalance = Number(stats?.totalBalance || 0);
  const totalReferralEarnings = Number(stats?.totalReferralEarnings || 0);
  const totalAgentEarnings = Number(stats?.totalAgentEarnings || 0);
  const totalAgentWithdrawn = Number(stats?.totalAgentWithdrawn || 0);
  const totalAgentPending = Number(stats?.totalAgentPending || 0);
  const totalAgentRemaining = Number(stats?.totalAgentRemaining || 0);
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const purchaseConversion = totalTransactions > 0 ? ((totalPurchases / totalTransactions) * 100).toFixed(1) : '0.0';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statCards = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: getColor(1),
      meta: `${activeRate}% active`,
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Active Users',
      value: activeUsers,
      icon: Activity,
      color: getColor(1),
      meta: `${totalUsers - activeUsers} inactive`,
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Transactions',
      value: totalTransactions,
      icon: TrendingUp,
      color: getColor(5),
      meta: `${purchaseConversion}% converted`,
      action: () => navigate('/admin/transactions'),
    },
    {
      title: 'Purchases',
      value: totalPurchases,
      icon: ShoppingCart,
      color: getColor(6),
      meta: 'Across all channels',
      action: () => navigate('/admin/orders'),
    },
    {
      title: 'Referral Earnings',
      value: `GHS ${formatNumberAbbreviated(totalReferralEarnings)}`,
      icon: Gift,
      color: getColor(12),
      meta: 'Total referral payout flow',
      action: () => navigate('/admin/referrals'),
    },
    {
      title: 'Agent Earnings',
      value: `GHS ${formatNumberAbbreviated(totalAgentEarnings)}`,
      icon: DollarSign,
      color: getColor(10),
      meta: 'Total earned by all agents',
      action: () => navigate('/admin/commissions'),
    },
    {
      title: 'Agent Withdrawals',
      value: `GHS ${formatNumberAbbreviated(totalAgentWithdrawn)}`,
      icon: HandCoins,
      color: getColor(10),
      meta: 'Total withdrawn by agents',
      action: () => navigate('/admin/commissions'),
    },
    {
      title: 'Agent Pending',
      value: `GHS ${formatNumberAbbreviated(totalAgentPending)}`,
      icon: Clock,
      color: getColor(10),
      meta: 'Pending withdrawal requests',
      action: () => navigate('/admin/commissions'),
    },
    {
      title: 'Agent Balance',
      value: `GHS ${formatNumberAbbreviated(totalAgentRemaining)}`,
      icon: Wallet,
      color: getColor(10),
      meta: 'Available agent balance',
      action: () => navigate('/admin/commissions'),
    },
  ];

  const handleDataPlansNavigation = () => {
    navigate('/admin/topza-plans');
  };

  const quickActions = [
    { label: 'Manage Users', icon: Users, path: '/admin/users' },
    { label: 'Data Plans', icon: Activity, path: null, handler: handleDataPlansNavigation },
    { label: 'Transactions', icon: TrendingUp, path: '/admin/transactions' },
    { label: 'Wallet Settings', icon: Settings2, path: '/admin/vtu-settings' },
    { label: 'Agent Stores', icon: Store, path: '/admin/agent-stores' },
    { label: 'Withdrawals', icon: HandCoins, path: '/admin/commissions' },
    { label: 'Agent Orders', icon: Package, path: '/admin/orders?scope=agent' },
    { label: 'Agent Histories', icon: History, path: '/admin/transactions?scope=agent' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff' }} className="dash-wrapper">
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="w-full px-2.5 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6">
            <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6">
              <div className="dash-header">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div style={{
                      width: 46, height: 46, background: '#7C3AED', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0,
                      boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
                    }}>
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h1 className="dash-title">
                        Admin Dashboard
                      </h1>
                      <p className="dash-subtitle">
                        System overview, operational health, and control actions
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#DDD6FE] bg-white/50 px-3 py-2 text-xs sm:text-sm text-indigo-700 font-bold backdrop-blur-sm">
                    <Clock size={16} />
                    {todayLabel}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl text-red-700 text-sm sm:text-base flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <section>
                <div className="dash-stat-grid">
                  {statCards.slice(0, 4).map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={idx}
                        onClick={card.action}
                        className="dash-stat-card"
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          '--stat-main': card.color.main,
                          '--stat-bg': card.color.soft,
                          '--stat-border': card.color.main + '33',
                          '--stat-color': card.color.main + '66',
                          '--stat-glow': card.color.glow,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
                          <div style={{ flex: 1 }}>
                            <p className="dash-stat-label" style={{ color: card.color.main }}>
                              {card.title}
                            </p>
                            <p className="dash-stat-value">
                              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                            </p>
                            <p className="dash-stat-meta">{card.meta}</p>
                          </div>
                          <div className="dash-stat-icon">
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <button
                  onClick={statCards[4].action}
                  className="dash-card"
                  style={{ 
                    width: '100%', 
                    padding: '24px', 
                    textAlign: 'left',
                    background: statCards[4].color.soft,
                    borderColor: statCards[4].color.main + '33',
                    boxShadow: `0 8px 30px ${statCards[4].color.glow}`,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = statCards[4].color.main + '66';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = statCards[4].color.main + '33';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="dash-stat-icon" style={{ 
                        width: '46px', 
                        height: '46px', 
                        background: statCards[4].color.main, 
                        color: '#fff',
                        boxShadow: `0 4px 12px ${statCards[4].color.glow}`,
                      }}>
                        <Gift size={22} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: statCards[4].color.main, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referral Earnings</p>
                        <p className="dash-stat-value" style={{ fontSize: '24px' }}>
                          GHS {formatNumberAbbreviated(totalReferralEarnings)}
                        </p>
                      </div>
                    </div>
                    <div style={{ 
                      width: 32, height: 32, borderRadius: '50%', 
                      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}>
                      <ArrowRight size={18} style={{ color: statCards[4].color.main }} />
                    </div>
                  </div>
                </button>
              </section>

              {/* Agent Earnings Stats */}
              <section>
                <div className="dash-stat-grid">
                  {statCards.slice(5, 9).map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={idx}
                        onClick={card.action}
                        className="dash-stat-card"
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          '--stat-main': card.color.main,
                          '--stat-bg': card.color.soft,
                          '--stat-border': card.color.main + '33',
                          '--stat-color': card.color.main + '66',
                          '--stat-glow': card.color.glow,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
                          <div style={{ flex: 1 }}>
                            <p className="dash-stat-label" style={{ color: card.color.main }}>
                              {card.title}
                            </p>
                            <p className="dash-stat-value">
                              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                            </p>
                            <p className="dash-stat-meta">{card.meta}</p>
                          </div>
                          <div className="dash-stat-icon">
                            <Icon size={18} strokeWidth={2.5} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-5">
                <div className="xl:col-span-2 dash-card">
                  <h2 className="dash-card-title">
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: '#DBEAFE', color: '#1D4ED8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DollarSign size={15} strokeWidth={2.5} />
                    </div>
                    Financial Overview
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF]">
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: '#1D4ED8', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(29,78,216,0.2)',
                        }}>
                          <Wallet size={20} />
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: '#1D4ED8', margin: 0 }}>Total User Balance</p>
                          <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', margin: 0 }}>All wallet balances combined</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '22px', fontWeight: '800', color: '#111', margin: 0 }}>
                        GHS {formatNumberAbbreviated(totalBalance)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#FCE7F3] bg-[#FDF2F8]">
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: '#BE185D', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(190,24,93,0.2)',
                        }}>
                          <Gift size={20} />
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: '#BE185D', margin: 0 }}>Referral Earnings</p>
                          <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', margin: 0 }}>Total distributed rewards</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '22px', fontWeight: '800', color: '#111', margin: 0 }}>
                        GHS {formatNumberAbbreviated(totalReferralEarnings)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div style={{ background: '#F5F3FF', padding: '16px', borderRadius: '12px', border: '1.5px solid #DDD6FE' }}>
                        <p className="dash-stat-label" style={{ marginBottom: '4px', color: '#7C3AED' }}>Purchase Conversion</p>
                        <p style={{ fontSize: '20px', fontWeight: '800', color: '#111', margin: 0 }}>{purchaseConversion}%</p>
                        <p style={{ fontSize: '11px', color: '#666' }}>Transaction success rate</p>
                      </div>
                      <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '12px', border: '1.5px solid #A7F3D0' }}>
                        <p className="dash-stat-label" style={{ marginBottom: '4px', color: '#0F6E56' }}>Active User Rate</p>
                        <p style={{ fontSize: '20px', fontWeight: '800', color: '#111', margin: 0 }}>{activeRate}%</p>
                        <p style={{ fontSize: '11px', color: '#666' }}>User engagement level</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dash-card">
                  <h2 className="dash-card-title">
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: '#ECFDF5', color: '#0F6E56',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ShieldCheck size={15} strokeWidth={2.5} />
                    </div>
                    System Health
                  </h2>
                  <div className="space-y-4">
                    <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '12px', border: '1.5px solid #A7F3D0' }}>
                      <p style={{ fontSize: '10px', fontWeight: '800', color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Global Status</p>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 12px #10B981' }}></div>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#065F46' }}>Operational</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>Admin Accounts</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>{totalAdmins} Verified</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>Data Engine</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} />
                          Active
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>Security Layer</span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>SSL Protected</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f0f0f0', marginTop: '8px' }}>
                      <p style={{ fontSize: '10px', fontWeight: '800', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                        Real-time Monitoring Live
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dash-card">
                <h2 className="dash-card-title">
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: '#FEF3C7', color: '#B45309',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Zap size={15} strokeWidth={2.5} />
                  </div>
                  Quick Management
                </h2>
                <div className="dash-action-grid">
                  {quickActions.map((action, idx) => {
                    const Icon = action.icon;
                    const c = getColor(idx + 2); // Start from index 2 to mix colors
                    return (
                      <button
                        key={action.label}
                        onClick={() => action.handler ? action.handler() : navigate(action.path)}
                        className="dash-action-btn"
                        style={{ 
                          borderColor: c.main + '22',
                          background: '#fff'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = c.soft;
                          e.currentTarget.style.borderColor = c.main + '44';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = c.main + '22';
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: c.soft, color: c.main,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={16} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                          {action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 pb-8">
                <div className="dash-card" style={{ marginBottom: 0 }}>
                  <h3 className="dash-card-title">
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: '#E0F2FE', color: '#0369A1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Activity size={15} strokeWidth={2.5} />
                    </div>
                    Live Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-sky-200 transition-all cursor-default">
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Active Users</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>{activeUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-sky-200 transition-all cursor-default">
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Total Transactions</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>{totalTransactions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-sky-200 transition-all cursor-default">
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Total Purchases</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>{totalPurchases.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="dash-card" style={{ marginBottom: 0 }}>
                  <h3 className="dash-card-title">
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: '#ECFCCB', color: '#4D7C0F',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TrendingUp size={15} strokeWidth={2.5} />
                    </div>
                    Operational Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-lime-200 transition-all cursor-default">
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Registered Users</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>{totalUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-lime-200 transition-all cursor-default">
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Admin Accounts</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>{totalAdmins.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-lime-200 transition-all cursor-default">
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>Core Services</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                        <CheckCircle size={14} />
                        Stable
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
