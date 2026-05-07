import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, CreditCard, History, Layout as LayoutIcon, Smartphone, Loader2, ChevronRight, ShoppingBag, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { checkers as checkersAPI, publicAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import UserLayout from '../components/UserLayout';
import AgentLayout from '../components/AgentLayout';
import PurchasePaymentModal from '../components/PurchasePaymentModal';
import {
  formatChargeDescriptor,
  getDataPurchaseChargeAmount,
  parseTransactionCharges,
} from '../utils/transactionCharges';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  
  .dash-wrapper {
    font-family: 'DM Sans', sans-serif;
    background-color: #f5f5f0;
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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
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
    background: #111;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f0a500;
    flex-shrink: 0;
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
    background: #fff;
    border: 1.5px solid #e4e4de;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s;
  }

  .dash-stat-card:hover {
    border-color: #d4d4ce;
    box-shadow: 0 8px 40px rgba(0,0,0,0.06);
  }

  .dash-stat-label {
    font-size: 11px;
    font-weight: 700;
    color: #999;
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
`;

export default function ResultsChecker() {
  const { user, updateBalance } = useAuth();
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [skipSms, setSkipSms] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionCharges, setTransactionCharges] = useState(parseTransactionCharges());

  const Layout = user?.role === 'agent' ? AgentLayout : UserLayout;

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
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
        skipSms,
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

  return (
    <Layout>
      <div className="dash-wrapper overflow-x-hidden">
        <style>{styles}</style>
        
        <div className="dash-content">
          {/* Header Card */}
          <div className="dash-header !p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="dash-heading-row">
                <div className="dash-icon-box !w-10 !h-10">
                  <LayoutIcon size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="dash-h2 !text-base sm:!text-xl">Result Checker</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase truncate">Buy WAEC, NECO, JAMB PINS</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={fetchData}
                  className="p-1.5 text-slate-400 hover:text-[#f0a500] transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="dash-stat-grid">
            <div className="md:col-span-2 dash-card !p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone number for notification</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0240000000"
                    className="w-full px-4 py-2.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl focus:outline-none focus:border-[#111] transition-all text-sm font-bold"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={skipSms} 
                    onChange={(e) => setSkipSms(e.target.checked)}
                    className="w-4 h-4 rounded border-[#e4e4de] text-[#111] focus:ring-[#111]" 
                  />
                  Skip SMS notification
                </label>
              </div>
            </div>

            <div className="dash-stat-card justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="dash-stat-label">Wallet Balance</span>
                <Wallet size={14} className="text-[#f0a500]" />
              </div>
              <div className="dash-stat-value">{formatCurrencyAbbreviated(Number(user?.balance || 0))}</div>
              <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" /> Secure Payments
              </div>
            </div>
          </div>

          <div className="dash-card !p-5">
            <h3 className="dash-card-title !mb-4 !text-xs uppercase tracking-widest">Select Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-[#fafaf7] border-1.5 border-[#e4e4de] rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  paymentMethod === 'wallet' ? 'bg-[#111] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Wallet Balance
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paystack')}
                className={`py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  paymentMethod === 'paystack' ? 'bg-[#111] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
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
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Available Checkers</h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f0a500]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
              </div>
            </div>

            {loading ? (
              <div className="dash-card py-20 text-center">
                <Loader2 className="animate-spin mx-auto text-[#f0a500]" size={32} />
                <p className="mt-4 text-slate-500 font-medium text-sm">Loading available products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="dash-card py-20 text-center border-2 border-dashed border-[#e4e4de] bg-white/50">
                <CreditCard size={32} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold text-sm uppercase">No checker products available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product) => {
                  const basePrice = Number(product.finalPrice || 0);
                  const dataPurchaseCharge = getDataPurchaseChargeAmount(transactionCharges, basePrice);
                  const totalPaystackAmount = basePrice + dataPurchaseCharge;
                  const chargeDescriptor = formatChargeDescriptor(
                    transactionCharges.dataPurchaseChargeType,
                    transactionCharges.dataPurchaseCharge,
                    'GHS'
                  );

                  return (
                    <div key={product._id} className="dash-card !p-5 group transition-all hover:translate-y-[-2px]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#fafaf7] border-1.5 border-[#e4e4de] flex items-center justify-center text-[#111] group-hover:bg-[#111] group-hover:text-white transition-all">
                          <Smartphone size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate uppercase text-sm">{product.displayName || product.checkerType}</h4>
                          <p className="text-[10px] font-bold text-[#f0a500] uppercase tracking-widest">{product.checkerType}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#f0f0f0]">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Unit Price</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          {formatCurrencyAbbreviated(basePrice)}
                        </p>
                        
                        {paymentMethod === 'paystack' && dataPurchaseCharge > 0 && (
                          <div className="mt-3 p-2 bg-slate-50 rounded-lg space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                              <span>Fee</span>
                              <span>+{formatCurrencyAbbreviated(dataPurchaseCharge)}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase">
                              <span>Total</span>
                              <span>{formatCurrencyAbbreviated(totalPaystackAmount)}</span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleBuy(product)}
                          disabled={buyingId === product._id || (paymentMethod === 'wallet' && Number(user?.balance || 0) < Number(product.finalPrice || 0))}
                          className="dash-btn-primary w-full !py-2.5 mt-4"
                        >
                          {buyingId === product._id ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
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
              <History size={16} className="text-[#f0a500]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Purchase History</h3>
            </div>
            
            <div className="dash-table-container">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th className="dash-th">Transaction ID</th>
                    <th className="dash-th">Checker Type</th>
                    <th className="dash-th">Beneficiary</th>
                    <th className="dash-th">Amount</th>
                    <th className="dash-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row._id}>
                      <td className="dash-td">
                        <p className="font-bold text-slate-900">#{row.purchaseId}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(row.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="dash-td font-bold text-slate-700 uppercase">{row.checkerType}</td>
                      <td className="dash-td font-bold text-slate-600">{row.phoneNumber}</td>
                      <td className="dash-td font-black text-slate-900">{formatCurrencyAbbreviated(row.price)}</td>
                      <td className="dash-td">
                        <span className={`dash-badge ${
                          row.status === 'completed' ? 'bg-green-100 text-green-700' : 
                          row.status === 'failed' ? 'bg-rose-100 text-rose-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="5" className="dash-td py-12 text-center text-slate-400 font-bold uppercase text-xs">No purchase history found</td>
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
    </Layout>
  );
}
