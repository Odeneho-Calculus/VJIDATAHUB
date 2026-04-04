import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import {
  AlertCircle,
  ShoppingBag,
  CheckCircle,
  Clock,
  ArrowRight,
  Copy,
  Zap,
  Lock,
  Mail,
  Phone,
  Layers,
  BarChart3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Target,
  Layout,
  RefreshCw,
  Eye
} from 'lucide-react';
import { store as storeAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [agentFeeStatus, setAgentFeeStatus] = useState(null);
  const [accessStatus, setAccessStatus] = useState(null);
  const [adminContact, setAdminContact] = useState(null);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [storeRes, statsRes, ordersRes, feeStatusRes] = await Promise.all([
        storeAPI.getMyStore(),
        storeAPI.getOrderStats(),
        storeAPI.getOrders(1, 10),
        storeAPI.getAgentFeeStatus(),
      ]);

      setStoreData(storeRes.store);
      setAccessStatus(storeRes.accessStatus || null);
      setAdminContact(storeRes.adminContact || null);
      setOrderStats(statsRes.stats || {
        totalOrders: 0,
        completedOrders: 0,
        processingOrders: 0,
        totalRevenue: 0,
      });
      setRecentOrders(ordersRes.orders || []);
      setAgentFeeStatus(feeStatusRes?.feeStatus || null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueActivation = () => {
    navigate('/agent/store');
  };

  const handleCopyLink = () => {
    if (storeData?.slug) {
      const storeUrl = `${window.location.origin}/store/${storeData.slug}`;
      navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => formatCurrencyAbbreviated(amount);

  if (loading) {
    return (
      <AgentLayout>
        <div className="flex items-center justify-center min-h-[60vh] relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-100/30 blur-[100px] rounded-full"></div>
          <div className="text-center relative">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 font-bold uppercase tracking-widest text-[10px]">Loading your page...</p>
          </div>
        </div>
      </AgentLayout>
    );
  }

  const showActivationBanner = !!agentFeeStatus && !['paid', 'protocol'].includes(agentFeeStatus?.status);
  const showBanBanner = accessStatus?.code === 'STORE_TEMP_BANNED' || !!storeData?.isTemporarilyBanned;
  const registrationFee = Number(agentFeeStatus?.registrationFee || 0);
  const walletBalance = Number(user?.balance || 0);
  const isWalletBalanceLow = showActivationBanner && registrationFee > 0 && walletBalance < registrationFee;
  const plansCount = storeData?.plans?.length || 0;

  return (
    <AgentLayout>
      <div className="relative min-h-screen bg-[#F8FAFC]">
        {/* Top Header - Glassmorphism */}
        <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200/60 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary-600 min-w-0">
                <Layout size={16} className="flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Store Summary</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/store/${storeData?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-primary-400 hover:text-primary-600 transition-all font-medium text-sm shadow-sm whitespace-nowrap"
                >
                  <ExternalLink size={16} />
                  View Store
                </a>
                <button
                  onClick={fetchDashboardData}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2 flex-wrap">
              {storeData?.name || 'My Store'}
              <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {storeData?.slug}
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
                to="/agent/orders"
                className="px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-bold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                Sales History
                <ArrowRight size={14} className="text-slate-600" />
              </Link>
              <Link
                to="/agent/wallet"
                className="px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all font-bold text-xs shadow-sm flex items-center justify-center gap-2"
              >
                Add Funds
                <CreditCard size={14} className="text-emerald-500" />
              </Link>
              <Link
                to="/agent/store"
                className="col-span-2 sm:col-auto px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-xs shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
              >
                Edit Store
                <Zap size={14} className="text-indigo-400" />
              </Link>
            </div>
          </div>

          {/* Critical Alerts - Premium Banner */}
          {showBanBanner && (
            <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-red-500 to-rose-600 p-[1px] shadow-lg shadow-red-200">
              <div className="bg-white rounded-[23px] p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                  <Lock size={30} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Action Required</h3>
                  <p className="text-slate-600 mt-1 font-medium">
                    Store suspended: {storeData?.temporaryBanReason || 'Access suspended by admin.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {/* Always show admin contact if available */}
                    {adminContact?.email && (
                      <a
                        href={`mailto:${adminContact.email}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Mail size={12} />
                        {adminContact.email}
                      </a>
                    )}
                    {adminContact?.phone && (
                      <a
                        href={`tel:${adminContact.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Phone size={12} />
                        {adminContact.phone}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleContinueActivation}
                  className="px-8 py-3 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-200 transition-all"
                >
                  Open Store Settings
                </button>
              </div>
            </div>
          )}

          {showActivationBanner && (
            <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-amber-600 p-[1px] shadow-lg shadow-orange-200">
              <div className="bg-white rounded-[23px] p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0 animate-pulse">
                  <AlertCircle size={32} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Complete Setup Payment</h3>
                  <p className="text-slate-600 mt-1 font-medium">
                    Pay your one-time setup fee to open your store and start selling.
                  </p>
                  {isWalletBalanceLow && (
                    <p className="text-xs font-bold text-orange-700 mt-2">
                      Wallet balance is low ({formatCurrencyAbbreviated(walletBalance)} / {formatCurrencyAbbreviated(registrationFee)} required)
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  {isWalletBalanceLow && (
                    <Link
                      to="/agent/wallet"
                      className="px-8 py-3 bg-white text-orange-700 rounded-2xl font-black border border-orange-200 hover:bg-orange-50 transition-all"
                    >
                      Add Funds
                    </Link>
                  )}
                  <button
                    onClick={handleContinueActivation}
                    className="px-10 py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 shadow-xl shadow-orange-200 transition-all transform hover:scale-105"
                  >
                    Pay Setup Fee
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales', value: orderStats?.totalOrders || 0, icon: Target, color: 'blue' },
              { label: 'Delivered', value: orderStats?.completedOrders || 0, icon: CheckCircle, color: 'emerald' },
              { label: 'Processing', value: orderStats?.processingOrders || 0, icon: Layers, color: 'indigo' },
              { label: 'Revenue', value: formatCurrency(orderStats?.totalRevenue), icon: TrendingUp, color: 'purple' }
            ].map((stat, i) => (
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
            {/* Store Details Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden group">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <ExternalLink size={18} className="text-primary-500" />
                  Store Details
                </h3>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Store Name</p>
                    <p className="text-base font-black text-slate-900">{storeData?.name || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Public Store Link</p>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black font-mono text-indigo-600 tracking-tighter">/{storeData?.slug}</p>
                      <button onClick={handleCopyLink} className="p-1 px-2 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold hover:bg-indigo-100 transition-colors">
                        {copiedLink ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary-50 text-primary-900 border border-primary-100 shadow-sm">
                  <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-primary-600 opacity-80">Available Data Bundles</p>
                    <p className="text-base font-black leading-tight">{plansCount} Bundles available</p>
                  </div>
                  <Link to="/agent/store" className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-md shadow-primary-200">
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col group">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Zap size={18} className="text-primary-500" />
                  Network Status
                </h3>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {[
                    { net: 'MTN Network', status: 'Available', load: '12%', color: 'emerald' },
                    { net: 'Telecel Network', status: 'Available', load: '24%', color: 'blue' },
                    { net: 'AirtelTigo Network', status: 'Available', load: '18%', color: 'blue' }
                  ].map((n, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-xs font-bold text-slate-600">{n.net}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${n.status === 'Available' ? 'text-emerald-600' : 'text-primary-600'}`}>{n.status}</p>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-${n.color}-500 rounded-full group-hover:opacity-80 transition-all`} style={{ width: n.load }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 mt-6 border-t border-slate-50 text-center">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Service Uptime 99.99%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight leading-none uppercase text-[11px] tracking-widest text-slate-600">Order List</h3>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Sales</h3>
                </div>
              </div>
              <Link
                to="/agent/orders"
                className="group flex items-center gap-2 text-xs font-black text-primary-600 uppercase tracking-widest hover:gap-3 transition-all"
              >
                View All
                <ChevronRight size={16} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-20 space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <ShoppingBag size={48} />
                </div>
                <p className="text-slate-600 font-bold text-lg">No sales yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 px-8 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Network</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Destination</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Bundle</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Price</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Status</th>
                      <th className="py-4 px-4 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Date</th>
                      <th className="py-4 px-8 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-8 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200`}>
                            {order.network}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{order.phoneNumber || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-slate-700">{order.dataAmount} Bundle</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-black text-slate-900">{formatCurrency(order.amount)}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.status === 'pending' || order.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <p className="text-xs font-bold text-slate-600">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="py-4 px-8 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetails(true);
                            }}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="View Order"
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

      {/* Order Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Order Details"
        icon={<ShoppingBag size={20} className="text-primary-600" />}
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Order ID</p>
                <p className="font-mono text-sm font-bold text-slate-900 uppercase">#{selectedOrder._id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-700' :
                  selectedOrder.status === 'pending' || selectedOrder.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer Details</p>
                <p className="font-bold text-slate-900">{selectedOrder.phoneNumber}</p>
                <p className="text-xs font-bold text-slate-600 uppercase mt-1">{selectedOrder.network}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Package</p>
                <p className="font-bold text-slate-900">{selectedOrder.dataAmount} Bundle</p>
                <p className="text-xs font-bold text-slate-600 mt-1">{formatCurrency(selectedOrder.amount)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">Purchase Date</span>
                <span className="text-sm font-bold text-slate-900">{formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">Commission Earned</span>
                <span className="text-sm font-black text-emerald-600">+{formatCurrency(selectedOrder.agentCommission || 0)}</span>
              </div>
              {selectedOrder.transactionId && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-500 uppercase">Transaction ID</span>
                  <span className="text-sm font-mono font-bold text-slate-900 uppercase">{selectedOrder.transactionId}</span>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 py-3 text-sm font-black text-slate-600 uppercase tracking-widest bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AgentLayout>
  );
}
