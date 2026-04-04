import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Save, Settings2, HandCoins, UserPlus } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import { admin as adminAPI } from '../services/api';

export default function AdminAgentSettings() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    registrationFee: 0,
    minWithdrawal: 0,
    maxWithdrawal: 0,
    withdrawalFeeType: 'fixed',
    withdrawalFeeValue: 0,
    recruitNewAgents: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

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
      const settings = response?.settings || {};

      setFormData({
        registrationFee: Number(settings?.agentFeeSettings?.registrationFee || 0),
        minWithdrawal: Number(settings?.commissionSettings?.minWithdrawal || 0),
        maxWithdrawal: Number(settings?.commissionSettings?.maxWithdrawal || 0),
        withdrawalFeeType: settings?.commissionSettings?.withdrawalFeeType || 'fixed',
        withdrawalFeeValue: Number(settings?.commissionSettings?.withdrawalFeeValue || 0),
        recruitNewAgents: settings?.recruitNewAgents !== false,
      });
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load agent settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      agentFeeSettings: {
        registrationFee: Number(formData.registrationFee || 0),
      },
      commissionSettings: {
        minWithdrawal: Number(formData.minWithdrawal || 0),
        maxWithdrawal: Number(formData.maxWithdrawal || 0),
        withdrawalFeeType: formData.withdrawalFeeType,
        withdrawalFeeValue: Number(formData.withdrawalFeeValue || 0),
      },
      recruitNewAgents: !!formData.recruitNewAgents,
    };

    try {
      setSaving(true);
      await adminAPI.updateSystemSettings(payload);
      showMessage('Agent settings updated successfully');
      await fetchSettings();
    } catch (err) {
      showMessage(err?.message || 'Failed to update agent settings', true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 flex items-center justify-center bg-slate-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading agent settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Agent Settings</h1>
              <p className="text-sm sm:text-base text-slate-600">Configure registration fee, withdrawal fee model, and agent payout limits</p>
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

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
              <StatCard title="Registration Fee" value={formatCurrencyAbbreviated(formData.registrationFee || 0)} icon={Settings2} iconBg="bg-blue-50" iconColor="text-blue-700" />
              <StatCard title="Withdrawal Fee Mode" value={String(formData.withdrawalFeeType).charAt(0).toUpperCase() + String(formData.withdrawalFeeType).slice(1)} icon={HandCoins} iconBg="bg-indigo-50" iconColor="text-indigo-700" />
              <StatCard title="Withdrawal Fee Value" value={formData.withdrawalFeeType === 'percentage' ? `${Number(formData.withdrawalFeeValue || 0)}%` : formatCurrencyAbbreviated(Number(formData.withdrawalFeeValue || 0))} icon={Save} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
              <StatCard title="Recruitment Status" value={formData.recruitNewAgents ? 'Enabled' : 'Disabled'} icon={UserPlus} iconBg="bg-amber-50" iconColor="text-amber-700" />
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Agent Registration Fee (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.registrationFee}
                    onChange={(e) => setFormData((prev) => ({ ...prev, registrationFee: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Withdrawal Fee Type</label>
                  <select
                    value={formData.withdrawalFeeType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, withdrawalFeeType: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm bg-white"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Withdrawal Fee Value ({formData.withdrawalFeeType === 'percentage' ? '%' : 'GHS'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.withdrawalFeeValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, withdrawalFeeValue: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Minimum Withdrawal (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minWithdrawal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minWithdrawal: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Maximum Withdrawal (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxWithdrawal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxWithdrawal: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">Recruit New Agents</label>
                    <p className="text-[10px] text-slate-500">If disabled, new agent registration forms will be locked.</p>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, recruitNewAgents: !prev.recruitNewAgents }))}
                    className={`w-14 h-7 rounded-full transition-all relative ${formData.recruitNewAgents ? 'bg-slate-900' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.recruitNewAgents ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Agent Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
