import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, Edit2, CheckCircle, AlertCircle, Save, X, Lock, Unlock, CreditCard, Info, MessageSquare } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { checkers as checkersAPI } from '../services/api';

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

  const handleToggleSms = async (offer) => {
    try {
      const res = await checkersAPI.toggleSms(offer._id);
      setOffers((prev) => prev.map((row) => (row._id === offer._id ? { ...row, smsEnabled: res.offer?.smsEnabled } : row)));
      showMessage('success', res.message || 'SMS status updated');
    } catch (err) {
      showMessage('error', err.message || 'Failed to toggle SMS status');
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

  const pageTheme = getColor(3); // Amber
  const syncColor = getColor(2); // Blue
  const lockColor = getColor(5); // Coral/Red
  const searchColor = getColor(0); // Purple

  return (
    <div className="chk-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff' }}>
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
          gap: 24px;
        }

        .chk-header {
          background: linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%);
          border: 1.5px solid ${pageTheme.main}33;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 8px 40px ${pageTheme.glow};
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 1000px;
        }

        .chk-heading-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chk-icon-box {
          width: 46px;
          height: 46px;
          background: ${pageTheme.main};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 8px 20px ${pageTheme.glow};
        }

        .chk-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .chk-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.06);
          width: 100%;
          max-width: 1000px;
          padding: 24px;
        }

        .chk-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 8px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .chk-input:focus {
          border-color: ${searchColor.main};
          box-shadow: 0 0 0 3px ${searchColor.glow};
          background: #fff;
          outline: none;
        }

        .chk-btn-primary {
          background: #111;
          color: #fff;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .chk-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .chk-btn-outline {
          background: #fff;
          color: #111;
          border: 1.5px solid #e4e4de;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .chk-btn-outline:hover:not(:disabled) {
          background: #fafaf7;
        }

        .chk-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 12px;
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
          padding: 14px 16px;
          font-weight: 800;
          color: #000;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .chk-td {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .chk-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chk-btn-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
          background: #fff;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chk-btn-icon:hover {
          border-color: ${pageTheme.main};
          color: ${pageTheme.main};
          background: ${pageTheme.soft};
        }

        .chk-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .chk-modal-card {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 420px;
          padding: 28px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          border: 1.5px solid #e4e4de;
        }

        .chk-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid ${pageTheme.soft};
          border-top-color: ${pageTheme.main};
          border-radius: 50%;
          animation: chk-spin 0.8s linear infinite;
        }

        @keyframes chk-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="chk-content">
        {/* Header Section */}
        <div className="chk-header">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="chk-heading-row">
              <div className="chk-icon-box">
                <CreditCard size={24} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: pageTheme.main }}>System Admin</span>
                </div>
                <h2 className="chk-h2">Result Checkers</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                className="chk-btn-outline" 
                style={{ 
                  borderColor: locked ? lockColor.main + '66' : '#e4e4de', 
                  color: locked ? lockColor.main : '#111',
                  background: locked ? lockColor.soft : '#fff'
                }} 
                onClick={handleToggleLock} 
                disabled={savingLock}
              >
                {locked ? <Lock size={16} strokeWidth={2.5} /> : <Unlock size={16} strokeWidth={2.5} />}
                <span>{locked ? 'Sales Locked' : 'Sales Unlocked'}</span>
              </button>
              
              <button 
                className="chk-btn-primary" 
                style={{ background: syncColor.main, boxShadow: `0 4px 12px ${syncColor.glow}` }} 
                onClick={handleSync} 
                disabled={syncing}
              >
                <RefreshCw size={16} strokeWidth={2.5} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? 'Syncing...' : 'Sync Offers'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="chk-main-card">
          {message.text && (
            <div style={{
              background: message.type === 'error' ? '#fff5f5' : '#ecfdf5',
              border: `1.5px solid ${message.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              color: message.type === 'error' ? '#b91c1c' : '#047857',
              borderRadius: '10px', padding: '14px', marginBottom: '24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700'
            }}>
              {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
              {message.text}
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <div className="relative">
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: searchColor.main }} strokeWidth={2.5} />
              <input
                className="chk-input"
                style={{ paddingLeft: '44px' }}
                placeholder="Search by checker name or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="chk-table-container">
            {loading ? (
              <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
                <div className="chk-spinner"></div>
              </div>
            ) : (
              <table className="chk-table">
                <thead>
                  <tr>
                    <th className="chk-th">Checker Type</th>
                    <th className="chk-th">Cost Price</th>
                    <th className="chk-th">Selling Prices</th>
                    <th className="chk-th">Inventory</th>
                    <th className="chk-th">Status</th>
                    <th className="chk-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer, idx) => {
                    const rowColor = getColor(idx + 4); // Start from index 4 for variety
                    return (
                      <tr key={offer._id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = rowColor.soft + '44'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td className="chk-td">
                          <div className="flex items-center gap-3">
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: rowColor.main }} />
                            <div>
                              <div style={{ fontWeight: '800', color: '#111', fontSize: '14px' }}>{offer.displayName || offer.checkerType}</div>
                              <div style={{ fontSize: '11px', color: '#000', fontWeight: '600', textTransform: 'uppercase' }}>{offer.checkerType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="chk-td">
                          <span style={{ fontWeight: '700', color: '#111' }}>{formatAmount(offer.costPrice)}</span>
                        </td>
                        <td className="chk-td">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#bbb', textTransform: 'uppercase' }}>Admin:</span>
                              <span style={{ fontWeight: '800', color: pageTheme.main }}>{formatAmount(offer.sellingPrice)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#bbb', textTransform: 'uppercase' }}>Agent:</span>
                              <span style={{ fontWeight: '700', color: '#555' }}>{formatAmount(offer.agentPrice)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="chk-td">
                          <div className="flex flex-col">
                            <span style={{ fontWeight: '800', color: offer.stockCount > 0 ? '#059669' : '#DC2626', fontSize: '14px' }}>{offer.stockCount || 0}</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#000', textTransform: 'uppercase' }}>
                              {offer.available ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </td>
                        <td className="chk-td">
                          <span className="chk-badge" style={{ 
                            background: offer.status === 'active' ? '#ECFDF5' : '#F3F4F6', 
                            color: offer.status === 'active' ? '#059669' : '#6B7280',
                            border: `1px solid ${offer.status === 'active' ? '#059669' : '#6B7280'}33`
                          }}>
                            {offer.status}
                          </span>
                        </td>
                        <td className="chk-td">
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="chk-btn-icon" onClick={() => openEdit(offer)} title="Edit Prices">
                              <Edit2 size={16} strokeWidth={2.5} />
                            </button>
                            <button 
                              className="chk-btn-icon" 
                              onClick={() => handleToggleSms(offer)}
                              style={{ color: offer.smsEnabled !== false ? '#7C3AED' : '#bbb' }}
                              title={offer.smsEnabled !== false ? 'SMS Enabled' : 'SMS Disabled'}
                            >
                              <MessageSquare size={16} strokeWidth={2.5} />
                            </button>
                            <button 
                              className="chk-btn-icon" 
                              onClick={() => handleToggleStatus(offer)}
                              style={{ color: offer.status === 'active' ? '#059669' : '#bbb' }}
                              title={offer.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              <CheckCircle size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="chk-modal-overlay">
          <div className="chk-modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', margin: 0 }}>Edit Prices</h3>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#000', textTransform: 'uppercase', margin: '4px 0 0' }}>{editing.displayName || editing.checkerType}</p>
              </div>
              <button onClick={() => setEditing(null)} className="chk-btn-icon" style={{ borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Cost Price (Provider)</label>
                <div style={{ padding: '12px', background: '#f5f5f0', border: '1.5px solid #e4e4de', borderRadius: '10px', fontWeight: '700', color: '#111' }}>
                  {formatAmount(editing.costPrice)}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Selling Price (User)</label>
                <input
                  className="chk-input"
                  type="number"
                  value={prices.sellingPrice}
                  onChange={(e) => setPrices({ ...prices, sellingPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Agent Price</label>
                <input
                  className="chk-input"
                  type="number"
                  value={prices.agentPrice}
                  onChange={(e) => setPrices({ ...prices, agentPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  className="chk-btn-primary" 
                  style={{ flex: 1, background: pageTheme.main, boxShadow: `0 8px 20px ${pageTheme.glow}` }} 
                  onClick={savePrices}
                >
                  <Save size={18} strokeWidth={2.5} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
