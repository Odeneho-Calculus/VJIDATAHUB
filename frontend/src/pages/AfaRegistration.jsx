import { useState, useEffect, useCallback } from 'react';
import { User, Phone, IdCard, MapPin, Calendar, Briefcase, Info, AlertCircle, CheckCircle2, History, RefreshCw, Send, Wallet, Loader2 } from 'lucide-react';
import { afa } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import UserLayout from '../components/UserLayout';
import AgentLayout from '../components/AgentLayout';
import { formatCurrency } from '../utils/formatCurrency';

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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
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
    background: #111;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f0a500;
    flex-shrink: 0;
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

  return (
    <Layout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>

        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header !p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-10 !h-10">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="dash-h2 !text-base sm:!text-xl">AFA Registration</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase truncate">Join the Account For All bundle</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 bg-[#fafaf7] border border-[#e4e4de] rounded-lg flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fee</span>
                  <span className="text-sm font-black text-[#111]">{formatCurrency(lockStatus.registrationFee)}</span>
                </div>
                <button
                  onClick={fetchData}
                  className="p-1.5 text-slate-400 hover:text-[#f0a500] transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
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
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center gap-4 text-amber-800 font-bold">
               <AlertCircle className="w-6 h-6 shrink-0" />
               <p>{lockStatus.message || 'AFA Registration is currently disabled for maintenance. Please check back later.'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Registration Form */}
            <div className="lg:col-span-2">
              <div className="dash-card">
                <h3 className="dash-card-title">
                   <Briefcase className="w-5 h-5 text-[#f0a500]" />
                   Registration Form
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name (As on ID)</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">MTN Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="0240000000"
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ghana Card ID</label>
                      <div className="relative">
                        <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="idNumber"
                          value={formData.idNumber}
                          onChange={handleInputChange}
                          placeholder="GHA-000000000-0"
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Occupation</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="occupation"
                          value={formData.occupation}
                          onChange={handleInputChange}
                          placeholder="Farmer or Trader"
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Location / City</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="Accra"
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Region</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          name="region"
                          value={formData.region}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all appearance-none"
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
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className="w-full pl-11 pr-4 py-2.5 bg-[#fafaf7] border border-[#e4e4de] rounded-xl font-bold text-sm focus:outline-none focus:border-[#111] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={registering || !lockStatus.enabled}
                      className="dash-btn-primary w-full py-3 text-base"
                    >
                      {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {registering ? 'Submitting...' : 'Submit Registration'}
                    </button>
                    <p className="mt-4 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                       <Info size={14} />
                       Fee of {formatCurrency(lockStatus.registrationFee)} will be deducted from your wallet
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Side Info & History */}
            <div className="space-y-6">
               <div className="bg-gradient-to-br from-[#111] to-[#333] rounded-xl p-6 text-white shadow-xl space-y-4">
                  <h3 className="font-black text-lg text-white flex items-center gap-2">
                     <Info size={20} className="text-[#f0a500]" />
                     Why AFA?
                  </h3>
                  <ul className="space-y-3">
                     {[
                       'Get more data for less',
                       'Exclusive MTN bundle offers',
                       'Quick and easy registration',
                       'Dedicated support for members'
                     ].map((item, i) => (
                       <li key={i} className="flex items-start gap-3 text-sm font-bold text-white">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#f0a500]" />
                          {item}
                       </li>
                     ))}
                  </ul>
               </div>

               <div className="dash-card">
                  <h3 className="dash-card-title">
                     <History className="w-5 h-5 text-[#f0a500]" />
                     Recent History
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
                      history.slice(0, 5).map((reg) => (
                        <div key={reg._id} className="p-3 bg-[#fafaf7] border border-[#e4e4de] rounded-xl space-y-2">
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-[#111] truncate max-w-[120px]">{reg.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                reg.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                reg.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {reg.status}
                              </span>
                           </div>
                           <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span>{reg.phoneNumber}</span>
                              <span>{new Date(reg.submittedAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                      ))
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
