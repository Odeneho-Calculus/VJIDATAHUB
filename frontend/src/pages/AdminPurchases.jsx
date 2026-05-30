import { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2, Search, ShoppingCart, CheckCircle, Clock, DollarSign, Database } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { PurchaseDetailsModal } from '../components/AdminPurchaseModals';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

export default function AdminPurchases() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, networkFilter, searchTerm]);

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getPurchases(page, 10);

      if (response.success) {
        setPurchases(response.data?.purchases || response.purchases || []);
        setTotalPages(response.data?.pagination?.pages || response.pagination?.pages || 0);
      } else {
        setError(response.message || 'Failed to fetch purchases');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

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

  const getFilteredPurchases = () => {
    let filtered = purchases;

    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (networkFilter) {
      filtered = filtered.filter(p => p.network === networkFilter);
    }

    if (!searchTerm) return filtered;

    const term = searchTerm.toLowerCase();
    return filtered.filter(purchase =>
      (purchase.user?.name || purchase.userId?.name || '').toLowerCase().includes(term) ||
      (purchase.user?.email || purchase.userId?.email || '').toLowerCase().includes(term) ||
      (purchase.phoneNumber || purchase.phone || '').includes(term) ||
      (purchase.planName || '').toLowerCase().includes(term)
    );
  };

  const calculateStats = () => {
    const total = purchases.length;
    const completed = purchases.filter(p => p.status === 'completed').length;
    const pending = purchases.filter(p => p.status === 'pending').length;
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    return { total, completed, pending, totalRevenue };
  };

  const stats = calculateStats();
  const filteredPurchases = getFilteredPurchases();

  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowDetailsModal(true);
  };

  const handleOpenDelete = (purchase) => {
    setSelectedPurchase(purchase);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedPurchase) return;

    try {
      setUpdateLoading(true);
      const response = await adminAPI.deletePurchase(selectedPurchase.id || selectedPurchase._id);

      if (response.success) {
        setShowDeleteConfirm(false);
        await fetchPurchases();
        setSelectedPurchase(null);
        showMessage('Purchase deleted successfully');
      } else {
        showMessage(response.message || 'Failed to delete purchase', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete purchase', true);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { backgroundColor: '#f0fdf4', color: '#166534' };
      case 'pending': return { backgroundColor: '#fffbeb', color: '#92400e' };
      case 'failed': return { backgroundColor: '#fef2f2', color: '#991b1b' };
      default: return { backgroundColor: '#f8fafc', color: '#334155' };
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f0', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .purchases-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .purchases-scrollable {
          flex: 1;
          overflow-y: auto;
          padding: 24px 16px;
        }
        
        .purchases-max-width {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .purchases-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          padding: 24px;
        }
        
        .purchases-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }
        
        .purchases-icon-box {
          width: 46px;
          height: 46px;
          background: #111;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f0a500;
        }
        
        .purchases-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        
        .purchases-subtitle {
          font-size: 14px;
          color: #666;
          margin: 4px 0 0 0;
        }
        
        .purchases-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        @media (min-width: 1024px) {
          .purchases-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .purchases-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          transition: all 0.2s;
        }
        
        .purchases-stat-card:hover {
          border-color: #111;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .purchases-stat-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }
        
        .purchases-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        
        .purchases-input-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .purchases-search-wrapper {
          position: relative;
        }
        
        .purchases-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
        
        .purchases-input {
          width: 100%;
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          color: #111;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        
        .purchases-input:focus {
          outline: none;
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
        }
        
        .purchases-filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .purchases-chip {
          padding: 8px 16px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #e0e0d8;
          background: #fafaf7;
          color: #111;
          transition: all 0.2s;
        }
        
        .purchases-chip.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        
        .purchases-table-container {
          overflow-x: auto;
          margin-top: 8px;
        }
        
        .purchases-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        
        .purchases-table th {
          padding: 16px;
          background: #fafaf7;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
        }
        
        .purchases-table td {
          padding: 16px;
          border-bottom: 1.5px solid #f0f0f0;
          font-size: 14px;
          color: #111;
        }
        
        .purchases-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-block;
        }
        
        .purchases-btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #e4e4de;
          background: #fff;
          color: #111;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .purchases-btn-icon:hover {
          background: #fafaf7;
          border-color: #111;
        }
        
        .purchases-error-box {
          background: #fff5f5;
          border: 1.5px solid #fecaca;
          color: #b91c1c;
          border-radius: 7px;
          padding: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .purchases-success-box {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          color: #166534;
          border-radius: 7px;
          padding: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .purchases-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(0,0,0,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: purchases-spin 0.8s linear infinite;
        }
        
        @keyframes purchases-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="purchases-container">
        <div className="purchases-scrollable">
          <div className="purchases-max-width">

            <div className="purchases-card">
              <div className="purchases-header">
                <div className="purchases-icon-box">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <h1 className="purchases-title">Purchase Management</h1>
                  <p className="purchases-subtitle">Track all user purchases and manage transactions</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="purchases-error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="purchases-success-box">
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            <div className="purchases-stats-grid">
              {[
                { label: 'Total Purchases', value: stats.total, icon: <ShoppingCart size={16} />, color: '#eff6ff' },
                { label: 'Completed', value: stats.completed, icon: <CheckCircle size={16} />, color: '#f0fdf4' },
                { label: 'Pending', value: stats.pending, icon: <Clock size={16} />, color: '#fffbeb' },
                { label: 'Total Revenue', value: `GHS ${formatNumberAbbreviated(stats.totalRevenue)}`, icon: <DollarSign size={16} />, color: '#f5f3ff' }
              ].map((stat, i) => (
                <div key={i} className="purchases-stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className="purchases-stat-label">{stat.label}</p>
                  <p className="purchases-stat-value">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="purchases-card">
              <div className="purchases-input-group">
                <div className="purchases-search-wrapper">
                  <Search className="purchases-search-icon" size={16} />
                  <input
                    type="text"
                    className="purchases-input"
                    placeholder="Search by user, phone, plan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p className="purchases-stat-label" style={{ textTransform: 'uppercase' }}>Status</p>
                    <div className="purchases-filter-chips">
                      <div className={`purchases-chip ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</div>
                      {['pending', 'completed', 'failed'].map(s => (
                        <div key={s} className={`purchases-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="purchases-stat-label" style={{ textTransform: 'uppercase' }}>Network</p>
                    <div className="purchases-filter-chips">
                      <div className={`purchases-chip ${networkFilter === '' ? 'active' : ''}`} onClick={() => setNetworkFilter('')}>All</div>
                      {['MTN', 'TELECEL', 'AIRTELTIGO'].map(n => (
                        <div key={n} className={`purchases-chip ${networkFilter === n ? 'active' : ''}`} onClick={() => setNetworkFilter(n)}>{n}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="purchases-card" style={{ padding: 0 }}>
              <div className="purchases-table-container">
                {loading ? (
                  <div style={{ padding: '64px', display: 'flex', justifyContent: 'center' }}>
                    <div className="purchases-spinner" style={{ width: '32px', height: '32px' }}></div>
                  </div>
                ) : filteredPurchases.length === 0 ? (
                  <div style={{ padding: '64px', textAlign: 'center' }}>
                    <Database size={48} style={{ color: '#e4e4de', marginBottom: '16px' }} />
                    <p style={{ color: '#666', margin: 0 }}>No purchases found</p>
                  </div>
                ) : (
                  <table className="purchases-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Purchase</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(purchase => (
                        <tr key={purchase.id || purchase._id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{purchase.user?.name || purchase.userId?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '11px', color: '#999' }}>{purchase.user?.email || purchase.userId?.email || 'N/A'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{purchase.planName || 'N/A'}</div>
                            <div style={{ fontSize: '11px', color: '#666', fontWeight: 700 }}>{purchase.network} • #{purchase._id?.slice(-8)}</div>
                          </td>
                          <td style={{ fontWeight: 800 }}>GHS {formatNumberAbbreviated(purchase.amount)}</td>
                          <td>
                            <span className="purchases-badge" style={getStatusStyle(purchase.status)}>
                              {purchase.status || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: 700 }}>{new Date(purchase.date || purchase.createdAt).toLocaleDateString()}</div>
                            <div style={{ fontSize: '10px', color: '#999' }}>{new Date(purchase.date || purchase.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="purchases-btn-icon" onClick={() => handleViewDetails(purchase)}><Eye size={14} /></button>
                              <button className="purchases-btn-icon" onClick={() => handleOpenDelete(purchase)} style={{ color: '#b91c1c' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {!loading && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                  isLoading={loading}
                />
              )}
            </div>

          </div>
        </div>
      </div>

      <PurchaseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Purchase"
        message={`Are you sure you want to delete this purchase? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedPurchase(null);
        }}
        isDangerous={true}
        loading={updateLoading}
      />
    </div>
  );
}
