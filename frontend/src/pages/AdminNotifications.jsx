import { useState, useEffect, useCallback } from 'react';
import { Trash2, Bell, CheckCircle, AlertCircle, Info, AlertTriangle, X, Search, Database, Clock, Activity } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

export default function AdminNotifications() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [isReadFilter, setIsReadFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [updateLoading, setUpdateLoading] = useState(false);

  const [stats, setStats] = useState({
    unreadCount: 0,
    totalCount: 0,
  });

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
    } else {
      setSuccess(msg);
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3000);
  };

  const fetchNotificationStats = useCallback(async () => {
    try {
      const response = await adminAPI.getNotificationStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getNotifications(page, 20, typeFilter, isReadFilter, searchQuery);

      if (response.success) {
        setNotifications(response.data?.notifications || []);
        setTotalPages(response.data?.pagination?.totalPages || 0);
        fetchNotificationStats();
      } else {
        setError(response.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, isReadFilter, searchQuery, fetchNotificationStats]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      const response = await adminAPI.markNotificationAsRead(id);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
        fetchNotificationStats();
      }
    } catch (err) {
      setError(err?.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await adminAPI.markAllNotificationsAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        fetchNotificationStats();
      }
    } catch (err) {
      setError(err?.message || 'Failed to mark all notifications as read');
    }
  };

  const handleOpenDelete = (notification) => {
    setSelectedNotification(notification);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedNotification) return;
    try {
      setUpdateLoading(true);
      const response = await adminAPI.deleteNotification(selectedNotification._id);
      if (response.success) {
        setShowDeleteConfirm(false);
        setNotifications(prev => prev.filter(n => n._id !== selectedNotification._id));
        setSelectedNotification(null);
        await fetchNotificationStats();
        showMessage('Notification deleted successfully');
      } else {
        showMessage(response.message || 'Failed to delete notification', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete notification', true);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleOpenDeleteAll = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = async () => {
    try {
      setUpdateLoading(true);
      const response = await adminAPI.deleteAllNotifications();
      if (response.success) {
        setShowDeleteAllConfirm(false);
        setNotifications([]);
        setTotalPages(0);
        await fetchNotificationStats();
        showMessage('All notifications deleted successfully');
      } else {
        showMessage(response.message || 'Failed to delete notifications', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to delete notifications', true);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getNotificationIcon = (type, severity) => {
    if (severity === 'error') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (severity === 'success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  const getTypeLabel = (type) => {
    const labels = {
      user_created: 'User Created',
      data_purchase: 'Data Purchase',
      low_balance: 'Low Balance',
      system: 'System',
    };
    return labels[type] || type;
  };

  const typeColors = {
    user_created: 'bg-blue-100 text-blue-700',
    data_purchase: 'bg-green-100 text-green-700',
    low_balance: 'bg-yellow-100 text-yellow-700',
    system: 'bg-gray-100 text-gray-700',
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Notifications</h1>
              <p className="text-sm sm:text-base text-slate-600">Manage platform notifications and alerts</p>
            </div>

            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 flex items-start gap-3">
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
              <StatCard title="Total Notifications" value={stats.totalCount} icon={Bell} iconBg="bg-blue-50" iconColor="text-blue-700" />
              <StatCard title="Unread" value={stats.unreadCount} icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-700" />
              <StatCard title="Read" value={stats.totalCount - stats.unreadCount} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
              <StatCard title="Total Items" value={notifications.length} icon={Activity} iconBg="bg-indigo-50" iconColor="text-indigo-700" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                  <div className="flex gap-2">
                    {stats.unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors text-sm font-semibold"
                      >
                        Mark All as Read
                      </button>
                    )}
                    <button
                      onClick={handleOpenDeleteAll}
                      disabled={notifications.length === 0}
                      className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                    >
                      Delete All
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900 text-sm hover:border-slate-300"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-slate-900 text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="user_created">User Created</option>
                    <option value="data_purchase">Data Purchase</option>
                    <option value="low_balance">Low Balance</option>
                    <option value="system">System</option>
                  </select>
                  <select
                    value={isReadFilter}
                    onChange={(e) => {
                      setIsReadFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-slate-900 text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="false">Unread</option>
                    <option value="true">Read</option>
                  </select>
                </div>
              </div>

              {loading && notifications.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-900 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading notifications...</p>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-16">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg">No notifications found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-3 sm:p-4 hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-slate-50' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type, notification.severity)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <h3 className={`text-sm font-bold ${!notification.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {notification.title}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${typeColors[notification.type] || ''}`}>
                                  {getTypeLabel(notification.type)}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[13px] leading-relaxed mb-1">{notification.message}</p>
                              {notification.description && (
                                <p className="text-slate-500 text-[12px] mb-1.5">{notification.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatDate(notification.createdAt)}
                                </span>
                                {!notification.isRead && (
                                  <span className="flex items-center gap-1 text-slate-700">
                                    <Activity size={12} />
                                    Unread
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0 self-start">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Mark as read"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenDelete(notification)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete notification"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <p className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Notification"
        message="Are you sure you want to delete this notification?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedNotification(null);
        }}
        isDangerous={true}
      />

      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="Delete All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
      <div className="mb-2 sm:mb-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">{title}</p>
      <p className="text-lg sm:text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
