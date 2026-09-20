import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Landmark,
  CreditCard,
  Ban,
  Clock,
  Phone,
  Shield,
  ShieldCheck,
  TrendingUp,
  Wallet,
  RefreshCw,
  X,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useCreditStore } from '@/stores/credit.store.ts';
import type { CustomerCredit, CreditStatus } from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';

import CreateCreditModal from '@/components/debtors/CreateCreditModal.tsx';
import RecordCreditPaymentModal from '@/components/debtors/RecordCreditPaymentModal.tsx';
import LinkDvaCreditModal from '@/components/debtors/LinkDvaCreditModal.tsx';
import WriteOffModal from '@/components/debtors/WriteOffModal.tsx';

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getAvatarStyle(name: string) {
  const palette = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return palette[hash % palette.length];
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'C'
  );
}

function getDueStatus(dueDateStr: string, status: CreditStatus) {
  if (status === 'paid') {
    return {
      label: 'Settled',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
    };
  }
  if (status === 'written_off') {
    return {
      label: 'Written Off',
      color: 'text-gray-600 bg-gray-100 border-gray-200',
      icon: Ban,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `${overdueDays}d overdue`,
      color: 'text-rose-700 bg-rose-50 border-rose-200 font-semibold',
      icon: AlertTriangle,
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      color: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
      icon: Clock,
    };
  }
  return {
    label: `Due in ${diffDays}d`,
    color: 'text-gray-700 bg-gray-50 border-gray-200',
    icon: Clock,
  };
}

