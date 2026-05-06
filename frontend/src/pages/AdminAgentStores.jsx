import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Store, User, Shield, Ban, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
import AdminAgentStoreDetailsModal from '../components/AdminAgentStoreDetailsModal';
import { toast } from 'react-hot-toast';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { adminStore } from '../services/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  .store-wrapper {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .store-container {
    background-color: #f5f5f0;
    min-height: 100vh;
  }

  .store-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .store-header-card {
    background-color: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.10);
  }

  .store-header-card h1 {
    font-size: 22px;
    font-weight: 700;
    color: #111;
    margin: 0 0 4px 0;
  }

  .store-header-card p {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .store-error-box {
    background-color: #fff5f5;
    border: 1.5px solid #fecaca;
    border-radius: 7px;
    color: #b91c1c;
    padding: 14px 16px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .store-success-box {
    background-color: #f0fdf4;
    border: 1.5px solid #86efac;
    border-radius: 7px;
    color: #166534;
    padding: 14px 16px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .store-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .store-stat-card {
    background-color: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 20px;
    transition: all 0.2s ease;
  }

  .store-stat-card:hover {
    border-color: #d4d4ce;
    box-shadow: 0 8px 40px rgba(0,0,0,0.10);
  }

  .store-stat-icon-box {
    width: 36px;
    height: 36px;
    background-color: rgba(240,165,0,0.15);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    color: #f0a500;
  }

  .store-stat-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
  }

  .store-stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #111;
  }

  .store-controls-card {
    background-color: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.10);
  }

  .store-controls-flex {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .store-search-box {
    position: relative;
    flex: 1;
  }

  .store-search-input {
    width: 100%;
    padding-left: 36px;
    padding-right: 14px;
    padding-top: 11px;
    padding-bottom: 11px;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    background-color: #fafaf7;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #111;
    transition: all 0.2s ease;
  }

  .store-search-input:focus {
    outline: none;
    border-color: #111;
    background-color: #fff;
    box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
  }

  .store-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #999;
  }

  .store-select,
  .store-button-refresh {
    padding: 11px 14px;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    background-color: #fafaf7;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #111;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .store-button-refresh {
    background-color: #111;
    color: #fff;
    border-color: #111;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    white-space: nowrap;
  }

  .store-button-refresh:hover {
    background-color: #222;
  }

  .store-table-card {
    background-color: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.10);
    margin-bottom: 24px;
  }

  .store-table-header {
    background-color: #fafaf7;
    border-bottom: 1.5px solid #e4e4de;
    padding: 16px 20px;
  }

  .store-table-header h2 {
    font-size: 14px;
    font-weight: 700;
    color: #111;
    margin: 0 0 4px 0;
  }

  .store-table-header p {
    font-size: 12px;
    color: #999;
    margin: 0;
  }

  .store-table-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
  }

  .store-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0,0,0,0.1);
    border-top-color: #111;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .store-table-empty {
    text-align: center;
    padding: 56px 20px;
    color: #999;
  }

  table.store-table {
    width: 100%;
    border-collapse: collapse;
  }

  .store-table thead tr {
    background-color: #fafaf7;
    border-bottom: 1.5px solid #e4e4de;
  }

  .store-table th {
    text-align: left;
    padding: 12px 20px;
    font-size: 13px;
    font-weight: 700;
    color: #333;
  }

  .store-table td {
    padding: 12px 20px;
    border-bottom: 1px solid #eee;
    font-size: 14px;
    color: #111;
  }

  .store-table tbody tr:hover {
    background-color: #f9f9f7;
  }

  .store-table-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .store-button-icon {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1.5px solid #e0e0d8;
    border-radius: 6px;
    background-color: #fff;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .store-button-icon:hover {
    background-color: #fafaf7;
    border-color: #d0d0c8;
  }

  .store-button-action {
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    background-color: #111;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .store-button-action:hover {
    background-color: #222;
  }

  .store-mobile-card {
    border: 1.5px solid #e4e4de;
    border-radius: 7px;
    padding: 12px;
    background-color: #fff;
    margin-bottom: 12px;
  }

  .store-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .store-pagination-button {
    padding: 11px 14px;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    background-color: #fafaf7;
    font-size: 14px;
    font-weight: 700;
    color: #111;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .store-pagination-button:hover:not(:disabled) {
    background-color: #f0f0ed;
    border-color: #d0d0c8;
  }

  .store-pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .store-pagination-button.next {
    background-color: #111;
    color: #fff;
    border-color: #111;
  }

  .store-pagination-button.next:hover:not(:disabled) {
    background-color: #222;
  }

  .store-modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .store-modal-content {
    background-color: #fff;
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    max-width: 500px;
    width: 100%;
    padding: 20px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .store-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
  }

  .store-modal-title {
    font-size: 18px;
    font-weight: 700;
    color: #111;
    margin: 0;
  }

  .store-modal-subtitle {
    font-size: 13px;
    color: #666;
    margin: 4px 0 0 0;
  }

  .store-modal-close {
    padding: 8px;
    border-radius: 6px;
    background-color: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .store-modal-close:hover {
    background-color: #f5f5f0;
    color: #666;
  }

  .store-modal-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .store-modal-item {
    padding: 12px;
    border-radius: 7px;
    background-color: #fafaf7;
    border: 1.5px solid #e4e4de;
  }

  .store-modal-label {
    font-size: 11px;
    color: #999;
    margin-bottom: 4px;
  }

  .store-modal-button {
    width: 100%;
    padding: 13px 20px;
    border: none;
    border-radius: 7px;
    background-color: #111;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 16px;
    transition: all 0.2s ease;
    font-family: 'DM Sans', sans-serif;
  }

  .store-modal-button:hover:not(:disabled) {
    background-color: #222;
  }

  .store-modal-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .store-modal-button.danger {
    background-color: #dc2626;
  }

  .store-modal-button.danger:hover:not(:disabled) {
    background-color: #b91c1c;
  }

  .store-modal-button.success {
    background-color: #16a34a;
  }

  .store-modal-button.success:hover:not(:disabled) {
    background-color: #15803d;
  }

  .store-modal-button.warning {
    background-color: #d97706;
  }

  .store-modal-button.warning:hover:not(:disabled) {
    background-color: #b45309;
  }

  .store-form-group {
    margin-bottom: 12px;
  }

  .store-form-input,
  .store-form-textarea {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    background-color: #fafaf7;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #111;
    transition: all 0.2s ease;
  }

  .store-form-input:focus,
  .store-form-textarea:focus {
    outline: none;
    border-color: #111;
    background-color: #fff;
    box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
  }

  .store-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
  }

  .store-badge-paid {
    background-color: #dcfce7;
    color: #166534;
  }

  .store-badge-protocol {
    background-color: #e0e7ff;
    color: #3730a3;
  }

  .store-badge-pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .store-badge-active {
    background-color: #dcfce7;
    color: #166534;
  }

  .store-badge-banned {
    background-color: #fee2e2;
    color: #991b1b;
  }

  @media (max-width: 1024px) {
    .store-controls-flex {
      flex-direction: column;
    }

    .store-modal-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .store-content {
      padding: 16px 12px;
    }

    .store-stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;


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
    <div style={{ display: 'flex', height: '100vh' }} className="store-wrapper">
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }} className="store-container">
          <div className="store-content">
            <div className="store-header-card">
              <h1>Agent Stores</h1>
              <p>Manage store activation, protocol access, and temporary bans</p>
            </div>

            {error && (
              <div className="store-error-box">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="store-success-box">
                <CheckCircle size={18} />
                {success}
              </div>
            )}

            <div className="store-stat-grid">
              <StatCard title="Stores On Page" value={stores.length} icon={Store} />
              <StatCard title="Operational" value={activeCount} icon={CheckCircle} />
              <StatCard title="Banned" value={bannedCount} icon={Ban} />
              <StatCard title="Current Page" value={page} icon={Shield} />
            </div>

            <div className="store-controls-card">
              <div className="store-controls-flex">
                <div className="store-search-box">
                  <Search className="store-search-icon" size={16} />
                  <input
                    type="text"
                    placeholder="Search by store name, slug, or agent email"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="store-search-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="store-select"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </select>

                  <button
                    onClick={fetchStores}
                    className="store-button-refresh"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="store-table-card">
              <div className="store-table-header">
                <h2>Store List</h2>
                <p>{stores.length} result{stores.length !== 1 ? 's' : ''} on this page</p>
              </div>
              {loading ? (
                <div className="store-table-loading">
                  <div className="store-spinner"></div>
                </div>
              ) : stores.length === 0 ? (
                <div className="store-table-empty">No agent stores found</div>
              ) : (
                <>
                  <div className="hidden lg:block">
                    <table className="store-table">
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Owner</th>
                          <th>Fee Status</th>
                          <th>Store Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stores.map((store) => (
                          <tr key={store._id}>
                            <td>
                              <p style={{ fontWeight: 700, margin: '0 0 4px 0' }}>{store.name}</p>
                              <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>/{store.slug}</p>
                            </td>
                            <td>
                              <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>{store.owner?.name || 'N/A'}</p>
                              <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>{store.owner?.email || 'N/A'}</p>
                            </td>
                            <td>
                              <StatusBadge status={store.owner?.agentFeeStatus} type="fee" />
                            </td>
                            <td>
                              <StatusBadge status={store.isTemporarilyBanned ? 'banned' : 'active'} type="store" />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="store-table-actions">
                                <button
                                  onClick={() => openDetailsModal(store)}
                                  className="store-button-icon"
                                  title="View Store Details"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => openModal(store)}
                                  className="store-button-action"
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

                  <div className="lg:hidden" style={{ padding: '12px' }}>
                    {stores.map((store) => (
                      <div key={store._id} className="store-mobile-card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px 0' }}>{store.name}</p>
                            <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>/{store.slug}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openModal(store)}
                              className="store-button-action"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => openDetailsModal(store)}
                              className="store-button-icon"
                              style={{ width: '28px', height: '28px' }}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                          <User size={14} />
                          <span>{store.owner?.name || 'N/A'}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div className="store-pagination">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="store-pagination-button"
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '14px', color: '#666' }}>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="store-pagination-button next"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedStore && (
        <div className="store-modal-overlay">
          <div className="store-modal-content">
            <div className="store-modal-header">
              <div>
                <h2 className="store-modal-title">Manage Store</h2>
                <p className="store-modal-subtitle">{selectedStore.name}</p>
              </div>
              <button onClick={closeModal} className="store-modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="store-modal-grid">
              <div className="store-modal-item">
                <p className="store-modal-label">Agent Fee</p>
                <StatusBadge status={selectedStore.owner?.agentFeeStatus} type="fee" />
              </div>
              <div className="store-modal-item">
                <p className="store-modal-label">Store Status</p>
                <StatusBadge status={selectedStore.isTemporarilyBanned ? 'banned' : 'active'} type="store" />
              </div>
            </div>

            {selectedStore.owner?.agentFeeStatus !== 'protocol' && selectedStore.owner?.agentFeeStatus !== 'paid' && (
              <button
                onClick={handleProtocolActivate}
                disabled={submitting}
                className="store-modal-button"
              >
                Activate Protocol
              </button>
            )}

            {(selectedStore.owner?.protocolActivatedAt || String(selectedStore.owner?.agentFeePaidReference || '').startsWith('PROTOCOL_')) && (
              <button
                onClick={handleProtocolDeactivate}
                disabled={submitting}
                className="store-modal-button warning"
              >
                Deactivate Protocol (Lock Store)
              </button>
            )}

            {!selectedStore.isTemporarilyBanned ? (
              <form onSubmit={handleBanStore} style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 700, margin: '0 0 12px 0' }}>Apply Temporary Ban</h3>
                <div className="store-form-group">
                  <input
                    type="number"
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) => setFormData((prev) => ({ ...prev, durationDays: e.target.value }))}
                    placeholder="Duration (days)"
                    className="store-form-input"
                  />
                </div>
                <div className="store-form-group">
                  <textarea
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason"
                    className="store-form-textarea"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="store-modal-button danger"
                >
                  Apply Ban
                </button>
              </form>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 700, margin: '0 0 12px 0' }}>Ban Details</h3>
                <div className="store-modal-item" style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 4px 0' }}><span style={{ fontWeight: 700 }}>Reason:</span> {selectedStore.temporaryBanReason || 'N/A'}</p>
                  <p style={{ margin: '0' }}>
                    <span style={{ fontWeight: 700 }}>Until:</span>{' '}
                    {selectedStore.temporaryBanUntil ? new Date(selectedStore.temporaryBanUntil).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={handleRemoveBan}
                  disabled={submitting}
                  className="store-modal-button success"
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

// eslint-disable-next-line no-unused-vars
function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="store-stat-card">
      <div className="store-stat-icon-box">
        <Icon size={18} />
      </div>
      <p className="store-stat-label">{title}</p>
      <p className="store-stat-value">{value}</p>
    </div>
  );
}

function StatusBadge({ status, type }) {
  const normalized = String(status || '').toLowerCase();

  if (type === 'store') {
    if (normalized === 'banned') {
      return <span className="store-badge store-badge-banned">Banned</span>;
    }
    return <span className="store-badge store-badge-active">Active</span>;
  }

  if (normalized === 'paid') {
    return <span className="store-badge store-badge-paid">Paid</span>;
  }
  if (normalized === 'protocol') {
    return <span className="store-badge store-badge-protocol">Protocol</span>;
  }
  return <span className="store-badge store-badge-pending">Pending</span>;
}
