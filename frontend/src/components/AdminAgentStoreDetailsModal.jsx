import { useState, useEffect } from 'react';
import {
  X, Wallet, RefreshCw, CheckCircle, Store,
  PlusCircle, MinusCircle, ShoppingCart, ArrowLeftRight,
  TrendingUp, CreditCard, LayoutDashboard, SlidersHorizontal,
} from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';

const TABS = [
  { id: 'overview',      label: 'Overview',      icon: LayoutDashboard },
  { id: 'orders',        label: 'Orders',         icon: ShoppingCart },
  { id: 'transactions',  label: 'Transactions',   icon: ArrowLeftRight },
  { id: 'commissions',   label: 'Commissions',    icon: TrendingUp },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'adjust',        label: 'Adjust',         icon: SlidersHorizontal },
];

function LedgerCard({ title, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="mb-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mb-0.5">{title}</p>
      <p className="text-base sm:text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DetailsTable({ columns, rows, renderRow }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((c) => (
              <th key={c} className="text-left py-2.5 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map(renderRow) : (
            <tr>
              <td colSpan={columns.length} className="py-8 px-3 text-sm text-slate-400 text-center">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || '').toLowerCase();
  const colorMap = {
    completed:  'bg-emerald-100 text-emerald-700',
    successful: 'bg-emerald-100 text-emerald-700',
    paid:       'bg-emerald-100 text-emerald-700',
    pending:    'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    failed:     'bg-red-100 text-red-700',
    cancelled:  'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colorMap[v] || 'bg-slate-100 text-slate-600'}`}>
      {value || 'N/A'}
    </span>
  );
}

