import { useState, useEffect } from 'react';
import { Search, Edit2, Ban, Clock, Trash2, Eye, Info, RotateCcw, Users, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { KeyRound } from 'lucide-react';
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
  const [selectedUser, setSelectedUser] = useState(null);

  const [showBanModal, setShowBanModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [banningUser, setBanningUser] = useState(false);
  const [suspendingUser, setSuspendingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);
  const [showUnsuspendConfirm, setShowUnsuspendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [confirmingUserId, setConfirmingUserId] = useState(null);

    // Password reset modal state
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetLink, setResetLink] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

  const [banReason, setBanReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers(page, 10, roleFilter, search);

      if (response.success) {
        setUsers(response.users);
        setTotalPages(response.pagination.pages);
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

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

  const handleUnbanUser = (userId) => {
    setConfirmingUserId(userId);
    setShowUnbanConfirm(true);
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

  const handleUnsuspendUser = (userId) => {
    setConfirmingUserId(userId);
    setShowUnsuspendConfirm(true);
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

  const handleDeleteUser = () => {
    setShowDeleteConfirm(true);
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

  const handleRestoreUser = (userId) => {
    setConfirmingUserId(userId);
    setShowRestoreConfirm(true);
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

  const getStatusColor = (user) => {
    if (user.status === 'banned') return 'bg-red-100 text-red-700';
    if (user.status === 'suspended') return 'bg-yellow-100 text-yellow-700';
    if (user.deletedAt) return 'bg-gray-100 text-gray-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (user) => {
    if (user.status === 'banned') return 'Banned';
    if (user.status === 'suspended') return `Suspended`;
    if (user.deletedAt) return 'Deleted';
    return 'Active';
  };

  const activeUsers = users.filter(u => u.status === 'active').length;
  const bannedUsers = users.filter(u => u.status === 'banned').length;
  const suspendedUsers = users.filter(u => u.status === 'suspended').length;
  const totalAccounts = users.length || 1;
  const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  return (
    <div className="flex h-screen bg-slate-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Manage Accounts</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">
                  Monitor users and agents, manage roles, and enforce account controls
                </p>
              </div>

              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm sm:text-base flex items-center gap-3">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm sm:text-base flex items-center gap-3">
                  <CheckCircle size={20} className="flex-shrink-0" />
                  {success}
                </div>
              )}

              <section>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Total Accounts</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{users.length}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Active Users</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{activeUsers}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Banned Users</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{bannedUsers}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] sm:text-sm text-slate-600 leading-tight">Suspended</p>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 leading-tight">{suspendedUsers}</p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp size={20} className="text-blue-700" />
                      Balance Snapshot
                    </h2>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">
                      GHS {formatNumberAbbreviated(totalBalance)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Avg Balance / Account</p>
                      <p className="text-base font-bold text-slate-900 mt-1">
                        GHS {formatNumberAbbreviated(totalBalance / totalAccounts)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Total Accounts</p>
                      <p className="text-base font-bold text-slate-900 mt-1">{users.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">User Distribution</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Active</span>
                      <span className="font-bold text-emerald-700">{Math.round((activeUsers / totalAccounts) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Banned</span>
                      <span className="font-bold text-red-700">{Math.round((bannedUsers / totalAccounts) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Suspended</span>
                      <span className="font-bold text-amber-700">{Math.round((suspendedUsers / totalAccounts) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-slate-500 text-sm"
                    />
                  </div>
                  <div className="sm:w-56">
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-slate-500 text-sm"
                    >
                      <option value="all">All Accounts</option>
                      <option value="user">Users</option>
                      <option value="agent">Agents</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">User List</h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Manage account status, access, and profile details</p>
                </div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-blue-700 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading users...</p>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No accounts found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your search filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                            User
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                            Role
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                            Balance
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                            Status
                          </th>
                          <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {users.map((user) => (
                          <tr
                            key={user._id}
                            className={`hover:bg-slate-50 transition ${user.deletedAt ? 'opacity-60 bg-slate-50' : ''
                              }`}
                          >
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-600">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                                user.role === 'agent'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}>
                                {user.role || 'user'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-bold text-slate-900">GHS {formatNumberAbbreviated(user.balance) || '0'}</p>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user)}`}>
                                {getStatusText(user)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1 items-center">
                                {user.deletedAt ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleRestoreUser(user._id)}
                                      className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                      title="Restore User"
                                    >
                                      <RotateCcw className="w-4 h-4 text-green-600" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                      title="Permanent Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowViewModal(true);
                                      }}
                                      className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                      title="View Info"
                                    >
                                      <Eye className="w-4 h-4 text-cyan-600" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowEditModal(true);
                                      }}
                                      className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                      title="Edit User"
                                    >
                                      <Edit2 className="w-4 h-4 text-blue-600" />
                                    </button>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setShowResetModal(true);
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                        title="Generate Password Reset Link"
                                      >
                                        <KeyRound className="w-4 h-4 text-fuchsia-600" />
                                      </button>
                                    {user.status === 'banned' ? (
                                      <button
                                        onClick={() => handleUnbanUser(user._id)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                        title="Unban User"
                                      >
                                        <Ban className="w-4 h-4 text-yellow-600" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setShowBanModal(true);
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                        title="Ban User"
                                      >
                                        <Ban className="w-4 h-4 text-red-600" />
                                      </button>
                                    )}
                                    {user.status === 'suspended' ? (
                                      <button
                                        onClick={() => handleUnsuspendUser(user._id)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                        title="Unsuspend User"
                                      >
                                        <Clock className="w-4 h-4 text-orange-600" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setSuspendDays(7);
                                          setShowSuspendModal(true);
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                        title="Suspend User"
                                      >
                                        <Clock className="w-4 h-4 text-orange-500" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="p-2 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                                      title="Delete User"
                                    >
                                      <Trash2 className="w-4 h-4 text-slate-400" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <p className="text-sm text-slate-600">
                      Page {page} of {totalPages} • {users.length} accounts total
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
              </section>
            </div>
          </div>
        </div>
      </div>

      <UserViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        user={selectedUser}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
      />


      <UserBanModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        user={selectedUser}
        banReason={banReason}
        setBanReason={setBanReason}
        onBan={handleBanUser}
        loading={banningUser}
      />

      <UserSuspendModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        user={selectedUser}
        suspendDays={suspendDays}
        setSuspendDays={setSuspendDays}
        onSuspend={handleSuspendUser}
        loading={suspendingUser}
      />

      <ConfirmDialog
        isOpen={showUnbanConfirm}
        title="Unban User"
        message="Are you sure you want to unban this user?"
        confirmText="Unban"
        onConfirm={confirmUnbanUser}
        onCancel={() => setShowUnbanConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showUnsuspendConfirm}
        title="Unsuspend User"
        message="Are you sure you want to unsuspend this user?"
        confirmText="Unsuspend"
        onConfirm={confirmUnsuspendUser}
        onCancel={() => setShowUnsuspendConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={selectedUser?.deletedAt ? 'Permanently Delete User' : 'Delete User'}
        message={
          selectedUser?.role === 'agent'
            ? `ARE YOU SURE? This will permanently delete ${selectedUser?.name} and all agent-related data (store, orders, payouts, fee records, guests, transactions). This action CANNOT be undone.`
            : selectedUser?.deletedAt
              ? `ARE YOU SURE? This will permanently delete ${selectedUser?.name} and ALL related data (Orders, Transactions, etc.). This action CANNOT be undone.`
              : `Are you sure you want to delete ${selectedUser?.name}? This is a soft-delete and the account can be restored later.`
        }
        confirmText={selectedUser?.role === 'agent' || selectedUser?.deletedAt ? 'Permanently Delete' : 'Delete'}
        onConfirm={confirmDeleteUser}
        onCancel={() => setShowDeleteConfirm(false)}
        isDangerous={true}
      />

      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title="Restore User"
        message="Are you sure you want to restore this user?"
        confirmText="Restore"
        onConfirm={confirmRestoreUser}
        onCancel={() => setShowRestoreConfirm(false)}
      />

      <UserEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onUpdate={handleUpdateUser}
        loading={updatingUser}
      />
        {/* Password Reset Modal Placeholder - to be implemented next */}
          <PasswordResetModal
            isOpen={showResetModal}
            onClose={() => {
              setShowResetModal(false);
              setResetLink('');
            }}
            user={selectedUser}
            resetLink={resetLink}
            loading={resetLoading}
            onGenerate={async () => {
              if (!selectedUser) return;
              setResetLoading(true);
              try {
                const res = await adminAPI.generatePasswordResetLink(selectedUser._id);
                setResetLink(res.resetLink);
              } catch (err) {
                setResetLink('');
                showMessage(err?.message || 'Failed to generate reset link', true);
              } finally {
                setResetLoading(false);
              }
            }}
          />
    </div>
  );
}
