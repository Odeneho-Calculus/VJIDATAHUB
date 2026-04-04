import React from 'react';
import Modal from './Modal';
import { Database, Calendar, CreditCard, Tag, Info, Hash } from 'lucide-react';
import { formatNumberAbbreviated } from '../utils/formatCurrency';

export const VtuTransactionDetailsModal = ({ isOpen, onClose, transaction, provider = 'XpresData' }) => {
  if (!transaction) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    successful: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const metadata = transaction.metadata || {};
  const datamartData = metadata.datamartResponse?.data || {};

  const reference = metadata.providerReference || metadata.datamartReference || transaction.reference || transaction._id || 'N/A';
  const transactionId = datamartData.transactionReference || metadata.datamartTransactionId || transaction.transactionId || 'N/A';
  const balanceBefore = datamartData.balanceBefore ?? transaction.oldBalance ?? 0;
  const balanceAfter = datamartData.balanceAfter ?? transaction.newBalance ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Details"
      icon={<Database className="text-cyan-600" size={20} />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Main Status & Amount */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex flex-col">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">
              {transaction.transactionType?.replace('_', ' ') || 'TRANSACTION'}
            </p>
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
              <span className="text-sm text-slate-400">GHS</span>
              {typeof transaction.amount === 'number' ? formatNumberAbbreviated(transaction.amount) : '0'}
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border ${statusColors[transaction.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {transaction.status}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DetailItem
            icon={<Calendar size={14} className="text-slate-400" />}
            label="Date & Time"
            value={formatDate(transaction.date || transaction.createdAt)}
          />
          <DetailItem
            icon={<Hash size={14} className="text-slate-400" />}
            label="Reference"
            value={reference}
          />
          <DetailItem
            icon={<Tag size={14} className="text-slate-400" />}
            label="Provider ID"
            value={transactionId}
          />
          <DetailItem
            icon={<CreditCard size={14} className="text-slate-400" />}
            label="Balance (Old/New)"
            value={`GHS ${formatNumberAbbreviated(Number(balanceBefore))} → GHS ${formatNumberAbbreviated(Number(balanceAfter))}`}
          />
        </div>

        {transaction.description && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase mb-1">
              <Info size={12} />
              Description
            </label>
            <p className="text-xs font-bold text-slate-700 leading-tight">
              {transaction.description}
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-md"
        >
          Close Details
        </button>
      </div>
    </Modal>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{label}</span>
    </div>
    <div className="text-xs font-black text-slate-900 break-all">{value}</div>
  </div>
);
