import React, { useState } from 'react';
import { DollarSign, TrendingUp, Save, X, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

export default function EditPricesModal({ plan, isOpen, onClose, onSave, loading = false }) {
  const [costPrice] = useState(Number(plan?.costPrice) || 0);
  const [sellingPrice, setSellingPrice] = useState(Number(plan?.sellingPrice) || 0);

  const calculateMargin = () => {
    const cost = isNaN(costPrice) ? 0 : Number(costPrice);
    const selling = isNaN(sellingPrice) ? 0 : Number(sellingPrice);
    if (cost <= 0) return 0;
    return (((selling - cost) / cost) * 100).toFixed(2);
  };

  const profit = (isNaN(sellingPrice) ? 0 : Number(sellingPrice)) - (isNaN(costPrice) ? 0 : Number(costPrice));
  const margin = calculateMargin();

  const handleSave = () => {
    const cost = isNaN(costPrice) ? 0 : Number(costPrice);
    const selling = isNaN(sellingPrice) ? 0 : Number(sellingPrice);
    onSave(cost, selling);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? null : onClose}
      title="Update Pricing"
      icon={<DollarSign className="text-emerald-600" size={20} />}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Selected Plan</p>
          <p className="text-sm font-black text-slate-900 leading-tight">{plan?.planName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 uppercase">
              {plan?.network}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{plan?.dataSize} • {plan?.validity}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tight mb-1">
              Cost Price (Synced)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">GHS</span>
              <input
                type="number"
                value={isNaN(costPrice) ? 0 : costPrice}
                disabled
                className="w-full pl-11 pr-3 py-2 rounded-xl border-2 border-slate-50 bg-slate-50 text-slate-400 font-black cursor-not-allowed text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-tight mb-1">
              Selling Price
            </label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-bold text-xs">GHS</span>
              <input
                type="number"
                value={isNaN(sellingPrice) ? 0 : sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                step="0.01"
                disabled={loading}
                className="w-full pl-11 pr-3 py-2 rounded-xl border-2 border-slate-100 bg-white text-slate-900 font-black text-sm focus:border-emerald-600 focus:ring-0 transition-all placeholder:text-slate-200"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
            <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">Margin</p>
            <p className="text-lg font-black text-emerald-700">{margin}%</p>
          </div>
          <div className={`p-3 rounded-xl border text-center ${profit >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
            <p className={`text-[9px] font-black uppercase mb-0.5 ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              Profit
            </p>
            <p className={`text-lg font-black ${profit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              {formatCurrencyAbbreviated(profit)}
            </p>
          </div>
        </div>

        {margin < 0 && (
          <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
            <AlertTriangle className="text-rose-600 mt-0.5 flex-shrink-0" size={14} />
            <p className="text-[10px] text-rose-900 font-bold uppercase tracking-tight leading-tight">
              Alert: Selling below cost price! Loss of {formatCurrencyAbbreviated(Math.abs(profit))}.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black uppercase text-[10px] hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
