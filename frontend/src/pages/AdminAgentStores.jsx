import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Store, User, Shield, Ban, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
import AdminAgentStoreDetailsModal from '../components/AdminAgentStoreDetailsModal';
import { toast } from 'react-hot-toast';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { adminStore } from '../services/api';

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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  .store-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
    min-height: 100vh;
    color: #1a1a1a;
  }

  .store-container {
    background-color: #f5f5f0;
    min-height: 100vh;
  }

  .store-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .store-header-card {
    background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
    border: 1.5px solid #A7F3D0;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(15,110,86,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .store-header-card h1 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    color: #111;
  }

  .store-header-card p {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .store-header-icon-box {
    width: 46px;
    height: 46px;
    background: #0F6E56;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(15,110,86,0.25);
  }

  .store-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .store-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .store-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .store-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .store-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .store-stat-icon-box {
    width: 34px;
    height: 34px;
    background-color: var(--stat-color, #0F6E56);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 12px var(--stat-glow, rgba(0,0,0,0.1));
    flex-shrink: 0;
  }

  .store-stat-label {
    font-size: 11px;
    font-weight: 800;
    color: var(--stat-color, #666);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.8;
  }

  .store-stat-value {
    font-size: 24px;
    font-weight: 800;
    color: #111;
    margin-top: 2px;
  }

  .store-controls-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .store-controls-flex {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .store-search-box {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }

  .store-search-icon {
    position: absolute;
    left: 14px;
    color: #999;
    pointer-events: none;
  }

  .store-search-input {
    width: 100%;
    padding: 12px 14px 12px 42px;
    border: 1.5px solid #e4e4de;
    border-radius: 10px;
    background-color: #fafaf7;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #111;
    transition: all 0.2s ease;
  }

  .store-search-input:focus {
    outline: none;
    border-color: #0F6E56;
    background-color: #fff;
    box-shadow: 0 8px 24px rgba(15,110,86,0.08);
  }

  .store-select {
    padding: 12px 36px 12px 14px;
    border: 1.5px solid #e4e4de;
    border-radius: 10px;
    background-color: #fafaf7;
    font-size: 14px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    color: #111;
    cursor: pointer;
    transition: all 0.2s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  .store-select:focus {
    outline: none;
    border-color: #0F6E56;
    background-color: #fff;
  }

  .store-button-refresh {
    background-color: #0F6E56;
    color: #fff;
    border: none;
    height: 46px;
    padding: 0 20px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(15,110,86,0.2);
    cursor: pointer;
  }

  .store-button-refresh:hover {
    background-color: #0d5e4a;
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(15,110,86,0.25);
  }

  .store-button-refresh:active {
    transform: translateY(0);
  }

  .store-table-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    overflow: hidden;
  }

  .store-table-header {
    background: #fafaf7;
    padding: 20px 24px;
    border-bottom: 1.5px solid #e4e4de;
  }

  .store-table th {
    background: #fafaf7;
    text-align: left;
    padding: 14px 16px;
    font-weight: 800;
    color: #999;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .store-table td {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #111;
    font-size: 13px;
  }

  .store-mobile-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 16px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    margin-bottom: 12px;
  }

  .store-mobile-card:hover {
    border-color: var(--card-color, #0F6E56);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px var(--card-glow, rgba(0,0,0,0.06));
  }

  .store-button-action {
    background-color: #0F6E56;
    color: #fff;
    border-radius: 8px;
    font-weight: 700;
    padding: 8px 16px;
    transition: all 0.2s;
  }

  .store-button-action:hover {
    background-color: #0d5e4a;
    box-shadow: 0 4px 12px rgba(15,110,86,0.2);
  }

  .store-pagination-button.next {
    background-color: #0F6E56;
    border-color: #0F6E56;
  }

  .store-pagination-button.next:hover:not(:disabled) {
    background-color: #0d5e4a;
  }

  .store-modal-button {
    background-color: #0F6E56;
    border-radius: 8px;
    font-weight: 700;
  }

  .store-modal-button:hover:not(:disabled) {
    background-color: #0d5e4a;
  }

  .store-form-input:focus,
  .store-form-textarea:focus {
    border-color: #0F6E56;
    box-shadow: 0 0 0 3px rgba(15,110,86,0.07);
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

  @media (max-width: 768px) {
    .store-controls-flex {
      flex-direction: column;
      align-items: stretch;
    }
    .store-search-box {
      width: 100%;
    }
    .store-button-refresh {
      justify-content: center;
    }

    .store-modal-grid {
      grid-template-columns: 1fr;
    }

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
              <div className="store-heading-row">
                <div className="store-header-icon-box">
                  <Store size={22} />
                </div>
                <div>
                  <h1>Agent Stores</h1>
                  <p>Manage store activation, protocol access, and temporary bans</p>
                </div>
              </div>
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
              <StatCard title="Stores On Page" value={stores.length} icon={Store} colorIdx={0} />
              <StatCard title="Operational" value={activeCount} icon={CheckCircle} colorIdx={1} />
              <StatCard title="Banned" value={bannedCount} icon={Ban} colorIdx={5} />
              <StatCard title="Current Page" value={page} icon={Shield} colorIdx={2} />
            </div>

            <div className="store-controls-card">
              <div className="store-controls-flex">
                <div className="store-search-box">
                  <Search className="store-search-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Search by store name, slug, or email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="store-search-input"
                  />
                </div>

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
                  <span>Refresh</span>
                </button>
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
                        {stores.map((store, idx) => {
                          const c = getColor(idx);
                          return (
                            <tr key={store._id} className="store-table-row">
                              <td>
                                <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: c.main }}>{store.name}</p>
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
                                    style={{ color: c.main, borderColor: c.bg }}
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => openModal(store)}
                                    className="store-button-action"
                                    style={{ background: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
                                  >
                                    Manage
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden" style={{ padding: '12px' }}>
                    {stores.map((store, idx) => (
                      <div key={store._id} className="store-mobile-card" style={{ '--card-color': getColor(idx).main, '--card-glow': getColor(idx).glow }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: getColor(idx).soft, color: getColor(idx).main, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: `1.5px solid ${getColor(idx).main}22`, boxShadow: `0 2px 8px ${getColor(idx).glow}` }}>
                              {store.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 2px 0', color: getColor(idx).main }}>{store.name}</p>
                              <p style={{ fontSize: '11px', color: '#999', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>/{store.slug}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openModal(store)}
                              className="store-button-action"
                              style={{ padding: '8px 12px', fontSize: '12px', background: getColor(idx).main, boxShadow: `0 4px 12px ${getColor(idx).glow}` }}
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => openDetailsModal(store)}
                              className="store-button-icon"
                              style={{ width: '32px', height: '32px', color: getColor(idx).main, borderColor: getColor(idx).bg }}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#fafaf7', borderRadius: '10px', marginBottom: '12px' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: getColor(idx).main, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                            {store.owner?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {store.owner?.name || 'N/A'}
                            </p>
                            <p style={{ fontSize: '10px', color: '#999', margin: 0 }}>{store.owner?.email || 'N/A'}</p>
                          </div>
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
function StatCard({ title, value, icon: Icon, colorIdx }) {
  const c = getColor(colorIdx);
  return (
    <div className="store-stat-card" style={{ '--stat-color': c.main, '--stat-bg': c.soft, '--stat-border': c.bg, '--stat-glow': c.glow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p className="store-stat-label">{title}</p>
        <div className="store-stat-icon-box">
          <Icon size={18} />
        </div>
      </div>
      <p className="store-stat-value">{value}</p>
    </div>
  );
}

function StatusBadge({ status, type }) {
  const normalized = String(status || '').toLowerCase();

  let className = "store-badge ";
  let text = status || 'Unknown';

  if (type === 'store') {
    if (normalized === 'banned') {
      className += "store-badge-banned";
      text = "Banned";
    } else {
      className += "store-badge-active";
      text = "Active";
    }
  } else {
    if (normalized === 'paid') {
      className += "store-badge-paid";
      text = "Paid";
    } else if (normalized === 'protocol') {
      className += "store-badge-protocol";
      text = "Protocol";
    } else {
      className += "store-badge-pending";
      text = "Pending";
    }
  }

  return <span className={className} style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: '8px' }}>{text}</span>;
}
