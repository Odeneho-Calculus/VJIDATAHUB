import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { User, Mail, Phone, Copy, Shield, LogOut, Check, ChevronRight, Bell, Settings, Lock, Smartphone, Wallet, Gift, ExternalLink, ReceiptText, Loader2, CheckCircle2, ShieldCheck, Zap, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth as authAPI, user as userAPI } from '../services/api';
import UserLayout from '../components/UserLayout';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #fafaf7;
    min-height: 100vh;
    padding: 20px;
    color: #1a1a1a;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }

  .dash-h2 {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin: 0;
    color: #111;
  }

  .dash-icon-box {
    width: 48px;
    height: 48px;
    background: #4D7C0F;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 16px rgba(77,124,15,0.25);
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dash-btn-outline {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 12px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 800;
    color: #111;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    border-color: #4D7C0F;
    background: #F7FEE7;
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }

  .dash-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 20px;
    padding: 20px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 800;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .dash-stat-value {
    font-size: 22px;
    font-weight: 900;
    color: #111;
    margin: 0;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 24px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dash-card-title {
    font-size: 14px;
    font-weight: 800;
    color: #111;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dash-input {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 12px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    color: #111;
    transition: all 0.2s;
    outline: none;
  }

  .dash-input:focus {
    border-color: #4D7C0F;
    box-shadow: 0 0 0 4px rgba(77,124,15,0.05);
  }

  .dash-btn-primary {
    background: #4D7C0F;
    color: #fff;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 14px;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(77,124,15,0.2);
  }

  .dash-btn-primary:hover:not(:disabled) {
    background: #3f650c;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(77,124,15,0.3);
  }

  .dash-badge {
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

export default function Profile() {
  const { user, logout, setUser } = useAuth();
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
  const [profileLoading, setProfileLoading] = useState(false);
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

  const handleSaveChanges = async () => {
    setPhoneError('');

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in name and phone fields', { duration: 5000 });
      return;
    }

    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      toast.error(phoneValidation.error, { duration: 5000 });
      return;
    }

    try {
      setProfileLoading(true);

      // Update the phone number format
      const updatedData = {
        name: formData.name,
        phone: phoneValidation.formatted
      };

      // Call the API to update profile
      const response = await userAPI.updateProfile(updatedData);

      // Update the user data in auth context
      setUser(prev => prev ? { ...prev, ...response.user } : null);

      // Update local form data
      setFormData(prev => ({ ...prev, ...updatedData }));

      toast.success('Profile updated successfully!', { duration: 3000 });
      setEditMode(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile', { duration: 5000 });
    } finally {
      setProfileLoading(false);
    }
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
      <style>{styles}</style>
      <div className="dash-wrapper">
        <div className="dash-content">
          {/* Header */}
          <div className="dash-header">
            <div className="flex items-center justify-between">
              <div className="dash-heading-row">
                <div className="dash-icon-box">
                  <User size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-600/80">Account Control</span>
                  </div>
                  <h2 className="dash-h2">Your Profile</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="dash-btn-outline !p-2">
                  <Bell size={18} />
                </button>
                <button
                  onClick={handleLogout}
                  className="dash-btn-outline !p-2 text-rose-600 border-rose-100 hover:bg-rose-50 hover:border-rose-200"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="dash-card items-center text-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[32px] bg-lime-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-lime-600/20 group-hover:scale-105 transition-transform">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{user?.name}</h3>
                  <p className="text-[11px] font-black text-lime-600 uppercase tracking-widest mt-1">
                    {user?.role || 'Valued Member'}
                  </p>
                </div>

                <div className="w-full mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Account ID</p>
                    <p className="text-sm font-mono font-bold text-slate-700">#{accountIdSuffix}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-300">
                    <Smartphone size={16} />
                  </div>
                </div>
              </div>

              <div className="dash-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-lime-50 text-lime-600 flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Financial Summary</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Current Balance</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">
                      {formatCurrencyAbbreviated(user?.balance) || '0'}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/topup')}
                    className="dash-btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Zap size={18} fill="currentColor" />
                    Top-up Wallet
                  </button>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</span>
                      <span className="dash-badge bg-emerald-50 text-emerald-600 border border-emerald-100">Verified</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Type</span>
                      <span className="dash-badge bg-indigo-50 text-indigo-600 border border-indigo-100">Premium</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="dash-card">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Personal Information</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Update your profile details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`dash-btn-outline !text-[11px] uppercase tracking-widest ${editMode ? 'bg-slate-900 !text-white !border-slate-900' : ''}`}
                  >
                    {editMode ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-lime-600 transition-colors" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!editMode || profileLoading}
                        className="w-full pl-12 pr-4 py-3.5 dash-input font-bold"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full pl-12 pr-4 py-3.5 dash-input font-bold bg-slate-50/50 cursor-not-allowed opacity-70"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative group">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-lime-600 transition-colors" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          setPhoneError('');
                        }}
                        disabled={!editMode || profileLoading}
                        className={`w-full pl-12 pr-4 py-3.5 dash-input font-bold ${phoneError ? 'border-rose-500 bg-rose-50' : ''}`}
                        placeholder="024XXXXXXX"
                      />
                    </div>
                    {phoneError && <p className="text-[10px] font-bold text-rose-500 ml-1">{phoneError}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Access</label>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full py-3.5 px-4 rounded-2xl border-2 border-slate-100 flex items-center justify-between hover:border-lime-200 hover:bg-lime-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Lock size={18} className="text-slate-300 group-hover:text-lime-600 transition-colors" />
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Change Password</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-lime-600" />
                    </button>
                  </div>
                </div>

                {editMode && (
                  <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={handleSaveChanges}
                      disabled={profileLoading}
                      className="dash-btn-primary min-w-[200px]"
                    >
                      {profileLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Updating Profile...
                        </>
                      ) : (
                        <>
                          <Check size={18} strokeWidth={3} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Referral Card */}
              <div className="dash-card overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Gift size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Refer & Earn</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invite friends to join Topza</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-6 rounded-3xl bg-amber-50/50 border border-amber-100 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm font-bold text-amber-900">Share your code and get rewards on every transaction your referrals make.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-6 py-3 bg-white rounded-2xl border-2 border-amber-200 font-mono font-black text-amber-700 text-lg shadow-sm">
                      {user?.referralCode || 'TOPZA-USER'}
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-600/20 hover:bg-amber-700 active:scale-95 transition-all"
                    >
                      {copied ? <Check size={20} strokeWidth={3} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleChangePassword} className="p-6 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-lime-50 text-lime-600 flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Security Update</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Change your account password</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3.5 dash-input font-bold"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 mx-1" />

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3.5 dash-input font-bold"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative">
                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 dash-input font-bold"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-4 rounded-2xl bg-lime-600 text-white font-black text-sm hover:bg-lime-700 transition-all shadow-lg shadow-lime-600/20 disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin" />
                      Updating...
                    </div>
                  ) : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
