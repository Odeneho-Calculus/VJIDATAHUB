import { useState, useEffect, useCallback } from 'react';
import { Edit2, Trash2, RefreshCw, Eye, Database, TrendingUp, AlertCircle, CheckCircle, Search } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import ViewPlanModal from '../components/ViewPlanModal';
import EditPricesModal from '../components/EditPricesModal';
import { useSidebar } from '../hooks/useSidebar';
import { dataplans, admin as adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminDataPlans() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings } = useSettings();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({ totalPlans: 0, activePlans: 0, outOfStockPlans: 0, avgMargin: 0 });

  const activeProvider = 'xpresdata';
  const activeProviderDisplayName = 'XpresData';

  const networkCatalog = (settings?.networkCatalog || []).filter(n => n?.isActive !== false);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditPricesModal, setShowEditPricesModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearEditsConfirm, setShowClearEditsConfirm] = useState(false);
  const [editPricesSaving, setEditPricesSaving] = useState(false);

  const formatPrice2dpNoRound = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0.00';

    const sign = numeric < 0 ? '-' : '';
    let absString = Math.abs(numeric).toString();

    if (absString.includes('e')) {
      absString = Math.abs(numeric).toLocaleString('en-US', {
        useGrouping: false,
        maximumFractionDigits: 20,
      });
    }

    const [whole, fraction = ''] = absString.split('.');
    return `${sign}${whole}.${(fraction + '00').slice(0, 2)}`;
  };

  const fetchDataPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dataplans.list(selectedNetwork, '', page, 10);
      if (response.success) {
        setPlans(response.plans);
        setTotalPages(response.pagination?.pages || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data plans');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, page]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await dataplans.getStats(selectedNetwork || 'all');
      if (response.success) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    setPage(1);
  }, [selectedNetwork, searchTerm]);

  useEffect(() => {
    fetchDataPlans();
    fetchStats();
  }, [page, selectedNetwork, fetchDataPlans, fetchStats]);

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
      plan.planName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await dataplans.sync();
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

  const handleSavePrices = async (costPrice, sellingPrice) => {
    if (!selectedPlan) return;
    try {
      setEditPricesSaving(true);
      const response = await dataplans.updatePrices(selectedPlan._id, costPrice, sellingPrice);
      if (response.success) {
        setPlans(plans.map(p => p._id === selectedPlan._id ? response.plan : p));
        setShowEditPricesModal(false);
        setSelectedPlan(null);
        showMessage('Data plan prices updated successfully');
      }
    } catch (err) {
      showMessage(`Failed to update prices: ${err.message}`, true);
    } finally {
      setEditPricesSaving(false);
    }
  };

  const handleOpenClearEdits = (plan) => {
    setSelectedPlan(plan);
    setShowClearEditsConfirm(true);
  };

  const confirmClearEdits = async () => {
    if (!selectedPlan) return;
    try {
      const response = await dataplans.clearEdits(selectedPlan._id);
      if (response.success) {
        setPlans(plans.map(p => p._id === selectedPlan._id ? response.plan : p));
        setShowClearEditsConfirm(false);
        setSelectedPlan(null);
        showMessage('Data plan edits cleared successfully');
      }
    } catch (err) {
      showMessage(`Failed to clear edits: ${err.message}`, true);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const response = await dataplans.toggleStatus(plan._id);
      if (response.success) {
        setPlans(plans.map(p => p._id === plan._id ? response.plan : p));
        showMessage(`Data plan ${response.plan.status === 'active' ? 'activated' : 'deactivated'} successfully`);
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
      const response = await dataplans.delete(selectedPlan._id);
      if (response.success) {
        setShowDeleteConfirm(false);
        await fetchDataPlans();
        setSelectedPlan(null);
        showMessage('Data plan deleted successfully');
      }
    } catch (err) {
      showMessage(`Failed to delete plan: ${err.message}`, true);
    }
  };

  const filteredPlans = getFilteredPlans();

  return (
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Manage Data Plans</h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-1">
                      Sync and manage {activeProviderDisplayName} data plan pricing, margins, and availability
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">Active: {activeProviderDisplayName}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm sm:text-base flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm sm:text-base flex items-center gap-3">
                  <CheckCircle size={20} className="flex-shrink-0" />
                  {success}
                </div>
              )}

              <section>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Total Plans</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{stats.totalPlans}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Active Plans</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{stats.activePlans}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Out of Stock</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{stats.outOfStockPlans}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Avg Margin</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{stats.avgMargin}%</p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by plan name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-slate-500 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-4 sm:px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : `Sync ${activeProviderDisplayName} Data`}
                  </button>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 block">Network</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedNetwork('')}
                      className={`px-3 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap border ${selectedNetwork === ''
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                        }`}
                    >
                      All Networks
                    </button>
                    {networkCatalog.map(network => (
                      <button
                        key={network.name}
                        onClick={() => setSelectedNetwork(network.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap border ${selectedNetwork === network.name
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-200'
                          }`}
                      >
                        {network.logoUrl && (
                          <img src={network.logoUrl} alt={network.name} className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />
                        )}
                        {network.name}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Data Plans</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Review, edit, and control data plan status</p>
                </div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-blue-700 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading data plans...</p>
                  </div>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No data plans found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your search or network filter</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Plan</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Pricing</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Margin</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Status</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredPlans.map(plan => {
                          const margin = ((plan.sellingPrice - plan.costPrice) / plan.costPrice * 100).toFixed(2);
                          return (
                            <tr
                              key={plan._id}
                              className={`hover:bg-slate-50 transition ${!plan.inStock ? 'opacity-60 bg-slate-50' : ''
                                }`}
                            >
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{plan.planName}</p>
                                    {!plan.inStock && (
                                      <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-tight">Out of Stock</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-600">{plan.network} • {plan.dataSize} • {plan.validity}</p>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <p className="text-[11px] text-slate-600">Cost: <span className="font-semibold text-slate-900">GHS {formatPrice2dpNoRound(plan.costPrice)}</span></p>
                                  <p className="text-sm font-bold text-slate-900">Admin: GHS {formatPrice2dpNoRound(plan.sellingPrice)}</p>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <p className="text-sm font-bold text-slate-900">{margin}%</p>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${plan.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                                  }`}>
                                  {plan.status}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex gap-1 items-center">
                                  <button
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setShowViewModal(true);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4 text-cyan-600" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditPrices(plan)}
                                    disabled={!plan.inStock}
                                    className={`p-2 rounded-lg transition border border-transparent ${!plan.inStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 hover:border-slate-200'}`}
                                    title={!plan.inStock ? 'Cannot edit out-of-stock plans' : 'Edit prices'}
                                  >
                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(plan)}
                                    disabled={!plan.inStock}
                                    className={`p-2 rounded-lg transition border border-transparent ${!plan.inStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 hover:border-slate-200'}`}
                                    title={!plan.inStock ? 'Cannot toggle status for out-of-stock plans' : 'Toggle status'}
                                  >
                                    <RefreshCw className="w-4 h-4 text-green-600" />
                                  </button>
                                  {plan.isEdited && plan.inStock && (
                                    <button
                                      onClick={() => handleOpenClearEdits(plan)}
                                      className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                      title="Clear edits"
                                    >
                                      <AlertCircle className="w-4 h-4 text-orange-600" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenDelete(plan)}
                                    disabled={!plan.inStock}
                                    className={`p-2 rounded-lg transition border border-transparent ${!plan.inStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 hover:border-slate-200'}`}
                                    title={!plan.inStock ? 'Cannot delete out-of-stock plans' : 'Delete'}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <p className="text-sm text-slate-600">
                      Page {page} of {totalPages} • {filteredPlans.length} plans total
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
              </section>
            </div>
          </div>
        </div>
      </div>

      <ViewPlanModal
        plan={selectedPlan}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedPlan(null);
        }}
      />

      <EditPricesModal
        plan={selectedPlan}
        isOpen={showEditPricesModal}
        onClose={() => {
          setShowEditPricesModal(false);
          setSelectedPlan(null);
        }}
        onSave={handleSavePrices}
        loading={editPricesSaving}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Data Plan"
        message={selectedPlan ? `Are you sure you want to delete "${selectedPlan.planName}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedPlan(null);
        }}
      />

      <ConfirmDialog
        isOpen={showClearEditsConfirm}
        title="Clear Price Edits"
        message={selectedPlan ? `Revert "${selectedPlan.planName}" prices to original API values?` : ''}
        confirmText="Clear"
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={confirmClearEdits}
        onCancel={() => {
          setShowClearEditsConfirm(false);
          setSelectedPlan(null);
        }}
      />
    </div>
  );
}
