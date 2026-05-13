import { useState, useEffect, useCallback } from 'react';
import { Search, Edit2, Ban, Clock, Trash2, Eye, RotateCcw, Users, AlertCircle, CheckCircle, TrendingUp, KeyRound } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import { UserViewModal, UserRoleModal, UserBanModal, UserSuspendModal, UserEditModal } from '../components/AdminUserModals';
import PasswordResetModal from '../components/PasswordResetModal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

export default function AdminUsers() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, banned: 0, suspended: 0, totalBalance: 0 });
  const [selectedUser, setSelectedUser] = useState(null);

  const [showBanModal, setShowBanModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [banningUser, setBanningUser] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState(false);

  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);
  const [showUnsuspendConfirm, setShowUnsuspendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [confirmingUserId, setConfirmingUserId] = useState(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [banReason, setBanReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers(page, 10, roleFilter, search);
      if (response.success) {
        setUsers(response.users);
        setTotalPages(response.pagination.pages);
        if (response.stats) {
          setStats(response.stats);
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showMessage = (msg, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3000);
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      setBanningUser(true);
      await adminAPI.banUser(selectedUser._id, banReason);
      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
      fetchUsers();
      showMessage('Account banned successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to ban user', true);
    } finally {
      setBanningUser(false);
    }
  };

  const confirmUnbanUser = async () => {
    try {
      await adminAPI.unbanUser(confirmingUserId);
      fetchUsers();
      showMessage('Account unbanned successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to unban user', true);
    } finally {
      setShowUnbanConfirm(false);
      setConfirmingUserId(null);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    if (suspendDays <= 0) {
      showMessage('Please enter a valid number of days', true);
      return;
    }
    try {
      setSuspendingUser(true);
      await adminAPI.suspendUser(selectedUser._id, suspendDays);
      setShowSuspendModal(false);
      setSuspendDays(7);
      setSelectedUser(null);
      fetchUsers();
      showMessage(`Account suspended for ${suspendDays} days`);
    } catch (err) {
      showMessage(err?.message || 'Failed to suspend user', true);
    } finally {
      setSuspendingUser(false);
    }
  };

  const confirmUnsuspendUser = async () => {
    try {
      await adminAPI.unsuspendUser(confirmingUserId);
      fetchUsers();
      showMessage('Account unsuspended successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to unsuspend user', true);
    } finally {
      setShowUnsuspendConfirm(false);
      setConfirmingUserId(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await adminAPI.deleteUser(selectedUser._id);
      setSelectedUser(null);
      fetchUsers();
      showMessage(selectedUser?.role === 'agent' ? 'Agent and related data deleted successfully' : 'Account deleted successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to delete user', true);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const confirmRestoreUser = async () => {
    try {
      await adminAPI.restoreUser(confirmingUserId);
      fetchUsers();
      showMessage('Account restored successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to restore user', true);
    } finally {
      setShowRestoreConfirm(false);
      setConfirmingUserId(null);
    }
  };

  const handleUpdateUser = async (formData) => {
    if (!selectedUser) return;
    try {
      setUpdatingUser(true);
      await adminAPI.updateUser(selectedUser._id, formData);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
      showMessage('Account updated successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to update user', true);
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleGenerateReset = async (userId) => {
    try {
      setResetLoading(true);
      const response = await adminAPI.generateResetLink(userId);
      if (response.success) {
        setResetLink(response.link);
        setShowResetModal(true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to generate reset link', true);
    } finally {
      setResetLoading(false);
    }
  };

  const getStatusColor = (user) => {
    if (user.status === 'banned') return '#b91c1c';
    if (user.status === 'suspended') return '#f0a500';
    if (user.deletedAt) return '#666';
    return '#059669';
  };

  const getStatusBg = (user) => {
    if (user.status === 'banned') return '#fff5f5';
    if (user.status === 'suspended') return '#fffbeb';
    if (user.deletedAt) return '#f3f4f6';
    return '#ecfdf5';
  };

  const getStatusText = (user) => {
    if (user.status === 'banned') return 'Banned';
    if (user.status === 'suspended') return 'Suspended';
    if (user.deletedAt) return 'Deleted';
    return 'Active';
  };

  return (
    <div className="usr-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .usr-page-container {
          font-family: 'DM Sans', sans-serif;
        }

        .usr-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .usr-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 1000px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .usr-heading-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .usr-icon-box {
          width: 46px;
          height: 46px;
          background: #111;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f0a500;
          flex-shrink: 0;
        }

        .usr-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .usr-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .usr-stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        .usr-stat-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .usr-stat-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .usr-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #111;
        }

        .usr-search-box {
          position: relative;
          width: 100%;
          margin-bottom: 20px;
        }

        .usr-input {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          width: 100%;
          color: #111;
          transition: all 0.2s;
        }

        .usr-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
          background: #fff;
          outline: none;
        }

        .usr-select {
          background: #fafaf7;
          border: 1.5px solid #e0e0d8;
          border-radius: 7px;
          padding: 10px 14px;
          font-size: 14px;
          width: 100%;
          color: #111;
          appearance: none;
          cursor: pointer;
        }

        .usr-table-container {
          width: 100%;
          overflow-x: auto;
          border-radius: 8px;
          border: 1.5px solid #e4e4de;
        }

        .usr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .usr-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .usr-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .usr-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .usr-btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #e4e4de;
          background: #fff;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
        }

        .usr-btn-icon:hover {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .usr-error-box {
          background: #fff5f5;
          border: 1.5px solid #fecaca;
          color: #b91c1c;
          border-radius: 7px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .usr-success-box {
          background: #ecfdf5;
          border: 1.5px solid #a7f3d0;
          color: #047857;
          border-radius: 7px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .usr-pagination {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
        }

        .usr-page-btn {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1.5px solid #e4e4de;
          background: #fff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .usr-page-btn.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .usr-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(17,17,17,0.1);
          border-top-color: #111;
          border-radius: 50%;
          animation: usr-spin 0.8s linear infinite;
        }

        @keyframes usr-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="usr-content">
        <div className="usr-main-card">
          <div className="usr-heading-section">
            <div className="usr-icon-box">
              <Users size={24} />
            </div>
            <div>
              <h2 className="usr-h2">Manage Accounts</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0' }}>Monitor users and agents across the platform</p>
            </div>
          </div>

          {error && <div className="usr-error-box"><AlertCircle size={16} /> {error}</div>}
          {success && <div className="usr-success-box"><CheckCircle size={16} /> {success}</div>}

          <div className="usr-stats-grid">
            <div className="usr-stat-card">
              <span className="usr-stat-label">Total Users</span>
              <span className="usr-stat-value">{stats.total}</span>
            </div>
            <div className="usr-stat-card">
              <span className="usr-stat-label">Active</span>
              <span className="usr-stat-value" style={{ color: '#059669' }}>{stats.active}</span>
            </div>
            <div className="usr-stat-card">
              <span className="usr-stat-label">Banned</span>
              <span className="usr-stat-value" style={{ color: '#b91c1c' }}>{stats.banned}</span>
            </div>
            <div className="usr-stat-card">
              <span className="usr-stat-label">Balance</span>
              <span className="usr-stat-value">GHS {formatNumberAbbreviated(stats.totalBalance)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div className="usr-search-box" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                className="usr-input"
                placeholder="Search name, email or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div style={{ width: '160px' }}>
              <select
                className="usr-select"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="agent">Agents</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          <div className="usr-table-container">
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="usr-spinner"></div></div>
            ) : (
              <table className="usr-table">
                <thead>
                  <tr>
                    <th className="usr-th">User</th>
                    <th className="usr-th">Role</th>
                    <th className="usr-th">Balance</th>
                    <th className="usr-th">Status</th>
                    <th className="usr-th" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td className="usr-td" style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#111' }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                      </td>
                      <td className="usr-td" style={{ whiteSpace: 'nowrap' }}>
                        <span className="usr-badge" style={{ background: '#111', color: '#fff' }}>{user.role}</span>
                      </td>
                      <td className="usr-td" style={{ whiteSpace: 'nowrap' }}>GHS {Number((user.wallet?.balance || user.balance) || 0).toFixed(2)}</td>
                      <td className="usr-td" style={{ whiteSpace: 'nowrap' }}>
                        <span className="usr-badge" style={{ background: getStatusBg(user), color: getStatusColor(user) }}>
                          {user.status || (user.deletedAt ? 'Deleted' : 'Active')}
                        </span>
                      </td>
                      <td className="usr-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="usr-btn-icon" title="View" onClick={() => { setSelectedUser(user); setShowViewModal(true); }}><Eye size={14} /></button>
                          <button className="usr-btn-icon" title="Edit" onClick={() => { setSelectedUser(user); setShowEditModal(true); }}><Edit2 size={14} /></button>
                          {user.status === 'banned' ? (
                            <button className="usr-btn-icon" title="Unban" onClick={() => { setConfirmingUserId(user._id); setShowUnbanConfirm(true); }}><RotateCcw size={14} style={{ color: '#059669' }} /></button>
                          ) : (
                            <button className="usr-btn-icon" title="Ban" onClick={() => { setSelectedUser(user); setShowBanModal(true); }}><Ban size={14} style={{ color: '#b91c1c' }} /></button>
                          )}
                          <button className="usr-btn-icon" title="Reset Password" onClick={() => handleGenerateReset(user._id)} disabled={resetLoading}><KeyRound size={14} /></button>
                          <button className="usr-btn-icon" title="Delete" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="usr-pagination">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`usr-page-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <UserViewModal 
        isOpen={showViewModal} 
        onClose={() => setShowViewModal(false)} 
        user={selectedUser} 
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
      />
      <UserEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} user={selectedUser} onUpdate={handleUpdateUser} loading={updatingUser} />
      <UserBanModal isOpen={showBanModal} onClose={() => setShowBanModal(false)} user={selectedUser} reason={banReason} setReason={setBanReason} onConfirm={handleBanUser} loading={banningUser} />
      <UserSuspendModal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} user={selectedUser} days={suspendDays} setDays={setSuspendDays} onConfirm={handleSuspendUser} loading={suspendingUser} />
      <PasswordResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} resetLink={resetLink} />
      
      <ConfirmDialog isOpen={showUnbanConfirm} onClose={() => setShowUnbanConfirm(false)} onConfirm={confirmUnbanUser} title="Unban Account" message="Are you sure you want to unban this account?" type="info" />
      <ConfirmDialog isOpen={showUnsuspendConfirm} onClose={() => setShowUnsuspendConfirm(false)} onConfirm={confirmUnsuspendUser} title="Unsuspend Account" message="Are you sure you want to unsuspend this account?" type="info" />
      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDeleteUser} title="Delete Account" message="This action is permanent and will delete all user data. Proceed?" type="danger" />
      <ConfirmDialog isOpen={showRestoreConfirm} onClose={() => setShowRestoreConfirm(false)} onConfirm={confirmRestoreUser} title="Restore Account" message="Restore this deleted account?" type="info" />
    </div>
  );
}
