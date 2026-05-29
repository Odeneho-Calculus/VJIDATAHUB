import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, DollarSign, X, Settings, Activity, Globe, Clock, Phone, Wifi, Eye, Wallet } from 'lucide-react';
import Pagination from '../components/Pagination';
import { toast } from 'react-hot-toast';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import { OrderDetailsModal } from '../components/AdminOrderModals';
import { useSidebar } from '../hooks/useSidebar';
import { admin as adminAPI, topza as topzaAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .vtu-page-container {
    font-family: 'DM Sans', sans-serif;
    display: flex;
    min-height: 100vh;
    background-color: #f5f5f0;
  }

  .vtu-content {
    flex: 1;
    padding: 24px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .vtu-main-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.10);
    width: 100%;
    max-width: 1000px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .vtu-heading-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
    width: 100%;
    max-width: 1000px;
  }

  .vtu-icon-box {
    width: 46px;
    height: 46px;
    background: #111;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f0a500;
    flex-shrink: 0;
  }

  .vtu-h2 {
    font-size: 26px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .vtu-p {
    font-size: 14px;
    color: #666;
    margin: 4px 0 0 0;
  }

  .vtu-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: 100%;
    margin-bottom: 24px;
  }

  @media (min-width: 768px) {
    .vtu-stats-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  .vtu-stat-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .vtu-stat-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .vtu-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .vtu-input {
    background: #fafaf7;
    border: 1.5px solid #e0e0d8;
    border-radius: 7px;
    padding: 10px 14px;
    font-size: 14px;
    width: 100%;
    color: #111;
    transition: all 0.2s;
  }

  .vtu-input:focus {
    border-color: #111;
    box-shadow: 0 0 0 3px rgba(17,17,17,0.07);
    background: #fff;
    outline: none;
  }

  .vtu-btn-primary {
    background: #111;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .vtu-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .vtu-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .vtu-btn-primary {
      padding: 6px 12px;
      font-size: 12px;
      gap: 6px;
    }
    .vtu-btn-primary svg {
      width: 14px;
      height: 14px;
    }
  }

  .vtu-banner-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 640px) {
    .vtu-banner-flex {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }
    .vtu-h2 {
      font-size: 20px;
    }
    .vtu-p {
      font-size: 12px;
    }
  }

  .vtu-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .vtu-table-container::-webkit-scrollbar {
    display: none;
  }

  .vtu-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .vtu-th {
    background: #fafaf7;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #333;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .vtu-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
  }

  .vtu-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
