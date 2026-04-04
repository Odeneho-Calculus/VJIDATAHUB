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
  icon: Icon
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

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4 sm:p-6 animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl ${maxWidth} w-full border border-slate-200/60 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 sm:px-8 sm:py-6 border-b border-slate-50 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2.5 bg-primary-50 rounded-2xl text-primary-600 transition-transform hover:scale-105">
                {React.isValidElement(Icon) ? Icon : <Icon size={20} strokeWidth={2.5} />}
              </div>
            )}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-50 rounded-xl transition-all text-slate-300 hover:text-rose-500 active:scale-95"
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
