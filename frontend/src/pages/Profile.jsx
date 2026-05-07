import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { User, Mail, Phone, Copy, Shield, LogOut, Check, ChevronRight, Bell, Settings, Lock, Smartphone, Wallet, Gift, ExternalLink, ReceiptText, Loader2, CheckCircle2, ShieldCheck, Zap, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth as authAPI } from '../services/api';
import UserLayout from '../components/UserLayout';

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

  .dash-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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

    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      toast.error(phoneValidation.error, { duration: 5000 });
      return;
    }

    setFormData(prev => ({ ...prev, phone: phoneValidation.formatted }));
    toast.success('Profile updated successfully!', { duration: 3000 });
    setEditMode(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password updated successfully! Please login again.', { duration: 5000 });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Logout and redirect
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <UserLayout>
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
                  <h2 className="dash-h2 !text-base sm:!text-xl">Account Profile</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase truncate">Active • Personal Space</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="p-2 text-slate-400 hover:text-[#f0a500] transition-colors">
                  <Bell size={18} />
                </button>
                <button className="p-2 text-slate-400 hover:text-[#f0a500] transition-colors">
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="dash-card flex flex-col items-center text-center !p-8">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#111] text-[#f0a500] flex items-center justify-center text-2xl font-black">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg shadow-lg border-2 border-white flex items-center justify-center text-white">
                    <Check size={12} strokeWidth={4} />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{user?.name}</h2>
                <p className="text-[10px] font-bold text-[#f0a500] uppercase tracking-widest mt-1">{user?.role || 'Valued Member'}</p>

                <div className="mt-6 w-full p-4 bg-[#fafaf7] border border-[#e4e4de] rounded-xl flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Account ID</p>
                    <p className="text-sm font-mono font-bold text-slate-700">#{accountIdSuffix}</p>
                  </div>
                  <Smartphone size={16} className="text-slate-300" />
                </div>
              </div>

              <div className="dash-card !p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Wallet size={20} />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Account Status</h3>
                </div>

                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrencyAbbreviated(user?.balance) || '0'}</p>
                  </div>

                  <button
                    onClick={() => navigate('/topup')}
                    className="dash-btn-primary w-full !py-3 !text-[10px] uppercase tracking-widest"
                  >
                    Fund Wallet
                  </button>

                  <div className="pt-4 border-t border-[#f0f0f0] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Since</span>
                      <span className="text-xs font-bold text-slate-700">Jan 2024</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan</span>
                      <span className="dash-badge bg-indigo-50 text-indigo-600 border border-indigo-100">PREMIUM</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Sign Out Account
              </button>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* ... existing personal info card ... */}
              <div className="dash-card !p-8">
                <div className="flex items-center justify-between gap-6 mb-8 pb-6 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#fafaf7] flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">Personal Info</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Management</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`dash-btn-outline !py-2 !px-4 !text-[10px] uppercase tracking-widest ${editMode ? '!bg-[#111] !text-white !border-[#111]' : ''}`}
                  >
                    {editMode ? 'Cancel Edit' : 'Modify Info'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!editMode}
                        className="w-full pl-11 pr-4 py-3 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#111] transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!editMode}
                        className="w-full pl-11 pr-4 py-3 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#111] transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Contact</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          setPhoneError('');
                        }}
                        disabled={!editMode}
                        placeholder="0XXXXXXXXX"
                        className={`w-full pl-11 pr-4 py-3 bg-[#fafaf7] border-1.5 rounded-xl text-sm font-bold text-slate-700 focus:outline-none transition-all disabled:opacity-50 ${
                          phoneError ? 'border-rose-400 focus:border-rose-500' : 'border-[#e4e4de] focus:border-[#111]'
                        }`}
                      />
                    </div>
                    {phoneError && editMode && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1 ml-1">{phoneError}</p>}
                  </div>
                </div>

                {editMode && (
                  <button
                    onClick={handleSaveChanges}
                    className="dash-btn-primary w-full !py-4 mt-8 !text-[11px] uppercase tracking-widest"
                  >
                    Save Profile Changes
                  </button>
                )}
              </div>

              <div className="dash-card !p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Security Access</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protection Settings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <SecurityAction 
                    icon={Lock} 
                    title="Change Password" 
                    desc="Update your security credentials"
                    onClick={() => setShowPasswordModal(true)}
                  />
                </div>
              </div>
            </div>

            {/* Full Width Referral Card */}
            <div className="lg:col-span-full">
              <div className="dash-card !bg-[#111] !border-[#111] !p-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-[#f0a500]/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4 text-[#f0a500]">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <Gift size={22} />
                      </div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-white/70">Referral Rewards</h2>
                    </div>
                    <h3 className="text-white text-2xl font-black tracking-tight mb-2">Invite friends & get bonuses!</h3>
                    <p className="text-slate-300 text-sm max-w-lg">Share your unique referral code with friends and family. Earn exclusive commissions on every successful registration or transaction they complete.</p>
                  </div>

                  <div className="w-full md:w-80">
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3 ml-1">Your Referral Code</p>
                    <button
                      onClick={copyReferralCode}
                      className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all active:scale-95 group/ref"
                    >
                      <span className="font-mono text-[#f0a500] text-xl font-black">{user?.referralCode}</span>
                      {copied ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Copy size={24} className="text-white/40 group-hover/ref:text-white transition-colors" />}
                    </button>
                    {copied && <p className="text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-3 animate-bounce">Copied to clipboard!</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#111]/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setShowPasswordModal(false)} />
            <div className="relative w-full max-w-md bg-white border-1.5 border-[#e4e4de] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="p-8 flex flex-col gap-6">
                <div className="text-center">
                  <div className="w-14 h-14 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl flex items-center justify-center mx-auto text-[#111] mb-4">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Change Password</h3>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Secure your account access</p>
                </div>

                <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        required
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#111] transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#111]"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative">
                      <Zap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        required
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#111] transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#111]"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                    <div className="relative">
                      <CheckCircle2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        required
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#111] transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordModal(false)} 
                      className="dash-btn-outline !py-3"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={passwordLoading} 
                      className="dash-btn-primary !py-3"
                    >
                      {passwordLoading ? <Loader2 className="animate-spin" size={18} /> : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

function SecurityAction({ icon: Icon, title, desc, status, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="p-5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-2xl text-left group transition-all hover:border-[#111] active:scale-95"
    >
      <div className="flex items-center justify-between mb-3">
        <Icon size={18} className="text-slate-400 group-hover:text-[#f0a500] transition-colors" />
        {status && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{status}</span>}
      </div>
      <h4 className="text-sm font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{desc}</p>
    </button>
  );
}
