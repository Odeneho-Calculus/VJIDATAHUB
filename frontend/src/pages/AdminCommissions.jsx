import { useEffect, useMemo, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Check, CircleDollarSign, Clock, Eye, HandCoins, Send, X, XCircle } from 'lucide-react';
import { formatCurrencyAbbreviated } from '../utils/formatCurrency';
import AdminSidebar from '../components/AdminSidebar';
import { useSidebar } from '../hooks/useSidebar';
import { adminStore } from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

export default function AdminCommissions() {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDangerous: false,
    confirmText: 'Confirm',
    onConfirm: null,
  });

  const openConfirm = useCallback(({ title, message, isDangerous = false, confirmText = 'Confirm', onConfirm }) => {
    setConfirmState({ isOpen: true, title, message, isDangerous, confirmText, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [filter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 3500);
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const data = await adminStore.getCommissionPayouts(page, 20, filter === 'all' ? '' : filter);
      setPayouts(data?.payouts || []);
      setTotalPages(data?.pagination?.pages || 0);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (payout, action) => {
    setSelectedPayout(payout);
    setModalAction(action);
    setFormData({});
    setShowModal(true);
  };

  const showApproveForm = () => {
    setModalAction('approve');
    setFormData({});
  };

  const showMarkPaidForm = () => {
    setModalAction('markPaid');
    setFormData({});
  };

  const showRejectForm = () => {
    setModalAction('reject');
    setFormData({ adminNote: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPayout(null);
    setModalAction(null);
    setFormData({});
  };

  const requestApprovePayout = () => {
    if (!selectedPayout) return;
    openConfirm({
      title: 'Approve Payout',
      message: `Approve this ${selectedPayout.method === 'mobile_money' ? 'mobile money' : 'bank'} payout request for ${selectedPayout.agentId?.name || 'this agent'}?`,
      isDangerous: false,
      confirmText: 'Yes, Approve',
      onConfirm: handleApprovePayout,
    });
  };

  const requestMarkAsPaid = () => {
    if (!selectedPayout) return;
    openConfirm({
      title: 'Mark as Paid',
      message: `Mark this payout of ${formatCurrencyAbbreviated(Number(selectedPayout.netAmount || 0))} as paid for ${selectedPayout.agentId?.name || 'this agent'}?`,
      isDangerous: false,
      confirmText: 'Yes, Mark Paid',
      onConfirm: handleMarkAsPaid,
    });
  };

  const requestRejectPayout = () => {
    if (!selectedPayout) return;
    openConfirm({
      title: 'Reject Payout',
      message: `Reject this request and return ${formatCurrencyAbbreviated(Number(selectedPayout.amount || 0))} to ${selectedPayout.agentId?.name || 'this agent'}'s available commission balance?`,
      isDangerous: true,
      confirmText: 'Yes, Reject',
      onConfirm: handleRejectPayout,
    });
  };

  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    try {
      setSubmitting(true);
      await adminStore.approveMobileMoneyPayout(selectedPayout._id, {
        requiresOtp: formData.requiresOtp || false,
        otpCode: formData.otpCode || '',
      });
      closeModal();
      await fetchPayouts();
      showMessage('Payout approval initiated');
    } catch (err) {
      showMessage(err?.message || 'Failed to approve payout', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayout) return;
    try {
      setSubmitting(true);
      await adminStore.markPayoutAsPaid(selectedPayout._id, {
        adminNote: formData.adminNote || '',
      });
      closeModal();
      await fetchPayouts();
      showMessage('Payout marked as paid');
    } catch (err) {
      showMessage(err?.message || 'Failed to mark payout as paid', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout) return;

    try {
      setSubmitting(true);
      await adminStore.rejectCommissionPayout(selectedPayout._id, {
        adminNote: formData.adminNote || '',
      });
      closeModal();
      await fetchPayouts();
      showMessage('Payout rejected and commission restored');
    } catch (err) {
      showMessage(err?.message || 'Failed to reject payout', true);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = useMemo(
    () => payouts.reduce((sum, payout) => sum + (payout.amount || 0), 0),
    [payouts]
  );
  const totalNetAmount = useMemo(
    () => payouts.reduce((sum, payout) => sum + (payout.netAmount || 0), 0),
    [payouts]
  );
  const pendingCount = useMemo(
    () => payouts.filter((payout) => payout.status === 'pending').length,
    [payouts]
  );

  return (
    <div className="flex h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Agent Withdrawals</h1>
              <p className="text-sm sm:text-base text-slate-600">Review and process agent commission payout requests</p>
            </div>

            {error && (
              <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm sm:text-base flex items-center gap-3">
                <AlertCircle size={20} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm sm:text-base flex items-center gap-3">
                <CheckCircle size={20} className="flex-shrink-0" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <StatCard title="Requests On Page" value={payouts.length} icon={HandCoins} iconBg="bg-blue-50" iconColor="text-blue-700" />
              <StatCard title="Pending" value={pendingCount} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-700" />
              <StatCard title="Gross Amount" value={formatCurrencyAbbreviated(totalAmount)} icon={HandCoins} iconBg="bg-indigo-50" iconColor="text-indigo-700" />
              <StatCard title="Net Amount" value={formatCurrencyAbbreviated(totalNetAmount)} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm mb-6 sm:mb-8">
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'processing', 'paid', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilter(status);
                      setPage(1);
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold capitalize transition ${filter === status
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-14 text-slate-500">No payouts found for this status</div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">Agent</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700 text-sm">Method</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-sm">Amount</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-sm">Net</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700 text-sm">Status</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-700 text-sm">Date</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-sm">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((payout) => (
                          <tr key={payout._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900 text-sm">{payout.agentId?.name || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{payout.agentId?.email || 'N/A'}</p>
                            </td>
                            <td className="py-3 px-4 text-slate-700 text-sm capitalize">
                              {payout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}
                            </td>
                            <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">
                              {formatCurrencyAbbreviated(Number(payout.amount || 0))}
                            </td>
                            <td className="py-3 px-4 text-right text-sm">
                              <p className="font-semibold text-slate-900">{formatCurrencyAbbreviated(Number(payout.netAmount || 0))}</p>
                              <p className="text-xs text-slate-500">Fee: {formatCurrencyAbbreviated(Number(payout.withdrawalFeeAmount || 0))}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <StatusBadge status={payout.status} />
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">
                              {new Date(payout.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  onClick={() => openModal(payout, 'details')}
                                  title="View details"
                                  aria-label="View payout details"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                  <Eye size={15} />
                                </button>
                                {payout.status === 'pending' && (
                                  <button
                                    onClick={() => openModal(payout, 'approve')}
                                    title="Approve"
                                    aria-label="Approve payout"
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                  >
                                    <Check size={15} />
                                  </button>
                                )}
                                {(payout.status === 'pending' || payout.status === 'processing') && (
                                  <button
                                    onClick={() => openModal(payout, 'reject')}
                                    title="Reject"
                                    aria-label="Reject payout"
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                )}
                                {(payout.status === 'pending' || payout.status === 'processing') && (
                                  <button
                                    onClick={() => openModal(payout, 'markPaid')}
                                    title="Mark paid"
                                    aria-label="Mark payout as paid"
                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                  >
                                    <CircleDollarSign size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden p-3 space-y-3">
                    {payouts.map((payout) => (
                      <div key={payout._id} className="border border-slate-200 rounded-2xl p-3 bg-white">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{payout.agentId?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{payout.agentId?.email || 'N/A'}</p>
                          </div>
                          <StatusBadge status={payout.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <p className="text-slate-600">Method: <span className="font-semibold text-slate-900">{payout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}</span></p>
                          <p className="text-slate-600">Date: <span className="font-semibold text-slate-900">{new Date(payout.createdAt).toLocaleDateString()}</span></p>
                          <p className="text-slate-600">Amount: <span className="font-semibold text-slate-900">{formatCurrencyAbbreviated(Number(payout.amount || 0))}</span></p>
                          <p className="text-slate-600">Net: <span className="font-semibold text-slate-900">{formatCurrencyAbbreviated(Number(payout.netAmount || 0))}</span></p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(payout, 'details')}
                            title="View details"
                            aria-label="View payout details"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                          >
                            <Eye size={15} />
                          </button>
                          {payout.status === 'pending' && (
                            <button
                              onClick={() => openModal(payout, 'approve')}
                              title="Approve"
                              aria-label="Approve payout"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          {(payout.status === 'pending' || payout.status === 'processing') && (
                            <button
                              onClick={() => openModal(payout, 'reject')}
                              title="Reject"
                              aria-label="Reject payout"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          {(payout.status === 'pending' || payout.status === 'processing') && (
                            <button
                              onClick={() => openModal(payout, 'markPaid')}
                              title="Mark paid"
                              aria-label="Mark payout as paid"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                            >
                              <CircleDollarSign size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 sm:mt-8 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && selectedPayout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                {modalAction === 'approve'
                  ? 'Approve Payout'
                  : modalAction === 'markPaid'
                    ? 'Mark Payout as Paid'
                    : modalAction === 'reject'
                      ? 'Reject Payout'
                      : 'Payout Details'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>

            {modalAction === 'reject' && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Rejecting this request will move the pending withdrawal amount back into the agent's available commission balance.
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <DetailRow label="Agent Name" value={selectedPayout.agentId?.name || 'N/A'} />
                <DetailRow label="Agent Email" value={selectedPayout.agentId?.email || 'N/A'} />
                <DetailRow label="Method" value={selectedPayout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'} />
                <DetailRow label="Status" value={String(selectedPayout.status || '').toUpperCase() || 'N/A'} />
                <DetailRow label="Requested" value={formatCurrencyAbbreviated(Number(selectedPayout.requestedAmount || selectedPayout.amount || 0))} />
                <DetailRow label="Gross Amount" value={formatCurrencyAbbreviated(Number(selectedPayout.amount || 0))} />
                <DetailRow label="Fee" value={formatCurrencyAbbreviated(Number(selectedPayout.withdrawalFeeAmount || 0))} />
                <DetailRow label="Net Amount" value={formatCurrencyAbbreviated(Number(selectedPayout.netAmount || 0))} />
                <DetailRow label="Date Requested" value={new Date(selectedPayout.createdAt).toLocaleString()} />
                <DetailRow label="Date Paid" value={selectedPayout.paidAt ? new Date(selectedPayout.paidAt).toLocaleString() : 'Not paid yet'} />
                <DetailRow
                  label="Admin Note"
                  value={selectedPayout.adminNote || 'No admin note'}
                  fullWidth
                />
              </div>

              {selectedPayout.details && typeof selectedPayout.details === 'object' && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Payout Account Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedPayout.details).map(([key, value]) => (
                      <DetailRow
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}
                        value={value == null || value === '' ? 'N/A' : String(value)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {modalAction === 'details' && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedPayout.status === 'pending' && (
                  <button
                    onClick={showApproveForm}
                    className="px-3 py-2 border border-slate-900 text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Approve
                  </button>
                )}
                {(selectedPayout.status === 'pending' || selectedPayout.status === 'processing') && (
                  <button
                    onClick={showRejectForm}
                    className="px-3 py-2 border border-red-600 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50"
                  >
                    Reject
                  </button>
                )}
                {(selectedPayout.status === 'pending' || selectedPayout.status === 'processing') && (
                  <button
                    onClick={showMarkPaidForm}
                    className="px-3 py-2 border border-emerald-600 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-50"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            )}

            {modalAction === 'approve' && selectedPayout.method === 'mobile_money' && (
              <div className="mb-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!formData.requiresOtp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requiresOtp: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Require OTP
                </label>
                {formData.requiresOtp && (
                  <input
                    type="text"
                    value={formData.otpCode || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, otpCode: e.target.value }))}
                    placeholder="Enter OTP code"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm"
                  />
                )}
              </div>
            )}

            {modalAction === 'markPaid' && (
              <div className="mb-4">
                <textarea
                  rows="3"
                  value={formData.adminNote || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="Optional admin note"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 text-sm resize-none"
                />
              </div>
            )}

            {modalAction === 'reject' && (
              <div className="mb-4">
                <textarea
                  rows="3"
                  value={formData.adminNote || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="Optional reason for rejection"
                  className="w-full px-3 py-2.5 border border-red-200 rounded-xl focus:outline-none focus:border-red-500 text-sm resize-none"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 disabled:opacity-60"
              >
                Close
              </button>
              {(modalAction === 'approve' || modalAction === 'markPaid' || modalAction === 'reject') && (
                <>
                  <button
                    onClick={() => setModalAction('details')}
                    disabled={submitting}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    onClick={modalAction === 'approve' ? requestApprovePayout : modalAction === 'markPaid' ? requestMarkAsPaid : requestRejectPayout}
                    disabled={submitting}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2 ${modalAction === 'reject' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    <Send size={16} />
                    {modalAction === 'approve' ? 'Approve' : modalAction === 'markPaid' ? 'Mark Paid' : 'Reject'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDangerous={confirmState.isDangerous}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        onConfirm={() => {
          closeConfirm();
          confirmState.onConfirm?.();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}

function StatCard(props) {
  const { title, value, icon: Icon, iconBg, iconColor } = props;

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
      <div className="mb-2 sm:mb-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5">{title}</p>
      <p className="text-lg sm:text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || '').toLowerCase();
  if (value === 'paid') return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>;
  if (value === 'processing') return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Processing</span>;
  if (value === 'rejected') return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Rejected</span>;
  return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>;
}

function DetailRow({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900 break-words">{value}</p>
    </div>
  );
}
