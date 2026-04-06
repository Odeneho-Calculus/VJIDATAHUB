import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, Edit2, CheckCircle, AlertCircle, Save, X, Lock, Unlock } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { checkers as checkersAPI } from '../services/api';

export default function AdminResultCheckers() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editing, setEditing] = useState(null);
  const [prices, setPrices] = useState({ sellingPrice: '', agentPrice: '', vendorPrice: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const [offersRes, lockRes] = await Promise.all([
        checkersAPI.listOffers('', search, 1, 100),
        checkersAPI.getLockStatus(),
      ]);

      setOffers(offersRes.offers || []);
      setLocked(Boolean(lockRes?.data?.enabled));
    } catch (err) {
      showMessage('error', err.message || 'Failed to load checker offers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await checkersAPI.sync();
      showMessage('success', res.message || 'Checker offers synced');
      await fetchOffers();
    } catch (err) {
      showMessage('error', err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      setSavingLock(true);
      await checkersAPI.updateLockStatus(!locked);
      setLocked((prev) => !prev);
      showMessage('success', !locked ? 'Checker sales locked' : 'Checker sales unlocked');
    } catch (err) {
      showMessage('error', err.message || 'Failed to update checker lock');
    } finally {
      setSavingLock(false);
    }
  };

  const handleToggleStatus = async (offer) => {
    try {
      const res = await checkersAPI.toggleStatus(offer._id);
      setOffers((prev) => prev.map((row) => (row._id === offer._id ? { ...row, status: res.offer?.status } : row)));
      showMessage('success', `Checker ${res.offer?.status === 'active' ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showMessage('error', err.message || 'Failed to toggle checker status');
    }
  };

  const openEdit = (offer) => {
    setEditing(offer);
    setPrices({
      sellingPrice: String(offer.sellingPrice || 0),
      agentPrice: String(offer.agentPrice || 0),
      vendorPrice: String(offer.vendorPrice || 0),
    });
  };

  const savePrices = async () => {
    if (!editing) return;
    try {
      const payload = {
        sellingPrice: Number(prices.sellingPrice || 0),
        agentPrice: Number(prices.agentPrice || 0),
        vendorPrice: Number(prices.vendorPrice || 0),
      };
      await checkersAPI.updatePrices(editing._id, payload);
      setEditing(null);
      showMessage('success', 'Checker prices updated');
      await fetchOffers();
    } catch (err) {
      showMessage('error', err.message || 'Failed to update prices');
    }
  };

  const formatAmount = (value) => `GHc ${Number(value || 0).toFixed(2)}`;

  return (
    <div className="flex min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 overflow-auto bg-slate-50 p-3 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900">Result Checker Config</h1>
              <p className="text-sm text-slate-600 mt-1">Set admin and agent checker prices and availability</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleToggleLock}
                disabled={savingLock}
                className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold border transition flex items-center justify-center gap-2 flex-1 sm:flex-initial ${locked ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                {locked ? <Lock size={16} /> : <Unlock size={16} />}
                {locked ? 'Locked' : 'Unlocked'}
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-3 sm:px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 flex-1 sm:flex-initial"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Checkers'}
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search checker types..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-500">Loading checker offers...</div>
            ) : offers.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No checker offers found</div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-slate-100">
                  {offers.map((offer) => (
                    <div key={offer._id} className="p-3.5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{offer.displayName || offer.checkerType}</p>
                          <p className="text-xs text-slate-500 truncate">{offer.checkerType}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${offer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {offer.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                          <p className="text-slate-500">Cost</p>
                          <p className="font-semibold text-slate-800 mt-0.5">{formatAmount(offer.costPrice)}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                          <p className="text-slate-500">Stock</p>
                          <p className="font-semibold text-slate-800 mt-0.5">{Number(offer.stockCount || 0)}</p>
                          <p className={`mt-0.5 ${offer.available ? 'text-emerald-700' : 'text-slate-500'}`}>{offer.available ? 'Available' : 'Unavailable'}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-2.5 text-xs text-slate-600 space-y-1">
                        <p><span className="font-semibold text-slate-700">Admin:</span> {formatAmount(offer.sellingPrice)}</p>
                        <p><span className="font-semibold text-slate-700">Agent:</span> {formatAmount(offer.agentPrice)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(offer)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                          title="Edit prices"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(offer)}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                          title="Toggle status"
                        >
                          {offer.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] text-slate-600 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Checker</th>
                        <th className="text-left px-4 py-3">Cost</th>
                        <th className="text-left px-4 py-3">Prices</th>
                        <th className="text-left px-4 py-3">Stock</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((offer) => (
                        <tr key={offer._id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{offer.displayName || offer.checkerType}</p>
                            <p className="text-xs text-slate-500">{offer.checkerType}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-700">{formatAmount(offer.costPrice)}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 space-y-1">
                            <p>Admin: {formatAmount(offer.sellingPrice)}</p>
                            <p>Agent: {formatAmount(offer.agentPrice)}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 space-y-1">
                            <p>{offer.available ? 'Available' : 'Unavailable'}</p>
                            <p>Stock: {Number(offer.stockCount || 0)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${offer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {offer.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(offer)} className="p-2 rounded-lg hover:bg-slate-100" title="Edit prices">
                                <Edit2 size={15} className="text-slate-700" />
                              </button>
                              <button onClick={() => handleToggleStatus(offer)} className="p-2 rounded-lg hover:bg-slate-100" title="Toggle status">
                                <CheckCircle size={15} className={offer.status === 'active' ? 'text-emerald-600' : 'text-slate-400'} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Edit Checker Prices</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Admin price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.sellingPrice}
                  onChange={(e) => setPrices((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Agent price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.agentPrice}
                  onChange={(e) => setPrices((prev) => ({ ...prev, agentPrice: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Vendor price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices.vendorPrice}
                  onChange={(e) => setPrices((prev) => ({ ...prev, vendorPrice: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200"
                />
              </label>
            </div>

            <button onClick={savePrices} className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold flex items-center justify-center gap-2">
              <Save size={15} />
              Save prices
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