export default function AdminAgentStoreDetailsModal({
  isOpen,
  onClose,
  store,
  details,
  loading,
  adjustForm,
  setAdjustForm,
  onAdjustSubmit,
  submitting,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isOpen) setActiveTab('overview');
  }, [isOpen]);

  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Agent Store Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {store.name} <span className="text-slate-400">/ {store.slug}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="px-5 sm:px-6 border-b border-slate-200 flex-shrink-0 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-0 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-blue-700"></div>
            </div>
          ) : details ? (
            <>
              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
                    <LedgerCard title="Withdrawable"      value={formatCurrencyAbbreviated(details.ledger?.totalEarned      || 0)} icon={Wallet}       iconBg="bg-emerald-50" iconColor="text-emerald-700" />
                    <LedgerCard title="Pending"           value={formatCurrencyAbbreviated(details.ledger?.totalPending    || 0)} icon={RefreshCw}     iconBg="bg-amber-50"   iconColor="text-amber-700" />
                    <LedgerCard title="Withdrawn"         value={formatCurrencyAbbreviated(details.ledger?.totalWithdrawn  || 0)} icon={CheckCircle}   iconBg="bg-blue-50"    iconColor="text-blue-700" />
                    <LedgerCard title="Total Commissions" value={formatCurrencyAbbreviated(details.ledger?.totalCommissions|| 0)} icon={Store}         iconBg="bg-indigo-50"  iconColor="text-indigo-700" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Agent</p>
                      <p className="font-semibold text-slate-900 text-sm">{details.agent?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-600">{details.agent?.email || 'N/A'}</p>
                      <p className="text-xs text-slate-600">{details.agent?.phone || 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Store Stats</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Total Orders</span><span className="font-semibold text-slate-900">{details.stats?.totalOrders || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Paid Orders</span><span className="font-semibold text-emerald-700">{details.stats?.paidOrders || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Failed Orders</span><span className="font-semibold text-red-600">{details.stats?.failedOrders || 0}</span></div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payout Stats</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Paid Payouts</span><span className="font-semibold text-slate-900">{details.stats?.paidPayouts || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Pending Payouts</span><span className="font-semibold text-amber-700">{details.stats?.pendingPayouts || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Commission Rows</span><span className="font-semibold text-slate-900">{details.stats?.commissionRecords || 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORDERS ── */}
              {activeTab === 'orders' && (
                <DetailsTable
                  columns={['Order #', 'Phone', 'Amount', 'Payment', 'Status']}
                  rows={details.orders || []}
                  renderRow={(row) => (
                    <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-xs font-medium text-slate-900">{row.orderNumber || '-'}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">{row.phoneNumber || '-'}</td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{formatCurrencyAbbreviated(row.amount || 0)}</td>
                      <td className="py-2.5 px-3 text-xs"><StatusPill value={row.paymentStatus} /></td>
                      <td className="py-2.5 px-3 text-xs"><StatusPill value={row.status} /></td>
                    </tr>
                  )}
                />
              )}

              {/* ── TRANSACTIONS ── */}
              {activeTab === 'transactions' && (
                <DetailsTable
                  columns={['Reference', 'Type', 'Amount', 'Status', 'Date']}
                  rows={details.transactions || []}
                  renderRow={(row) => (
                    <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-xs font-mono text-slate-700">{row.reference || '-'}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 capitalize">{row.type || '-'}</td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{formatCurrencyAbbreviated(row.amount || 0)}</td>
                      <td className="py-2.5 px-3 text-xs"><StatusPill value={row.status} /></td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )}
                />
              )}

              {/* ── COMMISSIONS ── */}
              {activeTab === 'commissions' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Commission History</p>
                    <DetailsTable
                      columns={['Order', 'Seller Price', 'Admin Price', 'Commission', 'Status']}
                      rows={details.commissions || []}
                      renderRow={(row) => (
                        <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-xs text-slate-700">{row.orderId?.orderNumber || '-'}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">{formatCurrencyAbbreviated(row.sellerPrice || 0)}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">{formatCurrencyAbbreviated(row.adminPlanPrice || 0)}</td>
                          <td className="py-2.5 px-3 text-xs font-semibold text-emerald-700">{formatCurrencyAbbreviated(row.commissionEarned || 0)}</td>
                          <td className="py-2.5 px-3 text-xs"><StatusPill value={row.status} /></td>
                        </tr>
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payout History</p>
                    <DetailsTable
                      columns={['Amount', 'Net Amount', 'Method', 'Status', 'Date']}
                      rows={details.payouts || []}
                      renderRow={(row) => (
                        <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{formatCurrencyAbbreviated(row.amount || 0)}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">{formatCurrencyAbbreviated(row.netAmount || 0)}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 capitalize">{row.method || '-'}</td>
                          <td className="py-2.5 px-3 text-xs"><StatusPill value={row.status} /></td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                        </tr>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* ── BILLING ── */}
              {activeTab === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Agent Fee Payments</p>
                    <DetailsTable
                      columns={['Reference', 'Amount', 'Status', 'Paid At', 'Created']}
                      rows={details.feePayments || []}
                      renderRow={(row) => (
                        <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-xs font-mono text-slate-700">{row.reference || '-'}</td>
                          <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{formatCurrencyAbbreviated(row.amount || 0)}</td>
                          <td className="py-2.5 px-3 text-xs"><StatusPill value={row.status} /></td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">{row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '—'}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                        </tr>
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Adjustment History</p>
                    <DetailsTable
                      columns={['Type', 'Amount', 'Reason', 'By', 'Date']}
                      rows={details.adjustments || []}
                      renderRow={(row) => (
                        <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-xs">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{formatCurrencyAbbreviated(row.amount || 0)}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-600">{row.reason || '-'}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-600">{row.performedBy?.name || 'Admin'}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                        </tr>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* ── ADJUST ── */}
              {activeTab === 'adjust' && (
                <form onSubmit={onAdjustSubmit} className="space-y-5 max-w-lg">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Withdrawable Balance</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrencyAbbreviated(details.ledger?.totalEarned || 0)}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type</label>
                    <div className="flex gap-2">
                      {['credit', 'debit'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAdjustForm((prev) => ({ ...prev, type: t }))}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors capitalize ${
                            adjustForm.type === t
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {t === 'credit'
                            ? <PlusCircle size={14} className="inline mr-1.5" />
                            : <MinusCircle size={14} className="inline mr-1.5" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Amount</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={adjustForm.amount}
                      onChange={(e) => setAdjustForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Reason for adjustment"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Internal Note <span className="text-slate-400 font-normal normal-case">(optional)</span>
                    </label>
                    <textarea
                      rows="2"
                      value={adjustForm.note}
                      onChange={(e) => setAdjustForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Optional note..."
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {submitting
                      ? 'Applying...'
                      : `Apply ${adjustForm.type === 'credit' ? 'Credit' : 'Debit'}`}
                  </button>
                </form>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm">No details available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
