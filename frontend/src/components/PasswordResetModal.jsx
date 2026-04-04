import React from 'react';
import Modal from './Modal';
import { KeyRound, Copy, Loader2 } from 'lucide-react';

export default function PasswordResetModal({ isOpen, onClose, user, resetLink, loading, onGenerate }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Password Reset Link"
      icon={KeyRound}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition text-sm"
          >
            Close
          </button>
          <button
            onClick={onGenerate}
            disabled={loading || !!resetLink}
            className="flex-1 px-4 py-2.5 bg-fuchsia-600 text-white font-bold rounded-xl hover:bg-fuchsia-700 transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Link'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Target User</p>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">Name:</span>
            <span className="text-xs font-black text-slate-900">{user?.name}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs font-bold text-slate-500">Email:</span>
            <span className="text-xs font-black text-slate-900 break-all ml-2">{user?.email}</span>
          </div>
        </div>
        {resetLink && (
          <div className="bg-fuchsia-50 border border-fuchsia-100 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-fuchsia-600 uppercase mb-1">Reset Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={resetLink}
                readOnly
                className="flex-1 px-2 py-1 bg-white border border-fuchsia-200 rounded text-xs text-fuchsia-700 font-bold"
              />
              <button
                onClick={handleCopy}
                className="p-2 bg-fuchsia-600 hover:bg-fuchsia-700 rounded text-white transition"
                title="Copy Link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <span className="text-xs text-fuchsia-700 font-bold">Copied!</span>}
            <p className="text-[10px] text-fuchsia-600 mt-2">Share this link with the user to reset their password. Link expires in 1 hour.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
