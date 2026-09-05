import { useEffect, useState, useRef } from 'react';
import { Search, Download, Landmark, Receipt, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useLedgerStore } from '@/stores/ledger.store.ts';
import Button from '@/components/ui/Button.tsx';
import StatementExportModal from '@/components/StatementExportModal';
import TransactionDetailPanel, {
  type TransactionDetailData,
  type TransactionDetailType,
} from '@/components/TransactionDetailPanel';
import type { UnifiedLedgerRow } from '@/types';

const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Transactions() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const {
    items,
    summary,
    scope,
    loading,
    setScope,
    fetchLedger,
    pagination,
  } = useLedgerStore();

  // Read search query from store
  const storeSearchQuery = useLedgerStore((s) => s.searchQuery);
  
  // Local input state for immediate updates
  const [inputValue, setInputValue] = useState(storeSearchQuery);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<TransactionDetailData | null>(null);
  
  // Debounce timer for search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (biz?.id) {
      fetchLedger(biz.id);
    }
  }, [biz?.id, fetchLedger]);

  // Sync local input with store search query
  useEffect(() => {
    setInputValue(storeSearchQuery);
  }, [storeSearchQuery]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // The ledger's `sourceType` enum differs from the detail panel's
  // `TransactionDetailType` enum — map ledger rows onto the panel type so the
  // receipt endpoint and detail sections resolve correctly.
  const panelTypeFor = (sourceType: UnifiedLedgerRow['sourceType']): TransactionDetailType => {
    if (sourceType === 'tax_payment') return 'tax_payment';
    if (sourceType === 'dva_transfer') return 'dva_inflow';
    // manual_sale / invoice_payment / pos / refund are all sales receipts
    return 'sales_transaction';
  };

  // Best-effort sales source label for the panel's "Payment Method" row.
  const sourceFor = (sourceType: UnifiedLedgerRow['sourceType']): string | undefined => {
    switch (sourceType) {
      case 'dva_transfer': return 'bank_transfer';
      case 'pos': return 'pos';
      case 'invoice_payment': return 'invoice';
      case 'manual_sale': return 'manual';
      default: return undefined;
    }
  };

  const handleTxnClick = (item: UnifiedLedgerRow) => {
    if (!biz?.id) return;
    setSelectedTxn({
      id: item.id,
      amount: item.amount,
      type: panelTypeFor(item.sourceType),
      description: item.description,
      date: item.date,
      referenceId: item.reference,
      status: item.status,
      customerName: item.counterparty && item.counterparty !== 'Customer' ? item.counterparty : undefined,
      source: sourceFor(item.sourceType),
      businessId: biz.id, // Required for receipt download
    });
  };

  if (!biz) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">Please select a business to view transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary-600" />
            Transaction History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete financial ledger with statements export
          </p>
        </div>

        <Button
          onClick={() => setShowExportModal(true)}
          variant="secondary"
          size="sm"
          disabled={items.length === 0}
          className="self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export Statement
        </Button>
      </div>

      {/* Scope Selector Card */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Ledger View Scope</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Switch between dedicated virtual bank movements and total business revenue
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-gray-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope(biz.id, 'dva_bank')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              scope === 'dva_bank'
                ? 'bg-white text-gray-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Landmark className="h-3.5 w-3.5 text-purple-700" />
            <span>Virtual Bank (DVA)</span>
          </button>
          <button
            type="button"
            onClick={() => setScope(biz.id, 'all_income')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              scope === 'all_income'
                ? 'bg-white text-gray-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Receipt className="h-3.5 w-3.5 text-indigo-700" />
            <span>All Business Revenue</span>
          </button>
        </div>
      </div>

      {/* 4-Card Summary Strip */}
      {scope === 'dva_bank' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Money Received (+)</p>
            <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
              {summary.totalCredits > 0 ? `+${formatNaira(summary.totalCredits)}` : formatNaira(0)}
            </p>
            <p className="text-[10px] text-emerald-600/70 mt-0.5">Bank transfers received</p>
          </div>

          <div className="rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Transfers to Bank (-)</p>
            <p className={`text-lg font-bold font-mono mt-1 ${((summary.totalPayoutDebits ?? 0) + (summary.totalSplitDebits ?? 0)) > 0 ? 'text-purple-700' : 'text-gray-800'}`}>
              {(() => {
                const total = (summary.totalPayoutDebits ?? 0) + (summary.totalSplitDebits ?? 0);
                return total > 0 ? `-${formatNaira(total)}` : formatNaira(0);
              })()}
            </p>
            <p className="text-[10px] text-purple-600/70 mt-0.5">
              {(summary.totalSplitDebits ?? 0) > 0 && (summary.totalPayoutDebits ?? 0) > 0
                ? `${formatNaira(summary.totalSplitDebits ?? 0)} auto-split · ${formatNaira(summary.totalPayoutDebits ?? 0)} withdrawn`
                : (summary.totalSplitDebits ?? 0) > 0
                  ? `${formatNaira(summary.totalSplitDebits ?? 0)} auto-split to bank`
                  : (summary.totalPayoutDebits ?? 0) > 0
                    ? 'Manual withdrawals to bank'
                    : 'No transfers to bank yet'}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tax Remitted (-)</p>
            <p className={`text-lg font-bold font-mono mt-1 ${(summary.totalTaxDebits ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {(summary.totalTaxDebits ?? 0) > 0 ? `-${formatNaira(summary.totalTaxDebits ?? 0)}` : formatNaira(0)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">FIRS tax payments</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xs text-white">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Digital Bank Balance</p>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{formatNaira(summary.closingBalance)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Platform-held DVA balance</p>
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 ${summary.breakdown ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {/* Total Revenue — Primary Card (Always Shown) */}
          <div className="rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Total Business Revenue</p>
            <p className="text-lg font-bold text-purple-900 font-mono mt-1">{formatNaira(summary.totalCredits)}</p>
            <p className="text-[10px] text-purple-600/70 mt-0.5">All sales channels combined</p>
          </div>

          {/* Breakdown Cards — Only when backend provides data */}
          {summary.breakdown && (
            <>
              {/* DVA Auto-Capture */}
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Digital Transfers</p>
                <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
                  {formatNaira(summary.breakdown.creditsBySource.dva_transfer)}
                </p>
                <p className="text-[10px] text-emerald-600/70 mt-0.5">Auto-captured bank transfers</p>
              </div>

              {/* Direct Sales (Cash, POS, Paycode, Online, Manual) */}
              <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Direct Sales</p>
                <p className="text-lg font-bold text-blue-600 font-mono mt-1">
                  {formatNaira(
                    summary.breakdown.creditsBySource.manual_sale + 
                    summary.breakdown.creditsBySource.pos
                  )}
                </p>
                <p className="text-[10px] text-blue-600/70 mt-0.5">POS, cash, paycode & online</p>
              </div>

              {/* Invoice Collections */}
              <div className="rounded-xl border border-orange-100 bg-gradient-to-b from-orange-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">Invoices</p>
                <p className="text-lg font-bold text-orange-600 font-mono mt-1">
                  {formatNaira(summary.breakdown.creditsBySource.invoice_payment)}
                </p>
                <p className="text-[10px] text-orange-600/70 mt-0.5">Invoice collections</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              const query = e.target.value;
              setInputValue(query); // Update input immediately
              
              // Debounce API call
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
              debounceTimer.current = setTimeout(() => {
                if (biz?.id) {
                  useLedgerStore.getState().setSearchQuery(biz.id, query);
                }
              }, 300);
            }}
            placeholder="Search by description or reference..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                    {storeSearchQuery ? 'No transactions match your search' : 'No transactions yet'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleTxnClick(item)}
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.reference || '—'}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${item.entryType === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.entryType === 'credit' ? '+' : '-'}{formatNaira(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => biz?.id && useLedgerStore.getState().setPage(biz.id, pagination.page - 1)}
                disabled={!pagination.hasPrev || loading}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => biz?.id && useLedgerStore.getState().setPage(biz.id, pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StatementExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        businessId={biz.id}
        businessName={biz.businessName}
      />

      {selectedTxn && (
        <TransactionDetailPanel
          isOpen={Boolean(selectedTxn)}
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </div>
  );
}
