import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, CreditCard, History, Layout as LayoutIcon, Smartphone, Loader2, ChevronRight, ShoppingBag, Wallet, Clock, CheckCircle2, Eye, EyeOff, FileText, Copy } from 'lucide-react';
import { checkers as checkersAPI, publicAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import UserLayout from '../components/UserLayout';
import AgentLayout from '../components/AgentLayout';
import PurchasePaymentModal from '../components/PurchasePaymentModal';
import ResultCheckerDetailModal from '../components/ResultCheckerDetailModal';
import {
  getDataPurchaseChargeAmount,
  parseTransactionCharges,
} from '../utils/transactionCharges';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

/* ── Homepage multi-colour palette ── */
const palette = [
  { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' },   // purple
  { main: '#0F6E56', bg: '#D1FAE5', soft: '#ECFDF5', glow: 'rgba(15,110,86,0.15)' },    // teal
  { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF', glow: 'rgba(29,78,216,0.15)' },    // blue
  { main: '#B45309', bg: '#FEF3C7', soft: '#FFFBEB', glow: 'rgba(180,83,9,0.15)' },     // amber
  { main: '#BE185D', bg: '#FCE7F3', soft: '#FDF2F8', glow: 'rgba(190,24,93,0.15)' },    // pink
  { main: '#DC2626', bg: '#FEE2E2', soft: '#FFF5F5', glow: 'rgba(220,38,38,0.15)' },    // coral/red
  { main: '#0369A1', bg: '#E0F2FE', soft: '#F0F9FF', glow: 'rgba(3,105,161,0.15)' },    // sky
  { main: '#4D7C0F', bg: '#ECFCCB', soft: '#F7FEE7', glow: 'rgba(77,124,15,0.15)' },    // lime/green
];

const getColor = (index) => palette[index % palette.length];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');

  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #ffffff;
    min-height: 100vh;
  }

  .dash-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dash-header {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
    border: 1.5px solid #BFDBFE;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(29,78,216,0.08);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .dash-header {
      padding: 24px;
    }
  }

  .dash-heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .dash-icon-box {
    width: 40px;
    height: 40px;
    background: #1D4ED8;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(29,78,216,0.25);
  }

  .dash-h2 {
    font-size: 18px;
    font-weight: 800;
    color: #111;
    margin: 0;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (min-width: 768px) {
    .dash-h2 {
      font-size: 26px;
    }
    .dash-icon-box {
      width: 46px;
      height: 46px;
    }
  }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 12px;
  }

  @media (min-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  .dash-stat-card {
    background: var(--stat-bg, #fff);
    border: 1.5px solid var(--stat-border, #e4e4de);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: var(--stat-color, #d4d4ce);
    box-shadow: 0 8px 40px var(--stat-glow, rgba(0,0,0,0.06));
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-stat-value {
    font-size: 20px;
    font-weight: 800;
    color: #111;
  }

  .dash-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-card-title {
    font-size: 16px;
    font-weight: 800;
    color: #111;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dash-btn-primary {
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

  .dash-btn-primary:hover:not(:disabled) {
    background: #333;
    transform: translateY(-1px);
  }

  .dash-btn-outline {
    background: #fff;
    color: #111;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    border: 1.5px solid #e4e4de;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .dash-btn-outline:hover {
    background: #fafaf7;
    border-color: #d4d4ce;
  }

  .dash-table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    border: 1.5px solid #e4e4de;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .dash-table-container::-webkit-scrollbar {
    display: none;
  }

  .dash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .dash-th {
    background: #fafaf7;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #333;
    border-bottom: 1.5px solid #e4e4de;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dash-td {
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #444;
  }

  .dash-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .dash-plan-card {
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }

  .dash-plan-card:hover {
    transform: translateY(-4px);
    border-color: var(--plan-color, #111);
    box-shadow: 0 12px 30px var(--plan-glow, rgba(0,0,0,0.08));
  }
`;

export default function ResultsChecker() {
  const { user, updateBalance } = useAuth();
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionCharges, setTransactionCharges] = useState(parseTransactionCharges());
  const [visiblePins, setVisiblePins] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  const Layout = user?.role === 'agent' ? AgentLayout : UserLayout;

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const togglePinVisibility = (id) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const buildOrderCopyText = (row) => {
    const lines = [
      `Transaction ID: ${row.purchaseId || '—'}`,
      `Checker Type: ${row.checkerType || '—'}`,
      `Beneficiary: ${row.phoneNumber || '—'}`,
      `Amount: ${formatCurrencyAbbreviated(row.price || 0)}`,
      `Status: ${row.status || '—'}`,
      `Payment Method: ${row.metadata?.paymentMethod || '—'}`,
      `Date: ${new Date(row.createdAt).toLocaleString()}`,
    ];
    if (row.serialNumber) lines.push(`Serial Number: ${row.serialNumber}`);
    if (row.pin) lines.push(`PIN: ${row.pin}`);
    if (row.reference) lines.push(`Reference: ${row.reference}`);
    return lines.join('\n');
  };

  const copyOrderDetails = async (row) => {
    try {
      await navigator.clipboard.writeText(buildOrderCopyText(row));
      setCopiedId(row._id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      showMessage('error', 'Failed to copy details');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, historyRes, settingsRes] = await Promise.all([
        checkersAPI.getProducts(),
        checkersAPI.getMyCheckers(1, 12),
        publicAPI.getSystemSettings(),
      ]);
      setProducts(productsRes?.data || []);
      setHistory(historyRes?.data || []);
      setTransactionCharges(parseTransactionCharges(settingsRes?.settings?.transactionCharges));
    } catch (err) {
      showMessage('error', err.message || 'Failed to load result checker data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canBuy = useMemo(() => {
    return phoneNumber.trim().length >= 9;
  }, [phoneNumber]);

  const handleBuy = async (product) => {
    if (!canBuy) {
      showMessage('error', 'Enter a valid phone number first');
      return;
    }

    try {
      setBuyingId(product._id);
      const response = await checkersAPI.buyChecker({
        checkerType: product.checkerType,
        phoneNumber: phoneNumber.trim(),
        paymentMethod,
      });

      if (paymentMethod === 'paystack') {
        const basePrice = Number(product.finalPrice || 0);
        const dataPurchaseCharge = getDataPurchaseChargeAmount(transactionCharges, basePrice);
        setPaymentData({
          ...response.data,
          amount: basePrice + dataPurchaseCharge,
        });
        setShowPaymentModal(true);
        return;
      }

      showMessage('success', response.message || 'Checker purchase initiated');

      if (updateBalance) {
        const newBalance = Number(user?.balance || 0) - Number(product.finalPrice || 0);
        if (Number.isFinite(newBalance)) {
          updateBalance(newBalance);
        }
      }

      await fetchData();
    } catch (err) {
      showMessage('error', err.message || 'Failed to buy checker');
    } finally {
      setBuyingId('');
    }
  };

  const pageTheme = getColor(2); // Blue
  const walletColor = getColor(1); // Teal
  const historyColor = getColor(3); // Amber
  const paystackColor = getColor(4); // Pink

  return (
    <Layout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>

        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header !p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-11 !h-11" style={{ background: pageTheme.main, boxShadow: `0 8px 20px ${pageTheme.glow}` }}>
                  <CheckCircle2 size={22} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: pageTheme.main }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: pageTheme.main }}>Exam Portal</span>
                  </div>
                  <h2 className="dash-h2 !text-lg sm:!text-2xl">Result Checker</h2>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#fafaf7] border-1.5 border-[#e4e4de] text-black hover:text-[#111] transition-all"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="dash-stat-card" style={{ '--stat-color': historyColor.main + '66', '--stat-glow': historyColor.glow, '--stat-bg': historyColor.soft, '--stat-border': historyColor.main + '33' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="dash-stat-label" style={{ color: historyColor.main }}>Total Checks</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: historyColor.soft, color: historyColor.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${historyColor.glow}` }}>
                  <History size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div className="dash-stat-value">{history.length}</div>
              <div className="mt-2 text-[10px] font-bold text-black uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} style={{ color: historyColor.main }} /> Lifetime Activity
              </div>
            </div>

            <div className="dash-stat-card" style={{ '--stat-color': walletColor.main + '66', '--stat-glow': walletColor.glow, '--stat-bg': walletColor.soft, '--stat-border': walletColor.main + '33' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="dash-stat-label" style={{ color: walletColor.main }}>Wallet Balance</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: walletColor.soft, color: walletColor.main, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${walletColor.glow}` }}>
                  <Wallet size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div className="dash-stat-value">{formatCurrencyAbbreviated(Number(user?.balance || 0))}</div>
              <div className="mt-2 text-[10px] font-bold text-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} style={{ color: walletColor.main }} /> Instant Funding
              </div>
            </div>

            <div className="md:col-span-1 dash-card !p-5 !flex !flex-col !justify-center" style={{ borderColor: pageTheme.main + '22' }}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Recipient Number</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0240000000"
                    className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl focus:outline-none transition-all text-sm font-bold"
                    style={{ focusBorderColor: pageTheme.main }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="dash-card !p-5">
            <h3 className="dash-card-title !mb-4 !text-xs uppercase tracking-widest">
              <div style={{ width: 24, height: 24, borderRadius: 5, background: pageTheme.soft, color: pageTheme.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={12} strokeWidth={2.5} />
              </div>
              Select Payment Method
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className="py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                style={paymentMethod === 'wallet' ? { background: walletColor.main, color: '#fff', boxShadow: `0 4px 12px ${walletColor.glow}` } : { color: '#000' }}
              >
                Wallet Balance
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paystack')}
                className="py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                style={paymentMethod === 'paystack' ? { background: paystackColor.main, color: '#fff', boxShadow: `0 4px 12px ${paystackColor.glow}` } : { color: '#000' }}
              >
                Online (Paystack)
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`dash-card flex items-center gap-3 py-4 border-none shadow-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              <p className="font-bold text-sm">{message.text}</p>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Available Checkers</h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: pageTheme.main }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
              </div>
            </div>

            {loading ? (
              <div className="dash-card py-20 text-center">
                <Loader2 className="animate-spin mx-auto" size={32} style={{ color: pageTheme.main }} />
                <p className="mt-4 text-black font-medium text-sm">Loading available products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="dash-card py-20 text-center border-2 border-dashed border-[#e4e4de] bg-white/50">
                <CreditCard size={32} className="mx-auto text-black mb-4" />
                <p className="text-black font-bold text-sm uppercase">No checker products available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product, idx) => {
                  const basePrice = Number(product.finalPrice || 0);
                  const dataPurchaseCharge = getDataPurchaseChargeAmount(transactionCharges, basePrice);
                  const totalPaystackAmount = basePrice + dataPurchaseCharge;
                  const c = getColor(idx);

                  return (
                    <div key={product._id} className="dash-plan-card group" style={{ '--plan-color': c.main + '66', '--plan-glow': c.glow }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: c.soft, color: c.main, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${c.main}22`, boxShadow: `0 2px 8px ${c.glow}` }}>
                          <Smartphone size={20} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-[#111] truncate uppercase text-sm tracking-tight">{product.displayName || product.checkerType}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: c.main }}>{product.checkerType}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#f5f5f0]">
                        <p className="text-[10px] text-black font-black uppercase tracking-widest mb-1">Unit Price</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-[#111] tracking-tight">
                            {formatCurrencyAbbreviated(basePrice)}
                          </span>
                        </div>

                        {paymentMethod === 'paystack' && dataPurchaseCharge > 0 && (
                          <div className="mt-3 p-2 rounded-lg space-y-1" style={{ background: c.soft }}>
                            <div className="flex justify-between text-[9px] font-bold text-black uppercase">
                              <span>Fee</span>
                              <span>+{formatCurrencyAbbreviated(dataPurchaseCharge)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-black uppercase" style={{ color: c.main }}>
                              <span>Total</span>
                              <span>{formatCurrencyAbbreviated(totalPaystackAmount)}</span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleBuy(product)}
                          disabled={buyingId === product._id || (paymentMethod === 'wallet' && Number(user?.balance || 0) < Number(product.finalPrice || 0))}
                          className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: c.main, color: '#fff', boxShadow: `0 4px 12px ${c.glow}` }}
                        >
                          {buyingId === product._id ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={14} strokeWidth={3} />}
                          Buy PIN
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div style={{ width: 24, height: 24, borderRadius: 5, background: pageTheme.soft, color: pageTheme.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={12} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Purchase History</h3>
            </div>

            <div className="dash-table-container">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-th">Transaction ID</th>
                    <th className="dash-th">Checker Type</th>
                    <th className="dash-th">Beneficiary</th>
                    <th className="dash-th">Pin / Serial</th>
                    <th className="dash-th">Amount</th>
                    <th className="dash-th">Status</th>
                    <th className="dash-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => {
                    const c = getColor(idx);
                    return (
                      <tr key={row._id}>
                        <td className="dash-td">
                          <p className="font-bold text-black">#{row.purchaseId}</p>
                          <p className="text-[10px] text-black font-medium">{new Date(row.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="dash-td font-bold text-black uppercase">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase" style={{ background: c.soft, color: c.main }}>{row.checkerType}</span>
                        </td>
                        <td className="dash-td font-bold text-black">{row.phoneNumber}</td>
                        <td className="dash-td">
                          {row.status === 'completed' ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs tracking-tight">
                                  {visiblePins[row._id] ? row.pin : '•••• •••• ••••'}
                                </span>
                                <button onClick={() => togglePinVisibility(row._id)} className="p-1 hover:bg-slate-100 rounded transition-colors">
                                  {visiblePins[row._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                              {row.serialNumber && (
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">SN: {row.serialNumber}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">—</span>
                          )}
                        </td>
                        <td className="dash-td font-black" style={{ color: c.main }}>{formatCurrencyAbbreviated(row.price)}</td>
                        <td className="dash-td">
                          <span className={`dash-badge ${
                            row.status === 'completed' ? 'bg-green-100 text-green-700' :
                            row.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="dash-td">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedOrder(row)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View details"
                            >
                              <FileText size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => copyOrderDetails(row)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Copy details"
                            >
                              {copiedId === row._id ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} strokeWidth={2} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="7" className="dash-td py-12 text-center text-black font-bold uppercase text-xs">No purchase history found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {paymentData && (
        <PurchasePaymentModal
          key={paymentData?.reference}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentData(null);
          }}
          accessCode={paymentData?.accessCode}
          reference={paymentData?.reference}
          amount={paymentData?.amount || 0}
          verifyPayment={checkersAPI.verifyCheckerPurchase}
          onSuccess={async (result) => {
            showMessage('success', result?.message || 'Payment successful. Checker purchase initiated.');
            await fetchData();
          }}
        />
      )}

      <ResultCheckerDetailModal
        key={selectedOrder?._id || 'closed'}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </Layout>
  );
}
