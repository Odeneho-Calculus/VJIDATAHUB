import React from 'react';
import { ShoppingCart, Edit2, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { formatNumberAbbreviated } from '../utils/formatCurrency';

export const OrderDetailsModal = ({ isOpen, onClose, order, onRefund }) => {
  if (!order) return null;

  const isCheckerOrder =
    String(order?.orderKind || '').toLowerCase() === 'checker' ||
    String(order?.network || '').toLowerCase() === 'checker' ||
    Boolean(order?.checkerDetails?.checkerType);

  const planAmountLabel = isCheckerOrder ? 'Checker Type' : 'Amount';
  const planAmountValue = isCheckerOrder
    ? (order?.planName || order?.checkerDetails?.checkerType || 'Checker')
    : (order?.dataAmount || 'N/A');

  const isFailedOrder = order.status === 'failed' || order.paymentStatus === 'failed';
  const canRefund = order.paymentStatus === 'completed' && !order.isRefunded;
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
      footer={
        <div className="flex w-full gap-3">
          {canRefund && onRefund && (
            <button
              onClick={() => onRefund(order)}
              className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Refund Order
            </button>
          )}
          <button
            onClick={onClose}
            className={`${canRefund ? 'flex-1' : 'w-full'} px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition text-sm`}
          >
            Close Details
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">Order ID</p>
            <p className="text-xs font-black text-slate-900 break-all">{order.orderNumber || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-1">Payment Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${order.paymentStatus === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : order.paymentStatus === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}>
              {order.paymentStatus || 'pending'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-1">Order/Delivery Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${order.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : order.status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : order.status === 'processing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
              }`}>
              {order.status || 'N/A'}
            </span>
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

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
            Customer Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Name</p>
              <p className="text-xs font-black text-slate-900">{order.user?.name || order.userId?.name || 'Unknown'}</p>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Email</p>
              <p className="text-xs font-black text-slate-900 truncate">{order.user?.email || order.userId?.email || 'N/A'}</p>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl sm:col-span-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Phone</p>
              <p className="text-xs font-black text-slate-900">{order.phoneNumber || 'N/A'}</p>
            </div>
          </div>
        </div>

        {order.store && (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
              Store Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Store Name</p>
                <p className="text-xs font-black text-slate-900">{order.store?.name || 'N/A'}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Owner</p>
                <p className="text-xs font-black text-slate-900">{order.store?.owner?.name || 'N/A'}</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl sm:col-span-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Owner Email</p>
                <p className="text-xs font-black text-slate-900 truncate">{order.store?.owner?.email || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
            Plan Information
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Network</p>
              <p className="text-xs font-black text-slate-900">{order.network || 'N/A'}</p>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
              <p className="text-[9px] font-bold text-slate-400 uppercase">{planAmountLabel}</p>
              <p className="text-xs font-black text-slate-900">{planAmountValue}</p>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl col-span-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Plan Name</p>
              <p className="text-xs font-black text-slate-900">{order.planName || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl col-span-2 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Price</p>
              <p className="text-lg font-black text-slate-900">GHS {formatNumberAbbreviated(order.amount) || '0'}</p>
            </div>
          </div>
        </div>

        {(order.providerMessage || order.errorMessage || order.adminNotes) && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              Audit Logs
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {order.providerMessage && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Provider</p>
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">{order.providerMessage}</p>
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

        <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-slate-400">
          <span className="uppercase">Created On</span>
          <span className="text-slate-500">
            {new Date(order.date || order.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </Modal>
  );
};

export const OrderStatusModal = ({ isOpen, onClose, order, newStatus, setNewStatus, adminNotes, setAdminNotes, updateLoading, onUpdate }) => {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Order Status"
      icon={Edit2}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={updateLoading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            disabled={updateLoading}
            className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm"
          >
            {updateLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Order Ref</p>
          <p className="text-sm font-black text-slate-900">#{order.orderNumber || 'N/A'}</p>
          <p className="text-[10px] font-bold text-slate-500 truncate">{order.planName}</p>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 border-l-2 border-slate-900 pl-2">Current Status: <span className="text-slate-600">{order.status}</span></label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={updateLoading}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:border-slate-900 outline-none transition-all text-sm"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 border-l-2 border-slate-200 pl-2">Admin Notes (Optional)</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes..."
            disabled={updateLoading}
            rows="2"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:border-slate-900 outline-none transition-all text-sm"
          />
        </div>
      </div>
    </Modal>
  );
};
