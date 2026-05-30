import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Save,
  Phone,
  Mail,
  MessageCircle,
  Users,
  Globe,
  Clock3,
  Settings2,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Modal from '../components/Modal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

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
const pageTheme = getColor(0); // purple — matches sidebar Platform Settings nav colour

export default function AdminPlatformSettings() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('contact');
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    whatsapp: '',
    whatsappGroup: '',
    email: '',
    duplicateOrderCooldownMinutes: 10,
    statusUpdateMethod: 'cron',
    dataPurchaseChargeType: 'fixed',
    dataPurchaseCharge: 0,
    walletFundingChargeType: 'fixed',
    walletFundingCharge: 0,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchWebhookLogs();
    }
  }, [activeTab]);

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemSettings();
      const cd = response?.settings?.contactDetails || {};
      setFormData({
        phone: cd.phone || '',
        whatsapp: cd.whatsapp || '',
        whatsappGroup: cd.whatsappGroup || '',
        email: cd.email || '',
        duplicateOrderCooldownMinutes: response?.settings?.orderSettings?.duplicateOrderCooldownMinutes || 10,
        statusUpdateMethod: response?.settings?.orderSettings?.statusUpdateMethod || 'cron',
        dataPurchaseChargeType: response?.settings?.transactionCharges?.dataPurchaseChargeType || 'fixed',
        dataPurchaseCharge: response?.settings?.transactionCharges?.dataPurchaseCharge ?? 0,
        walletFundingChargeType: response?.settings?.transactionCharges?.walletFundingChargeType || 'fixed',
        walletFundingCharge: response?.settings?.transactionCharges?.walletFundingCharge ?? 0,
      });
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminAPI.updateSystemSettings({
        contactDetails: {
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          whatsappGroup: formData.whatsappGroup,
          email: formData.email,
        },
        orderSettings: {
          duplicateOrderCooldownMinutes: Number(formData.duplicateOrderCooldownMinutes) || 10,
          statusUpdateMethod: formData.statusUpdateMethod || 'cron',
        },
        transactionCharges: {
          dataPurchaseChargeType: formData.dataPurchaseChargeType || 'fixed',
          dataPurchaseCharge: Number(formData.dataPurchaseCharge) || 0,
          walletFundingChargeType: formData.walletFundingChargeType || 'fixed',
          walletFundingCharge: Number(formData.walletFundingCharge) || 0,
        },
      });
      showMessage('Platform settings saved successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to save platform settings', true);
    } finally {
      setSaving(false);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await adminAPI.getTopzaWebhookLogs(1, 20);
      if (response.success) {
        setWebhookLogs(Array.isArray(response.logs) ? response.logs : []);
      } else {
        setWebhookLogs([]);
      }
    } catch {
      setWebhookLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenLogDetails = (log) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };

  const tabItems = [
    { key: 'contact', label: 'Contact', icon: Phone },
    { key: 'orders', label: 'Orders', icon: Settings2 },
    { key: 'charges', label: 'Charges', icon: Clock3 },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

        .settings-main {
          flex: 1;
          min-width: 0;
          padding: 24px 16px;
        }

        .settings-max-width {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          padding: 24px;
        }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }

        .settings-icon-box {
          width: 46px;
          height: 46px;
          background: ${pageTheme.main};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 8px 20px ${pageTheme.glow};
        }

        .settings-title {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
        }

        .settings-subtitle {
          font-size: 14px;
          color: #000;
          margin: 4px 0 0 0;
        }

        .settings-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background: #fafaf7;
          padding: 8px;
          border-radius: 14px;
          border: 1.5px solid #e4e4de;
        }

        .settings-tab-btn {
          padding: 12px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .settings-tab-btn.active {
          background: ${pageTheme.main};
          color: #fff;
          box-shadow: 0 4px 12px ${pageTheme.glow};
        }

        .settings-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #333;
          letter-spacing: 0.02em;
          margin-bottom: 8px;
        }

        .settings-input {
          width: 100%;
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px;
          font-size: 14px;
          color: #111;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .settings-input:focus {
          outline: none;
          border-color: ${pageTheme.main};
          box-shadow: 0 0 0 3px ${pageTheme.glow};
          background: #fff;
        }

        .settings-hint {
          font-size: 11.5px;
          font-weight: 600;
          color: #bbb;
          margin-top: 6px;
        }

        .settings-btn-primary {
          background: ${pageTheme.main};
          color: #fff;
          border: none;
          border-radius: 7px;
          padding: 13px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          box-shadow: 0 4px 12px ${pageTheme.glow};
        }

        .settings-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .settings-error-box {
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

        .settings-success-box {
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

        .settings-table-wrapper {
          overflow-x: auto;
          margin-top: 16px;
          border: 1.5px solid #e4e4de;
          border-radius: 7px;
        }

        .settings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .settings-table th {
          padding: 12px;
          background: #fafaf7;
          border-bottom: 1.5px solid #e4e4de;
          font-weight: 700;
          text-align: left;
        }

        .settings-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .settings-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: settings-spin 0.8s linear infinite;
        }

        @keyframes settings-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="settings-main">
        <div className="settings-max-width">

          <div className="settings-card" style={{ background: `linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%)`, borderColor: `${pageTheme.main}33`, boxShadow: `0 8px 40px ${pageTheme.glow}` }}>
            <div className="settings-header">
              <div className="settings-icon-box">
                <Globe size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: pageTheme.main }}>Management Center</span>
                </div>
                <h1 className="settings-title">Platform Settings</h1>
                <p className="settings-subtitle">Manage public contact details and order configurations</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="settings-error-box">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="settings-success-box">
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
              <div style={{ width: '32px', height: '32px', border: `3px solid ${pageTheme.soft}`, borderTopColor: pageTheme.main, borderRadius: '50%', animation: 'settings-spin 0.8s linear infinite' }}></div>
            </div>
          ) : (
            <>
              <div className="settings-tabs">
                {tabItems.map((tab) => (
                  <button
                    key={tab.key}
                    className={`settings-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <tab.icon size={15} /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="settings-card">
                {activeTab === 'contact' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="settings-label">Phone Number</label>
                      <input
                        type="tel"
                        className="settings-input"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/[^\d+]/g, '') }))}
                        placeholder="+233..."
                      />
                      <p className="settings-hint">Used for "Call" button. Include country code.</p>
                    </div>

                    <div>
                      <label className="settings-label">WhatsApp Number</label>
                      <input
                        type="tel"
                        className="settings-input"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                        placeholder="233..."
                      />
                      <p className="settings-hint">Used for "WhatsApp" button. No + or spaces.</p>
                    </div>

                    <div>
                      <label className="settings-label">WhatsApp Community Link</label>
                      <input
                        type="url"
                        className="settings-input"
                        name="whatsappGroup"
                        value={formData.whatsappGroup}
                        onChange={handleChange}
                        placeholder="https://chat.whatsapp.com/..."
                      />
                    </div>

                    <div>
                      <label className="settings-label">Support Email</label>
                      <input
                        type="email"
                        className="settings-input"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="support@example.com"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="settings-label">Status Update Method</label>
                      <select name="statusUpdateMethod" value={formData.statusUpdateMethod} onChange={handleChange} className="settings-input">
                        <option value="cron">Cron (Every 5 Minutes)</option>
                        <option value="webhook">Webhook (Real-time Push)</option>
                      </select>
                      <p className="settings-hint">Cron polls every 5 mins. Webhook updates in real-time.</p>
                    </div>

                    <div>
                      <label className="settings-label">Duplicate Order Cooldown (Minutes)</label>
                      <input type="number" name="duplicateOrderCooldownMinutes" value={formData.duplicateOrderCooldownMinutes} onChange={handleChange} className="settings-input" min="1" max="1440" />
                    </div>

                    <div style={{ border: '1.5px solid #e4e4de', borderRadius: '14px', overflow: 'hidden', marginTop: '12px' }}>
                      <div style={{ padding: '12px 16px', background: '#fafaf7', borderBottom: '1.5px solid #e4e4de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>Webhook Monitor</h3>
                        <button className="settings-tab-btn" style={{ padding: '6px 12px' }} onClick={fetchWebhookLogs}>
                          <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} /> Refresh
                        </button>
                      </div>
                      <div style={{ padding: '16px' }}>
                        {logsLoading ? <p className="settings-hint">Loading logs...</p> : (
                          <div className="settings-table-wrapper" style={{ border: 'none', marginTop: 0 }}>
                            <table className="settings-table">
                              <thead>
                                <tr>
                                  <th>Time</th>
                                  <th>Event</th>
                                  <th>Result</th>
                                  <th>Order</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {webhookLogs.slice(0, 5).map((log, idx) => {
                                  const c = getColor(idx);
                                  return (
                                    <tr key={log._id}>
                                      <td>{new Date(log.createdAt || log.receivedAt).toLocaleTimeString()}</td>
                                      <td style={{ fontWeight: 700, color: c.main }}>{log.event}</td>
                                      <td>
                                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: log.handled ? '#f0fdf4' : '#f8fafc', color: log.handled ? '#166534' : '#666', fontWeight: 700, fontSize: '10px' }}>
                                          {log.handled ? 'OK' : 'SKIP'}
                                        </span>
                                      </td>
                                      <td>{log.matchedOrderNumber || 'N/A'}</td>
                                      <td><button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: c.main }} onClick={() => handleOpenLogDetails(log)}><Eye size={12} /></button></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'charges' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="settings-label">Data Purchase Charge</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                        <select name="dataPurchaseChargeType" value={formData.dataPurchaseChargeType} onChange={handleChange} className="settings-input">
                          <option value="fixed">Fixed (GHS)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                        <input type="number" name="dataPurchaseCharge" value={formData.dataPurchaseCharge} onChange={handleChange} className="settings-input" step="0.01" />
                      </div>
                    </div>

                    <div>
                      <label className="settings-label">Wallet Funding Charge</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                        <select name="walletFundingChargeType" value={formData.walletFundingChargeType} onChange={handleChange} className="settings-input">
                          <option value="fixed">Fixed (GHS)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                        <input type="number" name="walletFundingCharge" value={formData.walletFundingCharge} onChange={handleChange} className="settings-input" step="0.01" />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '24px' }}>
                  <button className="settings-btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
                    {saving ? <div className="settings-spinner" /> : <Save size={16} />}
                    {saving ? 'Saving Changes...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Webhook Log Details" themeColor={pageTheme}>
        {selectedLog && (
          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="settings-card" style={{ padding: '12px', boxShadow: 'none' }}>
                <p className="settings-label" style={{ marginBottom: '4px' }}>Event</p>
                <p style={{ margin: 0, fontWeight: 700, color: pageTheme.main }}>{selectedLog.event}</p>
              </div>
              <div className="settings-card" style={{ padding: '12px', boxShadow: 'none' }}>
                <p className="settings-label" style={{ marginBottom: '4px' }}>Status</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{selectedLog.handled ? 'Processed' : 'Ignored'}</p>
              </div>
            </div>
            <div className="settings-card" style={{ padding: '12px', boxShadow: 'none' }}>
              <p className="settings-label" style={{ marginBottom: '4px' }}>Payload</p>
              <pre style={{ margin: 0, background: '#111', color: '#fff', padding: '12px', borderRadius: '7px', overflowX: 'auto' }}>
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
