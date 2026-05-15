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
import { useSettings } from '../context/SettingsContext';
import { admin as adminAPI } from '../services/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  .dash-wrapper { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .dash-container { background-color: #f5f5f0; }
  .dash-content { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
  .dash-header { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); margin-bottom: 24px; }
  .dash-title { font-size: 26px; font-weight: 800; color: #111; margin: 0; }
  .dash-subtitle { font-size: 14px; color: #666; margin: 8px 0 0 0; }
  .dash-error { background-color: #fff5f5; border: 1.5px solid #fecaca; border-radius: 7px; color: #b91c1c; padding: 14px 16px; font-size: 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .dash-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .dash-stat-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 20px; cursor: pointer; transition: all 0.2s ease; }
  .dash-stat-card:hover { border-color: #d4d4ce; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
  .dash-stat-icon { width: 36px; height: 36px; background-color: rgba(240,165,0,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #f0a500; margin-bottom: 8px; }
  .dash-stat-label { font-size: 11px; color: #999; margin-bottom: 4px; }
  .dash-stat-value { font-size: 24px; font-weight: 800; color: #111; white-space: nowrap; overflow: visible; text-overflow: unset; }
  .dash-stat-meta { font-size: 12px; color: #999; margin-top: 8px; }
  .dash-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 20px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); margin-bottom: 24px; }
  .dash-card-title { font-size: 16px; font-weight: 700; color: #111; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; }
  .dash-info-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .dash-info-item:last-child { border-bottom: none; }
  .dash-action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .dash-action-btn { padding: 12px 16px; border: 1.5px solid #e0e0d8; border-radius: 7px; background-color: #fafaf7; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
  .dash-action-btn:hover { background-color: #f0f0ed; border-color: #d0d0c8; }
  @media (max-width: 768px) {
    .dash-content { padding: 16px 12px; }
    .dash-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .dash-action-grid { grid-template-columns: repeat(2, 1fr); }
    .dash-stat-card { padding: 16px; }
    .dash-stat-label, .dash-stat-meta { white-space: normal; word-wrap: break-word; }
  }
  @media (max-width: 480px) {
    .dash-stat-grid { gap: 6px; }
    .dash-stat-card { padding: 12px; }
  }
  @media (min-width: 769px) {
    .dash-stat-label, .dash-stat-meta { white-space: nowrap; overflow: visible; text-overflow: unset; }
  }
`;


export default function AdminDashboard() {
  const navigate = useNavigate();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings } = useSettings();
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
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-blue-700 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
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
      tone: {
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-700',
      },
      meta: `${activeRate}% active`,
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Active Users',
      value: activeUsers,
      icon: Activity,
      tone: {
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-700',
      },
      meta: `${totalUsers - activeUsers} inactive`,
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Transactions',
      value: totalTransactions,
      icon: TrendingUp,
      tone: {
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-700',
      },
      meta: `${purchaseConversion}% converted`,
      action: () => navigate('/admin/transactions'),
    },
    {
      title: 'Purchases',
      value: totalPurchases,
      icon: ShoppingCart,
      tone: {
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-700',
      },
      meta: 'Across all channels',
      action: () => navigate('/admin/orders'),
    },
    {
      title: 'Referral Earnings',
      value: `GHS ${formatNumberAbbreviated(totalReferralEarnings)}`,
      icon: Gift,
      tone: {
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-700',
      },
      meta: 'Total referral payout flow',
      action: () => navigate('/admin/referrals'),
    },
    {
      title: 'Agent Earnings',
      value: `GHS ${formatNumberAbbreviated(totalAgentEarnings)}`,
      icon: DollarSign,
      tone: {
        iconBg: 'bg-green-50',
        iconColor: 'text-green-700',
      },
      meta: 'Total earned by all agents',
      action: () => navigate('/admin/commissions'),
    },
    {
      title: 'Agent Withdrawals',
      value: `GHS ${formatNumberAbbreviated(totalAgentWithdrawn)}`,
      icon: HandCoins,
      tone: {
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-700',
      },
      meta: 'Total withdrawn by agents',
      action: () => navigate('/admin/commissions'),
    },
    {
      title: 'Agent Pending',
      value: `GHS ${formatNumberAbbreviated(totalAgentPending)}`,
      icon: Clock,
      tone: {
        iconBg: 'bg-yellow-50',
        iconColor: 'text-yellow-700',
      },
      meta: 'Pending withdrawal requests',
      action: () => navigate('/admin/commissions'),
    },
    {
      title: 'Agent Balance',
      value: `GHS ${formatNumberAbbreviated(totalAgentRemaining)}`,
      icon: Wallet,
      tone: {
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-700',
      },
      meta: 'Available agent balance',
      action: () => navigate('/admin/commissions'),
    },
  ];

  const handleDataPlansNavigation = () => {
    const activeProvider = settings?.vtuProvider || 'topza';
    if (activeProvider === 'topza') {
      navigate('/admin/topza-plans');
    } else if (activeProvider === 'digimall') {
      navigate('/admin/digimall-plans');
    } else {
      navigate('/admin/dataplans');
    }
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
    <div className="flex min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] bg-slate-100 dash-wrapper">
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="w-full px-2.5 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6">
            <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6">
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-slate-900">
                      Admin Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1 leading-snug">
                      System overview, operational health, and control actions
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-700">
                    <Clock size={16} className="text-slate-500" />
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
                        style={{ display: 'flex', flexDirection: 'column' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <p className="dash-stat-label">
                              {card.title}
                            </p>
                            <p className="dash-stat-value">
                              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                            </p>
                            <p className="dash-stat-meta">{card.meta}</p>
                          </div>
                          <div className="dash-stat-icon">
                            <Icon size={18} />
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
                  style={{ width: '100%', padding: '20px', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="dash-stat-icon" style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        <Gift size={20} />
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>Referral Earnings</p>
                        <p className="dash-stat-value">
                          GHS {formatNumberAbbreviated(totalReferralEarnings)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={20} style={{ color: '#999' }} />
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
                        style={{ display: 'flex', flexDirection: 'column' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <p className="dash-stat-label">
                              {card.title}
                            </p>
                            <p className="dash-stat-value">
                              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                            </p>
                            <p className="dash-stat-meta">{card.meta}</p>
                          </div>
                          <div className="dash-stat-icon">
                            <Icon size={18} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-5">
                <div className="xl:col-span-2 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <DollarSign size={22} className="text-blue-700" />
                    Financial Overview
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <Wallet size={18} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-900 font-semibold">Total User Balance</p>
                          <p className="text-xs text-slate-500">All wallet balances combined</p>
                        </div>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900">
                        GHS {formatNumberAbbreviated(totalBalance)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                          <Gift size={18} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-900 font-semibold">Referral Earnings</p>
                          <p className="text-xs text-slate-500">Total distributed through referrals</p>
                        </div>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900">
                        GHS {formatNumberAbbreviated(totalReferralEarnings)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs text-slate-500">Purchase Conversion</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{purchaseConversion}%</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs text-slate-500">Active User Rate</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{activeRate}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <ShieldCheck size={22} className="text-emerald-700" />
                    System Health
                  </h2>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 p-4 bg-emerald-50">
                      <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Status</p>
                      <div className="flex items-center gap-2 mt-2 text-emerald-800">
                        <CheckCircle size={16} />
                        <span className="font-semibold">Operational</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Admin Accounts</span>
                        <span className="font-bold text-slate-900">{totalAdmins}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-600">Data Layer</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Database size={14} className="text-emerald-600" />
                          Healthy
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-600">Monitoring</span>
                        <span className="font-bold text-slate-900">Live</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dash-card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '16px', margin: '0 0 16px 0' }}>
                  <Zap size={18} style={{ color: '#f0a500' }} />
                  Quick Actions
                </h2>
                <div className="dash-action-grid">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => action.handler ? action.handler() : navigate(action.path)}
                        className="dash-action-btn"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Icon size={14} style={{ color: '#666' }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-blue-700" />
                    Live Metrics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-600">Active Users</span>
                      <span className="font-bold text-slate-900">{activeUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-600">Total Transactions</span>
                      <span className="font-bold text-slate-900">{totalTransactions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-600">Total Purchases</span>
                      <span className="font-bold text-slate-900">{totalPurchases.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-700" />
                    Operational Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-600">Registered Users</span>
                      <span className="font-bold text-slate-900">{totalUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-600">Admin Accounts</span>
                      <span className="font-bold text-slate-900">{totalAdmins.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-600">Core Services</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
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
