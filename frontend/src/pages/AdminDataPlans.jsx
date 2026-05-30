import { useState, useEffect, useCallback } from 'react';
import { Edit2, Trash2, RefreshCw, Eye, Database, TrendingUp, AlertCircle, CheckCircle, Search } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import ViewPlanModal from '../components/ViewPlanModal';
import EditPricesModal from '../components/EditPricesModal';
import { useSidebar } from '../hooks/useSidebar';
import { dataplans } from '../services/api';
import { useSettings } from '../context/SettingsContext';

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
const pageTheme = getColor(3); // amber

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  .plan-wrapper { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .plan-container { background-color: #ffffff; }
  .plan-content { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
  .plan-header { background: linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%); border: 1.5px solid ${pageTheme.main}33; border-radius: 14px; padding: 20px; box-shadow: 0 8px 40px ${pageTheme.glow}; margin-bottom: 24px; }
  .plan-title { font-size: 26px; font-weight: 800; color: #111; margin: 0; }
  .plan-subtitle { font-size: 14px; color: #000; margin: 8px 0 0 0; }
  .plan-error { background-color: #fff5f5; border: 1.5px solid #fecaca; border-radius: 7px; color: #b91c1c; padding: 14px 16px; font-size: 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .plan-success { background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 7px; color: #166534; padding: 14px 16px; font-size: 14px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .plan-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .plan-stat-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; padding: 20px; }
  .plan-stat-card:hover { border-color: #d4d4ce; box-shadow: 0 8px 40px rgba(0,0,0,0.10); }
  .plan-stat-icon { width: 36px; height: 36px; background-color: rgba(240,165,0,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #f0a500; }
  .plan-stat-label { font-size: 12px; color: #000; margin-bottom: 4px; }
  .plan-stat-value { font-size: 20px; font-weight: 700; color: #111; }
  .plan-card { background-color: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); margin-bottom: 24px; }
  .plan-search { width: 100%; padding: 11px 14px; border: 1.5px solid #e0e0d8; border-radius: 7px; background-color: #fafaf7; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #111; }
  .plan-search:focus { outline: none; border-color: #111; background-color: #fff; box-shadow: 0 0 0 3px rgba(17,17,17,0.07); }
  .plan-btn { padding: 11px 14px; border: 1.5px solid #e0e0d8; border-radius: 7px; background-color: #fafaf7; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
  .plan-btn-primary { background-color: #111; color: #fff; border-color: #111; }
  .plan-btn-primary:hover { background-color: #222; }
  .plan-table { width: 100%; border-collapse: collapse; }
  .plan-table th { padding: 12px 20px; text-align: left; font-size: 13px; font-weight: 700; color: #333; background-color: #fafaf7; border-bottom: 1.5px solid #e4e4de; }
  .plan-table td { padding: 12px 20px; border-bottom: 1px solid #eee; font-size: 14px; }
  .plan-table tbody tr:hover { background-color: #f9f9f7; }
  @media (max-width: 768px) { .plan-content { padding: 16px 12px; } .plan-stat-grid { grid-template-columns: repeat(2, 1fr); } }
`;


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

  const activeProviderDisplayName = 'Topza';

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
    <div className="flex h-screen bg-white plan-wrapper">
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-black">Manage Data Plans</h1>
                    <p className="text-sm sm:text-base text-black mt-1">
                      Sync and manage {activeProviderDisplayName} data plan pricing, margins, and availability
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs sm:text-sm font-semibold text-black">Active: {activeProviderDisplayName}</span>
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
                <div className="plan-stat-grid">
                  <div className="plan-stat-card">
                    <div className="plan-stat-icon">
                      <Database size={18} />
                    </div>
                    <p className="plan-stat-label">Total Plans</p>
                    <p className="plan-stat-value">{stats.totalPlans}</p>
                  </div>

                  <div className="plan-stat-card">
                    <div className="plan-stat-icon">
                      <CheckCircle size={18} />
                    </div>
                    <p className="plan-stat-label">Active Plans</p>
                    <p className="plan-stat-value">{stats.activePlans}</p>
                  </div>

                  <div className="plan-stat-card">
                    <div className="plan-stat-icon">
                      <AlertCircle size={18} />
                    </div>
                    <p className="plan-stat-label">Out of Stock</p>
                    <p className="plan-stat-value">{stats.outOfStockPlans}</p>
                  </div>

                  <div className="plan-stat-card">
                    <div className="plan-stat-icon">
                      <TrendingUp size={18} />
                    </div>
                    <p className="plan-stat-label">Avg Margin</p>
                    <p className="plan-stat-value">{stats.avgMargin}%</p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black" />
                    <input
                      type="text"
                      placeholder="Search by plan name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-black focus:outline-none focus:border-slate-500 text-sm"
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
                  <p className="text-xs font-semibold text-black mb-2 block">Network</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedNetwork('')}
                      className={`px-3 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap border ${selectedNetwork === ''
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-200'
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
                          : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-200'
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
                  <h2 className="text-base sm:text-lg font-bold text-black">Data Plans</h2>
                  <p className="text-xs sm:text-sm text-black mt-0.5">Review, edit, and control data plan status</p>
                </div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-blue-700 mx-auto mb-4"></div>
                    <p className="text-black">Loading data plans...</p>
                  </div>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-black mb-4" />
                  <p className="text-black text-lg">No data plans found</p>
                  <p className="text-black text-sm">Try adjusting your search or network filter</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-black whitespace-nowrap">Plan</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-black whitespace-nowrap">Pricing</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-black whitespace-nowrap">Margin</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-black whitespace-nowrap">Status</th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-black whitespace-nowrap">Actions</th>
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
                                    <p className="text-sm font-semibold text-black">{plan.planName}</p>
                                    {!plan.inStock && (
                                      <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-tight">Out of Stock</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-black">{plan.network} • {plan.dataSize} • {plan.validity}</p>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <p className="text-[11px] text-black">Cost: <span className="font-semibold text-black">GHS {formatPrice2dpNoRound(plan.costPrice)}</span></p>
                                  <p className="text-sm font-bold text-black">Admin: GHS {formatPrice2dpNoRound(plan.sellingPrice)}</p>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <p className="text-sm font-bold text-black">{margin}%</p>
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
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={(newPage) => setPage(newPage)}
                      isLoading={loading}
                    />
                  )}
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
