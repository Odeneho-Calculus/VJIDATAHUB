import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Save, Settings2, HandCoins, UserPlus } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
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
const pageTheme = getColor(3); // amber — matches sidebar Agent Settings nav colour

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  .agent-wrapper {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .agent-container {
    background-color: #ffffff;
    min-height: 100vh;
  }

  .agent-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .agent-header {
    background: linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%);
    border: 1.5px solid ${pageTheme.main}33;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px ${pageTheme.glow};
    margin-bottom: 32px;
  }

  .agent-title {
    font-size: 32px;
    font-weight: 800;
    color: #111;
    margin-bottom: 8px;
    line-height: 1.2;
  }

  .agent-subtitle {
    font-size: 14px;
    color: #000;
    line-height: 1.5;
  }

  .agent-error-box {
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

  .agent-error-box svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .agent-success-box {
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

  .agent-success-box svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }

  .agent-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  @media (min-width: 1024px) {
    .agent-stat-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .agent-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s ease;
  }

  .agent-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .agent-stat-icon-box {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .agent-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .agent-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .agent-form-card {
    background-color: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.10);
  }

  .agent-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .agent-form-group {
    display: flex;
    flex-direction: column;
  }

  .agent-label {
    font-size: 12.5px;
    font-weight: 700;
    color: #333;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
  }

  .agent-input,
  .agent-select {
    background-color: #fafaf7;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    padding: 11px 14px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #111;
    transition: all 0.2s ease;
  }

  .agent-input:focus,
  .agent-select:focus {
    outline: none;
    border-color: ${pageTheme.main};
    background-color: #fff;
    box-shadow: 0 0 0 3px ${pageTheme.glow};
  }

  .agent-toggle-group {
    background-color: #fafaf7;
    border: 1.5px solid #e4e4de;
    border-radius: 7px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    grid-column: span 1;
  }

  .agent-toggle-content {
    flex: 1;
  }

  .agent-toggle-label {
    font-size: 12.5px;
    font-weight: 700;
    color: #111;
    letter-spacing: 0.02em;
    display: block;
    margin-bottom: 4px;
  }

  .agent-toggle-desc {
    font-size: 11.5px;
    color: #000;
  }

  .agent-toggle-switch {
    width: 56px;
    height: 28px;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    background-color: #ddd;
  }

  .agent-toggle-switch.active {
    background-color: ${pageTheme.main};
  }

  .agent-toggle-dot {
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: #fff;
    border-radius: 10px;
    top: 4px;
    transition: all 0.2s ease;
  }

  .agent-toggle-dot.active {
    right: 4px;
  }

  .agent-toggle-dot:not(.active) {
    left: 4px;
  }

  .agent-button-container {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .agent-button-save {
    background-color: ${pageTheme.main};
    color: #fff;
    border: none;
    border-radius: 7px;
    padding: 13px 20px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 12px ${pageTheme.glow};
  }

  .agent-button-save:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .agent-button-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .agent-spinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .agent-content {
      padding: 16px 12px;
    }

    .agent-title {
      font-size: 24px;
    }

    .agent-stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .agent-form-grid {
      grid-template-columns: 1fr;
    }

    .agent-toggle-group {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

export default function AdminAgentSettings() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    registrationFee: 0,
    minWithdrawal: 0,
    maxWithdrawal: 0,
    withdrawalFeeType: 'fixed',
    withdrawalFeeValue: 0,
    recruitNewAgents: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

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
      const settings = response?.settings || {};

      setFormData({
        registrationFee: Number(settings?.agentFeeSettings?.registrationFee || 0),
        minWithdrawal: Number(settings?.commissionSettings?.minWithdrawal || 0),
        maxWithdrawal: Number(settings?.commissionSettings?.maxWithdrawal || 0),
        withdrawalFeeType: settings?.commissionSettings?.withdrawalFeeType || 'fixed',
        withdrawalFeeValue: Number(settings?.commissionSettings?.withdrawalFeeValue || 0),
        recruitNewAgents: settings?.recruitNewAgents !== false,
      });
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load agent settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      agentFeeSettings: {
        registrationFee: Number(formData.registrationFee || 0),
      },
      commissionSettings: {
        minWithdrawal: Number(formData.minWithdrawal || 0),
        maxWithdrawal: Number(formData.maxWithdrawal || 0),
        withdrawalFeeType: formData.withdrawalFeeType,
        withdrawalFeeValue: Number(formData.withdrawalFeeValue || 0),
      },
      recruitNewAgents: !!formData.recruitNewAgents,
    };

    try {
      setSaving(true);
      await adminAPI.updateSystemSettings(payload);
      showMessage('Agent settings updated successfully');
      await fetchSettings();
    } catch (err) {
      showMessage(err?.message || 'Failed to update agent settings', true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh' }}>
        <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: `2.5px solid ${pageTheme.soft}`, borderTopColor: pageTheme.main, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#000', fontSize: '14px' }}>Loading agent settings...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { title: 'Registration Fee', value: formatCurrencyAbbreviated(formData.registrationFee || 0), icon: Settings2, color: getColor(0) },
    { title: 'Withdrawal Fee Mode', value: String(formData.withdrawalFeeType).charAt(0).toUpperCase() + String(formData.withdrawalFeeType).slice(1), icon: HandCoins, color: getColor(1) },
    { title: 'Withdrawal Fee Value', value: formData.withdrawalFeeType === 'percentage' ? `${Number(formData.withdrawalFeeValue || 0)}%` : formatCurrencyAbbreviated(Number(formData.withdrawalFeeValue || 0)), icon: Save, color: getColor(2) },
    { title: 'Recruitment Status', value: formData.recruitNewAgents ? 'Enabled' : 'Disabled', icon: UserPlus, color: getColor(3) },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }} className="agent-wrapper">
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto' }} className="agent-container">
          <div className="agent-content">
            <div className="agent-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 8,
                  background: pageTheme.main, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 8px 20px ${pageTheme.glow}`,
                }}>
                  <Settings2 size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: pageTheme.main }}>Management Center</span>
                  </div>
                  <h1 className="agent-title" style={{ margin: 0 }}>Agent Settings</h1>
                </div>
              </div>
              <p className="agent-subtitle">Configure registration fee, withdrawal fee model, and agent payout limits</p>
            </div>

            {error && (
              <div className="agent-error-box">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="agent-success-box">
                <CheckCircle size={18} />
                {success}
              </div>
            )}

            <div className="agent-stat-grid">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="agent-stat-card"
                  style={{
                    '--stat-color': stat.color.main + '66',
                    '--stat-glow': stat.color.glow,
                    '--stat-bg': stat.color.soft,
                    '--stat-border': stat.color.main + '33',
                  }}
                >
                  <div className="agent-stat-icon-box" style={{ background: stat.color.soft, color: stat.color.main, boxShadow: `0 2px 8px ${stat.color.glow}` }}>
                    <stat.icon size={18} />
                  </div>
                  <p className="agent-stat-label" style={{ color: stat.color.main }}>{stat.title}</p>
                  <p className="agent-stat-value">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="agent-form-card">
              <div className="agent-form-grid">
                <div className="agent-form-group">
                  <label className="agent-label">Agent Registration Fee (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.registrationFee}
                    onChange={(e) => setFormData((prev) => ({ ...prev, registrationFee: e.target.value }))}
                    className="agent-input"
                  />
                </div>

                <div className="agent-form-group">
                  <label className="agent-label">Withdrawal Fee Type</label>
                  <select
                    value={formData.withdrawalFeeType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, withdrawalFeeType: e.target.value }))}
                    className="agent-select"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div className="agent-form-group">
                  <label className="agent-label">
                    Withdrawal Fee Value ({formData.withdrawalFeeType === 'percentage' ? '%' : 'GHS'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.withdrawalFeeValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, withdrawalFeeValue: e.target.value }))}
                    className="agent-input"
                  />
                </div>

                <div className="agent-form-group">
                  <label className="agent-label">Minimum Withdrawal (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minWithdrawal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minWithdrawal: e.target.value }))}
                    className="agent-input"
                  />
                </div>

                <div className="agent-form-group">
                  <label className="agent-label">Maximum Withdrawal (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxWithdrawal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxWithdrawal: e.target.value }))}
                    className="agent-input"
                  />
                </div>

                <div className="agent-toggle-group">
                  <div className="agent-toggle-content">
                    <label className="agent-toggle-label">Recruit New Agents</label>
                    <p className="agent-toggle-desc">If disabled, new agent registration forms will be locked.</p>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, recruitNewAgents: !prev.recruitNewAgents }))}
                    className={`agent-toggle-switch ${formData.recruitNewAgents ? 'active' : ''}`}
                  >
                    <div className={`agent-toggle-dot ${formData.recruitNewAgents ? 'active' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="agent-button-container">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="agent-button-save"
                >
                  {saving ? (
                    <>
                      <div className="agent-spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Agent Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
