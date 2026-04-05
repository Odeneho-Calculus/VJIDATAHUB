import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
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
  User
} from 'lucide-react';
import { dataplans, wallet, purchases, publicAPI } from '../services/api';
import UserLayout from '../components/UserLayout';

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

      const newStats = [
        { label: 'Total Spent', value: formatCurrencyAbbreviated(user?.totalSpent || 0), icon: Target, color: 'blue' },
        { label: 'Data Used', value: `${user?.dataUsed || 0}GB`, icon: Layers, color: 'indigo' },
        { label: 'Referral Earnings', value: formatCurrencyAbbreviated(user?.referralEarnings || 0), icon: TrendingUp, color: 'emerald' },
        { label: 'Wallet Balance', value: formatCurrencyAbbreviated(user?.balance || 0), icon: CreditCard, color: 'purple' },
      ];

      setStats(newStats);
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-rose-100 text-rose-700';
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const memberIdSource = user?.id || user?._id || '';
  const memberId = memberIdSource ? memberIdSource.slice(-6).toUpperCase() : 'N/A';

  return (
    <UserLayout>
      <div className="relative min-h-screen bg-[#F8FAFC]">
        {/* Top Header - Glassmorphism */}
        <div className="sticky top-0 z-20 app-pro-header px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-600 min-w-0">
                <Layout size={16} className="flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Account Overview</span>
              </div>

              <button
                onClick={() => {
                  setLoadingData(true);
                  fetchTransactionsAndStats();
                  fetchActiveBundles();
                }}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={loadingData ? 'animate-spin' : ''} />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2 flex-wrap">
              Welcome back, {user?.name}
              <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                Member ID: {memberId}
              </span>
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Dashboard Quick Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:flex items-center gap-3">
              <Link
                to="/orders"
                className="px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-bold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                Order History
                <ChevronRight size={14} className="text-slate-600" />
              </Link>
              <Link
                to="/topup"
                className="px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-bold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                Fund Wallet
                <CreditCard size={14} className="text-emerald-500" />
              </Link>
              <Link
                to="/buy-data"
                className="col-span-2 sm:col-auto px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-xs shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
              >
                Buy Data Bundle
                <Zap size={14} className="text-blue-400" />
              </Link>
            </div>
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Account Details & Referrals */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden group">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <User size={18} className="text-blue-500" />
                    Account Details
                  </h3>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Email Address</p>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Mail size={14} className="text-slate-400" />
                          <p className="text-sm font-black truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</p>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Phone size={14} className="text-slate-400" />
                          <p className="text-sm font-black">{user?.phone || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Referral Code</p>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-black font-mono text-blue-600 tracking-tighter">{user?.referralCode}</p>
                          <button onClick={copyReferralCode} className="p-1 px-2 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-bold hover:bg-blue-100 transition-colors">
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-50 text-blue-900 border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                            <Share2 size={16} />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600 opacity-80">Referral Reward</p>
                            <p className="text-xs font-black leading-tight">GH₵ {referralSettings?.amountPerReferral || '0.00'} / invite</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Bundles Grid */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Zap size={18} className="text-amber-500" />
                    Featured Bundles
                  </h3>
                  <Link to="/buy-data" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                    View All
                  </Link>
                </div>
                <div className="p-6">
                  {loadingBundles ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {dataBundles.map(bundle => (
                        <Link
                          key={bundle._id}
                          to={`/buy-data?planId=${bundle._id}&planName=${encodeURIComponent(bundle.planName)}&dataSize=${encodeURIComponent(bundle.dataSize)}&price=${bundle.sellingPrice}&network=${bundle.network}`}
                          className="group p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="px-2 py-0.5 bg-white rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600 border border-slate-100">
                              {bundle.network}
                            </span>
                          </div>
                          <p className="text-lg font-black text-slate-900 mb-1">{bundle.dataSize}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">{bundle.validity}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <p className="text-sm font-black text-blue-600">{formatCurrencyAbbreviated(bundle.sellingPrice)}</p>
                            <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Network Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col group h-fit">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-500" />
                  Service Health
                </h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-6">
                  {[
                    { net: 'MTN Network', status: 'Optimal', load: '12%', color: 'emerald' },
                    { net: 'Telecel Network', status: 'Stable', load: '24%', color: 'blue' },
                    { net: 'AirtelTigo Network', status: 'Stable', load: '18%', color: 'blue' }
                  ].map((n, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-xs font-bold text-slate-600">{n.net}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${n.status === 'Optimal' ? 'text-emerald-600' : 'text-blue-600'}`}>{n.status}</p>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-${n.color}-500 rounded-full group-hover:opacity-80 transition-all`} style={{ width: n.load }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-slate-50 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Platform Uptime 99.9%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight leading-none uppercase text-[11px] tracking-widest text-slate-600">Account Activity</h3>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Transactions</h3>
                </div>
              </div>
              <Link
                to="/transactions"
                className="group flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:gap-3 transition-all"
              >
                View All
                <ChevronRight size={16} />
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-center py-20 space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <ShoppingBag size={48} />
                </div>
                <p className="text-slate-600 font-bold text-lg">No activity yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 px-8 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Type</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Amount</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Status</th>
                      <th className="py-4 px-4 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Date</th>
                      <th className="py-4 px-8 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-8 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{tx.type}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{tx.description}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className={`font-black ${tx.rawAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {tx.rawAmount < 0 ? '-' : '+'}{formatCurrencyAbbreviated(Math.abs(tx.rawAmount))}
                          </p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(tx.statusRaw)}`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <p className="text-xs font-bold text-slate-600">{tx.date}</p>
                        </td>
                        <td className="py-4 px-8 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedOrder(tx);
                              setShowDetails(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDetails(false)}
          />
          <div className="relative bg-white rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Clock size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Transaction Details</h3>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <Check size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(selectedOrder.statusRaw)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                  <p className={`text-xl font-black ${selectedOrder.rawAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedOrder.rawAmount < 0 ? '-' : '+'}{formatCurrencyAbbreviated(Math.abs(selectedOrder.rawAmount))}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Type</span>
                  <span className="font-black text-slate-900">{selectedOrder.type}</span>
                </div>
                <div className="flex justify-between items-start text-sm">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Description</span>
                  <span className="font-bold text-slate-900 text-right max-w-[60%]">{selectedOrder.description}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Date</span>
                  <span className="font-bold text-slate-900">{selectedOrder.date}</span>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
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
