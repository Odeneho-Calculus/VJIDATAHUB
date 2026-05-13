import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { User, Mail, Phone, Copy, Shield, LogOut, Check, ChevronRight, Settings, Lock, Loader2, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth as authAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';

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

  .dash-heading {
    font-size: 24px;
    font-weight: 800;
    color: #111;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dash-subheading {
    font-size: 14px;
    color: #666;
    margin: 0;
    font-weight: 500;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-card-title {
    font-size: 18px;
    font-weight: 800;
    color: #111;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .dash-label {
    font-size: 12px;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dash-input {
    padding: 12px 16px;
    border: 1.5px solid #e4e4de;
    border-radius: 8px;
    font-size: 14px;
    background: #fafaf7;
    transition: all 0.2s;
  }

  .dash-input:focus {
    outline: none;
    border-color: #111;
    background: #fff;
  }

  .dash-input:disabled {
    background: #f5f5f0;
    color: #999;
    cursor: not-allowed;
  }

  .dash-btn-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 16px;
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

export default function AdminProfile() {
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

  const copyAccountId = () => {
    if (accountIdSource) {
      navigator.clipboard.writeText(accountIdSource);
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
    <AdminLayout>
      <style>{styles}</style>

      <div className="dash-wrapper">
        <div className="dash-content">
          {/* Header */}
          <div className="dash-header">
            <div className="dash-heading-row">
              <User size={24} />
              <div>
                <h1 className="dash-heading">Admin Profile</h1>
                <p className="dash-subheading">Manage your account settings and preferences</p>
              </div>
            </div>
          </div>

          {/* Profile Information Card */}
          <div className="dash-card">
            <h2 className="dash-card-title">
              <User size={18} />
              Profile Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="dash-form-group">
                <label className="dash-label">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!editMode}
                  className="dash-input"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editMode}
                  className="dash-input"
                  placeholder="Enter your email"
                />
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editMode}
                  className={`dash-input ${phoneError ? 'border-red-500' : ''}`}
                  placeholder="Enter your phone number"
                />
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Account ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={`...${accountIdSuffix}`}
                    disabled
                    className="dash-input pr-10"
                  />
                  <button
                    onClick={copyAccountId}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    title="Copy full Account ID"
                  >
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="dash-btn-row">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="dash-btn-primary"
                >
                  <Settings size={14} />
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="dash-btn-primary"
                  >
                    <Check size={14} />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setPhoneError('');
                      setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                      });
                    }}
                    className="dash-btn-outline"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Security Settings Card */}
          <div className="dash-card">
            <h2 className="dash-card-title">
              <Shield size={18} />
              Security Settings
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <SecurityAction
                icon={Lock}
                title="Change Password"
                desc="Update your security credentials"
                onClick={() => setShowPasswordModal(true)}
              />
            </div>
          </div>

          {/* Account Actions Card */}
          <div className="dash-card">
            <h2 className="dash-card-title">
              <Settings size={18} />
              Account Actions
            </h2>

            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="dash-btn-outline text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Change Password</h3>

            <form onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function SecurityAction({ icon: Icon, title, desc, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon size={20} className="text-blue-600" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </div>
  );
}