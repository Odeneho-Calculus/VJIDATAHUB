import React from 'react';
import { Database, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function ViewXpresOfferModal({ plan, isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Offer Details"
      icon={<Database className="text-primary-600" size={20} />}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-[24px] border border-blue-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Offer Name</p>
          <p className="text-xl font-black text-slate-900 leading-tight">{plan?.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailItem
            label="ISP"
            value={plan?.isp}
            subValue="Network Provider"
          />
          <DetailItem
            label="Volume"
            value={`${plan?.volume}GB`}
            subValue="Data Size"
          />
          <DetailItem
            label="Type"
            value={plan?.type}
            subValue="Offer Type"
          />
          <DetailItem
            label="Validity"
            value={plan?.validity || 'N/A'}
            subValue="Duration"
          />
        </div>

        <div className="p-5 bg-slate-50/50 rounded-[24px] border border-slate-100/60 shadow-inner">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">User Price</p>
              <p className="text-base font-black text-slate-900 leading-none">{formatCurrencyAbbreviated(plan?.sellingPrice)}</p>
            </div>
            <div className="text-center border-x border-slate-100 px-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Agent Price</p>
              <p className="text-base font-black text-primary-600 leading-none">{formatCurrencyAbbreviated(plan?.agentPrice)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vendor Price</p>
              <p className="text-base font-black text-slate-900 leading-none">{formatCurrencyAbbreviated(plan?.vendorPrice)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black text-center uppercase tracking-widest border flex items-center justify-center gap-2 ${plan?.status === 'active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
            {plan?.status === 'active' ? <CheckCircle size={14} strokeWidth={2.5} /> : <XCircle size={14} strokeWidth={2.5} />}
            {plan?.status === 'active' ? 'Active' : 'Inactive'}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          Dismiss Details
        </button>
      </div>
    </Modal>
  );
}

const DetailItem = ({ label, value, subValue, variant = 'default' }) => {
  const colors = {
    default: 'text-slate-900',
    success: 'text-emerald-600',
    danger: 'text-rose-600',
  };

  return (
    <div className="p-4 bg-white border border-slate-100 rounded-[20px] transition-all hover:border-primary-100 hover:shadow-sm">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-black ${colors[variant]}`}>{value}</p>
      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">{subValue}</p>
    </div>
  );
};
