import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import type { InvoiceStatus } from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}
function statusBadge(s: InvoiceStatus) {
  const m: Record<InvoiceStatus, string> = {
    draft: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${m[s]}`}>
      {s}
    </span>
  );
}

/**
 * Flag "overdue" client-side when status=sent and dueDate has passed. The
 * backend keeps the row as `sent` until a background job flips it; surfacing
 * the visual state now matches the user's mental model ("my invoice IS overdue").
 */
function effectiveStatus(row: { status: InvoiceStatus; dueDate: string }): InvoiceStatus {
  if (row.status === 'sent' && new Date(row.dueDate) < new Date()) return 'overdue';
  return row.status;
}

export default function Invoices() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const navigate = useNavigate();

  const invoices = useInvoiceStore((s) => s.invoices);
  const pagination = useInvoiceStore((s) => s.pagination);
  const listLoading = useInvoiceStore((s) => s.listLoading);
  const listError = useInvoiceStore((s) => s.listError);
  const fetchInvoices = useInvoiceStore((s) => s.fetchInvoices);
  const downloadInvoicePdf = useInvoiceStore((s) => s.downloadInvoicePdf);

  // Pre-fill search from `?search=` so the command palette can deep-link customers here.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [showFilters, setShowFilters] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const hasActiveFilters = !!(filterStatus || filterStartDate || filterEndDate || debouncedSearch);

  // Debounce search so every keystroke doesn't refire the list query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Keep the URL in sync with what the user typed — preserves "share this filter" intent
  // and lets the palette deep-link by writing ?search= without us re-reading the param.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('search', debouncedSearch);
    else next.delete('search');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (!biz) return;
    fetchInvoices(biz.id, {
      page,
      limit: 15,
      status: filterStatus || undefined,
      search: debouncedSearch || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    });
  }, [biz, page, filterStatus, filterStartDate, filterEndDate, debouncedSearch, fetchInvoices]);

  const clearFilters = () => {
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleDownload = async (id: string, invoiceNumber: string) => {
    if (!biz) return;
    setDownloadingId(id);
    try {
      await downloadInvoicePdf(biz.id, id, invoiceNumber);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  if (!biz) return <p className="py-20 text-center text-gray-400">Select a business first.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 font-body text-sm text-gray-500">
            Create and send invoices. Marking one paid records it as a sale automatically.
          </p>
        </div>
        <Button onClick={() => navigate('/invoices/new')} className="self-start sm:self-auto">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search invoice # or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-all placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                hasActiveFilters
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                  {[filterStatus, filterStartDate, filterEndDate, debouncedSearch].filter(Boolean).length}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-4 w-4" /> Clear
              </button>
            )}
            {pagination && (
              <span className="ml-auto font-body text-xs text-gray-400 sm:ml-0">
                {pagination.total} total
              </span>
            )}
          </div>
        </div>

        {showFilters && (
          <Card className="py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as InvoiceStatus | '');
                    setPage(1);
                  }}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">From</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">To</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Error state */}
      {listError && (
        <Card className="border-red-200 bg-red-50 py-4 text-sm text-red-700">{listError}</Card>
      )}

      {/* Loading */}
      {listLoading && !invoices.length && (
        <div className="py-12 text-center text-gray-400">Loading invoices...</div>
      )}

      {/* Empty */}
      {!listLoading && invoices.length === 0 && (
        <Card className="py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-body text-sm text-gray-400">
            {hasActiveFilters ? 'No invoices match your filters.' : 'No invoices yet.'}
          </p>
          {!hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/invoices/new')}
            >
              <Plus className="h-4 w-4" /> Create your first invoice
            </Button>
          )}
        </Card>
      )}

      {/* Table (desktop) */}
      {invoices.length > 0 && (
        <>
          <div className="hidden md:block rounded-md border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm">
                {invoices.map((inv) => {
                  const eff = effectiveStatus(inv);
                  return (
                    <tr
                      key={inv.id}
                      className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.customerName}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.issueDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3">{statusBadge(eff)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatNaira(Number(inv.total))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
                            disabled={downloadingId === inv.id}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => {
              const eff = effectiveStatus(inv);
              return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="block w-full rounded-md border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{inv.invoiceNumber}</span>
                        {statusBadge(eff)}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 truncate">{inv.customerName}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}
                      </p>
                      <p className="mt-2 text-base font-bold text-gray-900">
                        {formatNaira(Number(inv.total))}
                      </p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(inv.id, inv.invoiceNumber);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          handleDownload(inv.id, inv.invoiceNumber);
                        }
                      }}
                      aria-disabled={downloadingId === inv.id}
                      className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 aria-disabled:opacity-50 aria-disabled:pointer-events-none"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
