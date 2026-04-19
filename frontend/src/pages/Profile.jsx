import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { User, Mail, Phone, Copy, Shield, LogOut, Check, ChevronRight, Bell, Settings, Lock, Smartphone, Wallet, Gift, ExternalLink, ReceiptText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../components/UserLayout';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const accountIdSource = user?.id || user?._id || '';
  const accountIdSuffix = accountIdSource ? accountIdSource.slice(-8) : 'N/A';

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSaveChanges = () => {
    setPhoneError('');
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all fields', { duration: 5000 });
      return;
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      toast.error(phoneValidation.error, { duration: 5000 });
      return;
    }

    // Update with normalized phone
    setFormData(prev => ({ ...prev, phone: phoneValidation.formatted }));
    toast.success('Profile updated successfully!', { duration: 3000 });
    setEditMode(false);
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col">
          {/* Sticky Header */}
          <div className="sticky top-0 z-30 app-pro-header pb-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <User size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Profile</h1>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Active • Personal Space
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-slate-600 hover:text-blue-600 group active:scale-95">
                    <Bell size={20} />
                  </button>
                  <button className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-slate-600 hover:text-blue-600 group active:scale-95">
                    <Settings size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Sidebar Profile Info */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden relative group">
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors"></div>

                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl shadow-lg border-4 border-[#F8FAFC] flex items-center justify-center text-emerald-500">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{user?.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.role || 'Valued Member'}</p>

                    <div className="mt-8 w-full space-y-3">
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Account ID</p>
                          <p className="text-sm font-mono font-bold text-slate-700">#{accountIdSuffix}</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
                          <Smartphone size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Status Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Wallet size={20} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Account Status</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrencyAbbreviated(user?.balance) || '0'}</p>
                    </div>

                    <button
                      onClick={() => navigate('/topup')}
                      className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Fund Wallet
                    </button>

                    <div className="pt-6 border-t border-slate-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Since</span>
                        <span className="text-sm font-bold text-slate-700">Jan 2024</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">PREMIUM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Card */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent)] pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6 text-indigo-400">
                      <Gift size={20} />
                      <h2 className="text-xs font-black uppercase tracking-widest">Earn Rewards</h2>
                    </div>
                    <p className="text-white text-lg font-black tracking-tight mb-6">Invite your friends & get bonuses!</p>

                    <button
                      onClick={copyReferralCode}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group/ref active:scale-95"
                    >
                      <span className="font-mono text-indigo-400 font-black">{user?.referralCode}</span>
                      {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-white/40 group-hover/ref:text-white transition-colors" />}
                    </button>
                    {copied && <p className="text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-3">Copied to clipboard!</p>}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-5 bg-rose-50 text-rose-600 border border-rose-100 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <LogOut size={16} strokeWidth={3} />
                  Sign Out Account
                </button>
              </div>

              {/* Right Column: Profile Form & Security */}
              <div className="lg:col-span-8 space-y-8">

                {/* Account Information Card */}
                <div className="bg-white p-8 sm:p-10 rounded-[3rem] border border-slate-200/60 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <User size={28} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Public Profile</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage your identity</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${editMode
                          ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'
                        }`}
                    >
                      {editMode ? 'Cancel Edit' : 'Modify Info'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                      <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          disabled={!editMode}
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
                      <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!editMode}
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-400 transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Phone Contact</label>
                      <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                          <Phone size={18} />
                        </div>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 10) {
                              setFormData({ ...formData, phone: value });
                            }
                            setPhoneError(''); // Clear error on change
                          }}
                          onBlur={() => {
                            if (editMode && formData.phone) {
                              const validation = validatePhoneNumber(formData.phone);
                              if (!validation.isValid) {
                                setPhoneError(validation.error);
                              }
                            }
                          }}
                          disabled={!editMode}
                          placeholder="0XX-XXX-XXXX"
                          className={`w-full pl-14 pr-6 py-4 bg-slate-50 border-2 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            phoneError
                              ? 'border-red-400 focus:bg-white focus:border-red-400'
                              : 'border-slate-100 focus:bg-white focus:border-indigo-400'
                          }`}
                        />
                      </div>
                      {phoneError && editMode && (
                        <p className="text-xs text-red-500 font-semibold ml-4">{phoneError}</p>
                      )}
                    </div>
                  </div>

                  {editMode && (
                    <button
                      onClick={handleSaveChanges}
                      className="w-full mt-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-[0.98]"
                    >
                      Validate & Save Changes
                    </button>
                  )}
                </div>

                {/* Security Section */}
                <div className="bg-white p-8 sm:p-10 rounded-[3rem] border border-slate-200/60 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Shield size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Security & Privacy</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Protect your session</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols- gap-4">
                    {[
                      { title: 'Passphrase Security', desc: 'Manage your access password', icon: Lock, color: 'text-amber-500', bg: 'bg-amber-50' },
                      { title: '2-Step Verification', desc: 'Extra layer of authentication', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      { title: 'Device Management', desc: 'Secure your logged-in devices', icon: Smartphone, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                      { title: 'Data & Privacy', desc: 'Control your visibility settings', icon: ReceiptText, color: 'text-blue-500', bg: 'bg-blue-50' }
                    ].map((item, i) => (
                      <button key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group/sec text-left">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center transition-transform group-hover/sec:scale-110`}>
                            <item.icon size={22} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">{item.title}</p>
                            <p className="text-[11px] font-bold text-slate-400 leading-none">{item.desc}</p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover/sec:bg-slate-900 group-hover/sec:text-white group-hover/sec:border-slate-900 transition-all">
                          <ChevronRight size={18} strokeWidth={3} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
