import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, RefreshCw, Database, CheckCircle, AlertCircle, Search, Filter, X, Save, Package, RotateCcw } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
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
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState({ totalPlans: 0, activePlans: 0, outOfStockPlans: 0, providerInactive: 0 });

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
        setPagination(response.pagination || null);
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
    const provider = settings?.vtuProvider || 'topza';
    if (provider !== 'topza') navigate('/admin/topza-plans', { replace: true });
  }, [settings?.vtuProvider, navigate]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

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

  const filteredPlans = plans.filter((p) => (p.name || `${p.isp} ${p.volume}GB`).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="topza-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .topza-page-container {
          font-family: 'DM Sans', sans-serif;
        }

        .topza-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .topza-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 1100px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .topza-heading-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .topza-icon-box {
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

        .topza-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .topza-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .topza-stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        .topza-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .topza-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .topza-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
        }

        .topza-search-box {
          position: relative;
          width: 100%;
          margin-bottom: 20px;
        }

        .topza-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .topza-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
          outline: none;
        }

        .topza-btn-primary {
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

        .topza-btn-outline {
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

        .topza-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }

        .topza-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .topza-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11.5px;
          text-transform: uppercase;
        }

        .topza-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .topza-btn-icon {
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

        .topza-btn-icon:hover {
          background: #111;
          color: #fff;
        }

        .topza-filter-btn {
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

        .topza-filter-btn:hover {
          border-color: #111;
          background: #fafaf7;
        }

        .topza-filter-btn.active {
          background: #111;
          border-color: #111;
          color: #fff;
        }

        .topza-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(17,17,17,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: topza-spin 0.8s linear infinite;
        }

        @keyframes topza-spin {
          to { transform: rotate(360deg); }
        }

        .topza-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .topza-modal-card {
          background: #fff;
          border-radius: 14px;
          width: 100%;
          max-width: 400px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="topza-content">
        <div className="topza-main-card">
          <div className="topza-heading-section">
            <div className="topza-icon-box">
              <Database size={24} />
            </div>
            <div>
              <h2 className="topza-h2">Topza Offers</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>Sync and manage Topza pricing and stock</p>
            </div>
          </div>

          {error && <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={16} /> {error}</div>}
          {success && <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', color: '#047857', borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {success}</div>}

          <div className="topza-stats-grid">
            <div className="topza-stat-card">
              <span className="topza-stat-label">Total Plans</span>
              <span className="topza-stat-value">{stats.totalPlans}</span>
            </div>
            <div className="topza-stat-card">
              <span className="topza-stat-label">Active</span>
              <span className="topza-stat-value" style={{ color: '#059669' }}>{stats.activePlans}</span>
            </div>
            <div className="topza-stat-card">
              <span className="topza-stat-label">Out of Stock</span>
              <span className="topza-stat-value" style={{ color: '#b91c1c' }}>{stats.outOfStockPlans}</span>
            </div>
            <div className="topza-stat-card">
              <span className="topza-stat-label">Provider Off</span>
              <span className="topza-stat-value" style={{ color: '#f0a500' }}>{stats.providerInactive || 0}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="topza-search-box" style={{ flex: '1', minWidth: '240px', marginBottom: 0 }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  className="topza-input"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="topza-btn-primary" onClick={handleSync} disabled={syncing}>
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Topza'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#666', textTransform: 'uppercase' }}>Network:</span>
              <button className={`topza-filter-btn ${selectedNetwork === '' ? 'active' : ''}`} onClick={() => setSelectedNetwork('')}>All</button>
              {networkCatalog.map(n => (
                <button
                  key={n.slug || n.name}
                  className={`topza-filter-btn ${selectedNetwork === (n.name || n.slug) ? 'active' : ''}`}
                  onClick={() => setSelectedNetwork(n.name || n.slug)}
                >
                  {n.name || n.slug}
                </button>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px', background: '#fafaf7', borderRadius: '8px', border: '1.5px solid #e4e4de' }}>
                <button className="topza-btn-outline" style={{ borderColor: '#059669', color: '#059669' }} onClick={() => handleStockOverride([...selectedIds], true)} disabled={updatingStock}><Package size={14} /> In Stock</button>
                <button className="topza-btn-outline" style={{ borderColor: '#f0a500', color: '#f0a500' }} onClick={() => handleStockOverride([...selectedIds], false)} disabled={updatingStock}><Package size={14} /> Out of Stock</button>
                <button className="topza-btn-outline" onClick={() => handleStockOverride([...selectedIds], false, true)} disabled={updatingStock}><RotateCcw size={14} /> Reset</button>
                <button className="topza-btn-outline" style={{ borderColor: '#b91c1c', color: '#b91c1c', marginLeft: 'auto' }} onClick={() => setBulkDeleteTarget('selected')}><Trash2 size={14} /> Delete Selected</button>
              </div>
            )}
          </div>

          <div className="topza-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="topza-spinner"></div></div>
            ) : (
              <>
              <table className="topza-table">
                <thead>
                  <tr>
                    <th className="topza-th" style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredPlans.length && filteredPlans.length > 0}
                        onChange={() => {
                          if (selectedIds.size === filteredPlans.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(filteredPlans.map(p => p._id)));
                        }}
                      />
                    </th>
                    <th className="topza-th">Plan</th>
                    <th className="topza-th">Pricing (GHS)</th>
                    <th className="topza-th">Stock</th>
                    <th className="topza-th">Status</th>
                    <th className="topza-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map(plan => (
                    <tr key={plan._id}>
                      <td className="topza-td">
                        <input type="checkbox" checked={selectedIds.has(plan._id)} onChange={() => toggleSelect(plan._id)} />
                      </td>
                      <td className="topza-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#111' }}>{plan.name || `${plan.isp} ${plan.volume}GB`}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{plan.isp} • {plan.dataAmount || plan.volume}</div>
                      </td>
                      <td className="topza-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px' }}>Topza: <span style={{ fontWeight: '700', color: '#b91c1c' }}>{Number(plan.costPrice || 0).toFixed(2)}</span></div>
                        <div style={{ fontSize: '12px' }}>User: <span style={{ fontWeight: '700' }}>{Number(plan.sellingPrice || 0).toFixed(2)}</span></div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Agent: {Number(plan.agentPrice || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Vendor: {Number(plan.vendorPrice || 0).toFixed(2)}</div>
                        {plan.discount > 0 && <div style={{ fontSize: '10px', color: '#059669' }}>Disc: {plan.discount.toFixed(2)}</div>}
                      </td>
                      <td className="topza-td" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: plan.inStock ? '#059669' : '#b91c1c' }}>
                          {plan.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        {plan.stockOverriddenByAdmin && <div style={{ fontSize: '10px', color: '#f0a500' }}>Admin Override</div>}
                        {plan.providerIsActive === false && <div style={{ fontSize: '10px', color: '#b91c1c' }}>Provider Off</div>}
                      </td>
                      <td className="topza-td" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: plan.status === 'active' ? '#059669' : '#666' }}>
                          {plan.status}
                        </span>
                        {plan.isEdited && <div style={{ fontSize: '10px', color: '#f0a500' }}>Edited</div>}
                      </td>
                      <td className="topza-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="topza-btn-icon" onClick={() => openEditPrices(plan)} title="Edit Prices"><Edit2 size={14} /></button>
                          <button className="topza-btn-icon" onClick={() => handleToggleStatus(plan)} title="Toggle Status"><CheckCircle size={14} style={{ color: plan.status === 'active' ? '#059669' : '#ccc' }} /></button>
                          <button className="topza-btn-icon" onClick={() => { setDeletingPlan(plan); setShowDeleteConfirm(true); }}><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination && pagination.pages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={pagination.pages}
                  onPageChange={(newPage) => setPage(newPage)}
                  isLoading={loading}
                />
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {editingPlan && (
        <div className="topza-modal-overlay">
          <div className="topza-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Update Prices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Admin Selling Price</label>
                <input className="topza-input" style={{ paddingLeft: '14px' }} type="number" value={editPrices.sellingPrice} onChange={(e) => setEditPrices({ ...editPrices, sellingPrice: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Agent Price</label>
                <input className="topza-input" style={{ paddingLeft: '14px' }} type="number" value={editPrices.agentPrice} onChange={(e) => setEditPrices({ ...editPrices, agentPrice: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Vendor Price</label>
                <input className="topza-input" style={{ paddingLeft: '14px' }} type="number" value={editPrices.vendorPrice} onChange={(e) => setEditPrices({ ...editPrices, vendorPrice: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button className="topza-btn-primary" style={{ flex: '1' }} onClick={handleSavePrices} disabled={savingPrices}>{savingPrices ? 'Saving...' : 'Save Prices'}</button>
                <button className="topza-btn-outline" style={{ flex: '1', justifyContent: 'center' }} onClick={() => setEditingPlan(null)}>Cancel</button>
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
