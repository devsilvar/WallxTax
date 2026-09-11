import React, { useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  Loader2,
  CheckCheck,
  XCircle,
  Copy,
  AlertTriangle,
  ArrowRight,
  Search,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import toast from 'react-hot-toast';
import { formatNaira } from './WalletBalanceCard.tsx';

export interface PayoutItem {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  initiatedAt: string;
  transferReference: string;
  destinationBankName: string;
  destinationAccountNum: string;
  destinationAccountName?: string | null;
  completedAt?: string | null;
  narration?: string | null;
  failureReason?: string | null;
}

export interface PayoutPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WithdrawalsTableProps {
  payouts: PayoutItem[];
  isLoading?: boolean;
  pagination?: PayoutPagination;
  onPageChange?: (page: number) => void;
  onSearchChange?: (search: string) => void;
  onStatusFilterChange?: (status: 'all' | 'completed' | 'pending' | 'failed') => void;
  onRequestWithdrawal?: () => void;
  statusFilter?: 'all' | 'completed' | 'pending' | 'failed';
  searchQuery?: string;
  className?: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const WithdrawalsTable: React.FC<WithdrawalsTableProps> = ({
  payouts,
  isLoading = false,
  pagination,
  onPageChange,
  onSearchChange,
  onStatusFilterChange,
  onRequestWithdrawal,
  statusFilter = 'all',
  searchQuery = '',
  className = '',
}) => {
  const [internalSearch, setInternalSearch] = useState(searchQuery);

  const handleCopy = (value: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value);
      toast.success('Reference copied');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(internalSearch);
    }
  };

  return (
    <div
      data-testid="withdrawals-table"
      className={`divide-y divide-gray-100 ${className}`}
    >
      {/* Dual Header & Filters */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Withdrawals History</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Transfers sent to your commercial bank
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100/80 p-1 rounded-lg">
          {(['all', 'completed', 'pending', 'failed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilterChange && onStatusFilterChange(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer capitalize ${
                statusFilter === s
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s === 'completed' ? 'Sent' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2"
      >
        <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        <input
          type="text"
          value={internalSearch}
          onChange={(e) => {
            setInternalSearch(e.target.value);
            if (onSearchChange) onSearchChange(e.target.value);
          }}
          placeholder="Search by reference, bank, account, or note…"
          className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
          aria-label="Search withdrawals"
        />
        {internalSearch && (
          <button
            type="button"
            onClick={() => {
              setInternalSearch('');
              if (onSearchChange) onSearchChange('');
            }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Clear
          </button>
        )}
      </form>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-6 space-y-3" data-testid="withdrawals-loading">
            <div className="flex items-center justify-between mb-1">
              <Skeleton width={140} height={16} />
              <Skeleton width={80} height={16} />
            </div>
            <Skeleton width="100%" height={52} rounded="lg" />
            <Skeleton width="100%" height={52} rounded="lg" />
            <Skeleton width="100%" height={52} rounded="lg" />
          </div>
        ) : payouts.length === 0 ? (
          <div
            data-testid="withdrawals-empty-state"
            className="flex flex-col items-center py-14 text-center px-6"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 mb-3">
              <ArrowUpRight className="h-5 w-5 stroke-[2]" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {internalSearch ? 'No matching withdrawals' : 'No withdrawals yet'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              {internalSearch
                ? 'Try different keywords or reference numbers.'
                : 'When you transfer your wallet balance to your bank, your payout history will appear here.'}
            </p>
            {!internalSearch && onRequestWithdrawal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onRequestWithdrawal}
                className="mt-4 text-xs bg-purple-900 hover:bg-purple-950 text-white cursor-pointer"
              >
                Withdraw Funds <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        ) : (
          payouts.map((payout) => {
            const isPending = payout.status === 'pending';
            const isProcessing = payout.status === 'processing';
            const isCompleted = payout.status === 'completed';
            const isFailed = payout.status === 'failed';

            return (
              <div
                key={payout.id}
                data-testid={`payout-row-${payout.id}`}
                className="px-5 py-4 hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : isFailed
                          ? 'bg-rose-50 border-rose-100 text-rose-600'
                          : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4 stroke-[2]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {payout.narration || `Payout to ${payout.destinationBankName}`}
                        </p>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Clock className="h-3 w-3" /> Awaiting Approval
                          </span>
                        )}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                            <Loader2 className="h-3 w-3 animate-spin" /> Processing
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCheck className="h-3 w-3" /> Sent to Bank
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 flex-wrap">
                        <span>
                          {payout.destinationBankName} · ••••{' '}
                          {payout.destinationAccountNum?.slice(-4)}
                        </span>
                        <span>·</span>
                        <span>{formatDate(payout.initiatedAt)}</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          {payout.transferReference}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(payout.transferReference);
                            }}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            title="Copy Reference"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </span>
                      </div>

                      {isFailed && payout.failureReason && (
                        <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200/80 p-2 text-xs text-rose-800 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-medium">
                            {payout.failureReason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums font-mono text-gray-900">
                      −{formatNaira(payout.amount)}
                    </p>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      <span>Net: {formatNaira(payout.netAmount)}</span>
                      {payout.fee > 0 && (
                        <span className="text-gray-400 ml-1">
                          ({formatNaira(payout.fee)} fee)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded font-medium disabled:opacity-40 cursor-pointer hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded font-medium disabled:opacity-40 cursor-pointer hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalsTable;
