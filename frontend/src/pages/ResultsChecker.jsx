import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, CreditCard, History } from 'lucide-react';
import { checkers as checkersAPI, publicAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import UserLayout from '../components/UserLayout';
import AgentLayout from '../components/AgentLayout';
import PurchasePaymentModal from '../components/PurchasePaymentModal';

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
  const [dataPurchaseCharge, setDataPurchaseCharge] = useState(0);

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
      setDataPurchaseCharge(Number(settingsRes?.settings?.transactionCharges?.dataPurchaseCharge) || 0);
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
        setPaymentData({
          ...response.data,
          amount: Number(product.finalPrice || 0) + dataPurchaseCharge,
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
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Result Checker</h1>
              <p className="text-sm text-slate-600">Buy WAEC, NECO, JAMB and BECE checker pins</p>
            </div>
            <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold flex items-center gap-2">
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <label className="block text-xs font-semibold text-slate-600">Phone number for notification</label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0240000000"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200"
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={skipSms} onChange={(e) => setSkipSms(e.target.checked)} />
                Skip SMS notification
              </label>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Wallet balance</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">GHc {Number(user?.balance || 0).toFixed(2)}</p>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <CreditCard size={13} />
                Wallet and Paystack supported
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">Payment method</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${paymentMethod === 'wallet' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                Wallet
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('paystack')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${paymentMethod === 'paystack' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                Paystack (Card/Bank/MoMo)
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Available Checkers</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading checkers...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No checker products available now</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                {products.map((product) => (
                  <div key={product._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                    <p className="font-semibold text-slate-900">{product.displayName || product.checkerType}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{product.checkerType}</p>
                    <p className="text-xl font-bold text-slate-900 mt-2">GHc {Number(product.finalPrice || 0).toFixed(2)}</p>
                    {paymentMethod === 'paystack' && dataPurchaseCharge > 0 && (
                      <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Transaction fee</span>
                          <span>+GHc {dataPurchaseCharge.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-700">
                          <span>Total</span>
                          <span>GHc {(Number(product.finalPrice || 0) + dataPurchaseCharge).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleBuy(product)}
                      disabled={buyingId === product._id || (paymentMethod === 'wallet' && Number(user?.balance || 0) < Number(product.finalPrice || 0))}
                      className="mt-3 w-full py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {buyingId === product._id ? 'Processing...' : 'Buy Checker'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <History size={15} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900">My Checker History</h2>
            </div>
            {history.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No checker purchases yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wider">
                      <th className="text-left p-3">Purchase ID</th>
                      <th className="text-left p-3">Checker</th>
                      <th className="text-left p-3">Phone</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row._id} className="border-t border-slate-100 text-sm">
                        <td className="p-3 font-medium text-slate-900">{row.purchaseId}</td>
                        <td className="p-3">{row.checkerType}</td>
                        <td className="p-3">{row.phoneNumber}</td>
                        <td className="p-3">GHc {Number(row.price || 0).toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : row.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
