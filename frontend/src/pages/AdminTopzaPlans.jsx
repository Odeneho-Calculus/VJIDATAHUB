import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, RefreshCw, Database, CheckCircle, AlertCircle, Search, Filter, X, Save, Package, RotateCcw } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSidebar } from '../hooks/useSidebar';
import { topza as topzaAPI, admin as adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminTopzaPlans() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({ totalPlans: 0, activePlans: 0, outOfStockPlans: 0 });

  const [editingPlan, setEditingPlan] = useState(null);
  const [editPrices, setEditPrices] = useState({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [networkCatalog, setNetworkCatalog] = useState([]);

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

  useEffect(() => {
    adminAPI.getSystemSettings().then((res) => {
      const catalog = res?.settings?.networkCatalog || [];
      setNetworkCatalog(catalog.filter((n) => n?.isActive !== false));
    }).catch(() => {});
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await topzaAPI.list(selectedNetwork, '', page, 20);
      if (response.success) {
        setPlans(response.plans || []);
        setTotalPages(response.pagination?.pages || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch Topza plans');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, page]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await topzaAPI.getStats(selectedNetwork || 'all');
      if (response.success) setStats(response.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [selectedNetwork]);

  useEffect(() => { setPage(1); }, [selectedNetwork, searchTerm]);
  useEffect(() => {
    fetchPlans();
    fetchStats();
  }, [page, selectedNetwork, fetchPlans, fetchStats]);

  useEffect(() => {
    const provider = settings?.vtuProvider || 'xpresdata';
    if (provider === 'xpresdata') navigate('/admin/offers', { replace: true });
    if (provider === 'digimall') navigate('/admin/digimall-plans', { replace: true });
  }, [settings?.vtuProvider, navigate]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const getNumericVolume = (plan) => {
    const direct = Number(plan?.volume);
    if (Number.isFinite(direct)) return direct;

    const fallbackText = `${plan?.name || ''} ${plan?.dataAmount || ''}`;
    const match = fallbackText.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };

  const filteredPlans = (searchTerm
    ? plans.filter((p) => (p.name || `${p.isp} ${p.volume}GB`).toLowerCase().includes(searchTerm.toLowerCase()))
    : plans
  )
    .slice()
    .sort((a, b) => {
      const networkOrder = String(a.isp || '').localeCompare(String(b.isp || ''));
      if (networkOrder !== 0) return networkOrder;

      const volumeOrder = getNumericVolume(a) - getNumericVolume(b);
      if (volumeOrder !== 0) return volumeOrder;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await topzaAPI.sync();
      if (response.success) {
        setPage(1);
        await fetchPlans();
        await fetchStats();
        showMessage(`Sync complete: ${response.stats?.synced ?? 0} new, ${response.stats?.updated ?? 0} updated`);
      }
    } catch (err) {
      showMessage(`Sync failed: ${err.message}`, true);
    } finally {
      setSyncing(false);
    }
  };

  const openEditPrices = (plan) => {
    setEditingPlan(plan);
    setEditPrices({
      sellingPrice: plan.sellingPrice ?? '',
      agentPrice: plan.agentPrice ?? '',
      vendorPrice: plan.vendorPrice ?? '',
    });
  };

  const handleSavePrices = async () => {
    if (!editingPlan) return;
    try {
      setSavingPrices(true);
      const prices = {
        sellingPrice: parseFloat(editPrices.sellingPrice),
        agentPrice: parseFloat(editPrices.agentPrice),
        vendorPrice: parseFloat(editPrices.vendorPrice),
      };
      const response = await topzaAPI.updatePrices(editingPlan._id, prices);
      if (response.success) {
        setPlans(plans.map((p) => p._id === editingPlan._id ? { ...p, ...prices, isEdited: true } : p));
        setEditingPlan(null);
        showMessage('Prices updated successfully');
      }
    } catch (err) {
      showMessage(`Failed to update prices: ${err.message}`, true);
    } finally {
      setSavingPrices(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const response = await topzaAPI.toggleStatus(plan._id);
      if (response.success) {
        setPlans(plans.map((p) => p._id === plan._id ? { ...p, status: response.plan?.status || (p.status === 'active' ? 'inactive' : 'active') } : p));
        showMessage(`Plan ${response.plan?.status === 'active' ? 'activated' : 'deactivated'}`);
      }
    } catch (err) {
      showMessage(`Failed to toggle status: ${err.message}`, true);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPlan) return;
    try {
      await topzaAPI.delete(deletingPlan._id);
      setShowDeleteConfirm(false);
      setDeletingPlan(null);
      await fetchPlans();
      showMessage('Plan deleted');
    } catch (err) {
      showMessage(`Failed to delete: ${err.message}`, true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPlans.length && filteredPlans.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlans.map((p) => p._id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      const ids = bulkDeleteTarget === 'all' ? [] : [...selectedIds];
      const response = await topzaAPI.bulkDelete(ids);
      if (response.success) {
        setSelectedIds(new Set());
        setBulkDeleteTarget(null);
        await fetchPlans();
        await fetchStats();
        showMessage(`${response.deleted} plan${response.deleted !== 1 ? 's' : ''} deleted`);
      }
    } catch (err) {
      showMessage(`Bulk delete failed: ${err.message}`, true);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleStockOverride = async (ids, inStock, resetOverride = false) => {
    try {
      setUpdatingStock(true);
      const response = await topzaAPI.updateStock(ids, inStock, resetOverride);
      if (response.success) {
        setPlans((prev) => prev.map((p) =>
          ids.includes(p._id)
            ? { ...p, inStock: resetOverride ? p.inStock : inStock, stockOverriddenByAdmin: !resetOverride }
            : p
        ));
        setSelectedIds(new Set());
        await fetchStats();
        showMessage(response.message || 'Stock updated');
      }
    } catch (err) {
      showMessage(`Stock update failed: ${err.message}`, true);
    } finally {
      setUpdatingStock(false);
    }
  };

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-orange-50">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Topza Offers</h1>
                <p className="text-sm sm:text-base text-slate-600">Sync and manage Topza offers pricing and availability</p>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border-2 border-orange-100 self-start">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-orange-700">Provider: Topza</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
                <AlertCircle size={20} className="flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-2xl text-green-700 text-sm flex items-center gap-3">
                <CheckCircle size={20} className="flex-shrink-0" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { label: 'Total Plans', value: stats.totalPlans, color: 'from-blue-500 to-blue-600', Icon: Database },
                { label: 'Active Plans', value: stats.activePlans, color: 'from-green-500 to-green-600', Icon: CheckCircle },
                { label: 'Out of Stock', value: stats.outOfStockPlans, color: 'from-red-500 to-red-600', Icon: AlertCircle },
              ].map(({ label, value, color, Icon }) => (
                <div key={label} className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">{label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{value ?? 0}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search plans by name or size..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setBulkDeleteTarget('selected')}
                    className="px-4 sm:px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedIds.size})
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => handleStockOverride([...selectedIds], true)}
                      disabled={updatingStock}
                      className="px-4 py-3 bg-emerald-100 text-emerald-700 border-2 border-emerald-200 rounded-xl font-semibold hover:bg-emerald-200 transition-all flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
                    >
                      <Package size={15} /> Mark In Stock
                    </button>
                    <button
                      onClick={() => handleStockOverride([...selectedIds], false)}
                      disabled={updatingStock}
                      className="px-4 py-3 bg-orange-100 text-orange-700 border-2 border-orange-200 rounded-xl font-semibold hover:bg-orange-200 transition-all flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
                    >
                      <Package size={15} /> Mark Out of Stock
                    </button>
                    <button
                      onClick={() => handleStockOverride([...selectedIds], false, true)}
                      disabled={updatingStock}
                      className="px-4 py-3 bg-slate-100 text-slate-600 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
                      title="Clear admin override - let Topza status decide"
                    >
                      <RotateCcw size={15} /> Reset to Topza
                    </button>
                  </>
                )}
                <button
                  onClick={() => setBulkDeleteTarget('all')}
                  className="px-4 sm:px-6 py-3 bg-rose-100 text-rose-700 border-2 border-rose-200 rounded-xl font-semibold hover:bg-rose-200 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                >
                  <Trash2 size={16} />
                  Delete All
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Topza'}
                </button>
              </div>

              {networkCatalog.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Filter size={16} className="text-slate-400" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Filter</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedNetwork('')}
                      className={`px-4 py-2 rounded-lg font-bold transition text-[10px] uppercase tracking-wider ${selectedNetwork === '' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      All Networks
                    </button>
                    {networkCatalog.map((n) => (
                      <button
                        key={n.name}
                        onClick={() => setSelectedNetwork(n.name)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition text-[10px] uppercase tracking-wider ${selectedNetwork === n.name ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {n.logoUrl && (
                          <img src={n.logoUrl} alt={n.name} className="w-4 h-4 object-contain rounded-sm flex-shrink-0" />
                        )}
                        {n.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading Topza offers...</p>
                  </div>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No Topza offers found</p>
                  <p className="text-slate-500 text-sm mt-1">Sync from Topza to populate offers</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-100 to-orange-50 border-b-2 border-slate-200">
                          <th className="px-4 sm:px-6 py-4 w-10">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-orange-600 cursor-pointer"
                              checked={filteredPlans.length > 0 && selectedIds.size === filteredPlans.length}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-900 whitespace-nowrap">Plan</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-900 whitespace-nowrap">Pricing</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-900 whitespace-nowrap">Status</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredPlans.map((plan) => (
                          <tr key={plan._id} className={`hover:bg-orange-50 transition ${selectedIds.has(plan._id) ? 'bg-orange-50' : !plan.inStock ? 'opacity-60 bg-slate-50' : ''}`}>
                            <td className="px-4 sm:px-6 py-4 w-10">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-orange-600 cursor-pointer"
                                checked={selectedIds.has(plan._id)}
                                onChange={() => toggleSelect(plan._id)}
                              />
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{plan.name || `${plan.isp} ${plan.volume}GB`}</p>
                                  {!plan.inStock && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${plan.stockOverriddenByAdmin ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-800'}`}>
                                      {plan.stockOverriddenByAdmin ? 'OOS (Admin)' : 'OOS'}
                                    </span>
                                  )}
                                  {plan.inStock && plan.stockOverriddenByAdmin && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase">In Stock (Admin)</span>
                                  )}
                                  {plan.isEdited && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase">Edited</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded-md text-[9px] font-black uppercase border border-orange-100">
                                    {plan.isp}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {plan.volume}GB - ID {plan.providerPlanId}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1.5">
                                <div className="inline-flex items-center gap-1.5 w-fit">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Cost:</span>
                                  <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-black">GH₵{formatPrice2dpNoRound(plan.costPrice || 0)}</span>
                                </div>
                                <p className="text-sm font-bold text-orange-600">Admin: GH₵{formatPrice2dpNoRound(plan.sellingPrice || 0)}</p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Agt: GH₵{formatPrice2dpNoRound(plan.agentPrice || 0)} - Vendor: GH₵{formatPrice2dpNoRound(plan.vendorPrice || 0)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {plan.status}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1 items-center">
                                <button
                                  onClick={() => openEditPrices(plan)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                                  title="Edit Prices"
                                >
                                  <Edit2 size={18} className="text-orange-600" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(plan)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                                  title={plan.status === 'active' ? 'Deactivate' : 'Activate'}
                                >
                                  <CheckCircle size={18} className={plan.status === 'active' ? 'text-green-600' : 'text-slate-400'} />
                                </button>
                                <button
                                  onClick={() => handleStockOverride([plan._id], !plan.inStock)}
                                  disabled={updatingStock}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                                  title={plan.inStock ? 'Mark Out of Stock (admin override)' : 'Mark In Stock (admin override)'}
                                >
                                  <Package size={18} className={plan.inStock ? 'text-emerald-600' : 'text-orange-500'} />
                                </button>
                                {plan.stockOverriddenByAdmin && (
                                  <button
                                    onClick={() => handleStockOverride([plan._id], false, true)}
                                    disabled={updatingStock}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                                    title="Reset to Topza status"
                                  >
                                    <RotateCcw size={15} className="text-slate-400" />
                                  </button>
                                )}
                                <button
                                  onClick={() => { setDeletingPlan(plan); setShowDeleteConfirm(true); }}
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
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-6 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:border-slate-300 disabled:opacity-50 transition-all uppercase tracking-widest"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Prices</h3>
                <p className="text-sm text-slate-500">{editingPlan.name || `${editingPlan.isp} ${editingPlan.volume}GB`}</p>
              </div>
              <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-700 mb-1 uppercase tracking-wider">Cost Price / Console Price (GHC)</label>
                <input
                  type="number"
                  value={formatPrice2dpNoRound(editingPlan.costPrice || 0)}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl text-amber-800 bg-amber-50 text-sm font-bold cursor-not-allowed"
                />
              </div>

              {[
                { key: 'sellingPrice', label: 'Admin Selling Price (GHC)' },
                { key: 'agentPrice', label: 'Agent Price (GHC)' },
                { key: 'vendorPrice', label: 'Vendor Price (GHC)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrices[key]}
                    onChange={(e) => setEditPrices((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingPlan(null)}
                className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrices}
                disabled={savingPrices}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {savingPrices ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {savingPrices ? 'Saving...' : 'Save Prices'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeletingPlan(null); }}
        onConfirm={confirmDelete}
        title="Delete Topza Plan"
        message={`Delete "${deletingPlan?.name || `${deletingPlan?.isp} ${deletingPlan?.volume}GB`}"? This cannot be undone.`}
        confirmText="Delete"
        confirmColor="bg-rose-600"
      />

      <ConfirmDialog
        isOpen={!!bulkDeleteTarget}
        onClose={() => setBulkDeleteTarget(null)}
        onConfirm={handleBulkDelete}
        title={bulkDeleteTarget === 'all' ? 'Delete All Plans' : `Delete ${selectedIds.size} Plan${selectedIds.size !== 1 ? 's' : ''}`}
        message={
          bulkDeleteTarget === 'all'
            ? 'This will permanently delete ALL Topza plans. This cannot be undone.'
            : `Permanently delete ${selectedIds.size} selected plan${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`
        }
        confirmText={bulkDeleting ? 'Deleting...' : 'Delete'}
        confirmColor="bg-rose-600"
      />
    </div>
  );
}
