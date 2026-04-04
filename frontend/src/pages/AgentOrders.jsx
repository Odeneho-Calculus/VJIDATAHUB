import React, { useState, useEffect } from 'react';
import { AlertCircle, Search, CheckCircle, Clock, XCircle, Filter, Layout, CreditCard, RefreshCw, ArrowRight, Eye, ShoppingBag } from 'lucide-react';
import { store as storeAPI } from '../services/api';
import AgentLayout from '../components/AgentLayout';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { useSettings } from '../context/SettingsContext';

export default function AgentOrders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const networkCatalog = (settings?.networkCatalog || []).filter((n) => n?.isActive !== false);
  const normalizeNetwork = (val = '') => val.toString().trim().toLowerCase().replace(/\s+/g, '');
  const getNetworkFamily = (n = '') => {
    if (!n) return '';
    if (n.startsWith('mtn')) return 'mtn';
    if (n.startsWith('telecel') || n.startsWith('vodafone')) return 'telecel';
    if (
      n.startsWith('airtel') || n.startsWith('tigo') || n.startsWith('at') ||
      n.includes('airteltigo') || n.includes('ishare')
    ) return 'at';
    return n;
  };
  const networksMatch = (left = '', right = '') => {
    const normalizedLeft = normalizeNetwork(left);
    const normalizedRight = normalizeNetwork(right);
    if (!normalizedLeft || !normalizedRight) return false;
    if (normalizedLeft === normalizedRight) return true;
    return getNetworkFamily(normalizedLeft) === getNetworkFamily(normalizedRight);
  };

  const dynamicNetworks = Array.from(
    new Set(
      orders
        .map((order) => order?.network)
        .filter(Boolean)
    )
  );
  const networkOptions = networkCatalog.length > 0
    ? networkCatalog.map((network) => network.name)
    : dynamicNetworks;
  const displayedOrders = orders.filter((order) => !networkFilter || networksMatch(order.network, networkFilter));

  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, searchQuery, networkFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, networkFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await storeAPI.getOrders(currentPage, limit, statusFilter, searchQuery, networkFilter);
      setOrders(response.orders || []);
      setTotalPages(response.pagination?.pages || 1);
      setTotalOrders(response.pagination?.total || 0);
      setError('');
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `GHS ${(amount || 0).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'processing':
        return <Clock size={16} />;
      case 'failed':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusColor_OLD = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon_OLD = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'processing':
        return <Clock size={16} />;
      case 'failed':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <AgentLayout>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Top Header - Glassmorphism */}
        <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-slate-200/60 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary-600 mb-1">
                <Layout size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Order Summary</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Customer Orders
                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                  {totalOrders} Total
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchOrders}
                className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Refresh Orders"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 animate-in fade-in zoom-in-95 duration-300">
              <AlertCircle size={20} />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Filters and Search - Polished */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by customer, network..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-primary-500 focus:bg-white transition-all text-sm font-medium"
                />
              </form>

              {/* Status Filter */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 border border-slate-100 rounded-xl group focus-within:border-primary-500 focus-within:bg-white transition-all">
                <Filter size={18} className="text-slate-600" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 min-w-[140px] appearance-none cursor-pointer"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 border border-slate-100 rounded-xl group focus-within:border-primary-500 focus-within:bg-white transition-all">
                <Layout size={18} className="text-slate-600" />
                <select
                  value={networkFilter}
                  onChange={(e) => setNetworkFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 min-w-[160px] appearance-none cursor-pointer"
                >
                  <option value="">All Networks</option>
                  {networkOptions.map((network) => (
                    <option key={network} value={network}>{network}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight leading-none uppercase text-[11px] tracking-widest text-slate-600">Order List</h3>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">All Orders</h3>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                <p className="text-slate-600 font-medium animate-pulse">Loading orders...</p>
              </div>
            ) : displayedOrders.length === 0 ? (
              <div className="text-center py-24 space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <CreditCard size={40} />
                </div>
                <p className="text-slate-600 font-bold text-lg">No orders found for this search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 px-8 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">ID</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Customer</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Data Plan</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Amount</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Commission</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Payment</th>
                      <th className="py-4 px-4 font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Delivery</th>
                      <th className="py-4 px-4 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Date</th>
                      <th className="py-4 px-8 text-right font-bold text-[11px] uppercase text-slate-600 tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayedOrders.map((order) => (
                      <tr key={order._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-8 text-xs font-mono font-bold text-slate-600 whitespace-nowrap">
                          #{order._id?.slice(-8).toUpperCase()}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{order.phoneNumber || 'N/A'}</p>
                          <p className="text-[10px] font-black text-slate-600 uppercase">{order.network}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-slate-700">{order.dataAmount} Bundle</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-black text-slate-900">{formatCurrency(order.amount)}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block text-[11px]">
                            +{formatCurrency(order.agentCommission || 0)}
                          </p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getPaymentStatusColor(order.paymentStatus || 'pending')}`}
                          >
                            {order.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getOrderStatusColor(order.status)}`}
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
                            title="View Details"
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

            {/* Pagination Container */}
            {!loading && totalPages > 1 && (
              <div className="p-8 bg-slate-50/30 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
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
                  <div className="flex flex-col gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getPaymentStatusColor(selectedOrder.paymentStatus || 'pending')}`}>
                      Payment: {selectedOrder.paymentStatus || 'pending'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getOrderStatusColor(selectedOrder.status)}`}>
                      Delivery: {selectedOrder.status}
                    </span>
                  </div>
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
      </div>
    </AgentLayout>
  );
}
