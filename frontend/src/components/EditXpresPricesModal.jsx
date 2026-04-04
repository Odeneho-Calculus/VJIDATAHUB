import React, { useState, useEffect } from 'react';
import { DollarSign, Save, X } from 'lucide-react';
import Modal from './Modal';

export default function EditXpresPricesModal({ plan, isOpen, onClose, onSave, loading = false }) {
  const [sellingPrice, setSellingPrice] = useState(Number(plan?.sellingPrice) || 0);
  const [agentPrice, setAgentPrice] = useState(Number(plan?.agentPrice) || 0);
  const [vendorPrice, setVendorPrice] = useState(Number(plan?.vendorPrice) || 0);

  // Fix: Reset prices when modal opens or plan changes
  useEffect(() => {
    setSellingPrice(Number(plan?.sellingPrice) || 0);
    setAgentPrice(Number(plan?.agentPrice) || 0);
    setVendorPrice(Number(plan?.vendorPrice) || 0);
  }, [plan, isOpen]);

  const handleSave = () => {
    onSave({
      sellingPrice: Number(sellingPrice),
      agentPrice: Number(agentPrice),
      vendorPrice: Number(vendorPrice)
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? null : onClose}
      title="Update Xpresdata Pricing"
      icon={<DollarSign className="text-emerald-600" size={20} />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Selected Offer</p>
          <p className="text-sm font-black text-slate-900 leading-tight">{plan?.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 uppercase">
              {plan?.isp}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{plan?.volume}GB • {plan?.validity || 'N/A'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tight mb-1">
              Selling Price (User)
            </label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-bold text-sm">GHS</span>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                step="0.01"
                disabled={loading}
                className="w-full pl-11 pr-3 py-2 rounded-xl border-2 border-slate-100 bg-white text-slate-900 font-black text-sm focus:border-emerald-600 focus:ring-0 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tight mb-1">
                Agent Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-bold text-xs">GHS</span>
                <input
                  type="number"
                  value={agentPrice}
                  onChange={(e) => setAgentPrice(e.target.value)}
                  step="0.01"
                  disabled={loading}
                  className="w-full pl-11 pr-3 py-2 rounded-xl border-2 border-slate-100 bg-white text-slate-900 font-black text-xs focus:border-emerald-600 focus:ring-0 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-tight mb-1">
                Vendor Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-bold text-xs">GHS</span>
                <input
                  type="number"
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                  step="0.01"
                  disabled={loading}
                  className="w-full pl-11 pr-3 py-2 rounded-xl border-2 border-slate-100 bg-white text-slate-900 font-black text-xs focus:border-emerald-600 focus:ring-0 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

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
