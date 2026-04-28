import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, DollarSign, X, Settings, Activity, Globe, Clock, Phone, Wifi, Eye, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import { OrderDetailsModal } from '../components/AdminOrderModals';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI, digimall as digimallAPI, topza as topzaAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function AdminVtuSettings() {
  const TOPZA_WALLET_URL = 'https://www.topzagh.com/wallet';
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings: globalSettings, updateVtuProvider } = useSettings();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [systemSettings, setSystemSettings] = useState(globalSettings || { vtuProvider: 'xpresdata' });
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [networkCatalog, setNetworkCatalog] = useState([]);
  const [newNetwork, setNewNetwork] = useState({ name: '', slug: '', logoUrl: '', isActive: true });

  // DigiMall-specific network state (fetched from API/DB � name+id are readonly, admin sets logo)
  const [DigiMallNetworks, setDigiMallNetworks] = useState([]);
  const [DigiMallNetworksLoading, setDigiMallNetworksLoading] = useState(false);
  const [topzaNetworks, setTopzaNetworks] = useState([]);
  const [topzaNetworksLoading, setTopzaNetworksLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  const [pollingTopza, setPollingTopza] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const activeProvider = systemSettings?.vtuProvider || 'topza';

  const showMessage = (msg, isError = false) => {
    if (isError) {
      toast.error(msg, { duration: 5000 });
    } else {
      toast.success(msg, { duration: 3000 });
    }
  };
  const activeProviderDisplayName = activeProvider === 'digimall'
    ? 'DigiMall'
    : (activeProvider === 'topza' ? 'Topza' : 'XpresData');

  const formatPrice2dpNoRound = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0.00';

    const sign = numeric < 0 ? '-' : '';
    let absString = Math.abs(numeric).toString();

    if (absString.includes('e')) {
      absString = Math.abs(numeric).toLocaleString('en-US', {
        useGrouping: false,
        maximumFractionDigits: 20,
      });
    }

    const [whole, fraction = ''] = absString.split('.');
    return `${sign}${whole}.${(fraction + '00').slice(0, 2)}`;
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await adminAPI.getSystemSettings();
      if (response.success) {
        setSystemSettings(response.settings);
        const catalog = response.settings?.networkCatalog || [];
        setNetworkCatalog(catalog);
        // If DigiMall is active, pass the fresh catalog so logo URLs merge correctly
        if ((response.settings?.vtuProvider || 'xpresdata') === 'digimall') {
          fetchDigiMallNetworks(catalog);
        }
        if ((response.settings?.vtuProvider || 'xpresdata') === 'topza') {
          fetchTopzaNetworks(catalog);
        }
      }
    } catch (err) {
      console.error('Failed to fetch system settings', err);
    }
  };

  const fetchWalletSettings = async (provider, { silent = false } = {}) => {
    const prov = provider || activeProvider;
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = prov === 'digimall'
        ? await adminAPI.getDigimallWalletSettings()
        : (prov === 'topza'
          ? await adminAPI.getTopzaWalletSettings()
          : await adminAPI.getXpresDataWalletSettings());
      if (response.success) {
        setWalletData(response.data);
        if (response.data?.error) {
          const providerLabel = prov === 'digimall' ? 'DigiMall' : (prov === 'topza' ? 'Topza' : 'XpresData');
          setError(`${providerLabel} API Error: ${response.data.error}`);
        }
      } else {
        setError(response.message || 'Failed to fetch wallet settings');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch wallet settings');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchSystemSettings(); }, []);
  useEffect(() => { fetchWalletSettings(activeProvider); }, [activeProvider]); // eslint-disable-line
  useEffect(() => {
    if (globalSettings) {
      setSystemSettings(globalSettings);
      setNetworkCatalog(globalSettings?.networkCatalog || []);
    }
  }, [globalSettings]);

  // Fetch DigiMall networks whenever DigiMall becomes active
  useEffect(() => {
    if (activeProvider === 'digimall') {
      fetchDigiMallNetworks();
      fetchDigiMallTransactions();
    } else if (activeProvider === 'topza') {
      fetchTopzaNetworks();
      fetchTopzaTransactions();
    }
  }, [activeProvider]); // eslint-disable-line

  const fetchDigiMallTransactions = async () => {
    try {
      setTransactionsLoading(true);
      setTransactionsError('');
      // DigiMall currently has no admin transactions endpoint in this app.
      setTransactions([]);
    } catch (err) {
      setTransactionsError(err?.message || 'Failed to fetch transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchTopzaTransactions = async ({ silent = false } = {}) => {
    try {
      if (!silent) setTransactionsLoading(true);
      setTransactionsError('');
      const response = await adminAPI.getTopzaWalletTransactions(1, 25);
      if (response.success) {
        setTransactions(Array.isArray(response.transactions) ? response.transactions : []);
      } else {
        setTransactions([]);
        setTransactionsError(response.message || 'Failed to fetch Topza transactions');
      }
    } catch (err) {
      setTransactionsError(err?.message || 'Failed to fetch Topza transactions');
    } finally {
      if (!silent) setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProvider !== 'topza') {
      setPollingTopza(false);
      return undefined;
    }

    let cancelled = false;
    setPollingTopza(true);

    const pollTopza = async () => {
      try {
        await Promise.all([
          fetchWalletSettings('topza', { silent: true }),
          fetchTopzaTransactions({ silent: true }),
        ]);
      } catch (_) {
        // Ignore background polling errors; existing UI error handling remains in fetch helpers.
      }
    };

    const intervalId = setInterval(async () => {
      if (cancelled) return;
      await pollTopza();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      setPollingTopza(false);
    };
  }, [activeProvider]); // eslint-disable-line

  const handleTopzaRefresh = async () => {
    try {
      setSyncing(true);
      await Promise.all([
        fetchWalletSettings('topza', { silent: false }),
        fetchTopzaTransactions({ silent: false }),
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const openTransactionDetails = (txn) => {
    const item = txn?.order_items?.[0] || {};
    const statusValue = item.status || txn.status || txn.transaction_status || '';
    const normalized = {
      ...txn,
      orderNumber: txn.orderNumber || txn.orderId || txn.reference || txn.id || 'N/A',
      status: String(statusValue || 'pending').toLowerCase(),
      phoneNumber: item.beneficiary_number || txn.phoneNumber || txn.recipient_msisdn || txn.phone || txn.recipient || 'N/A',
      network: item.network || txn.network || txn.network_name || 'N/A',
      dataAmount: item.volume || txn.dataAmount || 'N/A',
      planName: txn.planName || item.volume || txn.dataAmount || 'N/A',
      amount: Number(txn.amount || 0),
      createdAt: txn.createdAt || txn.created_at || txn.lastUpdated || txn.date || txn.timestamp || null,
    };

    setSelectedTransaction(normalized);
    setShowOrderDetailsModal(true);
  };

  const handleRefund = (order) => {
    setSelectedTransaction(order);
    setShowRefundConfirm(true);
    setShowOrderDetailsModal(false);
  };

  const confirmRefund = async () => {
    if (!selectedTransaction) return;

    try {
      setRefundLoading(true);
      const response = await adminAPI.refundOrder(
        selectedTransaction.id || selectedTransaction._id,
        'Refund processed by admin from VTU settings'
      );

      if (response.success) {
        setShowRefundConfirm(false);
        showMessage('Order refunded successfully', false);
        
        // Update the transaction with the new order data to reflect isRefunded status
        if (response.order) {
          const updatedTransaction = {
            ...selectedTransaction,
            ...response.order,
            isRefunded: true,
          };
          setSelectedTransaction(updatedTransaction);
          setShowOrderDetailsModal(true);
        }
        
        // Refresh transactions to update the list
        if (activeProvider === 'topza') {
          await fetchTopzaTransactions();
        }
      } else {
        showMessage(response.message || 'Failed to refund order', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to refund order', true);
    } finally {
      setRefundLoading(false);
    }
  };

  const fetchDigiMallNetworks = async (catalog) => {
    try {
      setDigiMallNetworksLoading(true);
      const response = await digimallAPI.getNetworks();
      if (response.success && Array.isArray(response.networks)) {
        // Merge with saved logo URLs from networkCatalog (match by slug = String(networkId))
        const existing = catalog || networkCatalog;
        const merged = response.networks
          .filter((n) => n && n.networkId !== undefined && n.name !== undefined)
          .map((n) => {
            const saved = existing.find((c) => c.slug === String(n.networkId));
            return { networkId: n.networkId, name: n.name, logoUrl: saved?.logoUrl || '' };
          });
        setDigiMallNetworks(merged);
      }
    } catch (err) {
      console.error('Failed to fetch DigiMall networks:', err);
    } finally {
      setDigiMallNetworksLoading(false);
    }
  };

  const fetchTopzaNetworks = async (catalog) => {
    try {
      setTopzaNetworksLoading(true);
      const response = await topzaAPI.getNetworks();
      if (response.success && Array.isArray(response.networks)) {
        const existing = catalog || networkCatalog;
        const merged = response.networks
          .filter((n) => n && n.networkId !== undefined && n.name !== undefined)
          .map((n) => {
            const key = String(n.code || n.networkId);
            const saved = existing.find((c) => c.slug === key);
            return {
              networkId: n.networkId,
              code: n.code || null,
              name: n.name,
              logoUrl: saved?.logoUrl || '',
            };
          });
        setTopzaNetworks(merged);
      }
    } catch (err) {
      console.error('Failed to fetch Topza networks:', err);
    } finally {
      setTopzaNetworksLoading(false);
    }
  };

  const handleProviderSwitch = async (newProvider) => {
    if (newProvider === activeProvider || switchingProvider) return;
    try {
      setSwitchingProvider(true);
      setError('');
      await adminAPI.updateSystemSettings({ vtuProvider: newProvider });
      const updated = { ...systemSettings, vtuProvider: newProvider };
      setSystemSettings(updated);
      updateVtuProvider(newProvider);
      setWalletData(null);
    } catch (err) {
      setError(err?.message || 'Failed to switch provider');
    } finally {
      setSwitchingProvider(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setError('');
      await fetchWalletSettings(activeProvider);
    } catch (err) {
      setError(err?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const formatTime = (ds) => new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleNetworkChange = (index, field, value) => {
    setNetworkCatalog((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddNetwork = () => {
    if (!newNetwork.name.trim()) return;
    setNetworkCatalog((prev) => [...prev, { ...newNetwork, slug: newNetwork.slug || newNetwork.name }]);
    setNewNetwork({ name: '', slug: '', logoUrl: '', isActive: true });
  };

  const handleRemoveNetwork = (index) => setNetworkCatalog((prev) => prev.filter((_, i) => i !== index));

  const handleSaveNetworks = async () => {
    try {
      setUpdatingSettings(true);
      const payload = networkCatalog.map((n) => ({
        name: n.name || '', slug: n.slug || n.name, logoUrl: n.logoUrl || '', isActive: n.isActive !== false,
      }));
      await adminAPI.updateSystemSettings({ networkCatalog: payload });
      await fetchSystemSettings();
    } catch (err) {
      setError(err?.message || 'Failed to save networks');
    } finally {
      setUpdatingSettings(false);
    }
  };

  // DigiMall-specific: admin only sets logo URL; name/id come from the provider
  const handleDigiMallLogoChange = (networkId, logoUrl) => {
    setDigiMallNetworks((prev) => prev.map((n) => n.networkId === networkId ? { ...n, logoUrl } : n));
  };

  const handleSaveDigiMallNetworks = async () => {
    try {
      setUpdatingSettings(true);
      const payload = DigiMallNetworks
        .filter((n) => n && n.networkId !== undefined && n.name !== undefined)
        .map((n) => ({
          name: n.name,
          slug: String(n.networkId),
          logoUrl: n.logoUrl || '',
          isActive: true,
        }));
      if (payload.length === 0) {
        setError('No valid networks to save');
        setUpdatingSettings(false);
        return;
      }
      await adminAPI.updateSystemSettings({ networkCatalog: payload });
      // Reflect saved logos back in the global networkCatalog so XpresData restoring works later
      setNetworkCatalog(payload);
    } catch (err) {
      setError(err?.message || 'Failed to save network logos');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleTopzaLogoChange = (networkId, logoUrl) => {
    setTopzaNetworks((prev) => prev.map((n) => n.networkId === networkId ? { ...n, logoUrl } : n));
  };

  const handleSaveTopzaNetworks = async () => {
    try {
      setUpdatingSettings(true);
      const payload = topzaNetworks
        .filter((n) => n && n.networkId !== undefined && n.name !== undefined)
        .map((n) => ({
          name: n.name,
          slug: String(n.code || n.networkId),
          logoUrl: n.logoUrl || '',
          isActive: true,
        }));
      if (payload.length === 0) {
        setError('No valid Topza networks to save');
        setUpdatingSettings(false);
        return;
      }
      await adminAPI.updateSystemSettings({ networkCatalog: payload });
      setNetworkCatalog(payload);
    } catch (err) {
      setError(err?.message || 'Failed to save Topza network logos');
    } finally {
      setUpdatingSettings(false);
    }
  };

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">VTU Service Settings</h1>
                <p className="text-slate-600">Manage your VTU providers and view wallet activity</p>
              </div>
              {/* Provider Toggle */}
              <div className="bg-white p-2 rounded-2xl border-2 border-slate-200 flex items-center gap-1">
                <Settings className="text-slate-400 mx-2" size={18} />
                {/* XpresData and DigiMall disabled — Topza is the sole active provider */}
                {['topza'].map((p) => (
                  <button
                    key={p}
                    disabled={switchingProvider}
                    onClick={() => handleProviderSwitch(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeProvider === p ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {p === 'digimall' ? 'DigiMall' : (p === 'topza' ? 'Topza' : 'XpresData')}
                    {activeProvider === p && <span className="ml-1 text-[10px] font-black uppercase opacity-80">(Active)</span>}
                  </button>
                ))}
                {switchingProvider && <RefreshCw size={16} className="animate-spin text-blue-600 ml-1" />}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-white border-2 border-red-300 rounded-2xl text-red-700 flex items-start gap-3">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading wallet settings...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Provider Banner */}
                {activeProvider === 'xpresdata' ? (
                  <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold mb-2">XpresData Integration Active</h2>
                        <p className="text-blue-100 max-w-2xl">
                          Your system is currently using <strong>XpresData</strong> for VTU services.
                          XpresData does not expose a real-time wallet balance endpoint.
                          Use the toggle above to switch to <strong>DigiMall</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : activeProvider === 'digimall' ? (
                  <div className="mb-8 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h2 className="text-2xl font-bold mb-2">DigiMall Integration Active</h2>
                        {walletData ? (
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Console Balance</p>
                              <p className="text-2xl font-black mt-1">
                                {formatCurrencyAbbreviated(typeof walletData.balance === 'number' ? walletData.balance : 0)}
                              </p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Normal Balance</p>
                              <p className="text-2xl font-black mt-1">
                                {formatCurrencyAbbreviated(typeof walletData.normalBalance === 'number' ? walletData.normalBalance : 0)}
                              </p>
                            </div>
                            {walletData.lastSync && (
                              <div className="col-span-2 flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-200" />
                                <span className="text-emerald-100 text-xs">Last synced: {formatDate(walletData.lastSync)} {formatTime(walletData.lastSync)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-emerald-100">Your system is using <strong>DigiMall</strong> for VTU services.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8 bg-gradient-to-r from-orange-600 to-amber-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                        <Activity className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                          <h2 className="text-2xl font-bold">Topza Integration Active</h2>
                          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                            <a
                              href={TOPZA_WALLET_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold transition-all"
                            >
                              <Wallet size={14} />
                              Top Up Wallet
                            </a>
                            <button
                              onClick={handleTopzaRefresh}
                              disabled={syncing || transactionsLoading}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold transition-all disabled:opacity-60"
                            >
                              <RefreshCw size={14} className={(syncing || transactionsLoading) ? 'animate-spin' : ''} />
                              {(syncing || transactionsLoading) ? 'Refreshing...' : 'Refresh now'}
                            </button>
                          </div>
                        </div>
                        {walletData ? (
                          <div className="grid grid-cols-1 gap-4 mt-3">
                            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                              <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">Wallet Balance</p>
                              <p className="text-2xl font-black mt-1">
                                {formatCurrencyAbbreviated(typeof walletData.balance === 'number' ? walletData.balance : 0)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-100">
                              <RefreshCw size={13} className={pollingTopza ? 'animate-spin' : ''} />
                              Live updates every 20s (balance + transactions)
                            </div>
                            {walletData.lastSync && (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-amber-200" />
                                <span className="text-amber-100 text-xs">Last synced: {formatDate(walletData.lastSync)} {formatTime(walletData.lastSync)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-amber-100">Your system is using <strong>Topza</strong> for VTU services.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Balance stats (only providers with a supported balance endpoint) */}
                {(activeProvider === 'digimall' || activeProvider === 'topza') && walletData && typeof walletData.balance === 'number' && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 text-sm font-medium">Balance</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrencyAbbreviated(walletData.balance)}</p>
                        </div>
                        <DollarSign className="w-12 h-12 text-blue-100" />
                      </div>
                    </div>
                    {walletData.lastSync && (
                      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-600 text-sm font-medium">Last Sync</p>
                            <p className="text-2xl font-bold text-slate-900 mt-2">{formatDate(walletData.lastSync)}</p>
                            <p className="text-xs text-slate-500 mt-1">{formatTime(walletData.lastSync)}</p>
                          </div>
                          <CheckCircle className="w-12 h-12 text-green-100" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Network Catalog */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all mb-6 sm:mb-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Network Catalog</h2>
                      <p className="text-sm text-slate-500">
                        {(activeProvider === 'digimall' || activeProvider === 'topza')
                          ? `Networks are fetched from ${activeProvider === 'topza' ? 'Topza' : 'DigiMall'}. Set a logo URL for each network.`
                          : 'Set network name, slug/id, and logo URL for public display.'}
                      </p>
                    </div>
                    <button
                      onClick={activeProvider === 'digimall'
                        ? handleSaveDigiMallNetworks
                        : (activeProvider === 'topza' ? handleSaveTopzaNetworks : handleSaveNetworks)}
                      disabled={updatingSettings}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2"
                    >
                      {updatingSettings && <RefreshCw size={16} className="animate-spin" />}
                      {updatingSettings ? 'Saving...' : 'Save Catalog'}
                    </button>
                  </div>

                  {(activeProvider === 'digimall' || activeProvider === 'topza') ? (
                    // -- Provider-fetched networks: only logo URL is editable --
                    (activeProvider === 'digimall' ? DigiMallNetworksLoading : topzaNetworksLoading) ? (
                      <div className="flex items-center gap-2 py-6 text-slate-500 text-sm">
                        <RefreshCw size={16} className="animate-spin" /> Fetching {activeProvider === 'topza' ? 'Topza' : 'DigiMall'} networks...
                      </div>
                    ) : (activeProvider === 'digimall' ? DigiMallNetworks.length : topzaNetworks.length) === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-3">
                        <Globe size={32} className="text-slate-300" />
                        <p>No {activeProvider === 'topza' ? 'Topza' : 'DigiMall'} networks found. Sync plans first.</p>
                        <a
                          href={activeProvider === 'topza' ? '/admin/topza-plans' : '/admin/digimall-plans'}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all"
                        >
                          Go to {activeProvider === 'topza' ? 'Topza' : 'DigiMall'} Plans
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(activeProvider === 'digimall' ? DigiMallNetworks : topzaNetworks).map((net) => (
                          <div key={net.networkId} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 border border-slate-200 rounded-xl bg-slate-50">
                            {/* networkId � readonly */}
                            <div className="px-3 py-2 rounded-lg border border-slate-100 bg-white text-xs font-bold text-slate-400 select-none">
                              ID: {net.networkId}
                            </div>
                            {/* name � readonly */}
                            <div className="px-3 py-2 rounded-lg border border-slate-100 bg-white text-sm font-semibold text-slate-800 select-none">
                              {net.name}
                            </div>
                            {/* logo URL input */}
                            <input
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                              placeholder="Logo URL"
                              value={net.logoUrl || ''}
                              onChange={(e) => (activeProvider === 'digimall'
                                ? handleDigiMallLogoChange(net.networkId, e.target.value)
                                : handleTopzaLogoChange(net.networkId, e.target.value))}
                            />
                            {/* logo preview */}
                            <div className="flex items-center gap-2">
                              {net.logoUrl ? (
                                <img src={net.logoUrl} alt={net.name} className="w-10 h-10 object-contain rounded border border-slate-200 bg-white" />
                              ) : (
                                <div className="w-10 h-10 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center">
                                  <Globe size={16} className="text-slate-300" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    // -- XpresData: manual catalog --
                    <div className="space-y-3">
                      {networkCatalog.map((net, idx) => (
                        <div key={`${net.slug || net.name || idx}-${idx}`} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center p-3 border border-slate-200 rounded-xl bg-slate-50">
                          <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Network name" value={net.name || ''} onChange={(e) => handleNetworkChange(idx, 'name', e.target.value)} />
                          <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Slug / ID" value={(net.slug && net.slug !== 'undefined') ? net.slug : ''} onChange={(e) => handleNetworkChange(idx, 'slug', e.target.value)} />
                          <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm md:col-span-2" placeholder="Logo URL" value={net.logoUrl || ''} onChange={(e) => handleNetworkChange(idx, 'logoUrl', e.target.value)} />
                          <div className="flex items-center justify-center md:justify-start">
                            {net.logoUrl ? (
                              <img src={net.logoUrl} alt={net.name || 'network'} className="w-10 h-10 object-contain rounded border border-slate-200 bg-white" />
                            ) : (
                              <div className="w-10 h-10 rounded border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400">N/A</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                              <input type="checkbox" checked={net.isActive !== false} onChange={(e) => handleNetworkChange(idx, 'isActive', e.target.checked)} />
                              Active
                            </label>
                            <button onClick={() => handleRemoveNetwork(idx)} className="text-rose-600 hover:text-rose-700 text-sm font-semibold">Remove</button>
                          </div>
                        </div>
                      ))}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-3 border border-dashed border-slate-300 rounded-xl bg-white">
                        <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Network name" value={newNetwork.name} onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Slug / ID" value={newNetwork.slug} onChange={(e) => setNewNetwork({ ...newNetwork, slug: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm md:col-span-2" placeholder="Logo URL" value={newNetwork.logoUrl} onChange={(e) => setNewNetwork({ ...newNetwork, logoUrl: e.target.value })} />
                        <div className="flex items-center justify-end">
                          <button onClick={handleAddNetwork} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">Add Network</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sync */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-slate-200 hover:shadow-lg transition-all">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Provider Synchronization</h2>
                      <p className="text-sm text-slate-500">Refresh wallet data from the active provider</p>
                    </div>
                    <button
                      onClick={handleSyncAll}
                      disabled={syncing}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                    >
                      <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'Syncing...' : `Refresh ${activeProviderDisplayName} Data`}
                    </button>
                  </div>
                </div>

                {/* Provider Transactions */}
                {(activeProvider === 'digimall' || activeProvider === 'topza') && (
                  <div className="bg-white rounded-2xl border-2 border-slate-200 hover:shadow-lg transition-all mt-6 sm:mt-8 overflow-hidden">
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{activeProvider === 'topza' ? 'Topza Transactions' : 'DigiMall Transactions'}</h2>
                        <p className="text-sm text-slate-500">
                          Recent transactions fetched from the {activeProvider === 'topza' ? 'Topza' : 'DigiMall'} provider
                        </p>
                      </div>
                      <button
                        onClick={activeProvider === 'topza' ? () => fetchTopzaTransactions() : fetchDigiMallTransactions}
                        disabled={transactionsLoading}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm whitespace-nowrap"
                      >
                        <RefreshCw size={16} className={transactionsLoading ? 'animate-spin' : ''} />
                        {transactionsLoading ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>

                    {transactionsError && (
                      <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        {transactionsError}
                      </div>
                    )}

                    {transactionsLoading ? (
                      <div className="flex justify-center items-center py-16 gap-3 text-slate-500">
                        <RefreshCw size={20} className="animate-spin" />
                        <span className="text-sm">Fetching transactions�</span>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                        <Clock size={40} className="opacity-30" />
                        <p className="text-sm font-medium">No transactions found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction ID</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipient</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Network</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Bundle</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                              <th className="text-left px-4 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {transactions.map((txn, i) => {
                              const item = txn.order_items?.[0] || {};
                              const providerOrder = txn.order || txn.data?.order || {};
                              const txnId = txn.orderNumber || txn.orderId || txn.transaction_code || txn.transaction_id || txn.trx_ref || txn.id || txn.reference || providerOrder.orderNumber || providerOrder.orderId || '-';
                              const recipient = item.beneficiary_number || txn.phoneNumber || txn.recipient_msisdn || txn.phone || txn.recipient || providerOrder.phoneNumber || '-';
                              const network = item.network || txn.network || txn.network_name || providerOrder.network || (txn.network_id ? `Network ${txn.network_id}` : '-');
                              const bundle = item.volume || txn.planName || providerOrder.planName || providerOrder.dataAmount || txn.dataAmount || (txn.shared_bundle ? `${(txn.shared_bundle / 1000).toFixed(1)}GB` : '-');
                              const amount = Number.isFinite(Number(txn.amount)) ? `GHS ${formatPrice2dpNoRound(txn.amount)}` : '-';
                              const status = item.status || txn.status || txn.transaction_status || '-';
                              const date = txn.createdAt || txn.created_at || txn.lastUpdated || txn.date || txn.timestamp;
                              const statusLower = String(status).toLowerCase();
                              const statusColor = statusLower.includes('success') || statusLower.includes('complete')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : statusLower.includes('fail') || statusLower.includes('error')
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : statusLower.includes('pending') || statusLower.includes('processing')
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600';
                              return (
                                <tr key={txnId + i} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 sm:px-6 py-3 font-mono text-xs text-slate-700 max-w-[160px] truncate">{txnId}</td>
                                  <td className="px-4 sm:px-6 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <Phone size={12} className="text-slate-400 flex-shrink-0" />
                                      <span className="text-slate-700 font-medium">{recipient}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <Wifi size={12} className="text-slate-400 flex-shrink-0" />
                                      <span className="text-slate-700">{network}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 font-semibold text-slate-900">{bundle}</td>
                                  <td className="px-4 sm:px-6 py-3 font-semibold text-emerald-700">{amount}</td>
                                  <td className="px-4 sm:px-6 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                                      {status}
                                    </span>
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 text-slate-500 text-xs whitespace-nowrap">
                                    {date ? (isNaN(Date.parse(date)) ? date : new Date(date).toLocaleString()) : '-'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-3">
                                    <button
                                      type="button"
                                      onClick={() => openTransactionDetails(txn)}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                      title="View order details"
                                      aria-label="View order details"
                                    >
                                      <Eye size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <OrderDetailsModal
        isOpen={showOrderDetailsModal}
        onClose={() => {
          setShowOrderDetailsModal(false);
          setSelectedTransaction(null);
        }}
        order={selectedTransaction}
        onRefund={handleRefund}
      />

      {/* Refund Confirmation Modal */}
      {showRefundConfirm && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Confirm Refund</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-700">
                Are you sure you want to refund order <span className="font-bold">{selectedTransaction.orderNumber}</span>?
              </p>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Amount:</span> GHS {formatPrice2dpNoRound(selectedTransaction.amount)}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowRefundConfirm(false);
                  setSelectedTransaction(null);
                }}
                disabled={refundLoading}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  confirmRefund();
                }}
                disabled={refundLoading}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {refundLoading ? 'Processing...' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

