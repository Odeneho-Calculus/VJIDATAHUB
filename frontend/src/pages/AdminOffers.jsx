import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, RefreshCw, Eye, Database, TrendingUp, AlertCircle, CheckCircle, Search, Tag, Filter } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import ViewXpresOfferModal from '../components/ViewXpresOfferModal';
import EditXpresPricesModal from '../components/EditXpresPricesModal';
import { useSidebar } from '../hooks/useSidebar';
import { xpresdata } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminOffers() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({ totalPlans: 0, activePlans: 0, outOfStockPlans: 0, avgMargin: 0 });

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditPricesModal, setShowEditPricesModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editPricesSaving, setEditPricesSaving] = useState(false);

  const fetchDataPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await xpresdata.list(selectedNetwork, '', page, 20, selectedType);
      if (response.success) {
        setPlans(response.plans);
        setTotalPages(response.pagination?.pages || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, page, selectedType]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await xpresdata.getStats(selectedNetwork || 'all');
      if (response.success) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    setPage(1);
  }, [selectedNetwork, searchTerm, selectedType]);

  useEffect(() => {
    fetchDataPlans();
    fetchStats();
  }, [page, selectedNetwork, selectedType, fetchDataPlans, fetchStats]);

  useEffect(() => {
    const provider = settings?.vtuProvider || 'xpresdata';
    if (provider === 'digimall') navigate('/admin/digimall-plans', { replace: true });
    if (provider === 'topza') navigate('/admin/topza-plans', { replace: true });
  }, [settings?.vtuProvider, navigate]);

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
    } else {
      setSuccess(msg);
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3000);
  };

  const getFilteredPlans = () => {
    if (!searchTerm) return plans;
    return plans.filter(plan =>
      plan.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await xpresdata.sync();
      if (response.success) {
        setPage(1);
        await fetchDataPlans();
        await fetchStats();
        showMessage(`Sync complete: ${response.stats.synced} new, ${response.stats.updated} updated`);
      }
    } catch (err) {
      showMessage(`Sync failed: ${err.message}`, true);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenEditPrices = (plan) => {
    setSelectedPlan(plan);
    setShowEditPricesModal(true);
  };

  const handleSavePrices = async (prices) => {
    if (!selectedPlan) return;
    try {
      setEditPricesSaving(true);
      const response = await xpresdata.updatePrices(selectedPlan._id, prices);
      if (response.success) {
        setPlans(plans.map(p => p._id === selectedPlan._id ? response.plan : p));
        setShowEditPricesModal(false);
        setSelectedPlan(null);
        showMessage('Offer prices updated successfully');
      }
    } catch (err) {
      showMessage(`Failed to update prices: ${err.message}`, true);
    } finally {
      setEditPricesSaving(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const response = await xpresdata.toggleStatus(plan._id);
      if (response.success) {
        setPlans(plans.map(p => p._id === plan._id ? response.plan : p));
        showMessage(`Offer ${response.plan.status === 'active' ? 'activated' : 'deactivated'} successfully`);
      }
    } catch (err) {
      showMessage(`Failed to toggle status: ${err.message}`, true);
    }
  };

  const handleOpenDelete = (plan) => {
    setSelectedPlan(plan);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedPlan) return;
    try {
      const response = await xpresdata.delete(selectedPlan._id);
      if (response.success) {
        setShowDeleteConfirm(false);
        await fetchDataPlans();
        setSelectedPlan(null);
        showMessage('Offer deleted successfully');
      }
    } catch (err) {
      showMessage(`Failed to delete offer: ${err.message}`, true);
    }
  };

  const filteredPlans = getFilteredPlans();
  const networks = ['MTN', 'Telecel', 'AirtelTigo'];
  const types = ['Data', 'Airtime'];

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                  Manage Xpresdata Offers
                </h1>
                <p className="text-sm sm:text-base text-slate-600">
                  Sync and manage Xpresdata offers pricing and availability
                </p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border-2 border-blue-100 self-start">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-blue-700">Provider: Xpresdata</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-sm sm:text-base flex items-center gap-3">
                <AlertCircle size={20} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-2xl text-green-700 text-sm sm:text-base flex items-center gap-3">
                <CheckCircle size={20} className="flex-shrink-0" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-6 sm:mb-8">
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Offers</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalPlans}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Active Offers</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.activePlans}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Out of Stock</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.outOfStockPlans}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search offers by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-0 text-sm hover:border-slate-300"
                  />
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Xpresdata'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Filter size={16} className="text-slate-400" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Filter</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedNetwork('')}
                      className={`px-4 py-2 rounded-lg font-bold transition text-[10px] uppercase tracking-wider ${selectedNetwork === ''
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      All Networks
                    </button>
                    {networks.map(network => (
                      <button
                        key={network}
                        onClick={() => setSelectedNetwork(network)}
                        className={`px-4 py-2 rounded-lg font-bold transition text-[10px] uppercase tracking-wider ${selectedNetwork === network
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {network}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={16} className="text-slate-400" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Offer Type</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedType('')}
                      className={`px-4 py-2 rounded-lg font-bold transition text-[10px] uppercase tracking-wider ${selectedType === ''
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      All Types
                    </button>
                    {types.map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-2 rounded-lg font-bold transition text-[10px] uppercase tracking-wider ${selectedType === type
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading offers...</p>
                  </div>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No offers found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your filters or search term</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-100 to-blue-50 border-b-2 border-slate-200">
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Plan</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Pricing</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Status</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredPlans.map(plan => (
                          <tr key={plan._id} className={`hover:bg-blue-50 transition ${!plan.inStock ? 'opacity-60 bg-slate-50' : ''}`}>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                                  {!plan.inStock && (
                                    <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-tight">OOS</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black uppercase border border-blue-100">
                                    {plan.isp}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {plan.volume}GB • {plan.type}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <p className="text-sm font-bold text-blue-600">Admin: GHS {formatNumberAbbreviated(plan.sellingPrice)}</p>
                                <p className="text-[10px] text-slate-500 font-medium">Agt: GHS {formatNumberAbbreviated(plan.agentPrice)} • Ven: GHS {formatNumberAbbreviated(plan.vendorPrice)}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${plan.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                {plan.status}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1 items-center">
                                <button
                                  onClick={() => { setSelectedPlan(plan); setShowViewModal(true); }}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                                  title="View Details"
                                >
                                  <Eye size={18} className="text-cyan-600" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditPrices(plan)}
                                  disabled={!plan.inStock}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Edit Prices"
                                >
                                  <Edit2 size={18} className="text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(plan)}
                                  disabled={!plan.inStock}
                                  className={`p-2 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${plan.status === 'active'
                                    ? 'hover:bg-slate-100'
                                    : 'hover:bg-slate-100'
                                    }`}
                                  title={plan.status === 'active' ? 'Deactivate' : 'Activate'}
                                >
                                  <Tag size={18} className={plan.status === 'active' ? 'text-green-600' : 'text-slate-400'} />
                                </button>
                                <button
                                  onClick={() => handleOpenDelete(plan)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                                  title="Delete"
                                >
                                  <Trash2 size={18} className="text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="px-6 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-6 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:border-slate-300 disabled:opacity-50 transition-all uppercase tracking-widest"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-6 py-2 bg-slate-900 border-2 border-slate-900 rounded-xl text-[10px] font-black text-white hover:bg-slate-800 disabled:opacity-50 transition-all uppercase tracking-widest"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ViewXpresOfferModal
        plan={selectedPlan}
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedPlan(null); }}
      />

      <EditXpresPricesModal
        isOpen={showEditPricesModal}
        onClose={() => { setShowEditPricesModal(false); setSelectedPlan(null); }}
        plan={selectedPlan}
        onSave={handleSavePrices}
        loading={editPricesSaving}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setSelectedPlan(null); }}
        onConfirm={confirmDelete}
        title="Delete Xpresdata Offer"
        message={`Are you sure you want to delete "${selectedPlan?.name}"? This action cannot be undone and will permanently remove this offer from the local database.`}
        confirmText="Delete Permanently"
        confirmColor="bg-rose-600"
      />
    </div>
  );
}
