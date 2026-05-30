import { useState, useEffect, useCallback } from 'react';
import { Search, Edit2, Ban, Clock, Trash2, Eye, RotateCcw, Users, AlertCircle, CheckCircle, TrendingUp, KeyRound } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { UserViewModal, UserRoleModal, UserBanModal, UserSuspendModal, UserEditModal, UserDeleteModal } from '../components/AdminUserModals';
import PasswordResetModal from '../components/PasswordResetModal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

/* ── Multi-colour palette ── */
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [confirmingUserId, setConfirmingUserId] = useState(null);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

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

  const handleDeleteUser = async (type) => {
    if (!selectedUser) return;
    try {
      setDeletingUser(true);
      if (type === 'permanent') {
        await adminAPI.permanentDeleteUser(selectedUser._id);
        showMessage('User and all related records permanently deleted');
      } else {
        await adminAPI.temporaryDeleteUser(selectedUser._id);
        showMessage('User account temporarily deleted. Access restricted.');
      }
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      showMessage(err?.message || 'Failed to delete user', true);
    } finally {
      setDeletingUser(false);
      setShowDeleteModal(false);
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
    if (user.status === 'temporarily_deleted' || user.deletedAt) return '#666';
    return '#059669';
  };

  const getStatusBg = (user) => {
    if (user.status === 'banned') return '#fff5f5';
    if (user.status === 'suspended') return '#fffbeb';
    if (user.status === 'temporarily_deleted' || user.deletedAt) return '#f3f4f6';
    return '#ecfdf5';
  };

  const getStatusText = (user) => {
    if (user.status === 'banned') return 'Banned';
    if (user.status === 'suspended') return 'Suspended';
    if (user.status === 'temporarily_deleted' || user.deletedAt) return 'Temp Deleted';
    return 'Active';
  };

  const getRoleBadgeStyles = (role) => {
    if (role === 'admin') return { background: palette[0].soft, color: palette[0].main, border: `1px solid ${palette[0].main}33` };
    if (role === 'agent') return { background: palette[1].soft, color: palette[1].main, border: `1px solid ${palette[1].main}33` };
    return { background: palette[2].soft, color: palette[2].main, border: `1px solid ${palette[2].main}33` };
  };

  return (
    <div className="usr-page-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .usr-page-container {
          font-family: 'DM Sans', sans-serif;
          background-color: #f5f5f0;
        }

        .usr-content {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .usr-header { 
          background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); 
          border: 1.5px solid #A7F3D0; 
          border-radius: 14px; 
          padding: 24px; 
          box-shadow: 0 8px 40px rgba(15,110,86,0.08); 
          width: 100%;
          max-width: 1000px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .usr-icon-box {
          width: 46px;
          height: 46px;
          background: #0F6E56;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(15,110,86,0.25);
        }

        .usr-h2 {
          font-size: 26px;
          font-weight: 800;
          color: #111;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .usr-main-card {
          background: #fff;
          border: 1.5px solid #e4e4de;
          border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.06);
          width: 100%;
          max-width: 1000px;
          padding: 24px;
        }

        .usr-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 1000px;
        }

        @media (min-width: 768px) {
          .usr-stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        .usr-stat-card {
          background: var(--stat-bg, #fff);
          border: 1.5px solid var(--stat-border, #e4e4de);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.2s;
        }

        .usr-stat-card:hover {
          border-color: var(--stat-color, #d4d4ce);
          box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
          transform: translateY(-2px);
        }

        .usr-stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #999;
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
          border-color: #0F6E56;
          box-shadow: 0 0 0 3px rgba(15,110,86,0.07);
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
          transition: all 0.2s;
        }

        .usr-select:focus {
          border-color: #0F6E56;
          outline: none;
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
          font-size: 13px;
        }

        .usr-th {
          background: #fafaf7;
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #333;
          border-bottom: 1.5px solid #e4e4de;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .usr-td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }

        .usr-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 4px;
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
          background: #0F6E56;
          color: #fff;
          border-color: #0F6E56;
          transform: translateY(-1px);
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
          transition: all 0.2s;
        }

        .usr-page-btn.active {
          background: #0F6E56;
          color: #fff;
          border-color: #0F6E56;
          box-shadow: 0 4px 12px rgba(15,110,86,0.2);
        }

        .usr-page-btn:not(.active):hover {
          border-color: #0F6E56;
          color: #0F6E56;
        }

        .usr-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(15,110,86,0.1);
          border-top-color: #0F6E56;
          border-radius: 50%;
          animation: usr-spin 0.8s linear infinite;
        }

        @keyframes usr-spin {
          to { transform: rotate(360deg); }
        }

      `}</style>

      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="usr-content">
        <div className="usr-header">
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
          <div className="usr-stat-card" style={{ '--stat-color': getColor(2).main, '--stat-glow': getColor(2).glow, '--stat-bg': getColor(2).soft, '--stat-border': getColor(2).main + '33' }}>
            <span className="usr-stat-label" style={{ color: getColor(2).main }}>Total Users</span>
            <span className="usr-stat-value">{stats.total}</span>
          </div>
          <div className="usr-stat-card" style={{ '--stat-color': getColor(1).main, '--stat-glow': getColor(1).glow, '--stat-bg': getColor(1).soft, '--stat-border': getColor(1).main + '33' }}>
            <span className="usr-stat-label" style={{ color: getColor(1).main }}>Active</span>
            <span className="usr-stat-value">{stats.active}</span>
          </div>
          <div className="usr-stat-card" style={{ '--stat-color': getColor(5).main, '--stat-glow': getColor(5).glow, '--stat-bg': getColor(5).soft, '--stat-border': getColor(5).main + '33' }}>
            <span className="usr-stat-label" style={{ color: getColor(5).main }}>Banned</span>
            <span className="usr-stat-value">{stats.banned}</span>
          </div>
          <div className="usr-stat-card" style={{ '--stat-color': getColor(3).main, '--stat-glow': getColor(3).glow, '--stat-bg': getColor(3).soft, '--stat-border': getColor(3).main + '33' }}>
            <span className="usr-stat-label" style={{ color: getColor(3).main }}>Total Balance</span>
            <span className="usr-stat-value">GHS {formatNumberAbbreviated(stats.totalBalance)}</span>
          </div>
        </div>

        <div className="usr-main-card">

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div className="usr-search-box" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#0F6E56' }} />
              <input
                className="usr-input"
                placeholder="Search name, email or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div style={{ width: '160px', position: 'relative' }}>
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
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#0F6E56' }}>
                <TrendingUp size={14} />
              </div>
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
                        <span className="usr-badge" style={getRoleBadgeStyles(user.role)}>{user.role}</span>
                      </td>
                      <td className="usr-td" style={{ whiteSpace: 'nowrap', fontWeight: '800', color: '#111' }}>GHS {Number((user.wallet?.balance || user.balance) || 0).toFixed(2)}</td>
                      <td className="usr-td" style={{ whiteSpace: 'nowrap' }}>
                        <span className="usr-badge" style={{ background: getStatusBg(user), color: getStatusColor(user), border: `1px solid ${getStatusColor(user)}22` }}>
                          {getStatusText(user)}
                        </span>
                      </td>
                      <td className="usr-td">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="usr-btn-icon" title="View" onClick={() => { setSelectedUser(user); setShowViewModal(true); }}><Eye size={14} /></button>
                          <button className="usr-btn-icon" title="Edit" onClick={() => { setSelectedUser(user); setShowEditModal(true); }}><Edit2 size={14} /></button>
                          
                          { (user.status === 'temporarily_deleted' || user.deletedAt) ? (
                            <button className="usr-btn-icon" title="Restore Account" onClick={() => { setConfirmingUserId(user._id); setShowRestoreConfirm(true); }}><RotateCcw size={14} style={{ color: '#059669' }} /></button>
                          ) : user.status === 'banned' ? (
                            <button className="usr-btn-icon" title="Unban" onClick={() => { setConfirmingUserId(user._id); setShowUnbanConfirm(true); }}><RotateCcw size={14} style={{ color: '#059669' }} /></button>
                          ) : (
                            <button className="usr-btn-icon" title="Ban" onClick={() => { setSelectedUser(user); setShowBanModal(true); }}><Ban size={14} style={{ color: '#b91c1c' }} /></button>
                          )}
                          
                          <button className="usr-btn-icon" title="Reset Password" onClick={() => handleGenerateReset(user._id)} disabled={resetLoading}><KeyRound size={14} /></button>
                          <button className="usr-btn-icon" title="Delete" onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}><Trash2 size={14} style={{ color: '#b91c1c' }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
              isLoading={loading}
            />
          )}
        </div>
      </div>

      <UserViewModal 
        isOpen={showViewModal} 
        onClose={() => setShowViewModal(false)} 
        user={selectedUser} 
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        onRestore={() => { setShowViewModal(false); setConfirmingUserId(selectedUser._id); setShowRestoreConfirm(true); }}
        onDelete={() => { setShowViewModal(false); setShowDeleteModal(true); }}
      />
      <UserEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} user={selectedUser} onUpdate={handleUpdateUser} loading={updatingUser} />
      <UserBanModal isOpen={showBanModal} onClose={() => setShowBanModal(false)} user={selectedUser} banReason={banReason} setBanReason={setBanReason} onBan={handleBanUser} loading={banningUser} />
      <UserSuspendModal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} user={selectedUser} suspendDays={suspendDays} setSuspendDays={setSuspendDays} onSuspend={handleSuspendUser} loading={suspendingUser} />
      <UserDeleteModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} user={selectedUser} onDelete={handleDeleteUser} loading={deletingUser} />
      <PasswordResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} resetLink={resetLink} />
      
      <ConfirmDialog isOpen={showUnbanConfirm} onClose={() => setShowUnbanConfirm(false)} onConfirm={confirmUnbanUser} title="Unban Account" message="Are you sure you want to unban this account?" type="info" />
      <ConfirmDialog isOpen={showUnsuspendConfirm} onClose={() => setShowUnsuspendConfirm(false)} onConfirm={confirmUnsuspendUser} title="Unsuspend Account" message="Are you sure you want to unsuspend this account?" type="info" />
      <ConfirmDialog isOpen={showRestoreConfirm} onClose={() => setShowRestoreConfirm(false)} onConfirm={confirmRestoreUser} title="Restore Account" message="Restore this deleted account?" type="info" />
    </div>
  );
}
