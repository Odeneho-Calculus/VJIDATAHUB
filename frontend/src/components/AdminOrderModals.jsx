import React from 'react';
import { ShoppingCart, Edit2, RotateCcw, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import { formatNumberAbbreviated } from '../utils/formatCurrency';

export const OrderDetailsModal = ({ isOpen, onClose, order, onRefund, themeColor }) => {
  if (!order) return null;

  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  const isCheckerOrder =
    String(order?.orderKind || '').toLowerCase() === 'checker' ||
    String(order?.network || '').toLowerCase() === 'checker' ||
    Boolean(order?.checkerDetails?.checkerType);

  const isAfaOrder = order.isAfaRegistration || order.orderKind === 'afa' || order.orderCategory === 'afa';

  const planAmountLabel = isCheckerOrder ? 'Checker Type' : (isAfaOrder ? 'Service' : 'Amount');
  const planAmountValue = isCheckerOrder
    ? (order?.planName || order?.checkerDetails?.checkerType || 'Checker')
    : (isAfaOrder ? 'AFA Registration' : (order?.dataAmount || 'N/A'));

  const isFailedOrder = order.status === 'failed' || order.paymentStatus === 'failed';
  const canRefund = order.paymentStatus === 'completed' && !order.isRefunded && order.status !== 'completed';
  const failedContext = [
    order.errorMessage,
    order.providerMessage,
    order.adminNotes,
  ].filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Order Details"
      icon={ShoppingCart}
      maxWidth="max-w-xl"
      themeColor={c}
      footer={
        <div className="flex w-full gap-3">
          {canRefund && onRefund && (
            <button
              onClick={() => onRefund(order)}
              className="flex-1 px-4 py-2.5 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
              style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.2)' }}
            >
              <RotateCcw size={16} strokeWidth={2.5} />
              Refund Order
            </button>
          )}
          <button
            onClick={onClose}
            className={`${canRefund ? 'flex-1' : 'w-full'} px-4 py-2.5 text-white rounded-xl font-bold transition text-sm`}
            style={{ background: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
          >
            Close Details
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-slate-100" style={{ background: c.soft }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: c.main }}>Order ID</p>
            <p className="text-xs font-black text-[#111] break-all">#{order.orderNumber?.toUpperCase() || 'N/A'}</p>
          </div>
          {order.paymentStatus && (
            <div className="p-3 rounded-xl border border-slate-100" style={{ background: c.soft }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: c.main }}>Payment Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${order.paymentStatus === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : order.paymentStatus === 'pending'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                {order.paymentStatus || 'pending'}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 rounded-xl border border-slate-100" style={{ background: c.soft }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: c.main }}>Order/Delivery Status</p>
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${order.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : (order.status === 'pending' || order.status === 'processing')
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                {order.status || 'N/A'}
              </span>
              {order.isRefunded && (
                <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-orange-100 text-orange-700 border border-orange-200">
                  REFUNDED
                </span>
              )}
            </div>
          </div>
        </div>

        {isFailedOrder && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-[9px] font-black text-red-700 uppercase tracking-widest mb-1">Failed Details</p>
            <p className="text-[11px] font-bold text-red-700 leading-relaxed">
              {failedContext.length > 0
                ? failedContext[0]
                : 'This order failed, but no specific reason was recorded yet. Review webhook logs, provider response history, and transaction trace for the root cause.'}
            </p>
          </div>
        )}

        {(order.user?.name || order.userId?.name || (order.user?.email || order.userId?.email)) && (
          <div>
            <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.main }}></div>
              Customer Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Name</p>
                <p className="text-xs font-black text-[#111]">{order.user?.name || order.userId?.name || 'Unknown'}</p>
              </div>
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Email</p>
                <p className="text-xs font-black text-[#111] truncate">{order.user?.email || order.userId?.email || 'N/A'}</p>
              </div>
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl sm:col-span-2">
                <p className="text-[9px] font-bold text-black uppercase">Phone</p>
                <p className="text-xs font-black text-[#111]">{order.phoneNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {order.store && (
          <div>
            <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.main }}></div>
              Store Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Store Name</p>
                <p className="text-xs font-black text-[#111]">{order.store?.name || 'N/A'}</p>
              </div>
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Owner</p>
                <p className="text-xs font-black text-[#111]">{order.store?.owner?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {isAfaOrder && order.afaRegistration && (
          <div>
            <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              AFA Registration Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Applicant Name</p>
                <p className="text-xs font-black text-black">{order.afaRegistration.name}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Phone Number</p>
                <p className="text-xs font-black text-black">{order.afaRegistration.phoneNumber}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">ID Number (Ghana Card)</p>
                <p className="text-xs font-black text-black">{order.afaRegistration.idNumber}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Date of Birth</p>
                <p className="text-xs font-black text-black">{order.afaRegistration.dateOfBirth}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Occupation</p>
                <p className="text-xs font-black text-black">{order.afaRegistration.occupation}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Location / Region</p>
                <p className="text-xs font-black text-black">{order.afaRegistration.location}, {order.afaRegistration.region}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.main }}></div>
            Plan Information
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {order.network && order.network !== 'N/A' && (
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">Network</p>
                <p className="text-xs font-black text-[#111] uppercase">{order.network}</p>
              </div>
            )}
            {planAmountValue && planAmountValue !== 'N/A' && (
              <div className="p-2.5 bg-[#fafaf7] border border-slate-100 rounded-xl">
                <p className="text-[9px] font-bold text-black uppercase">{planAmountLabel}</p>
                <p className="text-xs font-black text-[#111]">{planAmountValue}</p>
              </div>
            )}
            {order.amount > 0 && (
              <div className="p-3 border rounded-xl col-span-2 flex justify-between items-center" style={{ background: c.soft, borderColor: c.main + '22' }}>
                <p className="text-[10px] font-black text-black uppercase">Total Amount</p>
                <p className="text-lg font-black" style={{ color: c.main }}>GHS {formatNumberAbbreviated(order.amount) || '0'}</p>
              </div>
            )}
          </div>
        </div>

        {(order.providerMessage || order.errorMessage || order.adminNotes) && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              Audit Logs
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {order.providerMessage && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[8px] font-bold text-black uppercase mb-0.5">Provider</p>
                  <p className="text-[11px] font-bold text-black leading-tight">{order.providerMessage}</p>
                </div>
              )}
              {order.errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-[8px] font-bold text-red-600 uppercase mb-0.5">Error</p>
                  <p className="text-[11px] font-bold text-red-700 leading-tight">{order.errorMessage}</p>
                </div>
              )}
              {order.adminNotes && (
                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-[8px] font-bold text-amber-600 uppercase mb-0.5">Notes</p>
                  <p className="text-[11px] font-bold text-amber-700 leading-tight">{order.adminNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-black">
          <span className="uppercase">Created On</span>
          <span className="text-black">
            {new Date(order.date || order.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </Modal>
  );
};

export const OrderStatusModal = ({ isOpen, onClose, order, newStatus, setNewStatus, adminNotes, setAdminNotes, updateLoading, onUpdate, themeColor }) => {
  if (!order) return null;

  const defaultTheme = { main: '#7C3AED', bg: '#EDE9FE', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.15)' };
  const c = themeColor || defaultTheme;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Status"
      icon={Edit2}
      maxWidth="max-w-sm"
      themeColor={c}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={updateLoading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-[#111] font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            disabled={updateLoading}
            className="flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm"
            style={{ background: c.main, boxShadow: `0 4px 12px ${c.glow}` }}
          >
            {updateLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-xl border border-slate-100" style={{ background: c.soft }}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: c.main }}>Order Reference</p>
          <p className="text-sm font-black text-[#111]">#{order.orderNumber?.toUpperCase() || order._id?.slice(-8).toUpperCase()}</p>
          <p className="text-[10px] font-bold text-black truncate">{order.planName}</p>
        </div>

        <div>
          <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.main }}></div>
            Current: <span style={{ color: c.main }}>{order.status}</span>
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={updateLoading}
            className="w-full px-4 py-3 bg-[#fafaf7] border border-slate-100 rounded-xl text-[#111] font-black focus:bg-white outline-none transition-all text-sm appearance-none cursor-pointer"
            style={{ borderLeft: `4px solid ${c.main}` }}
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.main }}></div>
            Admin Notes
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes..."
            disabled={updateLoading}
            rows="2"
            className="w-full px-4 py-3 bg-[#fafaf7] border border-slate-100 rounded-xl text-[#111] font-bold focus:bg-white outline-none transition-all text-sm resize-none"
          />
        </div>
      </div>
    </Modal>
  );
};
