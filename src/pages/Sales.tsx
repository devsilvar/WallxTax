import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus,
  Receipt,
  Trash2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Filter,
  XCircle,
  Upload,
} from 'lucide-react';
import SalesImportModal from '@/pages/SalesImportModal.tsx';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { SalesTransaction, Pagination } from '@/types/index.ts';
import NoBusinessPrompt from '@/components/NoBusinessPrompt.tsx';

const SOURCES = [
  'bank_transfer',
  'paycode',
  'pos',
  'online_store',
  'manual',
] as const;
const STATUSES = ['confirmed', 'pending', 'reversed', 'disputed'] as const;

interface TransactionClassification {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

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
  return s.replace(/_/g, ' ');
}

// ─── Types ──────────────────────────────────────────────────

interface SourceBreakdown {
  source: string;
  total: number;
  count: number;
}

interface SalesSummary {
  month: number;
  year: number;
  totalSales: number;
  transactionCount: number;
  sourceBreakdown: SourceBreakdown[];
}

// ─── Source color map for the breakdown bar ─────────────────

const SOURCE_COLORS: Record<string, string> = {
  bank_transfer: 'bg-blue-500',
  paycode: 'bg-purple-500',
  pos: 'bg-amber-500',
  online_store: 'bg-emerald-500',
  manual: 'bg-gray-400',
};

// ─── Component ──────────────────────────────────────────────

export default function Sales() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const [sales, setSales] = useState<SalesTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Summary state
  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<string>('manual');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [classification, setClassification] = useState('');
  const [originalClassification, setOriginalClassification] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [classifications, setClassifications] = useState<TransactionClassification[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

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
    const params: Record<string, any> = { page, limit: 15 };
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

  const fetchClassifications = () => {
    setLoadingClassifications(true);
    api
      .get('/transaction-classifications')
      .then((r) => {
        if (r.data.data && Array.isArray(r.data.data)) {
          setClassifications(r.data.data);
        }
      })
      .catch(() => toast.error('Failed to load classifications'))
      .finally(() => setLoadingClassifications(false));
  };

  useEffect(() => {
    fetchSales();
  }, [biz, page, filterSource, filterStatus, filterStartDate, filterEndDate]);
  useEffect(() => {
    fetchSummary();
  }, [biz, summaryMonth, summaryYear]);
  useEffect(() => {
    if (biz) fetchClassifications();
  }, [biz]);

  const resetForm = () => {
    setAmount('');
    setSource('manual');
    setDescription('');
    setCustomerName('');
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setClassification('');
    setOriginalClassification('');
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (s: SalesTransaction) => {
    setEditId(s.id);
    setAmount(String(Number(s.amount)));
    setSource(s.source);
    setDescription(s.description || '');
    setCustomerName(s.customerName || '');
    setTransactionDate(new Date(s.transactionDate).toISOString().slice(0, 10));
    const currentClass = s.finalClassification || '';
    setClassification(currentClass);
    setOriginalClassification(currentClass);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      amount: Number(amount),
      source,
      description: description || undefined,
      customerName: customerName || undefined,
      transactionDate,
    };
    try {
      if (editId) {
        await api.put(`${basePath}/${editId}`, body);
        
        // Only verify if classification changed
        if (classification && classification !== originalClassification) {
          await api.post(`${basePath}/${editId}/verify`, { 
            classification 
          });
        }
        
        toast.success('Sale updated');
      } else {
        await api.post(basePath, body);
        toast.success('Sale created');
      }
      resetForm();
      fetchSales();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale?')) return;
    try {
      await api.delete(`${basePath}/${id}`);
      toast.success('Sale deleted');
      fetchSales();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    }
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
          <Button variant='secondary' onClick={() => setShowImport(true)}>
            <Upload className='h-4 w-4' /> Import from Excel
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className='h-4 w-4' /> Add Sale
          </Button>
        </div>
      </div>

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
                  By Source
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

      {/* Form */}
      {showForm && (
        <Card>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>
              {editId ? 'Edit Sale' : 'New Sale'}
            </h2>
            <button
              onClick={resetForm}
              className='text-gray-400 hover:text-gray-600'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className='grid grid-cols-1 gap-4 sm:grid-cols-2'
          >
            <Input
              label='Amount (₦)'
              type='number'
              step='0.01'
              min='1'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className='space-y-1'>
              <label className='block text-sm font-medium text-gray-700'>
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label='Description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label='Customer Name'
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              label='Transaction Date'
              type='date'
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
            <div className='space-y-1'>
              <label className='block text-sm font-medium text-gray-700'>
                Classification (Optional)
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                disabled={loadingClassifications}
              >
                <option value=''>Not classified</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-end gap-2 sm:col-span-2'>
              <Button type='submit' isLoading={saving}>
                {editId ? 'Update' : 'Create'}
              </Button>
              <Button type='button' variant='secondary' onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

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
                  Source
                </label>
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    setPage(1);
                  }}
                  className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                >
                  <option value=''>All Sources</option>
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
                  <th className='px-4 py-3'>Payment Method</th>
                  <th className='px-4 py-3 text-right'>Amount</th>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='font-body text-sm'>
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className='border-b border-gray-50 hover:bg-gray-50'
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
                    <td className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <button
                          onClick={() => openEdit(s)}
                          className='rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        >
                          <Pencil className='h-4 w-4' />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className='rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500'
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
              <Card key={s.id} className='p-4'>
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
                  <div className='flex items-center gap-1 shrink-0'>
                    <button
                      onClick={() => openEdit(s)}
                      className='rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    >
                      <Pencil className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className='rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500'
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
          }}
        />
      )}

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
