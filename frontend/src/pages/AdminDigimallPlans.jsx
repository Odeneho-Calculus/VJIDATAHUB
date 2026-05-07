import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, RefreshCw, Database, CheckCircle, AlertCircle, Search, Filter, Package, RotateCcw, Database as DbIcon } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSidebar } from '../hooks/useSidebar';
import { digimall as digimallAPI, admin as adminAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminDigimallPlans() {
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

  const [editingPlan, setEditingPlan] = useState(null);
  const [editPrices, setEditPrices] = useState({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);

  useEffect(() => {
    adminAPI.getSystemSettings().then(res => {
      const catalog = res?.settings?.networkCatalog || [];
      setNetworkCatalog(catalog.filter(n => n?.isActive !== false));
    }).catch(() => {});
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await digimallAPI.list(selectedNetwork, '', page, 20);
      if (response.success) {
        setPlans(response.plans || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch DigiMall plans');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, page]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await digimallAPI.getStats(selectedNetwork || 'all');
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
    if (provider === 'topza') navigate('/admin/topza-plans', { replace: true });
  }, [settings?.vtuProvider, navigate]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await digimallAPI.sync();
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
      const response = await digimallAPI.updatePrices(editingPlan._id, prices);
      if (response.success) {
        setPlans(plans.map(p => p._id === editingPlan._id ? { ...p, ...prices, isEdited: true } : p));
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
      const response = await digimallAPI.toggleStatus(plan._id);
      if (response.success) {
        setPlans(plans.map(p => p._id === plan._id ? { ...p, status: response.plan?.status || (p.status === 'active' ? 'inactive' : 'active') } : p));
        showMessage(`Plan ${response.plan?.status === 'active' ? 'activated' : 'deactivated'}`);
      }
    } catch (err) {
      showMessage(`Failed to toggle status: ${err.message}`, true);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPlan) return;
    try {
      await digimallAPI.delete(deletingPlan._id);
      setShowDeleteConfirm(false);
      setDeletingPlan(null);
      await fetchPlans();
      showMessage('Plan deleted');
    } catch (err) {
      showMessage(`Failed to delete: ${err.message}`, true);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      const ids = bulkDeleteTarget === 'all' ? [] : [...selectedIds];
      const response = await digimallAPI.bulkDelete(ids);
      if (response.success) {
        setSelectedIds(new Set());
        setBulkDeleteTarget(null);
        await fetchPlans();
        await fetchStats();
        showMessage(`${response.deleted} plan(s) deleted`);
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
      const response = await digimallAPI.updateStock(ids, inStock, resetOverride);
      if (response.success) {
        setPlans(prev => prev.map(p =>
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

  const filteredPlans = plans.filter(p => (p.name || `${p.network} ${p.dataSize}`).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="dm-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .dm-page-container {
          font-family: 'DM Sans', sans-serif;
        }

        .dm-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dm-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 1100px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .dm-heading-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .dm-icon-box {
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

        .dm-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .dm-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .dm-stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        .dm-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dm-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dm-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
        }

        .dm-search-box {
          position: relative;
          width: 100%;
          margin-bottom: 20px;
        }

        .dm-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .dm-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
          outline: none;
        }

        .dm-btn-primary {
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

        .dm-btn-outline {
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

        .dm-filter-btn {
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

        .dm-filter-btn:hover {
          border-color: #111;
          background: #fafaf7;
        }

        .dm-filter-btn.active {
          background: #111;
          border-color: #111;
          color: #fff;
        }

        .dm-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }

        .dm-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .dm-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11.5px;
          text-transform: uppercase;
        }

        .dm-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .dm-btn-icon {
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

        .dm-btn-icon:hover {
          background: #111;
          color: #fff;
        }

        .dm-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(17,17,17,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: dm-spin 0.8s linear infinite;
        }

        @keyframes dm-spin {
          to { transform: rotate(360deg); }
        }

        .dm-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .dm-modal-card {
          background: #fff;
          border-radius: 14px;
          width: 100%;
          max-width: 400px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="dm-content">
        <div className="dm-main-card">
          <div className="dm-heading-section">
            <div className="dm-icon-box">
              <Database size={24} />
            </div>
            <div>
              <h2 className="dm-h2">DigiMall Offers</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>Sync and manage DigiMall pricing and stock</p>
            </div>
          </div>

          {error && <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}
          {success && <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#047857', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {success}</div>}

          <div className="dm-stats-grid">
            <div className="dm-stat-card">
              <span className="dm-stat-label">Total Plans</span>
              <span className="dm-stat-value">{stats.totalPlans}</span>
            </div>
            <div className="dm-stat-card">
              <span className="dm-stat-label">Active</span>
              <span className="dm-stat-value" style={{ color: '#059669' }}>{stats.activePlans}</span>
            </div>
            <div className="dm-stat-card">
              <span className="dm-stat-label">Out of Stock</span>
              <span className="dm-stat-value" style={{ color: '#b91c1c' }}>{stats.outOfStockPlans}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="dm-search-box" style={{ flex: '1', minWidth: '240px', marginBottom: 0 }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  className="dm-input"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="dm-btn-primary" onClick={handleSync} disabled={syncing}>
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync DigiMall'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#666', textTransform: 'uppercase' }}>Network:</span>
              <button className={`dm-filter-btn ${selectedNetwork === '' ? 'active' : ''}`} onClick={() => setSelectedNetwork('')}>All</button>
              {networkCatalog.map(n => (
                <button
                  key={n.slug || n.name}
                  className={`dm-filter-btn ${selectedNetwork === (n.name || n.slug) ? 'active' : ''}`}
                  onClick={() => setSelectedNetwork(n.name || n.slug)}
                >
                  {n.name || n.slug}
                </button>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px', background: '#fafaf7', borderRadius: '8px', border: '1.5px solid #e4e4de' }}>
                <button className="dm-btn-outline" style={{ borderColor: '#059669', color: '#059669' }} onClick={() => handleStockOverride([...selectedIds], true)} disabled={updatingStock}><Package size={14} /> In Stock</button>
                <button className="dm-btn-outline" style={{ borderColor: '#f0a500', color: '#f0a500' }} onClick={() => handleStockOverride([...selectedIds], false)} disabled={updatingStock}><Package size={14} /> Out of Stock</button>
                <button className="dm-btn-outline" onClick={() => handleStockOverride([...selectedIds], false, true)} disabled={updatingStock}><RotateCcw size={14} /> Reset</button>
                <button className="dm-btn-outline" style={{ borderColor: '#b91c1c', color: '#b91c1c', marginLeft: 'auto' }} onClick={() => setBulkDeleteTarget('selected')}><Trash2 size={14} /> Delete Selected</button>
              </div>
            )}
          </div>

          <div className="dm-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="dm-spinner"></div></div>
            ) : (
              <table className="dm-table">
                <thead>
                  <tr>
                    <th className="dm-th" style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredPlans.length && filteredPlans.length > 0}
                        onChange={() => {
                          if (selectedIds.size === filteredPlans.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(filteredPlans.map(p => p._id)));
                        }}
                      />
                    </th>
                    <th className="dm-th">Plan</th>
                    <th className="dm-th">Pricing (GHS)</th>
                    <th className="dm-th">Stock</th>
                    <th className="dm-th">Status</th>
                    <th className="dm-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map(plan => (
                    <tr key={plan._id}>
                      <td className="dm-td">
                        <input type="checkbox" checked={selectedIds.has(plan._id)} onChange={() => toggleSelect(plan._id)} />
                      </td>
                      <td className="dm-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#111' }}>{plan.name || `${plan.network} ${plan.dataSize}`}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{plan.network} • {plan.dataSize}</div>
                      </td>
                      <td className="dm-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px' }}>Admin: <span style={{ fontWeight: '700' }}>{Number(plan.sellingPrice || 0).toFixed(2)}</span></div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Agent: {Number(plan.agentPrice || 0).toFixed(2)}</div>
                      </td>
                      <td className="dm-td" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: plan.inStock ? '#059669' : '#b91c1c' }}>
                          {plan.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        {plan.stockOverriddenByAdmin && <div style={{ fontSize: '10px', color: '#f0a500' }}>Admin Override</div>}
                      </td>
                      <td className="dm-td" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: plan.status === 'active' ? '#059669' : '#666' }}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="dm-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="dm-btn-icon" onClick={() => openEditPrices(plan)} title="Edit Prices"><Edit2 size={14} /></button>
                          <button className="dm-btn-icon" onClick={() => handleToggleStatus(plan)} title="Toggle Status"><CheckCircle size={14} style={{ color: plan.status === 'active' ? '#059669' : '#ccc' }} /></button>
                          <button className="dm-btn-icon" onClick={() => { setDeletingPlan(plan); setShowDeleteConfirm(true); }}><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
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

      {editingPlan && (
        <div className="dm-modal-overlay">
          <div className="dm-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Update Prices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Admin Selling Price</label>
                <input className="dm-input" style={{ paddingLeft: '14px' }} type="number" value={editPrices.sellingPrice} onChange={(e) => setEditPrices({ ...editPrices, sellingPrice: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Agent Price</label>
                <input className="dm-input" style={{ paddingLeft: '14px' }} type="number" value={editPrices.agentPrice} onChange={(e) => setEditPrices({ ...editPrices, agentPrice: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button className="dm-btn-primary" style={{ flex: '1' }} onClick={handleSavePrices} disabled={savingPrices}>{savingPrices ? 'Saving...' : 'Save Prices'}</button>
                <button className="dm-btn-outline" style={{ flex: '1', justifyContent: 'center' }} onClick={() => setEditingPlan(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Plan" message="Remove this plan from your database?" type="danger" />
      <ConfirmDialog isOpen={!!bulkDeleteTarget} onClose={() => setBulkDeleteTarget(null)} onConfirm={handleBulkDelete} title="Bulk Delete" message="Remove all selected plans?" type="danger" loading={bulkDeleting} />
    </div>
  );
}