`;

export default function AdminVtuSettings() {
  const TOPZA_WALLET_URL = 'https://www.topzagh.com/wallet';
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { settings: globalSettings } = useSettings();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [, setSystemSettings] = useState(globalSettings || { vtuProvider: 'topza' });
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [networkCatalog, setNetworkCatalog] = useState([]);
  const networkCatalogRef = useRef(networkCatalog);

  useEffect(() => {
    networkCatalogRef.current = networkCatalog;
  }, [networkCatalog]);

  const [topzaNetworks, setTopzaNetworks] = useState([]);
  const [topzaNetworksLoading, setTopzaNetworksLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 10;
  const [pollingTopza, setPollingTopza] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const showMessage = (msg, isError = false) => {
    if (isError) {
      toast.error(msg, { duration: 5000 });
    } else {
      toast.success(msg, { duration: 3000 });
    }
  };

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

  const fetchTopzaNetworks = useCallback(async (catalog) => {
    try {
      setTopzaNetworksLoading(true);
      const response = await topzaAPI.getNetworks();
      if (response.success && Array.isArray(response.networks)) {
        const existing = catalog || networkCatalogRef.current;
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
  }, []);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const response = await adminAPI.getSystemSettings();
      if (response.success) {
        setSystemSettings(response.settings);
        const catalog = response.settings?.networkCatalog || [];
        setNetworkCatalog(catalog);
        fetchTopzaNetworks(catalog);
      }
    } catch (err) {
      console.error('Failed to fetch system settings', err);
    }
  }, [fetchTopzaNetworks]);

  const fetchWalletSettings = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await adminAPI.getTopzaWalletSettings();
      if (response.success) {
        setWalletData(response.data);
        if (response.data?.error) {
          setError(`Topza API Error: ${response.data.error}`);
        }
      } else {
        setError(response.message || 'Failed to fetch wallet settings');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch wallet settings');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchTopzaTransactions = async ({ silent = false } = {}) => {
    try {
      if (!silent) setTransactionsLoading(true);
      setTransactionsError('');
      const response = await adminAPI.getTopzaWalletTransactions(1, 500);
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

  useEffect(() => { fetchSystemSettings(); }, [fetchSystemSettings]);
  useEffect(() => { fetchWalletSettings(); }, [fetchWalletSettings]);
  useEffect(() => {
    if (globalSettings) {
      setSystemSettings(globalSettings);
      setNetworkCatalog(globalSettings?.networkCatalog || []);
    }
  }, [globalSettings]);

  useEffect(() => {
    fetchTopzaNetworks();
    fetchTopzaTransactions();
  }, [fetchTopzaNetworks]);

  useEffect(() => {
    let cancelled = false;
    setPollingTopza(true);
    const pollTopza = async () => {
      try {
        await Promise.all([
          fetchWalletSettings({ silent: true }),
          fetchTopzaTransactions({ silent: true }),
        ]);
      } catch {
        // Ignore background polling errors
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
  }, [fetchWalletSettings, transactionPage]);

  const handleTopzaRefresh = async () => {
    try {
      setSyncing(true);
      setTransactionPage(1);
      await Promise.all([
        fetchWalletSettings({ silent: false }),
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
        if (response.order) {
          const updatedTransaction = {
            ...selectedTransaction,
            ...response.order,
            isRefunded: true,
          };
          setSelectedTransaction(updatedTransaction);
          setShowOrderDetailsModal(true);
        }
        await fetchTopzaTransactions();
      } else {
        showMessage(response.message || 'Failed to refund order', true);
      }
    } catch (err) {
      showMessage(err?.message || 'Failed to refund order', true);
    } finally {
      setRefundLoading(false);
    }
  };

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const formatTime = (ds) => new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // const handleNetworkChange = (index, field, value) => {
  //   setNetworkCatalog((prev) => {
  //     const updated = [...prev];
  //     updated[index] = { ...updated[index], [field]: value };
  //     return updated;
  //   });
  // };
  //
  // const handleSaveNetworks = async () => {
  //   try {
  //     setUpdatingSettings(true);
  //     const payload = networkCatalog.map((n) => ({
  //       name: n.name || '', slug: n.slug || n.name, logoUrl: n.logoUrl || '', isActive: n.isActive !== false,
  //     }));
  //     await adminAPI.updateSystemSettings({ networkCatalog: payload });
  //     await fetchSystemSettings();
  //   } catch (err) {
  //     setError(err?.message || 'Failed to save networks');
  //   } finally {
  //     setUpdatingSettings(false);
  //   }
  // };

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
    <div className="vtu-page-container">
      <style>{styles}</style>
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="vtu-content">
        <div className="vtu-heading-section">
          <div className="vtu-icon-box">
            <Settings size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="vtu-h2">VTU Service Settings</h2>
            <p className="vtu-p">Manage your VTU providers and view wallet activity</p>
          </div>
        </div>

        {error && (
          <div className="vtu-main-card" style={{ borderColor: '#fecaca', background: '#fff5f5', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
            <AlertCircle size={20} />
            <span style={{ flex: 1 }}>{error}</span>
            <X size={16} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
          </div>
        )}

        {loading ? (
          <div className="vtu-main-card" style={{ textAlign: 'center', padding: '60px' }}>
            <RefreshCw size={40} className="animate-spin" style={{ margin: '0 auto 16px', color: '#f0a500' }} />
            <p className="vtu-p">Loading wallet settings...</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="vtu-stats-grid">
              <div className="vtu-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="vtu-stat-label">Wallet Balance</p>
                    <p className="vtu-stat-value">
                      {walletData?.balance ? `GHS ${formatCurrencyAbbreviated(walletData.balance)}` : 'GHS 0.00'}
                    </p>
                  </div>
                  <DollarSign size={20} style={{ color: '#f0a500' }} />
                </div>
              </div>

              {walletData?.lastSync && (
                <div className="vtu-stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="vtu-stat-label">Last Sync Date</p>
                      <p className="vtu-stat-value">{formatDate(walletData.lastSync)}</p>
                      <p style={{ fontSize: '10px', color: '#999' }}>{formatTime(walletData.lastSync)}</p>
                    </div>
                    <Clock size={20} style={{ color: '#f0a500' }} />
                  </div>
                </div>
              )}

              <div className="vtu-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="vtu-stat-label">Active Provider</p>
                    <p className="vtu-stat-value" style={{ textTransform: 'capitalize' }}>topza</p>
                  </div>
                  <Activity size={20} style={{ color: '#f0a500' }} />
                </div>
              </div>

              <div className="vtu-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="vtu-stat-label">Sync Status</p>
                    <p className="vtu-stat-value" style={{ color: '#059669', fontSize: '16px' }}>Operational</p>
                  </div>
                  <CheckCircle size={20} style={{ color: '#059669' }} />
                </div>
              </div>
            </div>

            {/* Provider Specific Banner Actions */}
            <div className="vtu-main-card" style={{ 
              background: 'linear-gradient(135deg, #111111 0%, #1a1a1a 100%)', 
              color: '#fff', 
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: '-20px', 
                right: '-20px', 
                width: '100px', 
                height: '100px', 
                background: 'rgba(240, 165, 0, 0.05)', 
                borderRadius: '50%', 
                blur: '40px' 
              }}></div>
              
              <div className="vtu-banner-flex">
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                    Topza Integration
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', fontWeight: '500' }}>
                    Real-time connection with <span style={{ color: '#f0a500' }}>Topza</span> is active and healthy.
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={TOPZA_WALLET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vtu-btn-primary"
                    style={{ 
                      background: '#f0a500', 
                      color: '#111', 
                      boxShadow: '0 4px 15px rgba(240, 165, 0, 0.2)'
                    }}
                  >
                    <Wallet size={18} />
                    Top Up Wallet
                  </a>
                  <button
                    onClick={handleTopzaRefresh}
                    disabled={syncing || transactionsLoading}
                    className="vtu-btn-primary"
                    style={{ 
                      background: 'rgba(255,255,255,0.08)', 
                      border: '1.5px solid rgba(255,255,255,0.15)'
                    }}
                  >
                    <RefreshCw size={18} className={(syncing || transactionsLoading) ? 'animate-spin' : ''} />
                    Refresh Stats
                  </button>
                </div>
              </div>
            </div>

            {/* Network Catalog Section */}
            <div className="vtu-main-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Network Catalog</h3>
                  <p className="vtu-p">Manage display logos for available networks</p>
                </div>
                <button
                  onClick={handleSaveTopzaNetworks}
                  disabled={updatingSettings}
                  className="vtu-btn-primary"
                >
                  {updatingSettings ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {updatingSettings ? 'Saving...' : 'Save Catalog'}
                </button>
              </div>

              {topzaNetworksLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#999' }} />
                  <p style={{ fontSize: '13px', color: '#999' }}>Fetching networks...</p>
                </div>
              ) : (
                <>
                <div className="vtu-table-container">
                  <table className="vtu-table">
                    <thead>
                      <tr>
                        <th className="vtu-th">Network Name</th>
                        <th className="vtu-th">Slug/Code</th>
                        <th className="vtu-th">Logo URL</th>
                        <th className="vtu-th">Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topzaNetworks.map((n, idx) => (
                        <tr key={n.networkId || n.code || idx}>
                          <td className="vtu-td" style={{ fontWeight: '700' }}>{n.name}</td>
                          <td className="vtu-td font-mono" style={{ fontSize: '12px' }}>{n.slug || n.code || n.networkId}</td>
                          <td className="vtu-td">
                            <input
                              type="text"
                              value={n.logoUrl || ''}
                              onChange={(e) => handleTopzaLogoChange(n.networkId, e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="vtu-input"
                              style={{ height: '36px' }}
                            />
                          </td>
                          <td className="vtu-td">
                            {n.logoUrl ? (
                              <img src={n.logoUrl} alt={n.name} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'contain', background: '#f9f9f9', padding: '2px' }} />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                <Globe size={16} />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>

            {/* Transactions Section */}
            <div className="vtu-main-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Recent API Transactions</h3>
                  <p className="vtu-p">Monitor real-time purchase activity from your provider</p>
                </div>
                {pollingTopza && (
                  <div className="vtu-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}>
                    <RefreshCw size={10} className="animate-spin" />
                    Live Polling
                  </div>
                )}
              </div>

              {transactionsLoading && transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#999' }} />
                  <p style={{ fontSize: '13px', color: '#999' }}>Loading transactions...</p>
                </div>
              ) : transactionsError ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#b91c1c', background: '#fff5f5', borderRadius: '8px' }}>
                  {transactionsError}
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#999', border: '1.5px dashed #e4e4de', borderRadius: '14px' }}>
                  No recent transactions found
                </div>
              ) : (
                <>
                  <div className="vtu-table-container">
                    <table className="vtu-table">
                      <thead>
                        <tr>
                          <th className="vtu-th">ID</th>
                          <th className="vtu-th">Recipient</th>
                          <th className="vtu-th">Details</th>
                          <th className="vtu-th">Amount</th>
                          <th className="vtu-th">Status</th>
                          <th className="vtu-th">Date</th>
                          <th className="vtu-th">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions
                          .slice((transactionPage - 1) * TRANSACTIONS_PER_PAGE, transactionPage * TRANSACTIONS_PER_PAGE)
                          .map((txn, i) => {
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
                          let badgeStyles = { background: '#f3f4f6', color: '#6b7280' };
                          if (statusLower.includes('success') || statusLower.includes('complete')) {
                            badgeStyles = { background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' };
                          } else if (statusLower.includes('fail') || statusLower.includes('error')) {
                            badgeStyles = { background: '#fff5f5', color: '#b91c1c', border: '1px solid #fecaca' };
                          } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
                            badgeStyles = { background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7' };
                          }

                          return (
                            <tr key={txnId + i}>
                              <td className="vtu-td font-mono" style={{ fontSize: '11px', color: '#999' }}>{String(txnId).slice(-8)}</td>
                              <td className="vtu-td">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Phone size={12} style={{ color: '#999' }} />
                                  <span style={{ fontWeight: '700' }}>{recipient}</span>
                                </div>
                              </td>
                              <td className="vtu-td">
                                <div style={{ fontSize: '12px' }}>
                                  <div style={{ fontWeight: '600' }}>{network}</div>
                                  <div style={{ color: '#666' }}>{bundle}</div>
                                </div>
                              </td>
                              <td className="vtu-td font-bold" style={{ color: '#059669' }}>{amount}</td>
                              <td className="vtu-td">
                                <span className="vtu-badge" style={badgeStyles}>{status}</span>
                              </td>
                              <td className="vtu-td" style={{ fontSize: '11px', color: '#999' }}>
                                {date ? (isNaN(Date.parse(date)) ? date : new Date(date).toLocaleString()) : '-'}
                              </td>
                              <td className="vtu-td">
                                <button
                                  onClick={() => openTransactionDetails(txn)}
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e4e4de', background: '#fff', cursor: 'pointer' }}
                                >
                                  <Eye size={14} style={{ color: '#666' }} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {transactions.length > TRANSACTIONS_PER_PAGE && (
                    <Pagination
                      currentPage={transactionPage}
                      totalPages={Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE))}
                      onPageChange={(page) => {
                        setTransactionPage(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      isLoading={transactionsLoading}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <OrderDetailsModal
        isOpen={showOrderDetailsModal}
        onClose={() => setShowOrderDetailsModal(false)}
        order={selectedTransaction}
        onRefund={handleRefund}
      />

      {showRefundConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '400px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px 0' }}>Confirm Refund</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0' }}>
              Are you sure you want to refund this order? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRefundConfirm(false)}
                className="vtu-btn-primary"
                style={{ background: '#f5f5f0', color: '#111' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRefund}
                disabled={refundLoading}
                className="vtu-btn-primary"
                style={{ background: '#dc2626' }}
              >
                {refundLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
