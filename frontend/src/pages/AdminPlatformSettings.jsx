import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Save,
  Phone,
  Mail,
  MessageCircle,
  Users,
  Globe,
  Clock3,
  Settings2,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Modal from '../components/Modal';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';

export default function AdminPlatformSettings() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('contact');
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(true);
  const [formData, setFormData] = useState({
    phone: '',
    whatsapp: '',
    whatsappGroup: '',
    email: '',
    duplicateOrderCooldownMinutes: 10,
    statusUpdateMethod: 'cron',
    dataPurchaseChargeType: 'fixed',
    dataPurchaseCharge: 0,
    walletFundingChargeType: 'fixed',
    walletFundingCharge: 0,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchWebhookLogs();
    }
  }, [activeTab]);

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSystemSettings();
      const cd = response?.settings?.contactDetails || {};
      setFormData({
        phone: cd.phone || '',
        whatsapp: cd.whatsapp || '',
        whatsappGroup: cd.whatsappGroup || '',
        email: cd.email || '',
        duplicateOrderCooldownMinutes: response?.settings?.orderSettings?.duplicateOrderCooldownMinutes || 10,
        statusUpdateMethod: response?.settings?.orderSettings?.statusUpdateMethod || 'cron',
        dataPurchaseChargeType: response?.settings?.transactionCharges?.dataPurchaseChargeType || 'fixed',
        dataPurchaseCharge: response?.settings?.transactionCharges?.dataPurchaseCharge ?? 0,
        walletFundingChargeType: response?.settings?.transactionCharges?.walletFundingChargeType || 'fixed',
        walletFundingCharge: response?.settings?.transactionCharges?.walletFundingCharge ?? 0,
      });
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminAPI.updateSystemSettings({
        contactDetails: {
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          whatsappGroup: formData.whatsappGroup,
          email: formData.email,
        },
        orderSettings: {
          duplicateOrderCooldownMinutes: Number(formData.duplicateOrderCooldownMinutes) || 10,
          statusUpdateMethod: formData.statusUpdateMethod || 'cron',
        },
        transactionCharges: {
          dataPurchaseChargeType: formData.dataPurchaseChargeType || 'fixed',
          dataPurchaseCharge: Number(formData.dataPurchaseCharge) || 0,
          walletFundingChargeType: formData.walletFundingChargeType || 'fixed',
          walletFundingCharge: Number(formData.walletFundingCharge) || 0,
        },
      });
      showMessage('Platform settings saved successfully');
    } catch (err) {
      showMessage(err?.message || 'Failed to save platform settings', true);
    } finally {
      setSaving(false);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError('');
      const response = await adminAPI.getTopzaWebhookLogs(1, 20);
      if (response.success) {
        setWebhookLogs(Array.isArray(response.logs) ? response.logs : []);
        setWebhookSecretConfigured(Boolean(response.secretConfigured));
      } else {
        setWebhookLogs([]);
        setLogsError(response.message || 'Failed to fetch webhook logs');
      }
    } catch (err) {
      setWebhookLogs([]);
      setLogsError(err?.message || 'Failed to fetch webhook logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenLogDetails = (log) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };

  const handleClearWebhookLogs = async () => {
    const confirmed = window.confirm('Clear all Topza webhook logs? This cannot be undone.');
    if (!confirmed) return;

    try {
      setClearingLogs(true);
      await adminAPI.clearTopzaWebhookLogs();
      showMessage('Webhook logs cleared successfully');
      await fetchWebhookLogs();
    } catch (err) {
      showMessage(err?.message || 'Failed to clear webhook logs', true);
    } finally {
      setClearingLogs(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  const filteredWebhookLogs = webhookLogs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'updated') return Boolean(log.handled);
    if (logFilter === 'ignored') return !Boolean(log.handled);
    if (logFilter === 'invalid') return !Boolean(log.signatureValid);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
              <Globe size={17} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Platform Settings</h1>
              <p className="text-sm text-slate-500 leading-tight">Manage public contact details shown on the site</p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            <CheckCircle size={16} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveTab('contact')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'contact'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  <Phone size={15} />
                  Contact Details
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'orders'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  <Settings2 size={15} />
                  Order Settings
                </button>
                <button
                  onClick={() => setActiveTab('charges')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'charges'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  <Clock3 size={15} />
                  Transaction Charges
                </button>
              </div>
            </div>

            {activeTab === 'contact' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-800">Contact Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These values populate the floating contact button visible to all users.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} />
                        Phone Number
                      </span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d+]/g, '');
                        if (value.length <= 15) {
                          setFormData((prev) => ({ ...prev, phone: value }));
                        }
                      }}
                      placeholder="+233534359912"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Used for the &ldquo;Call&rdquo; button (tel: link). Include country code.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <MessageCircle size={13} />
                        WhatsApp Number
                      </span>
                    </label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 15) {
                          setFormData((prev) => ({ ...prev, whatsapp: value }));
                        }
                      }}
                      placeholder="233534359912"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Used for the &ldquo;WhatsApp&rdquo; button (wa.me link). No + or spaces.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} />
                        WhatsApp Community Link
                      </span>
                    </label>
                    <input
                      type="url"
                      name="whatsappGroup"
                      value={formData.whatsappGroup}
                      onChange={handleChange}
                      placeholder="https://chat.whatsapp.com/xxxxxx"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Used for the &ldquo;Community&rdquo; button.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} />
                        Support Email
                      </span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="support@example.com"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Used for the &ldquo;Email&rdquo; button (mailto: link).</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-800">Order Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure how long a number is temporarily blocked from placing another order.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Settings2 size={13} />
                        Order Status Update Method
                      </span>
                    </label>
                    <select
                      name="statusUpdateMethod"
                      value={formData.statusUpdateMethod}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    >
                      <option value="cron">Cron (Every 5 Minutes)</option>
                      <option value="webhook">Webhook (Real-time Push)</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Cron mode polls Topza every 5 minutes. Webhook mode updates only from incoming Topza webhook events.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock3 size={13} />
                        Duplicate Order Cooldown (Minutes)
                      </span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      name="duplicateOrderCooldownMinutes"
                      value={formData.duplicateOrderCooldownMinutes}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Range: 1 to 1440 minutes. Example: set 10 to allow repeat purchase after 10 minutes.</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Topza Webhook Monitor</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Recent webhook deliveries and status updates applied to orders.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleClearWebhookLogs}
                          disabled={clearingLogs || logsLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                        >
                          <Trash2 size={13} />
                          {clearingLogs ? 'Clearing...' : 'Clear Logs'}
                        </button>
                        <button
                          onClick={fetchWebhookLogs}
                          disabled={logsLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                        >
                          <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
                          Refresh
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'updated', label: 'Updated' },
                          { id: 'ignored', label: 'Ignored' },
                          { id: 'invalid', label: 'Invalid Signature' },
                        ].map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => setLogFilter(filter.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${logFilter === filter.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>

                      {!webhookSecretConfigured && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          TOPZA_WEBHOOK_SECRET is not configured on the backend. Signature validation will fail until it is set.
                        </div>
                      )}

                      {logsError && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {logsError}
                        </div>
                      )}

                      {logsLoading ? (
                        <div className="text-xs text-slate-500">Loading webhook logs...</div>
                      ) : filteredWebhookLogs.length === 0 ? (
                        <div className="text-xs text-slate-500">No webhook logs yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-100">
                                <th className="py-2 pr-3 font-semibold">Time</th>
                                <th className="py-2 pr-3 font-semibold">Event</th>
                                <th className="py-2 pr-3 font-semibold">Signature</th>
                                <th className="py-2 pr-3 font-semibold">Result</th>
                                <th className="py-2 pr-3 font-semibold">Order</th>
                                <th className="py-2 pr-3 font-semibold text-right">Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredWebhookLogs.map((log) => (
                                <tr key={log._id} className="border-b border-slate-100 align-top">
                                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{formatDateTime(log.createdAt || log.receivedAt)}</td>
                                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{log.event || 'N/A'}</td>
                                  <td className="py-2 pr-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${log.signatureValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {log.signatureValid ? 'valid' : 'invalid'}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3">
                                    <span className={`px-2 py-0.5 rounded-full font-semibold ${log.handled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                      {log.handled ? 'updated' : (log.reason || 'ignored')}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 text-slate-700">
                                    <div className="font-semibold">{log.matchedOrderNumber || log.identifiers?.orderNumber || 'N/A'}</div>
                                    <div className="text-slate-500">{log.orderStatusBefore || '-'} {'->'} {log.orderStatusAfter || '-'}</div>
                                  </td>
                                  <td className="py-2 pr-3 text-right">
                                    <button
                                      onClick={() => handleOpenLogDetails(log)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                    >
                                      <Eye size={12} />
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'charges' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-800">Transaction Charges</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure transaction charges as either fixed GHS fees or percentages. Set value to 0 to disable.
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Settings2 size={13} />
                        Data Purchase Charge
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <select
                        name="dataPurchaseChargeType"
                        value={formData.dataPurchaseChargeType}
                        onChange={handleChange}
                        className="sm:col-span-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                      >
                        <option value="fixed">Fixed (GHS)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="dataPurchaseCharge"
                        value={formData.dataPurchaseCharge}
                        onChange={handleChange}
                        className="sm:col-span-2 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Applied on all Paystack data/checker purchases (guests, store buyers, and registered users paying via card/Momo). {formData.dataPurchaseChargeType === 'percentage' ? 'Example: 2.5 means 2.5% of order amount.' : 'Example: 0.20 means GHc 0.20 per transaction.'} Not charged on wallet data/checker payments.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Settings2 size={13} />
                        Wallet Funding Charge
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <select
                        name="walletFundingChargeType"
                        value={formData.walletFundingChargeType}
                        onChange={handleChange}
                        className="sm:col-span-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                      >
                        <option value="fixed">Fixed (GHS)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="walletFundingCharge"
                        value={formData.walletFundingCharge}
                        onChange={handleChange}
                        className="sm:col-span-2 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Applied every time a user funds their wallet via Paystack. {formData.walletFundingChargeType === 'percentage' ? 'Example: 1.5 means 1.5% of funding amount.' : 'Only fixed GHS value is added.'} Only the base amount is credited to the wallet.</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Webhook Log Details"
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-slate-500">Event</p>
                <p className="font-semibold text-slate-900 mt-1">{selectedLog.event || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-slate-500">Received</p>
                <p className="font-semibold text-slate-900 mt-1">{formatDateTime(selectedLog.createdAt || selectedLog.receivedAt)}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-slate-500">Signature</p>
                <p className="font-semibold text-slate-900 mt-1">{selectedLog.signatureValid ? 'Valid' : 'Invalid'}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-slate-500">Result</p>
                <p className="font-semibold text-slate-900 mt-1">{selectedLog.handled ? 'Updated' : (selectedLog.reason || 'Ignored')}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200">
              <p className="text-slate-500 mb-1">Matched Order</p>
              <p className="font-semibold text-slate-900">{selectedLog.matchedOrderNumber || selectedLog.identifiers?.orderNumber || 'N/A'}</p>
              <p className="text-slate-600 mt-1">{selectedLog.orderStatusBefore || '-'} {'->'} {selectedLog.orderStatusAfter || '-'}</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200">
              <p className="text-slate-500 mb-2">Payload</p>
              <pre className="text-[11px] bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto max-h-64">
                {JSON.stringify(selectedLog.payload || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
