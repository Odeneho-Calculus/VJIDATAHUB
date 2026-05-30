import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * A reusable Modal component with a solid, clear, and bold design.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-md',
  icon: Icon,
  themeColor // Added themeColor prop
}) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[4px] flex items-center justify-center z-[9999] p-4 sm:p-6 animate-in fade-in duration-300"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl ${maxWidth} w-full border border-slate-200/60 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 sm:px-8 sm:py-7 border-b border-slate-50 bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            {Icon && (
              <div 
                className="p-3 rounded-2xl transition-all duration-300 flex items-center justify-center"
                style={{ background: c.soft, color: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
              >
                {React.isValidElement(Icon) ? Icon : <Icon size={20} strokeWidth={2.5} />}
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-[#111] tracking-tight leading-none uppercase">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl transition-all text-black hover:text-[#111] bg-[#fafaf7] border-1.5 border-[#e4e4de] hover:border-slate-200 active:scale-95"
            aria-label="Close modal"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 sm:px-8 sm:py-6 border-t border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
