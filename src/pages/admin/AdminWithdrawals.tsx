import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { formatNaira } from '@/lib/format';

interface WithdrawalRequest {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  isStale?: boolean;
  destinationBankName: string;
  destinationAccountNum: string;
  destinationAccountName: string;
  transferReference: string;
  narration: string | null;
  failureReason: string | null;
  initiatedAt: string;
  completedAt: string | null;
  adminApprovedBy: string | null;
  adminApprovedAt: string | null;
  autoPayoutEnabled?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminWithdrawals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') as any) || 'pending';
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>(
    ['all', 'pending', 'processing', 'completed', 'failed'].includes(initialStatus) ? initialStatus : 'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [slaStats, setSlaStats] = useState<{
    pendingCount: number;
    breachedCount: number;
    oldestPendingHours: number;
  } | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Modal states
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showManualSettleModal, setShowManualSettleModal] = useState(false);
  const [manualSessionRef, setManualSessionRef] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const isAnyModalOpen = showApproveModal || showRejectModal || showManualSettleModal;
  useEffect(() => {
    if (!isAnyModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isAnyModalOpen]);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const [res, dashRes] = await Promise.all([
        api.get(`/admin/settlement/withdrawals?${params.toString()}`),
        api.get('/admin/dashboard').catch(() => null),
      ]);
      const list = res.data?.data || res.data?.items || [];
      setWithdrawals(Array.isArray(list) ? list : []);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
      if (dashRes?.data?.data?.withdrawalSla) {
        setSlaStats(dashRes.data.data.withdrawalSla);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to load withdrawal requests');
      setWithdrawals([]); // Ensure withdrawals is always an array even on error
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  useEffect(() => {
    const urlStatus = searchParams.get('status') as any;
    if (urlStatus && ['all', 'pending', 'processing', 'completed', 'failed'].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  const handleRequery = async (withdrawal: WithdrawalRequest) => {
    setProcessing(true);
    try {
      const res = await api.post(`/admin/settlement/withdrawals/${withdrawal.id}/requery`);
      toast.success(res.data?.message || 'Status updated from Paystack');
      fetchWithdrawals();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to re-query Paystack');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    
    setProcessing(true);
    try {
      await api.post(`/admin/settlement/withdrawals/${selectedWithdrawal.id}/approve`);
      toast.success('Withdrawal approved successfully. Transfer initiated.');
      setShowApproveModal(false);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      const errorMessage = err?.response?.data?.error?.message;
      
      if (errorCode === 'ALREADY_PROCESSED') {
        toast.error('This withdrawal has already been processed');
      } else if (errorCode === 'INSUFFICIENT_FUNDS_AT_APPROVAL') {
        toast.error('Insufficient funds available. Business balance may have changed.');
      } else {
        toast.error(errorMessage || 'Failed to approve withdrawal');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    if (rejectReason.trim().length < 3 || rejectReason.trim().length > 500) {
      toast.error('Rejection reason must be between 3 and 500 characters');
      return;
    }
    
    setProcessing(true);
    try {
      await api.post(`/admin/settlement/withdrawals/${selectedWithdrawal.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success('Withdrawal request rejected');
      setShowRejectModal(false);
      setSelectedWithdrawal(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      const errorMessage = err?.response?.data?.error?.message;
      
      if (errorCode === 'ALREADY_PROCESSED') {
        toast.error('This withdrawal has already been processed');
      } else {
        toast.error(errorMessage || 'Failed to reject withdrawal');
      }
    } finally {
      setProcessing(false);
    }
  };

  const openApproveModal = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowApproveModal(true);
  };

  const openRejectModal = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openManualSettleModal = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setManualSessionRef('');
    setManualNotes('');
    setShowManualSettleModal(true);
  };

  const handleManualSettle = async () => {
    if (!selectedWithdrawal) return;
    if (!manualSessionRef.trim()) {
      toast.error('Please enter the bank transfer session ID or reference');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/admin/settlement/withdrawals/${selectedWithdrawal.id}/manual-settle`, {
        sessionReference: manualSessionRef.trim(),
        notes: manualNotes.trim() || undefined,
      });
      toast.success('Withdrawal marked as settled via manual bank transfer!');
      setShowManualSettleModal(false);
      setSelectedWithdrawal(null);
      setManualSessionRef('');
      setManualNotes('');
      fetchWithdrawals();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error?.message;
      toast.error(errorMessage || 'Failed to settle withdrawal manually');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: 'amber', label: 'Awaiting Approval', icon: Clock },
      processing: { color: 'blue', label: 'Transfer In Progress', icon: Loader2 },
      completed: { color: 'green', label: 'Completed', icon: CheckCircle2 },
      failed: { color: 'red', label: 'Failed', icon: XCircle },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const StatusBadge = ({ withdrawal }: { withdrawal: WithdrawalRequest }) => {
    if (withdrawal.status === 'processing' && withdrawal.isStale) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border bg-amber-100 text-amber-800 border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Stale — re-query pending
        </span>
      );
    }

    const config = getStatusConfig(withdrawal.status);
    const Icon = config.icon;
    
    const colorClasses = {
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      red: 'bg-red-100 text-red-800 border-red-200',
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${colorClasses[config.color as keyof typeof colorClasses]}`}>
        <Icon className={`h-3.5 w-3.5 ${config.icon === Loader2 ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    );
  };

  const [togglingBizId, setTogglingBizId] = useState<string | null>(null);

  const handleToggleAutoPayout = async (businessId: string, currentEnabled: boolean) => {
    setTogglingBizId(businessId);
    try {
      await api.patch(`/admin/businesses/${businessId}/auto-payout`, {
        enabled: !currentEnabled,
      });
      toast.success(`Auto-payout ${!currentEnabled ? 'enabled' : 'disabled'} for business`);
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.businessId === businessId ? { ...w, autoPayoutEnabled: !currentEnabled } : w
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to toggle auto-payout');
    } finally {
      setTogglingBizId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = withdrawals?.filter(w => w.status === 'pending').length || 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* SLA Banner */}
      {slaStats && slaStats.breachedCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 font-medium">
            <span className="font-bold">{slaStats.breachedCount}</span> withdrawal request(s) have been pending for more than 24 hours (oldest: {slaStats.oldestPendingHours}h).
          </p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Withdrawal Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve SME withdrawal requests
          </p>
        </div>
        {pendingCount > 0 && statusFilter === 'all' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setStatusFilter('pending');
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('status', 'pending');
                return next;
              });
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Clock className="h-4 w-4" />
            {pendingCount} Pending Review
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (status === 'all') next.delete('status');
                    else next.set('status', status);
                    return next;
                  });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 lg:max-w-sm">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search business name, reference..."
              className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Loading withdrawal requests...</p>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <Wallet className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-900">
              {searchQuery || statusFilter !== 'all' ? 'No matching requests' : 'No withdrawal requests yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Withdrawal requests from SMEs will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {withdrawal.businessName}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {withdrawal.transferReference}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  withdrawal.autoPayoutEnabled
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                              >
                                {withdrawal.autoPayoutEnabled ? '⚡ Auto-Payout' : '🔒 Manual Review'}
                              </span>
                              <button
                                type="button"
                                disabled={togglingBizId === withdrawal.businessId}
                                onClick={() =>
                                  handleToggleAutoPayout(
                                    withdrawal.businessId,
                                    Boolean(withdrawal.autoPayoutEnabled)
                                  )
                                }
                                className="text-[10px] font-medium text-primary-600 hover:text-primary-800 hover:underline cursor-pointer disabled:opacity-50"
                                title={
                                  withdrawal.autoPayoutEnabled
                                    ? 'Disable auto-payout for this business'
                                    : 'Enable auto-payout for this business'
                                }
                              >
                                {togglingBizId === withdrawal.businessId
                                  ? 'Updating...'
                                  : withdrawal.autoPayoutEnabled
                                  ? 'Turn OFF'
                                  : 'Turn ON'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900 font-mono">
                            {formatNaira(withdrawal.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Net: {formatNaira(withdrawal.netAmount)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {withdrawal.destinationBankName}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            •••• {withdrawal.destinationAccountNum.slice(-4)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <StatusBadge withdrawal={withdrawal} />
                          {withdrawal.adminApprovedBy && (
                            <p className="text-[10px] text-gray-500 truncate max-w-[140px]" title={withdrawal.adminApprovedBy}>
                              By: {withdrawal.adminApprovedBy}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-600">
                          {formatDate(withdrawal.initiatedAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {withdrawal.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openApproveModal(withdrawal)}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              title="Approve and transfer via Paystack"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openManualSettleModal(withdrawal)}
                              className="text-purple-700 hover:bg-purple-50 border-purple-200"
                              title="Transfer via company bank app and settle manually"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Settle Offline
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openRejectModal(withdrawal)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {withdrawal.status === 'processing' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={processing}
                              onClick={() => handleRequery(withdrawal)}
                              className="text-primary-600 hover:bg-primary-50"
                            >
                              <Loader2 className={`h-3.5 w-3.5 ${processing ? 'animate-spin' : ''}`} />
                              Re-query Paystack
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openManualSettleModal(withdrawal)}
                              className="text-purple-700 hover:bg-purple-50 border-purple-200"
                              title="Transfer via company bank app and settle manually"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Settle Offline
                            </Button>
                          </div>
                        )}
                        {withdrawal.status === 'failed' && (
                          <div className="flex items-center justify-end gap-2">
                            {withdrawal.failureReason && (
                              <button
                                type="button"
                                className="text-xs text-red-600 hover:underline"
                                onClick={() => toast(withdrawal.failureReason || 'No reason provided', { icon: '❌' })}
                              >
                                View Reason
                              </button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openManualSettleModal(withdrawal)}
                              className="text-purple-700 hover:bg-purple-50 border-purple-200"
                              title="Transfer via company bank app and settle manually"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Settle Offline
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasPrev}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedWithdrawal && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-hidden">
          <div className="absolute inset-0 cursor-default" onClick={() => setShowApproveModal(false)} />
          <div className="relative z-10 w-full max-w-md max-h-[88vh] flex flex-col rounded-none bg-white shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-gray-200 px-5 py-4 bg-gray-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-none bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Approve Withdrawal</h3>
                  <p className="text-xs text-gray-500">Review and confirm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="rounded-none border border-transparent p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="rounded-none bg-gray-50 p-4 space-y-3 border border-gray-200 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Business</span>
                  <span className="font-semibold text-gray-900">{selectedWithdrawal.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Requested (Gross)</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">{formatNaira(selectedWithdrawal.amount)}</span>
                </div>
                {selectedWithdrawal.fee > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Paystack Transfer Fee</span>
                    <span className="font-mono text-gray-700">−{formatNaira(selectedWithdrawal.fee)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-bold text-emerald-900">Transfer to Bank (Net)</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {formatNaira(selectedWithdrawal.netAmount || selectedWithdrawal.amount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <p className="font-medium text-gray-500">Destination</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedWithdrawal.destinationBankName}</p>
                  <p className="text-gray-600 font-mono">
                    •••• {selectedWithdrawal.destinationAccountNum.slice(-4)} · {selectedWithdrawal.destinationAccountName}
                  </p>
                </div>
              </div>

              <div className="rounded-none bg-amber-50 border border-amber-300 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900">
                  This will initiate a Paystack transfer of <strong>{formatNaira(selectedWithdrawal.netAmount || selectedWithdrawal.amount)}</strong> to the destination bank. Paystack will debit <strong>{formatNaira(selectedWithdrawal.amount)}</strong> total from platform balance.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApproveModal(false)}
                disabled={processing}
                className="rounded-none text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                isLoading={processing}
                className="rounded-none text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve & Transfer
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedWithdrawal && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-hidden">
          <div className="absolute inset-0 cursor-default" onClick={() => { setShowRejectModal(false); setRejectReason(''); }} />
          <div className="relative z-10 w-full max-w-md max-h-[88vh] flex flex-col rounded-none bg-white shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-gray-200 px-5 py-4 bg-gray-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-none bg-red-100 text-red-800">
                  <XCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Reject Withdrawal</h3>
                  <p className="text-xs text-gray-500">Provide a reason for rejection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="rounded-none border border-transparent p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="rounded-none bg-gray-50 p-3 border border-gray-200 text-xs">
                <p className="font-medium text-gray-500">Business</p>
                <p className="font-semibold text-gray-900 mt-0.5">{selectedWithdrawal.businessName}</p>
                <p className="text-gray-700 mt-1 font-mono">{formatNaira(selectedWithdrawal.amount)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Insufficient verification documents, suspicious activity..."
                  className="w-full rounded-none border border-gray-300 p-3 text-xs focus:border-gray-900 focus:outline-none focus:ring-0 resize-none"
                  rows={4}
                  maxLength={500}
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {rejectReason.length}/500 characters (minimum 3)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={processing}
                className="rounded-none text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReject}
                isLoading={processing}
                disabled={!rejectReason.trim() || rejectReason.trim().length < 3}
                className="rounded-none text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject Request
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manual / Offline Settlement Modal */}
      {showManualSettleModal && selectedWithdrawal && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-hidden">
          <div className="absolute inset-0 cursor-default" onClick={() => setShowManualSettleModal(false)} />
          <div className="relative z-10 w-full max-w-md max-h-[88vh] flex flex-col rounded-none bg-white shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-gray-200 px-5 py-4 bg-gray-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-none bg-purple-100 text-purple-800">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">Settle Manually (Offline)</h3>
                  <p className="text-xs text-gray-500">Direct bank transfer dispatch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualSettleModal(false)}
                className="rounded-none border border-transparent p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Payment Details Box */}
              <div className="rounded-none bg-gray-50 p-4 space-y-2.5 border border-gray-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Business</span>
                  <span className="font-semibold text-gray-900">{selectedWithdrawal.businessName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Deducted (Wallet)</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">{formatNaira(selectedWithdrawal.amount)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                  <span className="font-bold text-emerald-900">Amount to Transfer to User</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {formatNaira(selectedWithdrawal.netAmount || selectedWithdrawal.amount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  <p className="text-gray-500 font-medium">Beneficiary Bank Details:</p>
                  <p className="text-sm font-bold text-gray-900">{selectedWithdrawal.destinationBankName}</p>
                  <p className="text-xs text-gray-700 font-mono font-semibold">
                    {selectedWithdrawal.destinationAccountNum}
                  </p>
                  <p className="text-xs text-gray-500">
                    Account Name: {selectedWithdrawal.destinationAccountName}
                  </p>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="rounded-none bg-purple-50 border border-purple-200 p-3 text-xs text-purple-900 space-y-1">
                <p className="font-semibold">How this works:</p>
                <p className="text-[11px] text-purple-800">
                  Transfer <strong>{formatNaira(selectedWithdrawal.netAmount || selectedWithdrawal.amount)}</strong> directly from your company mobile/web bank app to the beneficiary details above. Once dispatched, paste the transaction reference or session ID below.
                </p>
              </div>

              {/* Session Reference Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Bank Reference / Session ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualSessionRef}
                  onChange={(e) => setManualSessionRef(e.target.value)}
                  placeholder="e.g. 000013260910123456789012345678 or GTB-TXN-..."
                  className="w-full rounded-none border border-gray-300 px-3 py-2 text-xs font-mono focus:border-gray-900 focus:outline-none focus:ring-0"
                  required
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Internal Notes <span className="text-gray-400 font-normal lowercase">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Dispatched via Access Bank Corporate Portal"
                  className="w-full rounded-none border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualSettleModal(false)}
                disabled={processing}
                className="rounded-none text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleManualSettle}
                isLoading={processing}
                disabled={!manualSessionRef.trim()}
                className="rounded-none text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirm Settle
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
