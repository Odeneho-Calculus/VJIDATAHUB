import { useState, useEffect, useCallback } from 'react';
import { Trash2, Bell, CheckCircle, AlertCircle, Info, AlertTriangle, X, Search, Database, Clock, Activity } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

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
const pageTheme = getColor(6); // sky — matches sidebar Notifications nav colour

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

  const statItems = [
    { title: 'Total Notifications', value: stats.totalCount, icon: Bell, color: getColor(0) },
    { title: 'Unread', value: stats.unreadCount, icon: AlertCircle, color: getColor(3) },
    { title: 'Read', value: stats.totalCount - stats.unreadCount, icon: CheckCircle, color: getColor(1) },
    { title: 'Total Items', value: notifications.length, icon: Activity, color: getColor(2) },
  ];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    .notif-wrapper { font-family: 'DM Sans', sans-serif; background-color: #f5f5f0; min-height: 100vh; color: #333; }
    .notif-content { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .notif-heading-section { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
    .notif-icon-box { width: 46px; height: 46px; background: ${pageTheme.main}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; box-shadow: 0 8px 20px ${pageTheme.glow}; }
    .notif-title { font-size: 26px; font-weight: 800; color: #111; margin: 0; }
    .notif-subtitle { font-size: 14px; color: #666; margin-top: 4px; }

    .notif-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    @media (min-width: 1024px) { .notif-stat-grid { grid-template-columns: repeat(4, 1fr); } }

    .notif-stat-card {
      background: var(--stat-bg, #fff);
      border: 1.5px solid var(--stat-border, #e4e4de);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.10);
      transition: all 0.2s;
    }
    .notif-stat-card:hover {
      border-color: var(--stat-color, #d4d4ce);
      box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.10));
    }
    .notif-stat-icon-small { width: 36px; height: 36px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .notif-stat-label { font-size: 12.5px; font-weight: 700; color: #333; letter-spacing: 0.02em; margin-bottom: 4px; }
    .notif-stat-value { font-size: 24px; font-weight: 800; color: #111; }

    .notif-card { background: #fff; border: 1.5px solid #e4e4de; border-radius: 14px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); overflow: hidden; margin-bottom: 24px; }
    .notif-controls { padding: 20px; border-bottom: 1.5px solid #e4e4de; display: flex; flex-direction: column; gap: 20px; }
    .notif-controls-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .notif-controls-title { font-size: 18px; font-weight: 700; color: #111; margin: 0; }

    .notif-input-wrapper { position: relative; flex: 1; min-width: 200px; }
    .notif-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #bbb; pointer-events: none; }
    .notif-input { background: #fafaf7; border: 1.5px solid #e0e0d8; border-radius: 7px; padding: 11px 14px 11px 42px; font-size: 14px; color: #111; width: 100%; box-sizing: border-box; transition: all 0.2s; }
    .notif-input:focus { border-color: ${pageTheme.main}; box-shadow: 0 0 0 3px ${pageTheme.glow}; background: #fff; outline: none; }

    .notif-select { background: #fafaf7; border: 1.5px solid #e0e0d8; border-radius: 7px; padding: 11px 14px; font-size: 14px; color: #111; cursor: pointer; outline: none; }
    .notif-select:focus { border-color: ${pageTheme.main}; }

    .notif-btn-primary { background: ${pageTheme.main}; color: #fff; border-radius: 7px; padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px ${pageTheme.glow}; }
    .notif-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .notif-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .notif-btn-secondary { background: #fafaf7; border: 1.5px solid #e4e4de; border-radius: 7px; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #111; cursor: pointer; transition: all 0.2s; }
    .notif-btn-secondary:hover { background: #f0f0ed; border-color: ${pageTheme.main}44; color: ${pageTheme.main}; }

    .notif-btn-danger { background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 7px; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #b91c1c; cursor: pointer; transition: all 0.2s; }
    .notif-btn-danger:hover { background: #fee2e2; }
    .notif-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

    .notif-item { padding: 20px; display: flex; gap: 16px; transition: background 0.2s; border-bottom: 1px solid #e4e4de; }
    .notif-item:last-child { border-bottom: none; }
    .notif-item.is-unread { background-color: #fafaf7; }
    .notif-item:hover { background-color: #fcfcf9; }

    .notif-item-icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 8px; background: #fafaf7; display: flex; align-items: center; justify-content: center; }
    .notif-item-content { flex: 1; min-width: 0; }
    .notif-item-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .notif-item-title { font-size: 14px; font-weight: 700; color: #111; margin: 0; }
    .notif-item-msg { font-size: 13px; color: #555; line-height: 1.5; margin: 0 0 8px 0; }
    .notif-item-desc { font-size: 12px; color: #888; margin: 0 0 10px 0; }
    .notif-item-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; font-weight: 600; color: #aaa; }

    .notif-tag { font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 3px 7px; border-radius: 4px; letter-spacing: 0.03em; }

    .notif-actions { display: flex; gap: 4px; }
    .notif-icon-btn { padding: 8px; border-radius: 6px; border: none; background: transparent; cursor: pointer; color: #666; transition: all 0.2s; }
    .notif-icon-btn:hover { background: ${pageTheme.soft}; color: ${pageTheme.main}; }
    .notif-icon-btn.danger:hover { background: #fff5f5; color: #b91c1c; }

    .notif-pagination { padding: 20px; display: flex; align-items: center; justify-content: space-between; border-top: 1.5px solid #e4e4de; background: #fafaf7; }
    .notif-page-info { font-size: 13px; font-weight: 700; color: #666; }
    .notif-page-btns { display: flex; gap: 8px; }

    .notif-empty { padding: 60px 20px; text-align: center; color: #aaa; }
    .notif-empty-title { font-size: 16px; font-weight: 700; color: #666; margin: 12px 0 4px 0; }
    .notif-empty-text { font-size: 14px; }

    .notif-error-box { background: #fff5f5; border: 1.5px solid #fecaca; color: #b91c1c; border-radius: 7px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }
    .notif-success-box { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #15803d; border-radius: 7px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }

    .notif-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; }
    .notif-spinner { width: 32px; height: 32px; border: 3px solid ${pageTheme.soft}; border-top-color: ${pageTheme.main}; border-radius: 50%; animation: notif-spin 0.8s linear infinite; margin-bottom: 12px; }
    @keyframes notif-spin { to { transform: rotate(360deg); } }
  `;

  return (
    <div className="notif-wrapper" style={{ display: 'flex' }}>
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <main className="notif-content">
          <div className="notif-heading-section" style={{ background: `linear-gradient(135deg, ${pageTheme.soft} 0%, ${pageTheme.bg} 100%)`, border: `1.5px solid ${pageTheme.main}33`, borderRadius: '14px', padding: '24px', boxShadow: `0 8px 40px ${pageTheme.glow}` }}>
            <div className="notif-icon-box">
              <Bell size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: pageTheme.main }}>Management Center</span>
              </div>
              <h1 className="notif-title">Notifications</h1>
              <p className="notif-subtitle">Manage platform notifications and alerts</p>
            </div>
          </div>

          {error && (
            <div className="notif-error-box">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="notif-success-box">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <div className="notif-stat-grid">
            {statItems.map((stat, i) => (
              <div
                key={i}
                className="notif-stat-card"
                style={{
                  '--stat-color': stat.color.main + '66',
                  '--stat-glow': stat.color.glow,
                  '--stat-bg': stat.color.soft,
                  '--stat-border': stat.color.main + '33',
                }}
              >
                <div className="notif-stat-icon-small" style={{ background: stat.color.soft, color: stat.color.main, boxShadow: `0 2px 8px ${stat.color.glow}` }}>
                  <stat.icon size={18} />
                </div>
                <p className="notif-stat-label" style={{ color: stat.color.main }}>{stat.title}</p>
                <p className="notif-stat-value">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="notif-card">
            <div className="notif-controls">
              <div className="notif-controls-header">
                <h2 className="notif-controls-title">Notifications</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {stats.unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="notif-btn-secondary">
                      Mark All as Read
                    </button>
                  )}
                  <button
                    onClick={handleOpenDeleteAll}
                    disabled={notifications.length === 0}
                    className="notif-btn-danger"
                  >
                    Delete All
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="notif-input-wrapper">
                  <Search size={18} className="notif-input-icon" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="notif-input"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="notif-select"
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
                  className="notif-select"
                >
                  <option value="">All Status</option>
                  <option value="false">Unread</option>
                  <option value="true">Read</option>
                </select>
              </div>
            </div>

            {loading && notifications.length === 0 ? (
              <div className="notif-loading">
                <div className="notif-spinner"></div>
                <p style={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Database size={48} />
                <p className="notif-empty-title">No notifications found</p>
                <p className="notif-empty-text">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((notification, idx) => {
                  const c = getColor(idx);
                  return (
                    <div
                      key={notification._id}
                      className={`notif-item ${!notification.isRead ? 'is-unread' : ''}`}
                    >
                      <div className="notif-item-icon" style={{ background: c.soft, color: c.main, boxShadow: `0 2px 8px ${c.glow}` }}>
                        {getNotificationIcon(notification.type, notification.severity)}
                      </div>

                      <div className="notif-item-content">
                        <div className="notif-item-title-row">
                          <h3 className="notif-item-title">{notification.title}</h3>
                          <span className={`notif-tag ${typeColors[notification.type] || ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                            {getTypeLabel(notification.type)}
                          </span>
                        </div>
                        <p className="notif-item-msg">{notification.message}</p>
                        {notification.description && (
                          <p className="notif-item-desc">{notification.description}</p>
                        )}
                        <div className="notif-item-meta">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {formatDate(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: pageTheme.main }}>
                              <Activity size={12} />
                              Unread
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="notif-actions">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="notif-icon-btn"
                            title="Mark as read"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDelete(notification)}
                          className="notif-icon-btn danger"
                          title="Delete notification"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
                isLoading={loading}
                themeColor={pageTheme}
              />
            )}
          </div>
        </main>
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
        themeColor={pageTheme}
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
        themeColor={pageTheme}
      />
    </div>
  );
}
