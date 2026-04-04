import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Store, User, Shield, Ban, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
import AdminAgentStoreDetailsModal from '../components/AdminAgentStoreDetailsModal';
import { toast } from 'react-hot-toast';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { adminStore } from '../services/api';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function AdminAgentStores() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedStore, setSelectedStore] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ durationDays: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [storeDetails, setStoreDetails] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    type: 'credit',
    amount: '',
    reason: '',
    note: '',
  });

  useEffect(() => {
    fetchStores();
  }, [page, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
      toast.error(message);
    } else {
      setSuccess(message);
      setError('');
      toast.success(message);
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      const data = await adminStore.getAgentStores(page, 20, searchTerm, statusFilter);
      setStores(data?.stores || []);
      setTotalPages(data?.pagination?.pages || 0);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load agent stores');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStore(null);
    setFormData({ durationDays: '', reason: '' });
  };

  const openModal = (store) => {
    setSelectedStore(store);
    setShowModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setStoreDetails(null);
    setAdjustForm({ type: 'credit', amount: '', reason: '', note: '' });
  };

  const openDetailsModal = async (store) => {
    try {
      setSelectedStore(store);
      setShowDetailsModal(true);
      setDetailsLoading(true);
      const response = await adminStore.getAgentStoreDetails(store._id);
      setStoreDetails(response?.details || null);
    } catch (err) {
      showMessage(err?.message || 'Failed to load store details', true);
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCommissionAdjustment = async (event) => {
    event.preventDefault();
    if (!selectedStore) return;

    const amount = Number(adjustForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage('Enter a valid adjustment amount', true);
      return;
    }

    if (!adjustForm.reason || adjustForm.reason.trim().length < 3) {
      showMessage('Reason is required for adjustments', true);
      return;
    }

    try {
      setSubmitting(true);
      await adminStore.adjustCommission(selectedStore._id, {
        type: adjustForm.type,
        amount,
        reason: adjustForm.reason.trim(),
        note: adjustForm.note?.trim() || undefined,
      });

      const refreshed = await adminStore.getAgentStoreDetails(selectedStore._id);
      setStoreDetails(refreshed?.details || null);
      setAdjustForm({ type: 'credit', amount: '', reason: '', note: '' });
      await fetchStores();
      showMessage(`Commission ${adjustForm.type} applied successfully`);
    } catch (err) {
      showMessage(err?.message || 'Failed to apply adjustment', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBanStore = async (event) => {
    event.preventDefault();
    if (!selectedStore) return;

    if (!formData.durationDays || !formData.reason?.trim()) {
      showMessage('Ban duration and reason are required', true);
      return;
    }

    try {
      setSubmitting(true);
      await adminStore.applyTemporaryBan(selectedStore._id, {
        isApplying: true,
        durationDays: parseInt(formData.durationDays, 10),
        reason: formData.reason.trim(),
      });
      closeModal();
      await fetchStores();
      showMessage('Store temporarily banned successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to ban store', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBan = async () => {
    if (!selectedStore) return;
    try {
      setSubmitting(true);
      await adminStore.applyTemporaryBan(selectedStore._id, { isApplying: false });
      closeModal();
      await fetchStores();
      showMessage('Store ban removed successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to remove store ban', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProtocolActivate = async () => {
    if (!selectedStore) return;
    try {
      setSubmitting(true);
      await adminStore.activateProtocol(selectedStore._id);
      closeModal();
      await fetchStores();
      showMessage('Protocol activated and agent marked as paid');
    } catch (err) {
      showMessage(err?.message || 'Failed to activate protocol', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProtocolDeactivate = async () => {
    if (!selectedStore) return;
    try {
      setSubmitting(true);
      await adminStore.deactivateProtocol(selectedStore._id);
      closeModal();
      await fetchStores();
      showMessage('Protocol deactivated and store locked');
    } catch (err) {
      showMessage(err?.message || 'Failed to deactivate protocol', true);
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = useMemo(
    () => stores.filter((store) => !store.isTemporarilyBanned).length,
    [stores]
  );

  const bannedCount = useMemo(
    () => stores.filter((store) => store.isTemporarilyBanned).length,
    [stores]
  );

  return (
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
            {/* Page Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-5 sm:px-6 sm:py-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Agent Stores</h1>
              <p className="text-sm text-slate-500">Manage store activation, protocol access, and temporary bans</p>
            </div>

            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm flex items-center gap-3">
                <CheckCircle size={18} className="flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
              <StatCard title="Stores On Page" value={stores.length} icon={Store} iconBg="bg-blue-50" iconColor="text-blue-700" />
              <StatCard title="Operational" value={activeCount} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
              <StatCard title="Banned" value={bannedCount} icon={Ban} iconBg="bg-red-50" iconColor="text-red-700" />
              <StatCard title="Current Page" value={page} icon={Shield} iconBg="bg-indigo-50" iconColor="text-indigo-700" />
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by store name, slug, or agent email"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm bg-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>

                <button
                  onClick={fetchStores}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stores Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Section Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">Store List</h2>
                <p className="text-xs text-slate-500 mt-0.5">{stores.length} result{stores.length !== 1 ? 's' : ''} on this page</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-blue-700"></div>
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-14 text-slate-500">No agent stores found</div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Store</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Owner</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Fee Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Store Status</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stores.map((store) => (
                          <tr key={store._id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{store.name}</p>
                              <p className="text-xs text-slate-500">/{store.slug}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-900">{store.owner?.name || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{store.owner?.email || 'N/A'}</p>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={store.owner?.agentFeeStatus} type="fee" />
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={store.isTemporarilyBanned ? 'banned' : 'active'} type="store" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => openDetailsModal(store)}
                                  className="p-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition"
                                  title="View Store Details"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => openModal(store)}
                                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                                >
                                  Manage
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden p-3 space-y-3">
                    {stores.map((store) => (
                      <div key={store._id} className="border border-slate-200 rounded-xl p-3 bg-white">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{store.name}</p>
                            <p className="text-xs text-slate-500">/{store.slug}</p>
                          </div>
                          <button
                            onClick={() => openModal(store)}
                            className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-xs font-semibold"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => openDetailsModal(store)}
                            className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold"
                          >
                            View
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                          <User size={14} />
                          <span>{store.owner?.name || 'N/A'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={store.owner?.agentFeeStatus} type="fee" />
                          <StatusBadge status={store.isTemporarilyBanned ? 'banned' : 'active'} type="store" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedStore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 sm:p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Manage Store</h2>
                <p className="text-sm text-slate-600">{selectedStore.name}</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Agent Fee</p>
                <StatusBadge status={selectedStore.owner?.agentFeeStatus} type="fee" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Store Status</p>
                <StatusBadge status={selectedStore.isTemporarilyBanned ? 'banned' : 'active'} type="store" />
              </div>
            </div>

            {selectedStore.owner?.agentFeeStatus !== 'protocol' && selectedStore.owner?.agentFeeStatus !== 'paid' && (
              <button
                onClick={handleProtocolActivate}
                disabled={submitting}
                className="w-full mb-4 px-4 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Activate Protocol
              </button>
            )}

            {(selectedStore.owner?.protocolActivatedAt || String(selectedStore.owner?.agentFeePaidReference || '').startsWith('PROTOCOL_')) && (
              <button
                onClick={handleProtocolDeactivate}
                disabled={submitting}
                className="w-full mb-4 px-4 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Deactivate Protocol (Lock Store)
              </button>
            )}

            {!selectedStore.isTemporarilyBanned ? (
              <form onSubmit={handleBanStore} className="space-y-3">
                <h3 className="font-semibold text-slate-900">Apply Temporary Ban</h3>
                <input
                  type="number"
                  min="1"
                  value={formData.durationDays}
                  onChange={(e) => setFormData((prev) => ({ ...prev, durationDays: e.target.value }))}
                  placeholder="Duration (days)"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm"
                />
                <textarea
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Apply Ban
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Ban Details</h3>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 space-y-1">
                  <p><span className="font-semibold">Reason:</span> {selectedStore.temporaryBanReason || 'N/A'}</p>
                  <p>
                    <span className="font-semibold">Until:</span>{' '}
                    {selectedStore.temporaryBanUntil ? new Date(selectedStore.temporaryBanUntil).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={handleRemoveBan}
                  disabled={submitting}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Remove Ban
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AdminAgentStoreDetailsModal
        isOpen={showDetailsModal}
        onClose={closeDetailsModal}
        store={selectedStore}
        details={storeDetails}
        loading={detailsLoading}
        adjustForm={adjustForm}
        setAdjustForm={setAdjustForm}
        onAdjustSubmit={handleCommissionAdjustment}
        submitting={submitting}
      />

    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
      <div className="mb-2 sm:mb-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">{title}</p>
      <p className="text-xl sm:text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status, type }) {
  const normalized = String(status || '').toLowerCase();

  if (type === 'store') {
    if (normalized === 'banned') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Banned</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>;
  }

  if (normalized === 'paid') {
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>;
  }
  if (normalized === 'protocol') {
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Protocol</span>;
  }
  return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>;
}
