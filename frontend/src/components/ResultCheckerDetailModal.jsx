import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, Copy, CheckCircle2, CreditCard, Smartphone, Calendar, Hash, Tag, FileText, AlertCircle } from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

const statusStyles = {
  completed: { bg: '#ECFDF5', color: '#059669', border: '#05966933' },
  failed: { bg: '#FFF1F2', color: '#DC2626', border: '#DC262633' },
  pending: { bg: '#FEF3C7', color: '#D97706', border: '#D9770633' },
  processing: { bg: '#DBEAFE', color: '#2563EB', border: '#2563EB33' },
};

const getStatusStyle = (status) => {
  return statusStyles[status] || statusStyles.pending;
};

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ResultCheckerDetailModal({ isOpen, onClose, order }) {
  const [pinVisible, setPinVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const hasPin = Boolean(order.pin || order.metadata?.pin);
  const hasSerial = Boolean(order.serialNumber || order.metadata?.serialNumber);

  const buildCopyText = () => {
    const lines = [
      `Transaction ID: ${order.purchaseId || order.orderNumber || '—'}`,
      `Checker Type: ${order.checkerType || '—'}`,
      `Beneficiary: ${order.phoneNumber || '—'}`,
      `Amount: ${formatCurrencyAbbreviated(order.price || order.amount || 0)}`,
      `Status: ${order.status || '—'}`,
      `Payment Method: ${order.metadata?.paymentMethod || order.paymentMethod || '—'}`,
      `Date: ${formatDate(order.createdAt)}`,
    ];

    if (hasSerial) {
      lines.push(`Serial Number: ${order.serialNumber || order.metadata?.serialNumber}`);
    }
    if (hasPin) {
      lines.push(`PIN: ${order.pin || order.metadata?.pin}`);
    }
    if (order.reference) {
      lines.push(`Reference: ${order.reference}`);
    }
    if (order.metadata?.providerStatus) {
      lines.push(`Provider Status: ${order.metadata.providerStatus}`);
    }

    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy checker details:', err);
    }
  };

  const displayPin = order.pin || order.metadata?.pin;
  const displaySerial = order.serialNumber || order.metadata?.serialNumber;
  const paymentMethod = order.metadata?.paymentMethod || order.paymentMethod || '—';
  const providerStatus = order.metadata?.providerStatus || order.providerStatus;
  const providerMessage = order.metadata?.providerMessage || order.providerMessage;
  const statusStyle = getStatusStyle(order.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checker-detail-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#e4e4de] bg-white p-6 shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CreditCard size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h3 id="checker-detail-title" className="text-lg font-black text-[#111]">
              Result Checker Details
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {order.checkerType || 'Checker'} Purchase
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#e4e4de] bg-[#fafaf7] p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
            <span
              className="chk-badge mt-1 inline-block rounded-md px-3 py-1 text-[11px] font-black uppercase"
              style={{
                background: statusStyle.bg,
                color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`,
              }}
            >
              {order.status || 'pending'}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</p>
            <p className="text-xl font-black text-[#111]">{formatCurrencyAbbreviated(order.price || order.amount || 0)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <DetailRow icon={<Hash size={16} />} label="Transaction ID" value={`#${order.purchaseId || order.orderNumber || '—'}`} />
          <DetailRow icon={<Tag size={16} />} label="Checker Type" value={order.checkerType || '—'} />
          <DetailRow icon={<Smartphone size={16} />} label="Beneficiary" value={order.phoneNumber || '—'} />
          <DetailRow icon={<CreditCard size={16} />} label="Payment Method" value={paymentMethod} />
          <DetailRow icon={<Calendar size={16} />} label="Purchase Date" value={formatDate(order.createdAt)} />
          {order.reference && (
            <DetailRow icon={<FileText size={16} />} label="Reference" value={order.reference} />
          )}

          {(hasPin || hasSerial) && (
            <div className="rounded-xl border border-[#e4e4de] bg-[#fafaf7] p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Delivered Credentials</p>

              {hasSerial && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Serial Number</p>
                  <p className="font-mono text-sm font-black text-[#111]">{displaySerial}</p>
                </div>
              )}

              {hasPin && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">PIN</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-base font-black tracking-tight text-[#111]">
                      {pinVisible ? displayPin : '•••• •••• ••••'}
                    </p>
                    <button
                      onClick={() => setPinVisible((v) => !v)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200"
                      aria-label={pinVisible ? 'Hide PIN' : 'Show PIN'}
                    >
                      {pinVisible ? <EyeOff size={16} strokeWidth={2.5} /> : <Eye size={16} strokeWidth={2.5} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {providerMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-amber-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider">Provider Message</p>
                <p className="text-xs font-semibold">{providerMessage}</p>
              </div>
            </div>
          )}

          {providerStatus && !providerMessage && (
            <DetailRow icon={<FileText size={16} />} label="Provider Status" value={providerStatus} />
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#111] px-4 py-3 text-sm font-black text-white transition-all hover:bg-[#333] active:scale-[0.98]"
          >
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy Details'}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#e4e4de] bg-white px-5 py-3 text-sm font-black text-[#111] transition-colors hover:bg-[#fafaf7]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-[#111]">{value}</p>
      </div>
    </div>
  );
}
