import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, RefreshCw, Eye, Database, AlertCircle, CheckCircle, Search, Filter, Database as DbIcon } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import ViewXpresOfferModal from '../components/ViewXpresOfferModal';
import EditXpresPricesModal from '../components/EditXpresPricesModal';
import { useSidebar } from '../hooks/useSidebar';
import { xpresdata, admin as adminAPI } from '../services/api';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ totalPlans: 0, activePlans: 0, outOfStockPlans: 0 });
  const [networkCatalog, setNetworkCatalog] = useState([]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditPricesModal, setShowEditPricesModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editPricesSaving, setEditPricesSaving] = useState(false);

  useEffect(() => {
    adminAPI.getSystemSettings().then((res) => {
      const catalog = res?.settings?.networkCatalog || [];
      setNetworkCatalog(catalog.filter((n) => n?.isActive !== false));
    }).catch(() => {});
  }, []);

  const fetchDataPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await xpresdata.list(selectedNetwork, '', page, 20);
      if (response.success) {
        setPlans(response.plans || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, page]);

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
  }, [selectedNetwork, searchTerm]);

  useEffect(() => {
    fetchDataPlans();
    fetchStats();
  }, [page, selectedNetwork, fetchDataPlans, fetchStats]);

  useEffect(() => {
    const provider = settings?.vtuProvider || 'xpresdata';
    if (provider === 'digimall') navigate('/admin/digimall-plans', { replace: true });
    if (provider === 'topza') navigate('/admin/topza-plans', { replace: true });
  }, [settings?.vtuProvider, navigate]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await xpresdata.sync();
      if (response.success) {
        setPage(1);
        await fetchDataPlans();
        await fetchStats();
        showMessage(`Sync complete: ${response.stats?.synced ?? 0} new, ${response.stats?.updated ?? 0} updated`);
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

  const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="off-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .off-page-container {
          font-family: 'DM Sans', sans-serif;
        }

        .off-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .off-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 1100px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .off-heading-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .off-icon-box {
          width: 46px;
          height: 46px;
          background: #111;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f0a500;
          flex-shrink: 0;
        }

        .off-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .off-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .off-stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        .off-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .off-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .off-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
        }

        .off-search-box {
          position: relative;
          width: 100%;
          margin-bottom: 20px;
        }

        .off-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .off-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
          outline: none;
        }

        .off-btn-primary {
          background: #111;
          color: #fff;
          border-radius: 7px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .off-btn-outline {
          background: #fff;
          color: #111;
          border: 1.5px solid #e4e4de;
          border-radius: 7px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .off-filter-btn {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 7px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .off-filter-btn:hover {
          border-color: #111;
          background: #fafaf7;
        }

        .off-filter-btn.active {
          background: #111;
          border-color: #111;
          color: #fff;
        }

        .off-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }

        .off-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .off-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11.5px;
          text-transform: uppercase;
        }

        .off-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .off-btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #e4e4de;
          background: #fff;
          color: #444;
          cursor: pointer;
        }

        .off-btn-icon:hover {
          background: #111;
          color: #fff;
        }

        .off-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(17,17,17,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: off-spin 0.8s linear infinite;
        }

        @keyframes off-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="off-content">
        <div className="off-main-card">
          <div className="off-heading-section">
            <div className="off-icon-box">
              <DbIcon size={24} />
            </div>
            <div>
              <h2 className="off-h2">Xpresdata Offers</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>Sync and manage Xpresdata pricing and stock</p>
            </div>
          </div>

          {error && <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}
          {success && <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#047857', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {success}</div>}

          <div className="off-stats-grid">
            <div className="off-stat-card">
              <span className="off-stat-label">Total Plans</span>
              <span className="off-stat-value">{stats.totalPlans}</span>
            </div>
            <div className="off-stat-card">
              <span className="off-stat-label">Active</span>
              <span className="off-stat-value" style={{ color: '#059669' }}>{stats.activePlans}</span>
            </div>
            <div className="off-stat-card">
              <span className="off-stat-label">Out of Stock</span>
              <span className="off-stat-value" style={{ color: '#b91c1c' }}>{stats.outOfStockPlans}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="off-search-box" style={{ flex: '1', minWidth: '240px', marginBottom: 0 }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  className="off-input"
                  placeholder="Search offers by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="off-btn-primary" onClick={handleSync} disabled={syncing}>
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Xpresdata'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#666', textTransform: 'uppercase' }}>Network:</span>
              <button className={`off-filter-btn ${selectedNetwork === '' ? 'active' : ''}`} onClick={() => setSelectedNetwork('')}>All</button>
              {networkCatalog.map(n => (
                <button
                  key={n.slug || n.name}
                  className={`off-filter-btn ${selectedNetwork === (n.name || n.slug) ? 'active' : ''}`}
                  onClick={() => setSelectedNetwork(n.name || n.slug)}
                >
                  {n.name || n.slug}
                </button>
              ))}
            </div>
          </div>

          <div className="off-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="off-spinner"></div></div>
            ) : (
              <table className="off-table">
                <thead>
                  <tr>
                    <th className="off-th">Plan</th>
                    <th className="off-th">Pricing (GHS)</th>
                    <th className="off-th">Status</th>
                    <th className="off-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map(plan => (
                    <tr key={plan._id}>
                      <td className="off-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#111' }}>{plan.name}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{plan.network} • {plan.type}</div>
                      </td>
                      <td className="off-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px' }}>Admin: <span style={{ fontWeight: '700' }}>{Number(plan.sellingPrice || 0).toFixed(2)}</span></div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Agent: {Number(plan.agentPrice || 0).toFixed(2)}</div>
                      </td>
                      <td className="off-td" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: plan.status === 'active' ? '#059669' : '#666' }}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="off-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="off-btn-icon" onClick={() => { setSelectedPlan(plan); setShowViewModal(true); }} title="View"><Eye size={14} /></button>
                          <button className="off-btn-icon" onClick={() => handleOpenEditPrices(plan)} title="Edit Prices"><Edit2 size={14} /></button>
                          <button className="off-btn-icon" onClick={() => handleToggleStatus(plan)} title="Toggle Status"><CheckCircle size={14} style={{ color: plan.status === 'active' ? '#059669' : '#ccc' }} /></button>
                          <button className="off-btn-icon" onClick={() => handleOpenDelete(plan)} title="Delete"><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <ViewXpresOfferModal isOpen={showViewModal} onClose={() => setShowViewModal(false)} plan={selectedPlan} />
      <EditXpresPricesModal isOpen={showEditPricesModal} onClose={() => setShowEditPricesModal(false)} plan={selectedPlan} onSave={handleSavePrices} loading={editPricesSaving} />
      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Offer" message="Remove this offer from your database?" type="danger" />
    </div>
  );
}
