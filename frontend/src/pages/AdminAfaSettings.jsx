import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Save, Lock, Unlock, Settings2, Info, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { afa } from '../services/api';
import AdminLayout from '../components/AdminLayout';

export default function AdminAfaSettings() {
  const [offer, setOffer] = useState(null);
  const [lockStatus, setLockStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [prices, setPrices] = useState({
    costPrice: 0,
    sellingPrice: 0,
    agentPrice: 0,
    vendorPrice: 0
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [offerRes, lockRes] = await Promise.all([
        afa.getOffer(),
        afa.getLockStatus()
      ]);

      if (offerRes.success) {
        setOffer(offerRes.afaOffer);
        setPrices({
          costPrice: offerRes.afaOffer.costPrice || 0,
          sellingPrice: offerRes.afaOffer.sellingPrice || 0,
          agentPrice: offerRes.afaOffer.agentPrice || 0,
          vendorPrice: offerRes.afaOffer.vendorPrice || 0
        });
      }
      
      if (lockRes.success) {
        setLockStatus(!lockRes.data.enabled); // enabled=true means unlocked
      }
    } catch (err) {
      console.error('Fetch AFA settings error:', err);
      // If offer doesn't exist yet, we might get 404. That's fine.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await afa.sync();
      if (res.success) {
        setOffer(res.afaOffer);
        setPrices({
          costPrice: res.afaOffer.costPrice || 0,
          sellingPrice: res.afaOffer.sellingPrice || 0,
          agentPrice: res.afaOffer.agentPrice || 0,
          vendorPrice: res.afaOffer.vendorPrice || 0
        });
        showMessage('success', 'AFA Registration status synced from Topza');
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to sync AFA status');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await afa.updatePrices(prices);
      if (res.success) {
        setOffer(res.afaOffer);
        showMessage('success', 'AFA prices updated successfully');
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to update prices');
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async () => {
    try {
      const newLockedStatus = !lockStatus;
      const res = await afa.updateLockStatus(!newLockedStatus); // !newLockedStatus means enabled
      if (res.success) {
        setLockStatus(newLockedStatus);
        showMessage('success', `AFA Registration ${newLockedStatus ? 'locked' : 'unlocked'} successfully`);
      }
    } catch (err) {
      showMessage('error', err.message || 'Failed to update lock status');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Settings2 className="w-6 h-6" />
              AFA Registration Settings
            </h1>
            <p className="text-slate-500 font-medium">Manage pricing and availability for AFA Registration service</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:border-slate-900 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync from Topza
            </button>
            <button
              onClick={toggleLock}
              className={`px-4 py-2 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${
                lockStatus ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {lockStatus ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {lockStatus ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border-2 ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="font-bold text-sm">{message.text}</span>
          </div>
        )}

        {!offer ? (
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-8 text-center space-y-4">
            <Info className="w-12 h-12 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-amber-900">AFA Offer not initialized</h3>
              <p className="text-amber-700 font-medium">Click the sync button above to fetch the initial status from Topza.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Service Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topza Status</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Locked</span>
                    <span className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase ${lockStatus ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {lockStatus ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Synced</span>
                    <span className="text-xs font-bold text-slate-700">
                      {offer.lastSyncedAt ? new Date(offer.lastSyncedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-blue-900 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Pricing Note
                </h3>
                <p className="text-xs font-medium text-blue-700 leading-relaxed">
                  The **Cost Price** is the amount Topza deducts from your main wallet. Ensure your markup covers this to remain profitable.
                </p>
              </div>
            </div>

            {/* Pricing Form */}
            <div className="lg:col-span-2">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Pricing Configuration
                </h3>
                
                <form onSubmit={handleUpdatePrices} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cost Price (from Topza)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₵</span>
                        <input
                          type="number"
                          step="0.01"
                          value={prices.costPrice}
                          onChange={(e) => setPrices({...prices, costPrice: parseFloat(e.target.value)})}
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:border-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">User Selling Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₵</span>
                        <input
                          type="number"
                          step="0.01"
                          value={prices.sellingPrice}
                          onChange={(e) => setPrices({...prices, sellingPrice: parseFloat(e.target.value)})}
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:border-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Agent Base Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₵</span>
                        <input
                          type="number"
                          step="0.01"
                          value={prices.agentPrice}
                          onChange={(e) => setPrices({...prices, agentPrice: parseFloat(e.target.value)})}
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:border-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Vendor Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₵</span>
                        <input
                          type="number"
                          step="0.01"
                          value={prices.vendorPrice}
                          onChange={(e) => setPrices({...prices, vendorPrice: parseFloat(e.target.value)})}
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:border-slate-900 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {saving ? 'Saving Changes...' : 'Save Pricing'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
