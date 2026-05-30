import React from 'react';
import Modal from './Modal';
import { Settings, Save, X } from 'lucide-react';

export const ReferralSettingsModal = ({
  isOpen,
  onClose,
  settingsForm,
  setSettingsForm,
  onSave,
  loading,
  themeColor
}) => {
  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Referral Program Settings"
      icon={<Settings size={20} />}
      maxWidth="max-w-md"
      themeColor={c}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-black uppercase tracking-tight mb-1 border-l-2 pl-2" style={{ borderColor: c.main }}>
            Reward Amount (GHS)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-black text-sm">GHS</span>
            <input
              type="number"
              className="w-full pl-11 pr-3 py-2 bg-white border-2 border-slate-100 rounded-xl focus:ring-0 transition-all font-black text-sm"
              style={{ outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = c.main; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; }}
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
          <label className="block text-[10px] font-black text-black uppercase tracking-tight mb-1 border-l-2 pl-2" style={{ borderColor: c.main + '66' }}>
            Program Description
          </label>
          <textarea
            className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl focus:ring-0 transition-all font-medium text-sm min-h-[80px]"
            style={{ outline: 'none' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = c.main; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; }}
            rows="2"
            value={settingsForm.description}
            onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
            placeholder="Describe the referral program..."
          ></textarea>
        </div>

        <div className="p-3 rounded-xl border" style={{ background: c.soft, borderColor: c.main + '22' }}>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="isEnabled"
                className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 transition-all"
                style={{ borderColor: c.main + '33' }}
                checked={settingsForm.isEnabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, isEnabled: e.target.checked })}
              />
              <CheckIcon className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 top-1 left-1 pointer-events-none" style={{ color: c.main }} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-tight" style={{ color: c.main }}>
              Enable Referral Program
            </span>
          </label>
          <p className="mt-1.5 text-[10px] font-bold ml-7 leading-tight" style={{ color: c.main + 'aa' }}>
            Off: Hide referrals and stop tracking rewards.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-black text-black hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="flex-[2] px-4 py-2.5 text-white rounded-xl font-black hover:opacity-90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
            style={{ background: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
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

const CheckIcon = ({ className, style }) => (
  <svg
    className={className}
    style={style}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={4}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
