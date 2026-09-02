import { useState, useEffect, useCallback } from 'react';
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
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('pending');
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
  const [processing, setProcessing] = useState(false);

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
      setWithdrawals(res.data.data || []);
      setPagination(res.data.pagination);
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
            onClick={() => setStatusFilter('pending')}
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
                        <StatusBadge withdrawal={withdrawal} />
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
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
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
                        )}
                        {withdrawal.status === 'failed' && withdrawal.failureReason && (
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => toast(withdrawal.failureReason || 'No reason provided', { icon: '❌' })}
                          >
                            View Reason
                          </button>
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
      {showApproveModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4 bg-emerald-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Approve Withdrawal</h3>
                  <p className="text-xs text-gray-600">Review and confirm</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-3 border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-500">Business</span>
                  <span className="text-sm font-semibold text-gray-900">{selectedWithdrawal.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-500">Amount</span>
                  <span className="text-base font-bold text-gray-900 font-mono">{formatNaira(selectedWithdrawal.amount)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <p className="text-xs font-medium text-gray-500">Destination</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedWithdrawal.destinationBankName}</p>
                  <p className="text-xs text-gray-600 font-mono">
                    •••• {selectedWithdrawal.destinationAccountNum.slice(-4)} · {selectedWithdrawal.destinationAccountName}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  This will initiate a Paystack transfer. The funds will be sent immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowApproveModal(false)}
                  disabled={processing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={processing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Reject Withdrawal</h3>
                  <p className="text-xs text-gray-600">Provide a reason for rejection</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <p className="text-xs font-medium text-gray-500">Business</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedWithdrawal.businessName}</p>
                <p className="text-sm text-gray-700 mt-1 font-mono">{formatNaira(selectedWithdrawal.amount)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Insufficient verification documents, suspicious activity..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                  rows={4}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rejectReason.length}/500 characters (minimum 3)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  disabled={processing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleReject}
                  isLoading={processing}
                  disabled={!rejectReason.trim() || rejectReason.trim().length < 3}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
