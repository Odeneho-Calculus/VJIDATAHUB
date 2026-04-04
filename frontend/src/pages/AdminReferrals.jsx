import { useState, useEffect, useCallback } from 'react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';
import {
  Search,
  Settings,
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI } from '../services/api';
import { ReferralSettingsModal } from '../components/AdminReferralModals';

export default function AdminReferrals() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('events');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    amountPerReferral: 1,
    description: 'Earn GHS per successful referral',
    isEnabled: true
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [referralsRes, settingsRes] = await Promise.all([
        adminAPI.getAllReferrals(),
        adminAPI.getReferralSettings(),
      ]);

      if (referralsRes.success) {
        setReferrals(referralsRes.data);
      }

      if (settingsRes.success) {
        setSettingsForm(settingsRes.data);
      }

      // Basic stats calculation from the list
      const totalEarnings = referralsRes.data
        .filter(r => r.status === 'paid')
        .reduce((acc, curr) => acc + curr.amount, 0);

      setStats({
        totalReferrals: referralsRes.data.length,
        pendingReferrals: referralsRes.data.filter(r => r.status === 'pending').length,
        paidEarnings: totalEarnings,
        activeReferrers: new Set(referralsRes.data.map(r => r.referrer?._id)).size
      });

    } catch (err) {
      setError(err?.message || 'Failed to fetch referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (id, status) => {
    try {
      setUpdateLoading(true);
      const res = await adminAPI.updateReferralStatus(id, status);
      if (res.success) {
        setSuccess(`Referral marked as ${status}`);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setUpdateLoading(true);
      await adminAPI.updateReferralSettings(settingsForm);
      setShowSettingsModal(false);
      setSuccess('Settings updated successfully');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(ref =>
    ref.referrer?.name.toLowerCase().includes(search.toLowerCase()) ||
    ref.referredUser?.name.toLowerCase().includes(search.toLowerCase()) ||
    ref.referrer?.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">Referral Management</h1>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
          >
            <Settings size={18} />
            Settings
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Referrals</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalReferrals || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingReferrals || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">GHS {formatNumberAbbreviated(stats?.paidEarnings) || '0'}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-1">Active Referrers</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.activeReferrers || 0}</p>
              </div>
            </div>

            {/* Notifications */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <CheckCircle size={18} />
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search referrers or referred users..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-100 to-blue-50 border-b-2 border-slate-200">
                      <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Referrer</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Referred User</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Amount</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">Date</th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-4 sm:px-6 py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : filteredReferrals.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 sm:px-6 py-12 text-center text-slate-500">
                          No referrals found
                        </td>
                      </tr>
                    ) : (
                      filteredReferrals.map((ref) => (
                        <tr key={ref._id} className="hover:bg-blue-50 transition">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{ref.referrer?.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{ref.referrer?.email}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{ref.referredUser?.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{ref.referredUser?.email}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-black text-blue-600">GHS {formatNumberAbbreviated(ref.amount)}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${ref.status === 'paid' ? 'bg-green-100 text-green-700' :
                              ref.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                ref.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                              }`}>
                              {ref.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <p className="text-xs font-bold text-slate-900">{new Date(ref.createdAt).toLocaleDateString()}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1">
                              {ref.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(ref._id, 'approved')}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                                    title="Approve"
                                  >
                                    <CheckCircle2 size={18} className="text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(ref._id, 'rejected')}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                                    title="Reject"
                                  >
                                    <XCircle size={18} className="text-red-600" />
                                  </button>
                                </>
                              )}
                              {(ref.status === 'approved' || ref.status === 'pending') && (
                                <button
                                  onClick={() => handleUpdateStatus(ref._id, 'paid')}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                                  title="Mark as Paid"
                                >
                                  <DollarSign size={18} className="text-green-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ReferralSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        onSave={handleUpdateSettings}
        loading={updateLoading}
      />
    </div>
  );
}
