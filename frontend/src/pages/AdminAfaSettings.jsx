import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Save, Lock, Unlock, Settings2, Info, AlertCircle, CheckCircle2, DollarSign, History } from 'lucide-react';
import { afa } from '../services/api';
import AdminLayout from '../components/AdminLayout';

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

export default function AdminAfaSettings() {
  const [offer, setOffer] = useState(null);
  const [lockStatus, setLockStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [prices, setPrices] = useState({
    costPrice: 0,
    sellingPrice: 0,
    agentPrice: 0,
    vendorPrice: 0
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [offerRes, lockRes] = await Promise.all([
        afa.getOffer(),
        afa.getLockStatus()
      ]);

      if (offerRes.success) {
        setOffer(offerRes.afaOffer);
        setPrices({
          costPrice: offerRes.afaOffer.costPrice || 0,
          sellingPrice: offerRes.afaOffer.sellingPrice || 0,
          agentPrice: offerRes.afaOffer.agentPrice || 0,
          vendorPrice: offerRes.afaOffer.vendorPrice || 0
        });
      }
      
      if (lockRes.success) {
        setLockStatus(!lockRes.data.enabled); // enabled=true means unlocked
      }
    } catch (err) {
      console.error('Fetch AFA settings error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await afa.sync();
      if (res.success) {
        setOffer(res.afaOffer);
        setPrices({
          costPrice: res.afaOffer.costPrice || 0,
          sellingPrice: res.afaOffer.sellingPrice || 0,
          agentPrice: res.afaOffer.agentPrice || 0,
          vendorPrice: res.afaOffer.vendorPrice || 0
        });
        showMessage('success', 'AFA Registration status synced from Topza');
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to sync AFA status');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await afa.updatePrices(prices);
      if (res.success) {
        setOffer(res.afaOffer);
        showMessage('success', 'AFA prices updated successfully');
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to update prices');
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async () => {
    try {
      const newLockedStatus = !lockStatus;
      const res = await afa.updateLockStatus(!newLockedStatus); // !newLockedStatus means enabled
      if (res.success) {
        setLockStatus(newLockedStatus);
        showMessage('success', `AFA Registration ${newLockedStatus ? 'locked' : 'unlocked'} successfully`);
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to update lock status');
    }
  };

  const pageTheme = getColor(4); // Pink
  const syncColor = getColor(2); // Blue
  const lockColor = getColor(5); // Coral/Red
  const infoColor = getColor(6); // Sky
  const pricingColor = getColor(1); // Teal

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
    
    .afa-page-container {
      font-family: 'DM Sans', sans-serif;
      background-color: #ffffff;
      min-height: calc(100vh - 64px);
    }

    .afa-content {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .afa-header {
      background: linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%);
      border: 1.5px solid ${pageTheme.main}33;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 8px 40px ${pageTheme.glow};
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .afa-heading-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .afa-icon-box {
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

    .afa-h2 {
      font-size: 26px;
      font-weight: 800;
      color: #111;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .afa-card {
      background: #fff;
      border: 1.5px solid #e4e4de;
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.06);
    }

    .afa-card-title {
      font-size: 16px;
      font-weight: 800;
      color: #111;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .afa-input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .afa-label {
      font-size: 11px;
      font-weight: 800;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-left: 4px;
    }

    .afa-input-wrapper {
      position: relative;
    }

    .afa-input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #bbb;
      font-weight: 700;
    }

    .afa-input {
      width: 100%;
      padding: 12px 14px 12px 34px;
      background: #fafaf7;
      border: 1.5px solid #e0e0d8;
      border-radius: 10px;
      font-weight: 700;
      color: #111;
      font-size: 14px;
      transition: all 0.2s;
    }

    .afa-input:focus {
      border-color: ${pageTheme.main};
      box-shadow: 0 0 0 3px ${pageTheme.glow};
      background: #fff;
      outline: none;
    }

    .afa-btn-primary {
      background: #111;
      color: #fff;
      border-radius: 10px;
      padding: 12px 24px;
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

    .afa-btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .afa-btn-outline {
      background: #fff;
      color: #111;
      border: 1.5px solid #e4e4de;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .afa-btn-outline:hover:not(:disabled) {
      background: #fafaf7;
    }

    .afa-stat-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px;
      background: #fafaf7;
      border: 1.5px solid #e4e4de;
      border-radius: 12px;
    }

    .afa-stat-label {
      font-size: 11px;
      font-weight: 800;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .afa-stat-value {
      font-size: 13px;
      font-weight: 800;
      color: #111;
    }

    .afa-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .afa-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid ${pageTheme.soft};
      border-top-color: ${pageTheme.main};
      border-radius: 50%;
      animation: afa-spin 0.8s linear infinite;
    }

    @keyframes afa-spin {
      to { transform: rotate(360deg); }
    }
  `;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="afa-spinner"></div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading AFA Settings...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="afa-page-container">
        <style>{styles}</style>
        
        <div className="afa-content">
          {/* Header */}
          <div className="afa-header">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="afa-heading-row">
                <div className="afa-icon-box">
                  <Settings2 size={24} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: pageTheme.main }}>AFA Platform</span>
                  </div>
                  <h2 className="afa-h2">AFA Settings</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleLock}
                  className="afa-btn-outline"
                  style={{ 
                    borderColor: lockStatus ? lockColor.main + '66' : '#e4e4de', 
                    color: lockStatus ? lockColor.main : '#111',
                    background: lockStatus ? lockColor.soft : '#fff'
                  }}
                >
                  {lockStatus ? <Lock size={16} strokeWidth={2.5} /> : <Unlock size={16} strokeWidth={2.5} />}
                  <span>{lockStatus ? 'Sales Locked' : 'Sales Unlocked'}</span>
                </button>
                
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="afa-btn-primary"
                  style={{ background: syncColor.main, boxShadow: `0 4px 12px ${syncColor.glow}` }}
                >
                  <RefreshCw size={16} strokeWidth={2.5} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Syncing...' : 'Sync with Topza'}</span>
                </button>
              </div>
            </div>
          </div>

          {message.text && (
            <div style={{
              background: message.type === 'error' ? '#fff5f5' : '#ecfdf5',
              border: `1.5px solid ${message.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              color: message.type === 'error' ? '#b91c1c' : '#047857',
              borderRadius: '12px', padding: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700'
            }}>
              {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {message.text}
            </div>
          )}

          {!offer ? (
            <div className="afa-card" style={{ textAlign: 'center', padding: '60px 24px', background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div style={{ width: 64, height: 64, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#B45309' }}>
                <Info size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '8px' }}>Offer Not Initialized</h3>
              <p style={{ fontSize: '14px', color: '#666', maxWidth: '400px', margin: '0 auto 24px' }}>Click the sync button above to fetch the initial AFA offer and pricing details from the main platform.</p>
              <button 
                onClick={handleSync}
                className="afa-btn-primary"
                style={{ background: syncColor.main, margin: '0 auto' }}
              >
                Initialize Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Stats & Info */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="afa-card">
                  <h3 className="afa-card-title">
                    <div style={{ width: 28, height: 28, background: infoColor.soft, color: infoColor.main, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Info size={14} strokeWidth={2.5} />
                    </div>
                    Service Info
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <div className="afa-stat-item">
                      <span className="afa-stat-label">Platform Status</span>
                      <span className="afa-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #05966933' }}>Active</span>
                    </div>
                    
                    <div className="afa-stat-item">
                      <span className="afa-stat-label">Local Access</span>
                      <span className="afa-badge" style={{ 
                        background: lockStatus ? '#fff5f5' : '#ecfdf5', 
                        color: lockStatus ? '#b91c1c' : '#059669',
                        border: `1px solid ${lockStatus ? '#b91c1c' : '#059669'}33`
                      }}>
                        {lockStatus ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>

                    <div className="afa-stat-item">
                      <span className="afa-stat-label">Last Sync</span>
                      <span className="afa-stat-value">
                        {offer.lastSyncedAt ? new Date(offer.lastSyncedAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="afa-card" style={{ background: pageTheme.soft, borderColor: pageTheme.main + '33' }}>
                  <h3 className="afa-card-title" style={{ color: pageTheme.main }}>
                    <div style={{ width: 28, height: 28, background: '#fff', color: pageTheme.main, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${pageTheme.main}33` }}>
                      <AlertCircle size={14} strokeWidth={2.5} />
                    </div>
                    Pricing Note
                  </h3>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: pageTheme.main, lineHeight: '1.6', margin: 0 }}>
                    The **Cost Price** is the amount deducted from your system wallet. Set your markup accordingly to manage profitability across user roles.
                  </p>
                </div>
              </div>

              {/* Right Column: Pricing Form */}
              <div className="lg:col-span-2">
                <div className="afa-card">
                  <h3 className="afa-card-title">
                    <div style={{ width: 28, height: 28, background: pricingColor.soft, color: pricingColor.main, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={14} strokeWidth={2.5} />
                    </div>
                    Pricing Configuration
                  </h3>

                  <form onSubmit={handleUpdatePrices} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="afa-input-group">
                        <label className="afa-label">Cost Price (Provider)</label>
                        <div className="afa-input-wrapper">
                          <span className="afa-input-icon">₵</span>
                          <input
                            type="number"
                            step="0.01"
                            value={prices.costPrice}
                            onChange={(e) => setPrices({...prices, costPrice: parseFloat(e.target.value)})}
                            className="afa-input"
                          />
                        </div>
                      </div>

                      <div className="afa-input-group">
                        <label className="afa-label">User Selling Price</label>
                        <div className="afa-input-wrapper">
                          <span className="afa-input-icon">₵</span>
                          <input
                            type="number"
                            step="0.01"
                            value={prices.sellingPrice}
                            onChange={(e) => setPrices({...prices, sellingPrice: parseFloat(e.target.value)})}
                            className="afa-input"
                          />
                        </div>
                      </div>

                      <div className="afa-input-group">
                        <label className="afa-label">Agent Base Price</label>
                        <div className="afa-input-wrapper">
                          <span className="afa-input-icon">₵</span>
                          <input
                            type="number"
                            step="0.01"
                            value={prices.agentPrice}
                            onChange={(e) => setPrices({...prices, agentPrice: parseFloat(e.target.value)})}
                            className="afa-input"
                          />
                        </div>
                      </div>

                      <div className="afa-input-group">
                        <label className="afa-label">Vendor Base Price</label>
                        <div className="afa-input-wrapper">
                          <span className="afa-input-icon">₵</span>
                          <input
                            type="number"
                            step="0.01"
                            value={prices.vendorPrice}
                            onChange={(e) => setPrices({...prices, vendorPrice: parseFloat(e.target.value)})}
                            className="afa-input"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-top border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="afa-btn-primary"
                        style={{ background: pageTheme.main, boxShadow: `0 8px 20px ${pageTheme.glow}`, padding: '14px 40px' }}
                      >
                        {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} strokeWidth={2.5} />}
                        {saving ? 'Saving...' : 'Update AFA Pricing'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
