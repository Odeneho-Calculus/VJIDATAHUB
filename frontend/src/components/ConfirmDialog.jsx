import { useEffect } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
  themeColor
}) {
  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px] animate-in fade-in duration-200"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[360px] border border-slate-200/60 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
          <div className="p-2 rounded-lg" style={{ background: isDangerous ? '#fee2e2' : c.soft, color: isDangerous ? '#dc2626' : c.main }}>
            {isDangerous
              ? <AlertTriangle size={18} strokeWidth={2.5} />
              : <HelpCircle size={18} strokeWidth={2.5} />}
          </div>
          <h3 className="text-base font-black text-[#111] tracking-tight uppercase leading-none">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-[14px] text-black font-bold leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-[#fafaf7] border-1.5 border-[#e4e4de] hover:text-[#111] hover:border-slate-200 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95"
            style={{ 
              background: isDangerous ? '#DC2626' : c.main,
              boxShadow: isDangerous ? '0 4px 12px rgba(220,38,38,0.2)' : `0 4px 12px ${c.glow}`
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
