import React from 'react';
import { Info, Edit2, Ban, Clock, Trash2, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import { formatNumberAbbreviated } from '../utils/formatCurrency';

export const UserViewModal = ({ isOpen, onClose, user, getStatusColor, getStatusText }) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Information"
      icon={Info}
      footer={
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Close
        </button>
      }
    >
      <div className="space-y-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-2">User Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex justify-between items-center sm:border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-500">Name:</span>
              <span className="text-xs font-black text-slate-900">{user.name}</span>
            </div>
            <div className="flex justify-between items-center sm:border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-500">Email:</span>
              <span className="text-xs font-black text-slate-900 break-all ml-2">{user.email}</span>
            </div>
            <div className="flex justify-between items-center sm:border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-500">Balance:</span>
              <span className="text-xs font-black text-blue-600">GHS {formatNumberAbbreviated(user.balance) || '0'}</span>
            </div>
            <div className="flex justify-between items-center sm:border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-500">Role:</span>
              <span className="text-xs font-black text-slate-900 uppercase">{user.role}</span>
            </div>
            <div className="flex justify-between items-center sm:border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(user)}`}>
                {getStatusText(user)}
              </span>
            </div>
            <div className="flex justify-between items-center sm:border-b border-slate-200 pb-1">
              <span className="text-xs font-bold text-slate-500">Joined:</span>
              <span className="text-xs font-black text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Referral Code</p>
            <p className="text-sm font-black text-slate-900">{user.referralCode || 'N/A'}</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Earnings</p>
            <p className="text-sm font-black text-emerald-600">GHS {formatNumberAbbreviated(user.referralEarnings) || '0'}</p>
          </div>
        </div>

        {user.status === 'banned' && user.banReason && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-[9px] font-bold text-red-600 uppercase mb-1">Ban Reason</p>
            <p className="text-xs font-bold text-red-900">{user.banReason}</p>
          </div>
        )}

        {user.status === 'suspended' && user.suspendedUntil && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">Suspended Until</p>
            <p className="text-xs font-bold text-amber-900">{new Date(user.suspendedUntil).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export const UserRoleModal = ({ isOpen, onClose, user, newRole, setNewRole, onUpdate, loading }) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? null : onClose}
      title="Change User Role"
      icon={Edit2}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : 'Update Role'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
          <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Target User</p>
          <p className="text-sm font-black text-slate-900">{user.name}</p>
          <p className="text-[10px] font-medium text-slate-500">{user.email}</p>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-700 mb-1.5 border-l-2 border-blue-600 pl-2">New Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-slate-900 font-bold focus:border-blue-600 outline-none transition-all text-sm"
          >
            <option value="user">User (Standard)</option>
            <option value="agent">Agent (Store Owner)</option>
            <option value="admin">Admin (Full Access)</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};

export const UserBanModal = ({ isOpen, onClose, user, banReason, setBanReason, onBan, loading }) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? null : onClose}
      title="Ban User"
      icon={Ban}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onBan}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Banning...
              </>
            ) : 'Ban User'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-red-50 p-3 rounded-xl border border-red-100">
          <p className="text-[9px] font-bold text-red-600 uppercase mb-1">Account to Ban</p>
          <p className="text-sm font-black text-red-900">{user.name}</p>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 border-l-2 border-red-600 pl-2">Reason (Optional)</label>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            disabled={loading}
            placeholder="e.g. Fraudulent activities..."
            className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-slate-900 font-medium focus:border-red-500 outline-none transition-all text-sm"
            rows="2"
          />
        </div>
      </div>
    </Modal>
  );
};

export const UserSuspendModal = ({ isOpen, onClose, user, suspendDays, setSuspendDays, onSuspend, loading }) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? null : onClose}
      title="Suspend User"
      icon={Clock}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSuspend}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Suspending...
              </>
            ) : 'Suspend'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
          <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">Target Account</p>
          <p className="text-sm font-black text-amber-900">{user.name}</p>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 border-l-2 border-amber-600 pl-2">Duration (Days)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={suspendDays}
            onChange={(e) => setSuspendDays(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={loading}
            className="w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-xl text-slate-900 font-black focus:border-amber-600 outline-none transition-all text-sm"
          />
        </div>
      </div>
    </Modal>
  );
};

export const UserEditModal = ({ isOpen, onClose, user, onUpdate, loading }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    walletOperation: 'set',
    walletAmount: 0,
    role: 'user'
  });

  const [previewBalance, setPreviewBalance] = React.useState(0);

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        walletOperation: 'set',
        walletAmount: user.balance || 0,
        role: user.role || 'user'
      });
      setPreviewBalance(user.balance || 0);
    }
  }, [user, isOpen]);

  React.useEffect(() => {
    if (!user) return;
    const amount = parseFloat(formData.walletAmount) || 0;
    const current = parseFloat(user.balance) || 0;
    let result = current;

    if (formData.walletOperation === 'credit') result = current + amount;
    else if (formData.walletOperation === 'deduct') result = current - amount;
    else if (formData.walletOperation === 'set') result = amount;

    setPreviewBalance(result);
  }, [formData.walletOperation, formData.walletAmount, user]);

  if (!user) return null;

  const isDeductIssue = formData.walletOperation === 'deduct' && user.balance < 1;
  const isNegativeIssue = previewBalance < 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? null : onClose}
      title="Edit User Details"
      icon={Edit2}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate(formData)}
            disabled={isNegativeIssue || loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-blue-600 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-blue-600 outline-none transition-all text-sm"
            >
              <option value="user">User</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-blue-600 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold focus:border-blue-600 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="p-3 bg-blue-50 border-2 border-blue-100 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Wallet Management</span>
            <span className="text-[10px] font-bold text-slate-600">Current: GHS {formatNumberAbbreviated(user.balance)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Operation</label>
              <select
                value={formData.walletOperation}
                onChange={(e) => setFormData({ ...formData, walletOperation: e.target.value, walletAmount: e.target.value === 'set' ? user.balance : 0 })}
                className="w-full px-2 py-1.5 bg-white border-2 border-blue-100 rounded-lg text-slate-900 font-bold text-xs outline-none focus:border-blue-400"
              >
                <option value="set">Set Balance</option>
                <option value="credit">Credit (Add)</option>
                <option value="deduct">Deduct (Subtract)</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.walletAmount}
                onChange={(e) => setFormData({ ...formData, walletAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 bg-white border-2 border-blue-100 rounded-lg text-slate-900 font-bold text-xs outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-1.5 border-t border-blue-100">
            <span className="text-[10px] font-bold text-slate-500">Preview:</span>
            <span className={`text-xs font-black ${isNegativeIssue ? 'text-red-600' : 'text-blue-700'}`}>
              GHS {formatNumberAbbreviated(previewBalance)}
            </span>
          </div>

          {isDeductIssue && !isNegativeIssue && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-amber-600 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-100">
              <AlertCircle size={10} />
              Low balance warning
            </div>
          )}
          {isNegativeIssue && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-red-600 font-bold bg-red-50 p-1.5 rounded-lg border border-red-100">
              <AlertCircle size={10} />
              Balance cannot be negative
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