function statusBadge(s: CreditStatus) {
  const map: Record<CreditStatus, { label: string; dot: string; cls: string }> = {
    unpaid: {
      label: 'Unpaid',
      dot: 'bg-amber-500',
      cls: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    partially_paid: {
      label: 'Partially Paid',
      dot: 'bg-blue-500',
      cls: 'bg-blue-50 text-blue-800 border-blue-200/80',
    },
    overdue: {
      label: 'Overdue',
      dot: 'bg-rose-500 animate-pulse',
      cls: 'bg-rose-50 text-rose-800 border-rose-200/80 font-bold',
    },
    paid: {
      label: 'Settled',
      dot: 'bg-emerald-500',
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
    written_off: {
      label: 'Written Off',
      dot: 'bg-gray-400',
      cls: 'bg-gray-100 text-gray-700 border-gray-200/80',
    },
  };
  const item = map[s] || { label: s, dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-700 border-gray-200/80' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${item.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

export default function Debtors() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const credits = useCreditStore((s) => s.credits);
  const summary = useCreditStore((s) => s.summary);
  const pagination = useCreditStore((s) => s.pagination);
  const listLoading = useCreditStore((s) => s.listLoading);
  const fetchCredits = useCreditStore((s) => s.fetchCredits);
  const fetchSummary = useCreditStore((s) => s.fetchSummary);
  const sendWhatsApp = useCreditStore((s) => s.sendWhatsApp);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('status') as CreditStatus) || '';
  const initialNew = searchParams.get('new') === 'true';

  const [statusFilter, setStatusFilter] = useState<CreditStatus | ''>(initialStatus);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(initialNew);
  const [paymentModalCredit, setPaymentModalCredit] = useState<CustomerCredit | null>(null);
  const [dvaModalCredit, setDvaModalCredit] = useState<CustomerCredit | null>(null);
  const [writeOffModalCredit, setWriteOffModalCredit] = useState<CustomerCredit | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load list & summary
  useEffect(() => {
    if (!biz) return;
    fetchCredits(biz.id, {
      page,
      limit: 15,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
    });
    fetchSummary(biz.id);
  }, [biz, page, statusFilter, debouncedSearch, fetchCredits, fetchSummary]);

  const handleWhatsAppClick = async (credit: CustomerCredit) => {
    if (!biz) return;
    if (!credit.customerPhone) {
      toast.error(`No phone number recorded for ${credit.customerName}`);
      return;
    }

    try {
      const meta = await sendWhatsApp(biz.id, credit.id);
      if (meta?.waUrl) {
        window.open(meta.waUrl, '_blank', 'noopener,noreferrer');
        toast.success(`WhatsApp reminder opened for ${credit.customerName}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const reloadData = () => {
    if (biz) {
      fetchCredits(biz.id, {
        page,
        limit: 15,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      fetchSummary(biz.id);
    }
  };

  const handleRefresh = async () => {
    if (!biz) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchCredits(biz.id, {
          page,
          limit: 15,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        }),
        fetchSummary(biz.id),
      ]);
      toast.success('Debtors book refreshed');
    } catch {
      toast.error('Failed to refresh debtors book');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!biz) {
    return <div className="py-20 text-center text-gray-400">Select a business first.</div>;
  }

  // Portfolio metrics calculations
  const recovered = summary?.recoveredThisMonth ?? 0;
  const outstanding = summary?.totalOutstanding ?? 0;
  const overdue = summary?.overdueAmount ?? 0;
  const totalBook = recovered + outstanding;
  const recoveryRate = totalBook > 0 ? Math.round((recovered / totalBook) * 100) : 0;
  const overduePct = outstanding > 0 ? Math.round((overdue / outstanding) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Debtors & Customer Credit Book
            </h1>
            <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
              FIRS Cash-Basis Ledger
            </span>
          </div>
          <p className="font-body text-xs sm:text-sm text-gray-500 mt-0.5">
            Track receivables, send automated WhatsApp payment reminders, and auto-recognize sales upon repayment.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200/90 hover:bg-gray-50 hover:border-gray-300 shadow-xs transition-all disabled:opacity-50"
            title="Refresh records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary-600' : 'text-gray-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Record Credit / Debt
          </Button>
        </div>
      </div>

      {/* ── Executive Financial KPI Strip ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Outstanding</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shadow-2xs">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">
            {formatNaira(outstanding)}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Active debtors</span>
            <span className="font-semibold text-gray-700">{summary?.activeDebtors || 0} accounts</span>
          </div>
        </Card>

        {/* Past Due (Overdue) */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Past Due (Overdue)</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center shadow-2xs">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2 tabular-nums">
            {formatNaira(overdue)}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Share of book</span>
            <span className={`font-semibold ${overdue > 0 ? 'text-rose-600' : 'text-gray-700'}`}>
              {overduePct}% at risk
            </span>
          </div>
        </Card>

        {/* Recovered This Month */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Recovered (Month)</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-2xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2 tabular-nums">
            {formatNaira(recovered)}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Cashflow status</span>
            <span className="font-semibold text-emerald-700">Realized as sales</span>
          </div>
        </Card>

        {/* Collection Efficiency */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Recovery Efficiency</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-indigo-900 tabular-nums">{recoveryRate}%</p>
            <span className="text-xs text-gray-400">collected this cycle</span>
          </div>
          <div className="mt-2.5">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, recoveryRate))}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters, Search & Segmentation Bar ───────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          {/* Status Tabs with Indicators */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: '', label: 'All Debts' },
              { key: 'unpaid', label: 'Unpaid', dot: 'bg-amber-500' },
              { key: 'partially_paid', label: 'Partially Paid', dot: 'bg-blue-500' },
              { key: 'overdue', label: 'Overdue', dot: 'bg-rose-500 animate-pulse' },
              { key: 'paid', label: 'Settled', dot: 'bg-emerald-500' },
              { key: 'written_off', label: 'Written Off', dot: 'bg-gray-400' },
            ].map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key as any);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
                  }`}
                >
                  {tab.dot && <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar with clear button */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search debtor, phone, guarantor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-9 pr-8 py-2 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Debtors Ledger Table ─────────────────────────────── */}
      <Card className="overflow-hidden border border-gray-200/80 shadow-xs bg-white">
        {listLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 w-1/3">
                  <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="w-1/4 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                  <div className="h-2 bg-gray-100 rounded-full w-full" />
                </div>
                <div className="h-6 w-24 bg-gray-100 rounded-md" />
                <div className="h-7 w-20 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : credits.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 border border-gray-200/60 mx-auto mb-3 shadow-2xs">
              <BookOpen className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No debt records found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
              {search || statusFilter
                ? 'No debtors match your current filter criteria. Try adjusting your search query or status filter.'
                : 'Keep track of all customers who owe your business money, generate payment links, and auto-recognize sales on repayment.'}
            </p>
            {!search && !statusFilter ? (
              <Button onClick={() => setCreateModalOpen(true)} className="mt-4" size="sm">
                <Plus className="h-3.5 w-3.5" /> Record First Debtor
              </Button>
            ) : (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
                className="mt-4 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Debtor / Customer</th>
                  <th className="py-3.5 px-4">Debt & Recovery Progress</th>
                  <th className="py-3.5 px-4">Schedule & Urgency</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {credits.map((c) => {
                  const dueInfo = getDueStatus(c.dueDate, c.status);
                  const paidPct = c.totalAmount > 0 ? Math.min(100, Math.round((c.amountPaid / c.totalAmount) * 100)) : 0;
                  const avatarStyle = getAvatarStyle(c.customerName);
                  const initials = getInitials(c.customerName);
                  const DueIcon = dueInfo.icon;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/debtors/${c.id}`)}
                      className="hover:bg-primary-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Customer & Product Information */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold border shrink-0 shadow-2xs mt-0.5 ${avatarStyle.bg} ${avatarStyle.text} ${avatarStyle.border}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-sm truncate group-hover:text-primary-600 transition-colors">
                              {c.customerName}
                            </div>
                            {/* Product / Debt Description */}
                            <div className="text-[11px] text-gray-700 font-medium line-clamp-1 mt-0.5 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 text-[10px] uppercase font-semibold rounded-md shrink-0">
                                Product
                              </span>
                              <span className="truncate">{c.description || 'Customer credit obligation'}</span>
                            </div>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-[10px] text-gray-400">
                              {c.customerPhone && (
                                <span className="flex items-center gap-1 font-mono text-gray-500">
                                  <Phone className="h-2.5 w-2.5 text-gray-400" /> {c.customerPhone}
                                </span>
                              )}
                              {c.guarantorName && (
                                <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-1.5 py-0.2 rounded-md font-medium">
                                  <Shield className="h-2.5 w-2.5 text-indigo-600" /> {c.guarantorName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Debt Amount & Progress Bar */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm tabular-nums">{formatNaira(c.balance)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Original: <span className="font-medium text-gray-600">{formatNaira(c.totalAmount)}</span>
                        </div>
                        <div className="w-36 mt-1.5">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                            <span>{paidPct}% collected</span>
                            {c.amountPaid > 0 && <span className="text-emerald-600 font-medium">+{formatNaira(c.amountPaid)}</span>}
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                c.status === 'paid'
                                  ? 'bg-emerald-500'
                                  : c.status === 'overdue'
                                  ? 'bg-rose-500'
                                  : 'bg-primary-600'
                              }`}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Repayment Schedule & Urgency */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] border ${dueInfo.color}`}
                          >
                            <DueIcon className="h-3 w-3" /> {dueInfo.label}
                          </span>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-300" /> Due {formatDate(c.dueDate)}
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">{statusBadge(c.status)}</td>

                      {/* Actions Toolbar & Click Indicator */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Settlement */}
                          {c.status !== 'paid' && c.status !== 'written_off' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentModalCredit(c);
                              }}
                              title="Record Cash or Manual Payment"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1 border border-emerald-200/60 transition-all shadow-2xs"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Pay
                            </button>
                          )}

                          {/* Reconcile with DVA */}
                          {c.status !== 'paid' && c.status !== 'written_off' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDvaModalCredit(c);
                              }}
                              title="Match Incoming Bank Transfer via DVA"
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs flex items-center gap-1 border border-indigo-200/60 transition-all shadow-2xs"
                            >
                              <Landmark className="h-3.5 w-3.5" /> Match DVA
                            </button>
                          )}

                          {/* WhatsApp Reminder */}
                          {c.customerPhone && c.status !== 'paid' && c.status !== 'written_off' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsAppClick(c);
                              }}
                              title={`Send WhatsApp payment reminder to ${c.customerPhone}`}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-all shadow-2xs"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}

                          {/* Write-Off */}
                          {c.status !== 'paid' && c.status !== 'written_off' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWriteOffModalCredit(c);
                              }}
                              title="Write Off Uncollectible Debt"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                          {/* Navigation Indicator Arrow */}
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-xs">
            <span className="text-gray-500">
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, pagination.total)} of {pagination.total} debtors
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="font-medium text-gray-700">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Modals ───────────────────────────────────────────── */}
      <CreateCreditModal
        businessId={biz.id}
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={reloadData}
      />

      <RecordCreditPaymentModal
        businessId={biz.id}
        credit={paymentModalCredit}
        isOpen={!!paymentModalCredit}
        onClose={() => setPaymentModalCredit(null)}
        onSuccess={reloadData}
      />

      <LinkDvaCreditModal
        businessId={biz.id}
        credit={dvaModalCredit}
        isOpen={!!dvaModalCredit}
        onClose={() => setDvaModalCredit(null)}
        onSuccess={reloadData}
      />

      <WriteOffModal
        businessId={biz.id}
        credit={writeOffModalCredit}
        isOpen={!!writeOffModalCredit}
        onClose={() => setWriteOffModalCredit(null)}
        onSuccess={reloadData}
      />
    </div>
  );
}
