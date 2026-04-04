import React from 'react';
import { Database, User, Tag, Calendar, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import { formatNumberAbbreviated } from '../utils/formatCurrency';

export const TransactionDetailsModal = ({ isOpen, onClose, transaction, typeLabels, statusColors }) => {
  if (!transaction) return null;

  const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
  const paymentStatus = transaction?.paymentStatus
    ? normalizeStatus(transaction.paymentStatus)
    : (['successful', 'completed', 'success'].includes(normalizeStatus(transaction?.status)) ? 'completed' : normalizeStatus(transaction?.status) || 'pending');
  const orderStatus = normalizeStatus(transaction?.type) === 'data_purchase'
    ? (normalizeStatus(transaction?.status) || 'pending')
    : 'n/a';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Details"
      icon={Database}
      maxWidth="max-w-sm"
      footer={
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition text-sm"
        >
          Close Details
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Reference ID</p>
            <p className="text-[10px] font-mono font-black text-slate-900 break-all">{transaction.reference || transaction._id}</p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Payment</p>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${statusColors[paymentStatus] || 'bg-slate-100 text-slate-700'}`}>
                {paymentStatus}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Order</p>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${orderStatus === 'n/a' ? 'bg-slate-100 text-slate-500' : (statusColors[orderStatus] || 'bg-slate-100 text-slate-700')}`}>
                {orderStatus === 'n/a' ? 'N/A' : orderStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-2.5 bg-white border border-slate-200 rounded-xl">
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
              <User size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
              <p className="text-sm font-black text-slate-900 truncate">{transaction.userId?.name || 'Unknown User'}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate">{transaction.userId?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 bg-white border border-slate-200 rounded-xl">
            <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600 flex-shrink-0">
              <Tag size={14} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Type & Details</p>
              <p className="text-sm font-black text-slate-900">{typeLabels[transaction.type] || transaction.type}</p>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">{transaction.description || 'No description'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 flex-shrink-0">
              <ShieldCheck size={14} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Financials</p>
              <p className="text-lg font-black text-emerald-700">
                {transaction.currency || 'GHS'} {formatNumberAbbreviated(transaction.amount)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 bg-white border border-slate-200 rounded-xl">
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 flex-shrink-0">
              <Calendar size={14} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</p>
              <p className="text-xs font-black text-slate-900">
                {new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
