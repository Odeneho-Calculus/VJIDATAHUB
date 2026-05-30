import { useState, useEffect, useCallback } from 'react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import {
  Search,
  Settings,
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Gift
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';
import { ReferralSettingsModal } from '../components/AdminReferralModals';

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
const pageTheme = getColor(4); // pink — matches sidebar Referral Program nav colour

export default function AdminReferrals() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    amountPerReferral: 1,
    description: 'Earn GHS per successful referral',
    isEnabled: true
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [referralsRes, settingsRes] = await Promise.all([
        adminAPI.getAllReferrals(),
        adminAPI.getReferralSettings(),
      ]);

      if (referralsRes.success) {
        setReferrals(referralsRes.data);
      }

      if (settingsRes.success) {
        setSettingsForm(settingsRes.data);
      }

      const totalEarnings = referralsRes.data
        .filter(r => r.status === 'paid')
        .reduce((acc, curr) => acc + curr.amount, 0);

      setStats({
        totalReferrals: referralsRes.data.length,
        pendingReferrals: referralsRes.data.filter(r => r.status === 'pending').length,
        paidEarnings: totalEarnings,
        activeReferrers: new Set(referralsRes.data.map(r => r.referrer?._id)).size
      });

    } catch (err) {
      setError(err?.message || 'Failed to fetch referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (id, status) => {
    try {
      setUpdateLoading(true);
      const res = await adminAPI.updateReferralStatus(id, status);
      if (res.success) {
        setSuccess(`Referral marked as ${status}`);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setUpdateLoading(true);
      await adminAPI.updateReferralSettings(settingsForm);
      setShowSettingsModal(false);
      setSuccess('Settings updated successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(ref =>
    ref.referrer?.name.toLowerCase().includes(search.toLowerCase()) ||
    ref.referredUser?.name.toLowerCase().includes(search.toLowerCase()) ||
    ref.referrer?.email.toLowerCase().includes(search.toLowerCase()) ||
    ref.referrer?.phone?.toLowerCase().includes(search.toLowerCase()) ||
    ref.referredUser?.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const statItems = [
    { label: 'Total Referrals', value: stats?.totalReferrals || 0, icon: Users, color: getColor(0) },
    { label: 'Pending', value: stats?.pendingReferrals || 0, icon: Clock, color: getColor(3) },
    { label: 'Total Paid', value: `GHS ${formatNumberAbbreviated(stats?.paidEarnings) || '0'}`, icon: DollarSign, color: getColor(1) },
    { label: 'Active Referrers', value: stats?.activeReferrers || 0, icon: Award, color: getColor(2) },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

        .ref-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ref-scrollable { flex: 1; overflow-y: auto; padding: 24px 16px; }
        .ref-max-width { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }

        .ref-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.06);
          padding: 24px;
          transition: all 0.2s;
        }

        .ref-header { display: flex; align-items: center; gap: 16px; }
        .ref-icon-box {
          width: 46px; height: 46px; background: ${pageTheme.main}; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; color: #fff;
          box-shadow: 0 8px 20px ${pageTheme.glow}; flex-shrink: 0;
        }
        .ref-title { font-size: 26px; font-weight: 800; color: #111; margin: 0; letter-spacing: -0.02em; }
        .ref-subtitle { font-size: 14px; color: #666; margin: 4px 0 0 0; }

        .ref-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 1024px) { .ref-stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }

        .ref-stat-card {
          background: var(--stat-bg, #fff);
          border: 1.5px solid var(--stat-border, #e4e4de);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.2s;
        }
        .ref-stat-card:hover {
          border-color: var(--stat-color, #d4d4ce);
          box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
        }
        .ref-stat-label { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
        .ref-stat-value { font-size: 20px; font-weight: 800; color: #111; }

        .ref-input {
          width: 100%; background: #fafaf7; border: 1.5px solid #e0e0d8; border-radius: 12px;
          padding: 12px 14px 12px 40px; font-size: 14px; color: #111; transition: all 0.2s;
          box-sizing: border-box; font-weight: 600;
        }
        .ref-input:focus {
          outline: none; border-color: ${pageTheme.main}; box-shadow: 0 0 0 4px ${pageTheme.glow}; background: #fff;
        }

        .ref-btn-primary {
          background: ${pageTheme.main}; color: #fff; border: none; border-radius: 8px;
          padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; gap: 8px;
          box-shadow: 0 4px 12px ${pageTheme.glow};
        }
        .ref-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

        .ref-btn-icon {
          width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          border: 1.5px solid #e4e4de; background: #fff; color: ${pageTheme.main}; cursor: pointer; transition: all 0.2s;
        }
        .ref-btn-icon:hover { border-color: ${pageTheme.main}; background: ${pageTheme.soft}; }

        .ref-table { width: 100%; border-collapse: collapse; text-align: left; }
        .ref-table th {
          padding: 14px 16px; background: #fafaf7; border-bottom: 1.5px solid #e4e4de;
          font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .ref-table td { padding: 16px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #111; }
        .ref-table tr { transition: all 0.2s; }
        .ref-table tr:hover { background: #fafaf7; }

        .ref-badge {
          padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 900;
          text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;
        }

        .ref-alert-error {
          background: #fff5f5; border: 1.5px solid #fecaca; color: #b91c1c;
          border-radius: 7px; padding: 12px 16px; margin-bottom: 16px;
          display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600;
        }
        .ref-alert-success {
          background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #15803d;
          border-radius: 7px; padding: 12px 16px; margin-bottom: 16px;
          display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600;
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="ref-container">
        <div className="ref-scrollable">
          <div className="ref-max-width">

            {/* Header */}
            <div className="ref-card !p-5" style={{ background: `linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%)`, borderColor: `${pageTheme.main}33`, boxShadow: `0 8px 40px ${pageTheme.glow}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div className="ref-header">
                  <div className="ref-icon-box">
                    <Gift size={22} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: pageTheme.main }}>Management Center</span>
                    </div>
                    <h1 className="ref-title">Referral Management</h1>
                    <p className="ref-subtitle">Track and manage your platform's referral program</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="ref-btn-primary"
                >
                  <Settings size={16} />
                  Settings
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="ref-stats-grid">
              {statItems.map((stat, i) => (
                <div
                  key={i}
                  className="ref-stat-card"
                  style={{
                    '--stat-color': stat.color.main + '66',
                    '--stat-glow': stat.color.glow,
                    '--stat-bg': stat.color.soft,
                    '--stat-border': stat.color.main + '33',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="ref-stat-label" style={{ color: stat.color.main }}>{stat.label}</p>
                      <p className="ref-stat-value">{stat.value}</p>
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: stat.color.soft, color: stat.color.main,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 2px 8px ${stat.color.glow}`,
                    }}>
                      <stat.icon size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {success && (
              <div className="ref-alert-success">
                <CheckCircle size={18} />
                {success}
              </div>
            )}
            {error && (
              <div className="ref-alert-error">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* List */}
            <div className="ref-card" style={{ padding: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1.5px solid #e4e4de', background: '#fafaf7', borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', sm: { flexDirection: 'row' }, justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: pageTheme.soft, color: pageTheme.main,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Database size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#111' }}>Referral Records</h2>
                      <p style={{ margin: 0, fontSize: '11px', color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{filteredReferrals.length} matching entries</p>
                    </div>
                  </div>
                  <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
                    <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} size={16} />
                    <input
                      type="text"
                      placeholder="Search referrers or referred users..."
                      className="ref-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="ref-table">
                  <thead>
                    <tr>
                      <th>Referrer</th>
                      <th>Referred User</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '48px', textAlign: 'center' }}>
                          <div style={{ width: '32px', height: '32px', border: `3px solid ${pageTheme.soft}`, borderTopColor: pageTheme.main, borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
                        </td>
                      </tr>
                    ) : filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#999' }}>
                          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fafaf7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1.5px dashed #e4e4de' }}>
                            <Database size={32} style={{ color: '#e4e4de' }} />
                          </div>
                          <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>No referrals found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((ref, idx) => {
                        const c = getColor(idx);
                        return (
                          <tr key={ref._id}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: 8,
                                  background: c.soft, color: c.main,
                                  border: `1.5px solid ${c.main}22`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: `0 2px 8px ${c.glow}`,
                                  fontSize: '12px', fontWeight: 800,
                                }}>
                                  {ref.referrer?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#111' }}>{ref.referrer?.name}</div>
                                  <div style={{ fontSize: '11px', color: '#999', fontWeight: 600 }}>{ref.referrer?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 700, color: '#111' }}>{ref.referredUser?.name}</div>
                              <div style={{ fontSize: '11px', color: '#999', fontWeight: 600 }}>{ref.referredUser?.email}</div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 800, color: c.main }}>GHS {formatNumberAbbreviated(ref.amount)}</span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span className="ref-badge" style={{
                                background: ref.status === 'paid' ? '#f0fdf4' : ref.status === 'approved' ? '#eff6ff' : ref.status === 'rejected' ? '#fef2f2' : '#fffbeb',
                                color: ref.status === 'paid' ? '#166534' : ref.status === 'approved' ? '#1e40af' : ref.status === 'rejected' ? '#991b1b' : '#92400e',
                                border: `1px solid ${ref.status === 'paid' ? '#d1fae5' : ref.status === 'approved' ? '#dbeafe' : ref.status === 'rejected' ? '#fee2e2' : '#fef3c7'}`,
                              }}>
                                {ref.status}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{new Date(ref.createdAt).toLocaleDateString()}</span>
                                <span style={{ fontSize: '10px', color: '#999', fontWeight: 600 }}>{new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                {ref.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(ref._id, 'approved')}
                                      className="ref-btn-icon"
                                      title="Approve"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(ref._id, 'rejected')}
                                      className="ref-btn-icon"
                                      title="Reject"
                                      style={{ color: '#DC2626' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.background = '#FFF5F5'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e4e4de'; e.currentTarget.style.background = '#fff'; }}
                                    >
                                      <XCircle size={16} />
                                    </button>
                                  </>
                                )}
                                {(ref.status === 'approved' || ref.status === 'pending') && (
                                  <button
                                    onClick={() => handleUpdateStatus(ref._id, 'paid')}
                                    className="ref-btn-icon"
                                    title="Mark as Paid"
                                    style={{ color: '#059669' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#f0fdf4'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e4e4de'; e.currentTarget.style.background = '#fff'; }}
                                  >
                                    <DollarSign size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReferralSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        onSave={handleUpdateSettings}
        loading={updateLoading}
        themeColor={pageTheme}
      />
    </div>
  );
}
