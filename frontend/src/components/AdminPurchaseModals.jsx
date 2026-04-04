import React from 'react';
import { ShoppingBag, User, Briefcase } from 'lucide-react';
import Modal from './Modal';
import { formatNumberAbbreviated } from '../utils/formatCurrency';

export const PurchaseDetailsModal = ({ isOpen, onClose, purchase }) => {
  if (!purchase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Details"
      icon={ShoppingBag}
      maxWidth="max-w-xl"
      footer={
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md text-sm"
        >
          Close Details
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">Purchase Ref</p>
            <p className="text-[10px] font-mono font-black text-slate-900 break-all">{purchase.id || purchase._id}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-1">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${purchase.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : purchase.status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                {purchase.status || 'N/A'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">Date</p>
              <p className="text-xs font-black text-slate-900">{new Date(purchase.date || purchase.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <User size={14} className="text-blue-600" />
            Customer Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 bg-white border-2 border-slate-50 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Name</p>
              <p className="text-xs font-black text-slate-900">{purchase.user?.name || purchase.userId?.name || 'Unknown'}</p>
            </div>
            <div className="p-2.5 bg-white border-2 border-slate-50 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Email</p>
              <p className="text-xs font-black text-slate-900 truncate">{purchase.user?.email || purchase.userId?.email || 'N/A'}</p>
            </div>
            <div className="p-2.5 bg-white border-2 border-slate-50 rounded-xl sm:col-span-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Phone</p>
              <p className="text-xs font-black text-slate-900">{purchase.phoneNumber || purchase.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Briefcase size={14} className="text-blue-600" />
            Product Info
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-white border-2 border-slate-50 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Network</p>
              <p className="text-xs font-black text-slate-900">{purchase.network || 'N/A'}</p>
            </div>
            <div className="p-2.5 bg-white border-2 border-slate-50 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Plan</p>
              <p className="text-xs font-black text-slate-900">{purchase.planName || 'N/A'}</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl col-span-2 flex justify-between items-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Paid Amount</p>
              <p className="text-lg font-black text-blue-700">GHS {formatNumberAbbreviated(purchase.amount) || '0'}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
