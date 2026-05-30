import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import Modal from './Modal';

export function VerifyingPaymentModal({ isOpen, themeColor }) {
  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Verifying"
      icon={Sparkles}
      maxWidth="max-w-sm"
      themeColor={c}
      footer={null}
    >
      <div className="text-center space-y-4 py-2">
        <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center border border-slate-100" style={{ background: c.soft }}>
          <Loader2 size={28} className="animate-spin" style={{ color: c.main }} />
        </div>
        <div>
          <p className="text-sm font-black text-[#111] uppercase tracking-tight">Checking payment...</p>
          <p className="text-xs font-bold text-black mt-1">Please wait while we verify this transaction.</p>
        </div>
        <div className="flex justify-center gap-1">
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ background: c.main + '88' }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.1s]" style={{ background: c.main + 'BB' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: c.main }} />
        </div>
      </div>
    </Modal>
  );
}

export function VerifiedPaymentModal({ isOpen, onClose, message = 'Payment verified successfully.', themeColor }) {
  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verified"
      icon={CheckCircle2}
      maxWidth="max-w-sm"
      themeColor={c}
      footer={
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          style={{ background: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
        >
          Close Feedback
        </button>
      }
    >
      <div className="text-center space-y-4 py-2">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-base font-black text-[#111] uppercase tracking-tight">Success!</p>
          <p className="text-xs font-bold text-black mt-1">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
