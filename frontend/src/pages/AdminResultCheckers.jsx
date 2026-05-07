import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, Edit2, CheckCircle, AlertCircle, Save, X, Lock, Unlock, CreditCard } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { checkers as checkersAPI } from '../services/api';

export default function AdminResultCheckers() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editing, setEditing] = useState(null);
  const [prices, setPrices] = useState({ sellingPrice: '', agentPrice: '', vendorPrice: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const [offersRes, lockRes] = await Promise.all([
        checkersAPI.listOffers('', search, 1, 100),
        checkersAPI.getLockStatus(),
      ]);
      setOffers(offersRes.offers || []);
      setLocked(Boolean(lockRes?.data?.enabled));
    } catch (err) {
      showMessage('error', err.message || 'Failed to load checker offers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await checkersAPI.sync();
      showMessage('success', res.message || 'Checker offers synced');
      await fetchOffers();
    } catch (err) {
      showMessage('error', err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      setSavingLock(true);
      await checkersAPI.updateLockStatus(!locked);
      setLocked((prev) => !prev);
      showMessage('success', !locked ? 'Checker sales locked' : 'Checker sales unlocked');
    } catch (err) {
      showMessage('error', err.message || 'Failed to update checker lock');
    } finally {
      setSavingLock(false);
    }
  };

  const handleToggleStatus = async (offer) => {
    try {
      const res = await checkersAPI.toggleStatus(offer._id);
      setOffers((prev) => prev.map((row) => (row._id === offer._id ? { ...row, status: res.offer?.status } : row)));
      showMessage('success', `Checker ${res.offer?.status === 'active' ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showMessage('error', err.message || 'Failed to toggle checker status');
    }
  };

  const openEdit = (offer) => {
    setEditing(offer);
    setPrices({
      sellingPrice: String(offer.sellingPrice || 0),
      agentPrice: String(offer.agentPrice || 0),
      vendorPrice: String(offer.vendorPrice || 0),
    });
  };

  const savePrices = async () => {
    if (!editing) return;
    try {
      const payload = {
        sellingPrice: Number(prices.sellingPrice || 0),
        agentPrice: Number(prices.agentPrice || 0),
        vendorPrice: Number(prices.vendorPrice || 0),
      };
      await checkersAPI.updatePrices(editing._id, payload);
      setEditing(null);
      showMessage('success', 'Checker prices updated');
      await fetchOffers();
    } catch (err) {
      showMessage('error', err.message || 'Failed to update prices');
    }
  };

  const formatAmount = (value) => `GHc ${Number(value || 0).toFixed(2)}`;

  return (
    <div className="chk-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .chk-page-container {
          font-family: 'DM Sans', sans-serif;
        }

        .chk-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chk-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 1000px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .chk-heading-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .chk-icon-box {
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

        .chk-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .chk-search-box {
          position: relative;
          width: 100%;
          margin-bottom: 20px;
        }

        .chk-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .chk-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
          outline: none;
        }

        .chk-btn-primary {
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

        .chk-btn-outline {
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

        .chk-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }

        .chk-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .chk-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11.5px;
          text-transform: uppercase;
        }

        .chk-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .chk-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .chk-btn-icon {
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

        .chk-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .chk-modal-card {
          background: #fff;
          border-radius: 14px;
          width: 100%;
          max-width: 400px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
        }

        .chk-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(17,17,17,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: chk-spin 0.8s linear infinite;
        }

        @keyframes chk-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="chk-content">
        <div className="chk-main-card">
          <div className="chk-heading-section">
            <div className="chk-icon-box">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="chk-h2">Result Checkers</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>Manage prices and lock/unlock checker sales</p>
            </div>
          </div>

          {message.text && (
            <div style={{
              background: message.type === 'error' ? '#fff5f5' : '#ecfdf5',
              border: `1.5px solid ${message.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              color: message.type === 'error' ? '#b91c1c' : '#047857',
              borderRadius: '7px', padding: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700'
            }}>
              {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="chk-search-box" style={{ flex: '1', minWidth: '240px', marginBottom: 0 }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                <input
                  className="chk-input"
                  placeholder="Search checkers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`chk-btn-outline ${locked ? 'active' : ''}`} style={{ borderColor: locked ? '#b91c1c' : '#e4e4de', color: locked ? '#b91c1c' : '#111' }} onClick={handleToggleLock} disabled={savingLock}>
                  {locked ? <Lock size={16} /> : <Unlock size={16} />}
                  {locked ? 'Locked' : 'Unlocked'}
                </button>
                <button className="chk-btn-primary" onClick={handleSync} disabled={syncing}>
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </div>
          </div>

          <div className="chk-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="chk-spinner"></div></div>
            ) : (
              <table className="chk-table">
                <thead>
                  <tr>
                    <th className="chk-th">Checker</th>
                    <th className="chk-th">Cost</th>
                    <th className="chk-th">Admin/Agent Prices</th>
                    <th className="chk-th">Stock</th>
                    <th className="chk-th">Status</th>
                    <th className="chk-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer._id}>
                      <td className="chk-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#111' }}>{offer.displayName || offer.checkerType}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{offer.checkerType}</div>
                      </td>
                      <td className="chk-td" style={{ whiteSpace: 'nowrap' }}>{formatAmount(offer.costPrice)}</td>
                      <td className="chk-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px' }}>Admin: <span style={{ fontWeight: '700' }}>{formatAmount(offer.sellingPrice)}</span></div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Agent: {formatAmount(offer.agentPrice)}</div>
                      </td>
                      <td className="chk-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: offer.available ? '#059669' : '#b91c1c' }}>{offer.stockCount || 0}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{offer.available ? 'Available' : 'Out of stock'}</div>
                      </td>
                      <td className="chk-td">
                        <span className="chk-badge" style={{ background: offer.status === 'active' ? '#ecfdf5' : '#f3f4f6', color: offer.status === 'active' ? '#059669' : '#666' }}>
                          {offer.status}
                        </span>
                      </td>
                      <td className="chk-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="chk-btn-icon" onClick={() => openEdit(offer)}><Edit2 size={14} /></button>
                          <button className="chk-btn-icon" onClick={() => handleToggleStatus(offer)}>
                            <CheckCircle size={14} style={{ color: offer.status === 'active' ? '#059669' : '#ccc' }} />
                          </button>
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

      {editing && (
        <div className="chk-modal-overlay">
          <div className="chk-modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', flex: 1 }}>Update Prices</h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Admin Selling Price</label>
                <input className="chk-input" style={{ paddingLeft: '14px' }} type="number" value={prices.sellingPrice} onChange={(e) => setPrices({ ...prices, sellingPrice: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#333', display: 'block', marginBottom: '6px' }}>Agent Price</label>
                <input className="chk-input" style={{ paddingLeft: '14px' }} type="number" value={prices.agentPrice} onChange={(e) => setPrices({ ...prices, agentPrice: e.target.value })} />
              </div>
              <button className="chk-btn-primary" style={{ marginTop: '8px' }} onClick={savePrices}><Save size={18} /> Save Prices</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
