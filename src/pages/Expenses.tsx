import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus,
  Wallet,
  Trash2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  PieChart,
  AlertTriangle,
  Filter,
  XCircle,
} from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Expense, Pagination } from '@/types/index.ts';
import NoBusinessPrompt from '@/components/NoBusinessPrompt.tsx';

const CATEGORIES = ['rent', 'inventory', 'salary', 'utility', 'fuel', 'logistics', 'marketing', 'other'] as const;

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Types ──────────────────────────────────────────────────

interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

interface ExpenseSummary {
  month: number;
  year: number;
  totalExpenses: number;
  totalSales: number;
  transactionCount: number;
  categoryBreakdown: CategoryBreakdown[];
  alerts: { type: string; message: string }[];
}

// ─── Category color map ─────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  rent: 'bg-blue-500',
  inventory: 'bg-emerald-500',
  salary: 'bg-purple-500',
  utility: 'bg-amber-500',
  fuel: 'bg-orange-500',
  logistics: 'bg-cyan-500',
  marketing: 'bg-pink-500',
  other: 'bg-gray-400',
};

// ─── Component ──────────────────────────────────────────────

export default function Expenses() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filterCat, setFilterCat] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Summary state
  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDeductible, setIsDeductible] = useState(true);
  const [saving, setSaving] = useState(false);

  const basePath = biz ? `/businesses/${biz.id}/expenses` : '';

  const hasActiveFilters = !!(filterCat || filterStartDate || filterEndDate);

  const clearFilters = () => {
    setFilterCat(''); setFilterStartDate(''); setFilterEndDate('');
    setPage(1);
  };

  const fetchExpenses = () => {
    if (!biz) return;
    setIsLoading(true);
    const params: Record<string, any> = { page, limit: 15 };
    if (filterCat) params.category = filterCat;
    if (filterStartDate) params.startDate = filterStartDate;
    if (filterEndDate) params.endDate = filterEndDate;
    api.get(basePath, { params })
      .then((r) => { setExpenses(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  };

  const fetchSummary = () => {
    if (!biz) return;
    setSummaryLoading(true);
    api.get(`${basePath}/summary`, { params: { month: summaryMonth, year: summaryYear } })
      .then((r) => setSummary(r.data.data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [biz, page, filterCat, filterStartDate, filterEndDate]);
  useEffect(() => { fetchSummary(); }, [biz, summaryMonth, summaryYear]);

  const resetForm = () => {
    setAmount(''); setCategory('other'); setDescription('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setIsDeductible(true);
    setEditId(null); setShowForm(false);
  };

  const openEdit = (exp: Expense) => {
    setEditId(exp.id); setAmount(String(Number(exp.amount))); setCategory(exp.category);
    setDescription(exp.description || '');
    setExpenseDate(new Date(exp.expenseDate).toISOString().slice(0, 10));
    setIsDeductible(exp.isDeductible ?? true);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { amount: Number(amount), category, description, expenseDate, isDeductible };
    try {
      if (editId) {
        await api.put(`${basePath}/${editId}`, body);
        toast.success('Expense updated');
      } else {
        await api.post(basePath, body);
        toast.success('Expense created');
      }
      resetForm();
      fetchExpenses();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`${basePath}/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
      fetchSummary();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  // Month navigation
  const prevMonth = () => {
    if (summaryMonth === 1) { setSummaryMonth(12); setSummaryYear(summaryYear - 1); }
    else setSummaryMonth(summaryMonth - 1);
  };
  const nextMonth = () => {
    if (summaryMonth === 12) { setSummaryMonth(1); setSummaryYear(summaryYear + 1); }
    else setSummaryMonth(summaryMonth + 1);
  };
  const monthLabel = new Date(summaryYear, summaryMonth - 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  if (!biz) return <NoBusinessPrompt />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 font-body text-sm text-gray-500">Track your business expenses.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="self-start sm:self-auto"><Plus className="h-4 w-4" /> Add Expense</Button>
      </div>

      {/* Monthly Summary */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-warning-500" />
            Monthly Summary
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-gray-700">{monthLabel}</span>
            <button onClick={nextMonth} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {summaryLoading ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading summary...</div>
        ) : !summary || summary.transactionCount === 0 ? (
          <div className="py-6 text-center">
            <Wallet className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 font-body text-sm text-gray-400">No expenses for {monthLabel}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Totals row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-red-50 px-4 py-3">
                <p className="font-body text-xs text-red-600 uppercase tracking-wider">Total Expenses</p>
                <p className="mt-1 text-xl font-bold text-red-700">{formatNaira(summary.totalExpenses)}</p>
              </div>
              <div className="rounded-lg bg-green-50 px-4 py-3">
                <p className="font-body text-xs text-green-600 uppercase tracking-wider">Total Sales</p>
                <p className="mt-1 text-xl font-bold text-green-700">{formatNaira(summary.totalSales)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="font-body text-xs text-gray-500 uppercase tracking-wider">Entries</p>
                <p className="mt-1 text-xl font-bold text-gray-700">{summary.transactionCount}</p>
              </div>
            </div>

            {/* Expense intelligence alerts */}
            {summary.alerts.length > 0 && (
              <div className="space-y-2">
                {summary.alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-600" />
                    <p className="font-body text-sm text-warning-700">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Category breakdown */}
            {summary.categoryBreakdown.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">By Category</p>
                {/* Stacked bar */}
                <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                  {summary.categoryBreakdown.map((cb) => {
                    const pct = summary.totalExpenses > 0
                      ? (Number(cb.total) / summary.totalExpenses) * 100
                      : 0;
                    return (
                      <div
                        key={cb.category}
                        className={`${CATEGORY_COLORS[cb.category] || 'bg-gray-400'} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${cb.category}: ${formatNaira(Number(cb.total))} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3">
                  {summary.categoryBreakdown.map((cb) => (
                    <div key={cb.category} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[cb.category] || 'bg-gray-400'}`} />
                      <span className="font-body text-sm text-gray-600 capitalize">{cb.category}</span>
                      <span className="ml-auto font-body text-sm font-medium text-gray-700">{formatNaira(Number(cb.total))}</span>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{editId ? 'Edit Expense' : 'New Expense'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Amount (₦)" type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            <Input label="Expense Date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 sm:col-span-2">
              <input
                id="isDeductible"
                type="checkbox"
                checked={isDeductible}
                onChange={(e) => setIsDeductible(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <label htmlFor="isDeductible" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  Tax deductible
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Uncheck if this is a personal expense or not allowable for tax purposes
                </p>
              </div>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" isLoading={saving}>{editId ? 'Update' : 'Create'}</Button>
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="space-y-3">
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
                {[filterCat, filterStartDate, filterEndDate].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <XCircle className="h-4 w-4" /> Clear all
            </button>
          )}
          {pagination && <span className="ml-auto font-body text-xs text-gray-400">{pagination.total} total</span>}
        </div>

        {showFilters && (
          <Card className="py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Category</label>
                <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1); }} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">From</label>
                <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">To</label>
                <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Table */}
      {isLoading && <TableSkeleton rows={6} columns={6} />}

      {!isLoading && expenses.length === 0 && (
        <Card className="py-12 text-center">
          <Wallet className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-body text-sm text-gray-400">No expenses found.</p>
        </Card>
      )}

      {!isLoading && expenses.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body text-sm">
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(exp.expenseDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{exp.description || '—'}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{exp.category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    <div className="flex items-center justify-end gap-2">
                      <span>{formatNaira(Number(exp.amount))}</span>
                      {!exp.isDeductible && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          Non-deductible
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(exp)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(exp.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {expenses.map((exp) => (
            <Card key={exp.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{formatNaira(Number(exp.amount))}</span>
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">{exp.category}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 truncate">{exp.description || '—'}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(exp.expenseDate)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(exp)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(exp.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="secondary" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
