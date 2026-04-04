import { useState, useEffect } from 'react';
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
      action: () => navigate('/admin/purchases'),
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
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                      Admin Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1">
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
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm sm:text-base flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <section>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                  {statCards.slice(0, 4).map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={idx}
                        onClick={card.action}
                        className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] sm:text-sm font-medium text-slate-600 mb-1 leading-tight">
                              {card.title}
                            </p>
                            <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">
                              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-tight">{card.meta}</p>
                          </div>
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.tone.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.tone.iconColor}`} />
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
                  className="w-full bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-rose-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Referral Earnings</p>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
                          GHS {formatNumberAbbreviated(totalReferralEarnings)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </button>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
                <div className="xl:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
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

                    <div className="grid grid-cols-2 gap-3">
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

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
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

              <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap size={22} className="text-amber-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => action.handler ? action.handler() : navigate(action.path)}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 text-sm flex items-center justify-center gap-2"
                      >
                        <Icon size={16} className="text-slate-600" />
                        <span className="truncate">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
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

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
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
