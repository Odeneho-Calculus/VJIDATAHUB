import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import Modal from './Modal';

export function VerifyingPaymentModal({ isOpen }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Verifying Payment"
      icon={Sparkles}
      maxWidth="max-w-sm"
      footer={null}
    >
      <div className="text-center space-y-4 py-2">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <Loader2 size={28} className="text-amber-600 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Checking payment with Paystack...</p>
          <p className="text-xs text-slate-500 mt-1">Please wait a moment while we verify this transaction.</p>
        </div>
        <div className="flex justify-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.2s]" />
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.1s]" />
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" />
        </div>
      </div>
    </Modal>
  );
}

export function VerifiedPaymentModal({ isOpen, onClose, message = 'Payment verified successfully.' }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Verified"
      icon={CheckCircle2}
      maxWidth="max-w-sm"
      footer={
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition text-sm"
        >
          Nice!
        </button>
      }
    >
      <div className="text-center space-y-4 py-2">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Verification completed</p>
          <p className="text-xs text-slate-500 mt-1">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
