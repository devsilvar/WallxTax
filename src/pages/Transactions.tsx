import { useEffect, useState } from 'react';
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
  } = useLedgerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<TransactionDetailData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (biz?.id) {
      fetchLedger(biz.id);
    }
  }, [biz?.id, fetchLedger]);

  // Filter and paginate
  const filtered = items.filter((item) =>
    searchQuery.trim()
      ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200/70 bg-gradient-to-b from-gray-50/50 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Opening Balance</p>
            <p className="text-lg font-bold text-gray-800 font-mono mt-1">{formatNaira(summary.openingBalance)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Balance brought forward</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Money Received (+)</p>
            <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
              {summary.totalCredits > 0 ? `+${formatNaira(summary.totalCredits)}` : formatNaira(0)}
            </p>
            <p className="text-[10px] text-emerald-600/70 mt-0.5">Bank transfers received</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tax Remitted (-)</p>
            <p className={`text-lg font-bold font-mono mt-1 ${summary.totalDebits > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {summary.totalDebits > 0 ? `-${formatNaira(summary.totalDebits)}` : formatNaira(0)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">FIRS tax payments</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xs text-white">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Digital Bank Balance</p>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{formatNaira(summary.closingBalance)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Current Wema DVA balance</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Total Business Revenue</p>
            <p className="text-lg font-bold text-purple-900 font-mono mt-1">{formatNaira(summary.totalCredits)}</p>
            <p className="text-[10px] text-purple-600/70 mt-0.5">All sales channels combined</p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Digital Transfers</p>
            <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
              {formatNaira(paginatedItems.filter((it) => it.sourceType === 'dva_transfer').reduce((s, it) => s + it.amount, 0))}
            </p>
            <p className="text-[10px] text-emerald-600/70 mt-0.5">Auto-captured bank transfers</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Cash &amp; POS</p>
            <p className="text-lg font-bold text-blue-600 font-mono mt-1">
              {formatNaira(paginatedItems.filter((it) => it.sourceType === 'manual_sale' || it.sourceType === 'pos').reduce((s, it) => s + it.amount, 0))}
            </p>
            <p className="text-[10px] text-blue-600/70 mt-0.5">Physical payments</p>
          </div>

          <div className="rounded-xl border border-orange-100 bg-gradient-to-b from-orange-50/40 to-white p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">Invoices</p>
            <p className="text-lg font-bold text-orange-600 font-mono mt-1">
              {formatNaira(paginatedItems.filter((it) => it.sourceType === 'invoice_payment').reduce((s, it) => s + it.amount, 0))}
            </p>
            <p className="text-[10px] text-orange-600/70 mt-0.5">Invoice collections</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
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
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                    {searchQuery ? 'No transactions match your search' : 'No transactions yet'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
