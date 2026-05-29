import { useState, useEffect, useCallback } from 'react';
import { User, Phone, IdCard, MapPin, Calendar, Briefcase, Info, AlertCircle, CheckCircle2, History, RefreshCw, Send, Wallet, Loader2 } from 'lucide-react';
import { afa } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import UserLayout from '../components/UserLayout';
import AgentLayout from '../components/AgentLayout';
import { formatCurrency } from '../utils/formatCurrency';

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

const formFields = [
  { name: 'name', label: 'Full Name (As on ID)', icon: User, placeholder: 'John Doe', color: getColor(0) },
  { name: 'phoneNumber', label: 'MTN Phone Number', icon: Phone, placeholder: '0240000000', color: getColor(1) },
  { name: 'idNumber', label: 'Ghana Card ID', icon: IdCard, placeholder: 'GHA-000000000-0', color: getColor(2) },
  { name: 'occupation', label: 'Occupation', icon: Briefcase, placeholder: 'Farmer or Trader', color: getColor(3) },
  { name: 'location', label: 'Location / City', icon: MapPin, placeholder: 'Accra', color: getColor(4) },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
    min-height: 100vh;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
    border: 1.5px solid #FDE68A;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(180,83,9,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .dash-header {
      padding: 24px;
    }
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .dash-icon-box {
    width: 40px;
    height: 40px;
    background: #B45309;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(180,83,9,0.25);
  }

  .dash-h2 {
    font-size: 18px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (min-width: 768px) {
    .dash-h2 {
      font-size: 26px;
    }
    .dash-icon-box {
      width: 46px;
      height: 46px;
    }
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  .dash-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
    background: #111;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .dash-btn-outline {
    background: #fff;
    color: #111;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: 1.5px solid #e4e4de;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    background: #fafaf7;
    border-color: #d4d4ce;
  }
`;

export default function AfaRegistration() {
  const { user, updateBalance } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [lockStatus, setLockStatus] = useState({ enabled: false, message: '', registrationFee: 0 });
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    idNumber: '',
    occupation: '',
    location: '',
    region: '',
    dateOfBirth: ''
  });

  const Layout = user?.role === 'agent' ? AgentLayout : UserLayout;

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await afa.getLockStatus();
      if (res.success) {
        setLockStatus(res.data);
      }

      setHistoryLoading(true);
      const historyRes = await afa.getMyRegistrations();
      if (historyRes.success) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      console.error('Fetch AFA data error:', err);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    for (const key in formData) {
      if (!formData[key]) {
        showMessage('error', `Please fill in your ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return;
      }
    }

    if (!formData.phoneNumber.match(/^0(24|54|55|59|53|25)\d{7}$/)) {
        showMessage('error', 'Please enter a valid MTN Ghana phone number');
        return;
    }

    if (user.balance < lockStatus.registrationFee) {
        showMessage('error', 'Insufficient wallet balance');
        return;
    }

    try {
      setRegistering(true);
      const res = await afa.register(formData);
      if (res.success) {
        showMessage('success', 'AFA Registration submitted successfully!');
        setFormData({
          name: '',
          phoneNumber: '',
          idNumber: '',
          occupation: '',
          location: '',
          region: '',
          dateOfBirth: ''
        });

        // Update balance
        if (updateBalance) {
          updateBalance(user.balance - lockStatus.registrationFee);
        }

        // Refresh history
        const historyRes = await afa.getMyRegistrations();
        if (historyRes.success) {
          setHistory(historyRes.data);
        }
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to submit registration');
    } finally {
      setRegistering(false);
    }
  };

  const pageTheme = getColor(3); // Amber
  const walletColor = getColor(1); // Teal
  const historyColor = getColor(2); // Blue
  const feeColor = getColor(5); // Sky/Lime
  const submitColor = getColor(3); // Amber

  return (
    <Layout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>

        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header !p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-11 !h-11" style={{ background: pageTheme.main, boxShadow: `0 8px 20px ${pageTheme.glow}` }}>
                  <Briefcase size={22} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: pageTheme.main }}>MTN Center</span>
                  </div>
                  <h2 className="dash-h2 !text-lg sm:!text-2xl">AFA Registration</h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex px-4 py-2 rounded-xl flex-col items-end" style={{ background: feeColor.soft, border: `1.5px solid ${feeColor.main}33` }}>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: feeColor.main }}>Reg Fee</span>
                  <span className="text-sm font-black text-[#111]">{formatCurrency(lockStatus.registrationFee)}</span>
                </div>
                <button
                  onClick={fetchData}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#fafaf7] border-1.5 border-[#e4e4de] text-slate-400 hover:text-[#111] transition-all"
                  title="Refresh Data"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="dash-stat-card" style={{ '--stat-color': historyColor.main + '66', '--stat-glow': historyColor.glow, '--stat-bg': historyColor.soft, '--stat-border': historyColor.main + '33' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="dash-stat-label" style={{ color: historyColor.main }}>Registrations</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: historyColor.soft, color: historyColor.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${historyColor.glow}` }}>
                  <History size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div className="dash-stat-value">{history.length}</div>
              <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} style={{ color: historyColor.main }} /> Completed Tasks
              </div>
            </div>

            <div className="dash-stat-card" style={{ '--stat-color': walletColor.main + '66', '--stat-glow': walletColor.glow, '--stat-bg': walletColor.soft, '--stat-border': walletColor.main + '33' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="dash-stat-label" style={{ color: walletColor.main }}>Wallet Balance</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: walletColor.soft, color: walletColor.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${walletColor.glow}` }}>
                  <Wallet size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div className="dash-stat-value">{formatCurrency(Number(user?.balance || 0))}</div>
              <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} style={{ color: walletColor.main }} /> Ready for Reg
              </div>
            </div>

            <div className="dash-stat-card" style={{ '--stat-color': pageTheme.main + '66', '--stat-glow': pageTheme.glow, '--stat-bg': pageTheme.soft, '--stat-border': pageTheme.main + '33' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="dash-stat-label" style={{ color: pageTheme.main }}>Status</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: pageTheme.soft, color: pageTheme.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${pageTheme.glow}` }}>
                  <Info size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div className="dash-stat-value !text-base">{lockStatus.enabled ? 'ONLINE' : 'LOCKED'}</div>
              <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${lockStatus.enabled ? 'bg-emerald-500' : 'bg-rose-500'}`} /> {lockStatus.enabled ? 'System Available' : 'Maintenance'}
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-4 ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="font-bold text-sm">{message.text}</span>
            </div>
          )}

          {!lockStatus.enabled && !loading && (
            <div className="rounded-xl p-6 flex items-center gap-4 font-bold" style={{ background: pageTheme.soft, border: `1.5px solid ${pageTheme.main}33`, color: pageTheme.main }}>
               <AlertCircle className="w-6 h-6 shrink-0" style={{ color: pageTheme.main }} />
               <p>{lockStatus.message || 'AFA Registration is currently disabled for maintenance. Please check back later.'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Registration Form */}
            <div className="lg:col-span-2">
              <div className="dash-card">
                <h3 className="dash-card-title">
                   <div style={{ width: 28, height: 28, borderRadius: 6, background: pageTheme.soft, color: pageTheme.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Briefcase size={15} strokeWidth={2.5} />
                   </div>
                   Registration Form
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formFields.map((field) => {
                      const Icon = field.icon;
                      return (
                        <div className="space-y-2" key={field.name}>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                          <div className="relative">
                            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: 5, background: field.color.soft, color: field.color.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={12} strokeWidth={2.5} />
                            </div>
                            <input
                              type="text"
                              name={field.name}
                              value={formData[field.name]}
                              onChange={handleInputChange}
                              placeholder={field.placeholder}
                              className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none transition-all"
                              style={{ focusBorder: field.color.main }}
                              onFocus={(e) => e.target.style.borderColor = field.color.main}
                              onBlur={(e) => e.target.style.borderColor = '#e4e4de'}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Region</label>
                      <div className="relative">
                        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: 5, background: getColor(5).soft, color: getColor(5).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MapPin size={12} strokeWidth={2.5} />
                        </div>
                        <select
                          name="region"
                          value={formData.region}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none transition-all appearance-none"
                          onFocus={(e) => e.target.style.borderColor = getColor(5).main}
                          onBlur={(e) => e.target.style.borderColor = '#e4e4de'}
                        >
                          <option value="">Select Region</option>
                          <option value="Greater Accra">Greater Accra</option>
                          <option value="Ashanti">Ashanti</option>
                          <option value="Central">Central</option>
                          <option value="Eastern">Eastern</option>
                          <option value="Western">Western</option>
                          <option value="Northern">Northern</option>
                          <option value="Upper East">Upper East</option>
                          <option value="Upper West">Upper West</option>
                          <option value="Volta">Volta</option>
                          <option value="Bono">Bono</option>
                          <option value="Bono East">Bono East</option>
                          <option value="Ahafo">Ahafo</option>
                          <option value="Savannah">Savannah</option>
                          <option value="North East">North East</option>
                          <option value="Oti">Oti</option>
                          <option value="Western North">Western North</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                      <div className="relative">
                        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: 5, background: getColor(6).soft, color: getColor(6).main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Calendar size={12} strokeWidth={2.5} />
                        </div>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none transition-all"
                          onFocus={(e) => e.target.style.borderColor = getColor(6).main}
                          onBlur={(e) => e.target.style.borderColor = '#e4e4de'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={registering || !lockStatus.enabled}
                      className="dash-btn-primary w-full py-3 text-base"
                      style={{ background: submitColor.main, boxShadow: `0 4px 16px ${submitColor.glow}` }}
                    >
                      {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {registering ? 'Submitting...' : 'Submit Registration'}
                    </button>
                    <p className="mt-4 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                       <Info size={14} style={{ color: feeColor.main }} />
                       Fee of {formatCurrency(lockStatus.registrationFee)} will be deducted from your wallet
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Side Info & History */}
            <div className="space-y-6">
               <div className="rounded-2xl p-6 text-white shadow-xl space-y-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${pageTheme.main} 0%, #111 100%)` }}>
                  {/* Background Glow */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-20 bg-white" />
                  
                  <h3 className="font-black text-lg text-white flex items-center gap-3 relative z-10">
                     <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Info size={18} strokeWidth={2.5} />
                     </div>
                     Why AFA?
                  </h3>
                  <ul className="space-y-4 relative z-10">
                     {[
                       'Unlock huge data savings',
                       'Priority MTN bundle access',
                       'Quick 5-minute activation',
                       'Exclusive member rewards'
                     ].map((item, i) => (
                       <li key={i} className="flex items-center gap-3 text-sm font-bold text-white/90">
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={12} strokeWidth={3} />
                          </div>
                          {item}
                       </li>
                     ))}
                  </ul>
               </div>

               <div className="dash-card">
                  <h3 className="dash-card-title">
                     <div style={{ width: 28, height: 28, borderRadius: 6, background: pageTheme.soft, color: pageTheme.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <History size={15} strokeWidth={2.5} />
                     </div>
                     Recent Activity
                  </h3>

                  <div className="space-y-4">
                    {historyLoading ? (
                       <div className="flex justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                       </div>
                    ) : history.length === 0 ? (
                       <div className="text-center py-8 space-y-2">
                          <History className="w-10 h-10 text-slate-200 mx-auto" />
                          <p className="text-sm font-bold text-slate-400">No registrations yet</p>
                       </div>
                    ) : (
                      history.slice(0, 5).map((reg, idx) => {
                        const c = getColor(idx);
                        return (
                          <div key={reg._id} className="p-3 rounded-xl space-y-2" style={{ background: c.soft, border: `1.5px solid ${c.main}22` }}>
                             <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#111] truncate max-w-[120px]">{reg.name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{
                                  background: reg.status === 'completed' ? '#ecfdf5' : reg.status === 'failed' ? '#fef2f2' : '#fffbeb',
                                  color: reg.status === 'completed' ? '#059669' : reg.status === 'failed' ? '#dc2626' : '#d97706',
                                  border: `1px solid ${reg.status === 'completed' ? '#d1fae5' : reg.status === 'failed' ? '#fee2e2' : '#fef3c7'}`,
                                }}>
                                  {reg.status}
                                </span>
                             </div>
                             <div className="flex items-center justify-between text-[10px] font-bold" style={{ color: c.main }}>
                                <span>{reg.phoneNumber}</span>
                                <span>{new Date(reg.submittedAt).toLocaleDateString()}</span>
                             </div>
                          </div>
                        );
                      })
                    )}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
