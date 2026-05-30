import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const CONFIG = {
  success: { icon: CheckCircle, main: '#10B981', soft: '#ECFDF5', glow: 'rgba(16,185,129,0.15)', label: 'Success' },
  error:   { icon: AlertCircle, main: '#EF4444', soft: '#FEF2F2', glow: 'rgba(239,68,68,0.15)', label: 'Error' },
  info:    { icon: Info,        main: '#3B82F6', soft: '#EFF6FF', glow: 'rgba(59,130,246,0.15)', label: 'Info' },
};

export default function AlertModal({ isOpen, onClose, type = 'info', title, message, themeColor }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cfg = CONFIG[type] ?? CONFIG.info;
  const c = themeColor || cfg;
  const Icon = cfg.icon;
  const heading = title || cfg.label;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px] animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm border border-slate-200/60 overflow-hidden animate-in zoom-in-95 duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-50">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
            style={{ background: c.soft, color: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
          >
            <Icon size={20} strokeWidth={2.5} />
          </div>
          <span className="text-base font-black text-[#111] tracking-tight uppercase leading-none flex-1">{heading}</span>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-black hover:text-[#111] bg-[#fafaf7] border-1.5 border-[#e4e4de] hover:border-slate-200 transition-all active:scale-90"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        {message && (
          <div className="px-6 py-5">
            <p className="text-sm font-bold text-black leading-relaxed">{message}</p>
          </div>
        )}

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all shadow-xl active:scale-95"
            style={{ background: c.main, boxShadow: `0 8px 20px ${c.glow}` }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
