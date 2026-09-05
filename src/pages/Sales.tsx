import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Receipt,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Filter,
  XCircle,
  Upload,
  CalendarDays,
} from 'lucide-react';
import SalesImportModal from '@/pages/SalesImportModal.tsx';
import AddSaleModal from '@/components/AddSaleModal.tsx';
import SalesExpenseChart from '@/components/dashboard/SalesExpenseChart.tsx';
import Card from '@/components/ui/Card.tsx';
import TransactionDetailPanel, { type TransactionDetailData } from '@/components/TransactionDetailPanel.tsx';

import Button from '@/components/ui/Button.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useDashboardEvents } from '@/stores/dashboard.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { SalesTransaction, Pagination } from '@/types/index.ts';
import { paymentTypeLabel } from '@/lib/paymentTypes.ts';
import NoBusinessPrompt from '@/components/NoBusinessPrompt.tsx';

// 'manual' is retired from the UI (migration 20260904120000_retire_manual_source
// mapped legacy no-reference rows to 'cash'); rows that kept 'manual' still
// render via paymentTypeLabel's 'Cash (legacy)' mapping.
const SOURCES = [
  'bank_transfer',
  'paycode',
  'pos',
  'online_store',
  'cash',
  'invoice',
] as const;

// Fixed box order for the daily strip — every payment type always has a home,
// even at ₦0 (dimmed), so the layout doesn't reshuffle through the day.
const DAILY_SOURCES = [
  'cash',
  'pos',
  'bank_transfer',
  'paycode',
  'online_store',
  'invoice',
] as const;
const STATUSES = ['confirmed', 'pending', 'reversed', 'disputed'] as const;

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function statusBadge(s: string) {
  const m: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    reversed: 'bg-red-100 text-red-700',
    disputed: 'bg-orange-100 text-orange-700',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${m[s] || 'bg-gray-100 text-gray-600'}`}
    >
      {s}
    </span>
  );
}
function sourceLabel(s: string) {
  return paymentTypeLabel(s);
}

// ─── Types ──────────────────────────────────────────────────

type SourceBreakdown = {
  source: string;
  total: number;
  count: number;
};

type SalesSummary = {
  month: number;
  year: number;
  totalSales: number;
  transactionCount: number;
  sourceBreakdown: SourceBreakdown[];
};

// Shape returned by GET /sales/daily (sales.service.getDailySummary)
type DailySale = {
  id: string;
  amount: string;
  source: string;
  status: string;
  description: string | null;
  customerName: string | null;
  transactionDate: string;
  referenceId: string | null;
};

type DailySalesSummary = {
  date: string;
  totalSales: number;
  transactionCount: number;
  sourceBreakdown: SourceBreakdown[];
  transactions: DailySale[];
};

// ─── Source color map for the breakdown bar ─────────────────

const SOURCE_COLORS: Record<string, string> = {
  bank_transfer: 'bg-blue-500',
  paycode: 'bg-purple-500',
  pos: 'bg-amber-500',
  online_store: 'bg-emerald-500',
  manual: 'bg-gray-400',
  cash: 'bg-green-600',
  invoice: 'bg-indigo-500',
};

// ─── Component ──────────────────────────────────────────────

export default function Sales() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const invalidateDashboard = useDashboardEvents((s) => s.invalidateDashboard);
  const [sales, setSales] = useState<SalesTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSale, setEditSale] = useState<SalesTransaction | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetailData | null>(null);

  // Summary state

  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ─── Daily view state (default tab) ─────────────────────────
  const todayStr = now.toISOString().slice(0, 10);
  const [dailyDate, setDailyDate] = useState(todayStr);
  const [daily, setDaily] = useState<DailySalesSummary | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const basePath = biz ? `/businesses/${biz.id}/sales` : '';

  const hasActiveFilters = !!(
    filterSource ||
    filterStatus ||
    filterStartDate ||
    filterEndDate
  );

  const clearFilters = () => {
    setFilterSource('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const fetchSales = () => {
    if (!biz) return;
    setIsLoading(true);
    const params: Record<string, string | number> = { page, limit: 15 };
    if (filterSource) params.source = filterSource;
    if (filterStatus) params.status = filterStatus;
    if (filterStartDate) params.startDate = filterStartDate;
    if (filterEndDate) params.endDate = filterEndDate;
    api
      .get(basePath, { params })
      .then((r) => {
        setSales(r.data.data);
        setPagination(r.data.pagination);
      })
      .finally(() => setIsLoading(false));
  };

  const fetchSummary = () => {
    if (!biz) return;
    setSummaryLoading(true);
    api
      .get(`${basePath}/summary`, {
        params: { month: summaryMonth, year: summaryYear },
      })
      .then((r) => setSummary(r.data.data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, [biz, page, filterSource, filterStatus, filterStartDate, filterEndDate]);
  useEffect(() => {
    fetchSummary();
  }, [biz, summaryMonth, summaryYear]);

  // ─── Daily tab (default) — URL-backed like TaxReports ?tab=analytics ──
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: 'daily' | 'monthly' =
    searchParams.get('tab') === 'monthly' ? 'monthly' : 'daily';
  const setTab = (t: 'daily' | 'monthly') =>
    setSearchParams(t === 'monthly' ? { tab: 'monthly' } : {}, { replace: true });

  const fetchDaily = () => {
    if (!biz) return;
    setDailyLoading(true);
    api
      .get(`${basePath}/daily`, { params: { date: dailyDate } })
      .then((r) => setDaily(r.data.data))
      .catch(() => setDaily(null))
      .finally(() => setDailyLoading(false));
  };

  useEffect(() => {
    fetchDaily();
  }, [biz, dailyDate]);

  // Keep "today's" boxes live while the daily tab is open (60s cadence).
  useEffect(() => {
    if (tab !== 'daily' || dailyDate !== todayStr || !biz) return;
    const t = setInterval(fetchDaily, 60_000);
    return () => clearInterval(t);
  }, [tab, dailyDate, biz]);

  const shiftDay = (delta: number) => {
    const d = new Date(`${dailyDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    setDailyDate(d.toISOString().slice(0, 10));
  };

  const openEdit = (s: SalesTransaction) => {
    setEditSale(s);
    setShowAddModal(true);
  };

  const handleSaveComplete = (outcome: 'created' | 'updated') => {
    if (outcome === 'created') setPage(1);
    fetchSales();
    fetchSummary();
    fetchDaily();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale?')) return;
    try {
      await api.delete(`${basePath}/${id}`);
      toast.success('Sale deleted');
      invalidateDashboard('sale_deleted');
      fetchSales();
      fetchSummary();
      fetchDaily();
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message || 'Failed');
    }
  };

  const openTransactionDetail = (sale: SalesTransaction) => {
    setSelectedTransaction({
      id: sale.id,
      type: 'sales_transaction',
      amount: sale.amount,
      status: sale.status,
      date: sale.transactionDate,
      referenceId: sale.referenceId,
      description: sale.description,
      customerName: sale.customerName,
      source: sale.source,
      businessId: biz!.id,
    });
  };

  // Month navigation
  const prevMonth = () => {
    if (summaryMonth === 1) {
      setSummaryMonth(12);
      setSummaryYear(summaryYear - 1);
    } else setSummaryMonth(summaryMonth - 1);
  };
  const nextMonth = () => {
    if (summaryMonth === 12) {
      setSummaryMonth(1);
      setSummaryYear(summaryYear + 1);
    } else setSummaryMonth(summaryMonth + 1);
  };
  const monthLabel = new Date(summaryYear, summaryMonth - 1).toLocaleDateString(
    'en-NG',
    { month: 'long', year: 'numeric' },
  );

  if (!biz) return <NoBusinessPrompt />;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>Sales</h1>
          <p className='mt-1 font-body text-sm text-gray-500'>
            Manage your sales transactions.
          </p>
        </div>
        <div className='flex flex-wrap gap-2 self-start sm:self-auto'>
          <Button
            variant={showOverview ? 'primary' : 'secondary'}
            onClick={() => setShowOverview(!showOverview)}
          >
            <TrendingUp className='h-4 w-4' /> {showOverview ? 'Hide Trends' : 'Trends & Insights'}
          </Button>
          <Button variant='secondary' onClick={() => setShowImport(true)}>
            <Upload className='h-4 w-4' /> Import from Excel
          </Button>
          <Button
            onClick={() => {
              setEditSale(null);
              setShowAddModal(true);
            }}
          >
            <Plus className='h-4 w-4' /> Add Sale
          </Button>
        </div>
      </div>

      {/* Financial Overview & Cashflow Trends (Collapsible) */}
      {showOverview && (
        <SalesExpenseChart className='animate-scale-in' />
      )}

      {/* Daily / Monthly tabs — default is Daily (no URL param) */}
      <div className='flex w-fit gap-1 rounded-lg bg-gray-100 p-1'>
        {(['daily', 'monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'monthly' && (
        <>
      {/* Monthly Summary */}
      <Card>

        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
            <BarChart3 className='h-5 w-5 text-primary-500' />
            Monthly Summary
          </h2>
          <div className='flex items-center gap-2'>
            <button
              onClick={prevMonth}
              className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            >
              <ChevronLeft className='h-4 w-4' />
            </button>
            <span className='min-w-[140px] text-center text-sm font-medium text-gray-700'>
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            >
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>
        </div>

        {summaryLoading ? (
          <div className='py-6 text-center text-sm text-gray-400'>
            Loading summary...
          </div>
        ) : !summary || summary.transactionCount === 0 ? (
          <div className='py-6 text-center'>
            <TrendingUp className='mx-auto h-8 w-8 text-gray-300' />
            <p className='mt-2 font-body text-sm text-gray-400'>
              No confirmed sales for {monthLabel}.
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* Totals row */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='rounded-lg bg-green-50 px-4 py-3'>
                <p className='font-body text-xs text-green-600 uppercase tracking-wider'>
                  Total Sales
                </p>
                <p className='mt-1 text-xl font-bold text-green-700'>
                  {formatNaira(Number(summary.totalSales))}
                </p>
              </div>
              <div className='rounded-lg bg-gray-50 px-4 py-3'>
                <p className='font-body text-xs text-gray-500 uppercase tracking-wider'>
                  Transactions
                </p>
                <p className='mt-1 text-xl font-bold text-gray-700'>
                  {summary.transactionCount}
                </p>
              </div>
            </div>

            {/* Source breakdown */}
            {summary.sourceBreakdown.length > 0 && (
              <div>
                <p className='mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  By Payment Type
                </p>
                {/* Stacked bar */}
                <div className='flex h-3 overflow-hidden rounded-full bg-gray-100'>
                  {summary.sourceBreakdown.map((sb) => {
                    const pct =
                      Number(summary.totalSales) > 0
                        ? (Number(sb.total) / Number(summary.totalSales)) * 100
                        : 0;
                    return (
                      <div
                        key={sb.source}
                        className={`${SOURCE_COLORS[sb.source] || 'bg-gray-400'} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${sourceLabel(sb.source)}: ${formatNaira(Number(sb.total))} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div className='mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3'>
                  {summary.sourceBreakdown.map((sb) => (
                    <div key={sb.source} className='flex items-center gap-2'>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${SOURCE_COLORS[sb.source] || 'bg-gray-400'}`}
                      />
                      <span className='font-body text-sm text-gray-600 capitalize'>
                        {sourceLabel(sb.source)}
                      </span>
                      <span className='ml-auto font-body text-sm font-medium text-gray-700'>
                        {formatNaira(Number(sb.total))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Filters */}
      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className='h-4 w-4' />
            Filters
            {hasActiveFilters && (
              <span className='ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white'>
                {
                  [
                    filterSource,
                    filterStatus,
                    filterStartDate,
                    filterEndDate,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700'
            >
              <XCircle className='h-4 w-4' /> Clear all
            </button>
          )}
          {pagination && (
            <span className='ml-auto font-body text-xs text-gray-400'>
              {pagination.total} total
            </span>
          )}
        </div>

        {showFilters && (
          <Card className='py-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='space-y-1'>
                <label className='block text-xs font-medium text-gray-500'>
                  Payment Type
                </label>
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    setPage(1);
                  }}
                  className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                >
                  <option value=''>All Payment Types</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {sourceLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <label className='block text-xs font-medium text-gray-500'>
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-primary-500'
                >
                  <option value=''>All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <label className='block text-xs font-medium text-gray-500'>
                  From
                </label>
                <input
                  type='date'
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setPage(1);
                  }}
                  className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                />
              </div>
              <div className='space-y-1'>
                <label className='block text-xs font-medium text-gray-500'>
                  To
                </label>
                <input
                  type='date'
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setPage(1);
                  }}
                  className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Table */}
      {isLoading && <TableSkeleton rows={6} columns={6} />}

      {!isLoading && sales.length === 0 && (
        <Card className='py-12 text-center'>
          <Receipt className='mx-auto h-10 w-10 text-gray-300' />
          <p className='mt-3 font-body text-sm text-gray-400'>
            No sales found.
          </p>
        </Card>
      )}

      {!isLoading && sales.length > 0 && (
        <>
          {/* Desktop table */}
          <div className='hidden md:block rounded-md border border-gray-200 bg-white shadow-sm overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400'>
                  <th className='px-4 py-3'>Date</th>
                  <th className='px-4 py-3'>Description</th>
                  <th className='px-4 py-3'>Payment Type</th>
                  <th className='px-4 py-3 text-right'>Amount</th>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='font-body text-sm'>
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openTransactionDetail(s)}
                    className='border-b border-gray-50 hover:bg-gray-50 cursor-pointer'
                  >
                    <td className='px-4 py-3 text-gray-600'>
                      {formatDate(s.transactionDate)}
                    </td>
                    <td className='px-4 py-3 text-gray-700'>
                      {s.description || '—'}
                    </td>
                    <td className='px-4 py-3 capitalize text-gray-600'>
                      {sourceLabel(s.source)}
                    </td>
                    <td className='px-4 py-3 text-right font-semibold text-gray-900'>
                      {formatNaira(Number(s.amount))}
                    </td>
                    <td className='px-4 py-3'>{statusBadge(s.status)}</td>
                    <td className='px-4 py-3 text-right' onClick={(e) => e.stopPropagation()}>
                      <div className='flex items-center justify-end gap-1'>
                        <button
                          onClick={() => openEdit(s)}
                          className='rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          title='Edit Sale'
                        >
                          <Pencil className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className='rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500'
                          title='Delete Sale'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className='md:hidden space-y-3'>
            {sales.map((s) => (
              <Card 
                key={s.id} 
                className='p-4 cursor-pointer hover:shadow-md transition-shadow'
                onClick={() => openTransactionDetail(s)}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-semibold text-gray-900'>
                        {formatNaira(Number(s.amount))}
                      </span>
                      {statusBadge(s.status)}
                    </div>
                    <p className='mt-1 text-sm text-gray-600 truncate'>
                      {s.description || '—'}
                    </p>
                    <p className='mt-1 text-xs text-gray-400'>
                      {formatDate(s.transactionDate)} ·{' '}
                      <span className='capitalize'>
                        {sourceLabel(s.source)}
                      </span>
                    </p>
                  </div>
                  <div className='flex items-center gap-1 shrink-0' onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(s)}
                      className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      title='Edit Sale'
                    >
                      <Pencil className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className='rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500'
                      title='Delete Sale'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      </>
      )}

      {tab === 'daily' && (
        <Card>
          {/* Date navigation */}
          <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
            <h2 className='flex items-center gap-2 text-lg font-semibold text-gray-900'>
              <CalendarDays className='h-5 w-5 text-primary-500' />
              Daily Summary
            </h2>
            <div className='flex items-center gap-1'>
              <button
                onClick={() => shiftDay(-1)}
                className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                aria-label='Previous day'
              >
                <ChevronLeft className='h-4 w-4' />
              </button>
              <input
                type='date'
                value={dailyDate}
                max={todayStr}
                onChange={(e) => setDailyDate(e.target.value)}
                className='rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
              />
              <button
                onClick={() => shiftDay(1)}
                disabled={dailyDate >= todayStr}
                className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40'
                aria-label='Next day'
              >
                <ChevronRight className='h-4 w-4' />
              </button>
              {dailyDate !== todayStr && (
                <button
                  onClick={() => setDailyDate(todayStr)}
                  className='ml-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50'
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {dailyLoading && !daily ? (
            <div className='py-6 text-center text-sm text-gray-400'>
              Loading daily summary...
            </div>
          ) : !daily ? (
            <div className='py-6 text-center text-sm text-gray-400'>
              Could not load daily summary.
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Boxes strip — Total Today + one box per payment type.
                  ₦0 types stay visible (dimmed) so the layout is stable. */}
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7'>
                <div className='col-span-2 rounded-lg bg-primary-50 px-4 py-3 sm:col-span-4 lg:col-span-1'>
                  <p className='font-body text-xs uppercase tracking-wider text-primary-600'>
                    Total {daily.date === todayStr ? 'Today' : ''}
                  </p>
                  <p className='mt-1 text-lg font-bold text-primary-700 sm:text-xl'>
                    {formatNaira(Number(daily.totalSales))}
                  </p>
                </div>
                {DAILY_SOURCES.map((src) => {
                  const entry = daily.sourceBreakdown.find(
                    (sb) => sb.source === src,
                  );
                  const total = Number(entry?.total ?? 0);
                  const count = entry?.count ?? 0;
                  const dim = total === 0;
                  return (
                    <div
                      key={src}
                      className={`rounded-lg bg-gray-50 px-4 py-3 ${dim ? 'opacity-60' : ''}`}
                      title={`${paymentTypeLabel(src)} — ${count} transaction${count === 1 ? '' : 's'}`}
                    >
                      <p className='truncate font-body text-xs uppercase tracking-wider text-gray-500'>
                        {paymentTypeLabel(src)}
                      </p>
                      <p
                        className={`mt-1 text-base font-bold sm:text-lg ${dim ? 'text-gray-400' : 'text-gray-800'}`}
                      >
                        {formatNaira(total)}
                      </p>
                      <p className='text-xs text-gray-400'>
                        {count} txn{count === 1 ? '' : 's'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Register — every row is dated the selected day, any status
                  (pending sales show with their status badge, not hidden). */}
              {daily.transactions.length === 0 ? (
                <div className='py-6 text-center'>
                  <Receipt className='mx-auto h-8 w-8 text-gray-300' />
                  <p className='mt-2 font-body text-sm text-gray-400'>
                    No sales recorded for this day.
                  </p>
                </div>
              ) : (
                <div className='overflow-x-auto rounded-md border border-gray-200'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400'>
                        <th className='px-4 py-3'>Date</th>
                        <th className='px-4 py-3'>Description</th>
                        <th className='px-4 py-3'>Customer</th>
                        <th className='px-4 py-3'>Payment Type</th>
                        <th className='px-4 py-3'>Status</th>
                        <th className='px-4 py-3 text-right'>Amount</th>
                        <th className='px-4 py-3'></th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-50'>
                      {daily.transactions.map((t) => (
                        <tr
                          key={t.id}
                          className='cursor-pointer text-sm text-gray-700 hover:bg-gray-50'
                          onClick={() =>
                            openTransactionDetail(
                              t as unknown as SalesTransaction,
                            )
                          }
                        >
                          <td className='whitespace-nowrap px-4 py-3'>
                            {formatDate(t.transactionDate)}
                          </td>
                          <td className='max-w-[200px] truncate px-4 py-3'>
                            {t.description || '—'}
                          </td>
                          <td className='px-4 py-3'>{t.customerName || '—'}</td>
                          <td className='whitespace-nowrap px-4 py-3'>
                            {paymentTypeLabel(t.source)}
                          </td>
                          <td className='px-4 py-3'>{statusBadge(t.status)}</td>
                          <td className='whitespace-nowrap px-4 py-3 text-right font-medium'>
                            {formatNaira(Number(t.amount))}
                          </td>
                          <td className='px-4 py-3'>
                            <div
                              className='flex items-center gap-1'
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  openEdit(t as unknown as SalesTransaction)
                                }
                                className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                title='Edit Sale'
                              >
                                <Pencil className='h-4 w-4' />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className='rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500'
                                title='Delete Sale'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Import modal — mounted once per page so it retains step state
          between opens until explicitly closed. */}
      {biz && (
        <SalesImportModal
          isOpen={showImport}
          businessId={biz.id}
          onClose={() => setShowImport(false)}
          onImported={() => {
            // After import, jump to page 1 and clear date filters so the user
            // actually sees the new rows — date filters often exclude imports
            // dated outside the current window, and pagination hides them
            // when the user wasn't on page 1. The fetchSales/fetchSummary
            // calls below cover the case where page+filters were already at
            // their reset values (no state change → no useEffect refire).
            setPage(1);
            setFilterStartDate('');
            setFilterEndDate('');
            fetchSales();
            fetchSummary();
            fetchDaily();
          }}
        />
      )}

      {/* Add/Edit Sale modal — mounted once per page, state resets on open */}
      {biz && (
        <AddSaleModal
          isOpen={showAddModal}
          businessId={biz.id}
          editSale={editSale}
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaveComplete}
        />
      )}

      {/* Transaction Detail Panel */}
      <TransactionDetailPanel
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        onVerifySuccess={() => {
          fetchSales();
          fetchSummary();
          fetchDaily();
        }}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <span className='font-body text-xs text-gray-400'>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='secondary'
              size='sm'
              disabled={!pagination.hasPrev}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='secondary'
              size='sm'
              disabled={!pagination.hasNext}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
