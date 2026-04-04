import React from 'react';
import Modal from './Modal';
import { Settings, Save, X } from 'lucide-react';

export const ReferralSettingsModal = ({
  isOpen,
  onClose,
  settingsForm,
  setSettingsForm,
  onSave,
  loading
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Referral Program Settings"
      icon={<Settings className="text-indigo-600" size={20} />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tight mb-1 border-l-2 border-indigo-600 pl-2">
            Reward Amount (GHS)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">GHS</span>
            <input
              type="number"
              className="w-full pl-11 pr-3 py-2 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-black text-sm"
              value={isNaN(settingsForm.amountPerReferral) ? '' : settingsForm.amountPerReferral}
              onChange={(e) => {
                const val = e.target.value;
                setSettingsForm({
                  ...settingsForm,
                  amountPerReferral: val === '' ? 0 : parseFloat(val)
                });
              }}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tight mb-1 border-l-2 border-indigo-200 pl-2">
            Program Description
          </label>
          <textarea
            className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-medium text-sm min-h-[80px]"
            rows="2"
            value={settingsForm.description}
            onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
            placeholder="Describe the referral program..."
          ></textarea>
        </div>

        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="isEnabled"
                className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-indigo-200 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                checked={settingsForm.isEnabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, isEnabled: e.target.checked })}
              />
              <CheckIcon className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 top-1 left-1 pointer-events-none" />
            </div>
            <span className="text-[11px] font-black text-indigo-900 uppercase tracking-tight">
              Enable Referral Program
            </span>
          </label>
          <p className="mt-1.5 text-[10px] text-indigo-500 font-bold ml-7 leading-tight">
            Off: Hide referrals and stop tracking rewards.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-black text-slate-600 hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={14} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const CheckIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={4}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
