import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const CONFIG = {
  success: { icon: CheckCircle, iconCls: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Success' },
  error:   { icon: AlertCircle, iconCls: 'text-rose-500',    bg: 'bg-rose-50',    label: 'Error'   },
  info:    { icon: Info,         iconCls: 'text-blue-500',    bg: 'bg-blue-50',    label: 'Info'    },
};

export default function AlertModal({ isOpen, onClose, type = 'info', title, message }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { icon: Icon, iconCls, bg, label } = CONFIG[type] ?? CONFIG.info;
  const heading = title || label;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-slate-100">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
            <Icon size={15} strokeWidth={2.5} className={iconCls} />
          </div>
          <span className="text-sm font-bold text-slate-900 tracking-tight uppercase leading-none flex-1">{heading}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        {message && (
          <div className="px-4 py-3">
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        )}

        {/* Action */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
