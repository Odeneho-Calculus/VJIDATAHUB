import React from 'react';
import { Info, Database, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function ViewPlanModal({ plan, isOpen, onClose }) {
  const calculateMargin = (costPrice, sellingPrice) => {
    if (costPrice <= 0) return 0;
    return (((sellingPrice - costPrice) / costPrice) * 100).toFixed(2);
  };

  const margin = plan ? calculateMargin(plan.costPrice, plan.sellingPrice) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Details"
      icon={<Database className="text-primary-600" size={20} />}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-primary-50 to-blue-50/50 p-5 rounded-[24px] border border-primary-100/50 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary-100/20 rounded-full blur-xl transition-transform group-hover:scale-150 duration-700" />
          <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1 relative z-10">Plan Name</p>
          <p className="text-xl font-black text-slate-900 leading-tight relative z-10">{plan?.planName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DetailItem
            label="Network"
            value={plan?.network}
            subValue="Provider"
          />
          <DetailItem
            label="Data Size"
            value={plan?.dataSize}
            subValue="Capacity"
          />
          <DetailItem
            label="Validity"
            value={plan?.validity}
            subValue="Duration"
          />
          <DetailItem
            label="Stock Status"
            value={plan?.inStock ? 'In Stock' : 'Out of Stock'}
            subValue="Availability"
            variant={plan?.inStock ? 'success' : 'danger'}
          />
        </div>

        <div className="p-5 bg-slate-50/50 rounded-[28px] border border-slate-100/60 shadow-inner space-y-4">
          <div className="flex justify-between items-end border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost Price</p>
              <p className="text-lg font-black text-slate-600 leading-none">{formatCurrencyAbbreviated(plan?.costPrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Selling Price</p>
              <p className="text-3xl font-black text-primary-600 leading-none">{formatCurrencyAbbreviated(plan?.sellingPrice)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1 bg-emerald-100 rounded-lg text-emerald-600">
                  <TrendingUp size={12} strokeWidth={3} />
                </div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Margin</p>
              </div>
              <p className="text-xl font-black text-emerald-700 leading-none">{margin}%</p>
            </div>
            <div className="p-4 bg-primary-50/50 rounded-2xl border border-primary-100/60 transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1 bg-primary-100 rounded-lg text-primary-600">
                  <Database size={12} strokeWidth={3} />
                </div>
                <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none">Profit</p>
              </div>
              <p className="text-xl font-black text-primary-700 leading-none">{formatCurrencyAbbreviated(plan?.sellingPrice - plan?.costPrice)}</p>
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
          {plan?.isEdited && (
            <div className="flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black text-center uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center gap-2">
              <Info size={14} strokeWidth={2.5} />
              Customized
            </div>
          )}
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
    <div className="p-3 bg-white border border-slate-100 rounded-xl">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">{label}</p>
      <p className={`text-xs font-black ${colors[variant]}`}>{value}</p>
      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">{subValue}</p>
    </div>
  );
};
