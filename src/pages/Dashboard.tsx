import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CreateBusinessModal from '@/components/CreateBusinessModal.tsx';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Receipt,
  Wallet,
  Bell,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CircleDollarSign,
  Plus,
  FileText,
  Sparkles,
  Activity,
  BarChart3,
  Zap,
  Heart,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';
import type { TaxReport, SalesTransaction, Expense } from '@/types/index.ts';

// ─── Types ──────────────────────────────────────────────────

interface DashboardData {
  currentMonth: TaxReport | null;
  trends: TrendItem[];
  lifetime: {
    totalSales: number;
    totalExpenses: number;
    totalTaxPayable: number;
    reportsCount: number;
  };
  unpaidCount: number;
  taxConfig: { currentRate: number; currency: string; authority: string };
}

interface TrendItem {
  taxMonth: string;
  totalSales: number;
  totalExpenses: number;
  grossProfit: number;
  taxPayable: number;
  taxRate: number;
  profitMargin: number;
  paymentStatus: string;
  isFinalized: boolean;
  isLocked: boolean;
}

interface Reminder {
  id: string;
  reminderType: string;
  scheduledDate: string;
  message: string;
  isSent: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

function formatNaira(amount: number): string {
  return `\u20A6${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    month: 'short',
    year: 'numeric',
  });
}

function statusDot(status: string) {
  const colorMap: Record<string, string> = {
    pending: 'bg-amber-400',
    processing: 'bg-blue-400',
    completed: 'bg-emerald-400',
    failed: 'bg-red-400',
    confirmed: 'bg-emerald-400',
    reversed: 'bg-red-400',
  };
  const labelMap: Record<string, string> = {
    pending: 'text-amber-600 bg-amber-50 border-amber-100',
    processing: 'text-blue-600 bg-blue-50 border-blue-100',
    completed: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    failed: 'text-red-600 bg-red-50 border-red-100',
    confirmed: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    reversed: 'text-red-600 bg-red-50 border-red-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${labelMap[status] || 'text-gray-500 bg-gray-50 border-gray-100'}`}>
      <span className={`h-1.5 w-1.5 rounded-full animate-pulse-soft ${colorMap[status] || 'bg-gray-400'}`} />
      {status}
    </span>
  );
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '\u{1F31F}';
  if (hour < 12) return '\u{2600}\u{FE0F}';
  if (hour < 17) return '\u{1F44B}';
  if (hour < 21) return '\u{1F305}';
  return '\u{1F319}';
}

function getHealthScore(lt: DashboardData['lifetime'] | undefined, unpaidCount: number): { score: number; label: string; color: string; bg: string } {
  if (!lt) return { score: 0, label: 'No data', color: 'text-gray-400', bg: 'bg-gray-200' };
  let score = 50;
  if (lt.reportsCount > 0) score += 15;
  if (lt.totalSales > 0) score += 15;
  if (unpaidCount === 0) score += 20;
  else score -= unpaidCount * 10;
  score = Math.max(0, Math.min(100, score));
  if (score >= 80) return { score, label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-400' };
  if (score >= 60) return { score, label: 'Good', color: 'text-blue-600', bg: 'bg-blue-400' };
  if (score >= 40) return { score, label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-400' };
  return { score, label: 'Needs attention', color: 'text-red-500', bg: 'bg-red-400' };
}

// ─── Component ──────────────────────────────────────────────

export default function Dashboard() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const user = useAuthStore((s) => s.user);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentSales, setRecentSales] = useState<SalesTransaction[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [recentReports, setRecentReports] = useState<TaxReport[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateBiz, setShowCreateBiz] = useState(false);

  useEffect(() => {
    if (!activeBusiness) return;

    const bid = activeBusiness.id;
    setIsLoading(true);

    Promise.all([
      api.get(`/businesses/${bid}/tax/dashboard?months=6`),
      api.get(`/businesses/${bid}/sales?limit=5`),
      api.get(`/businesses/${bid}/expenses?limit=5`),
      api.get(`/businesses/${bid}/tax/reports?limit=3`),
      api.get(`/businesses/${bid}/reminders/active`).catch(() => ({ data: { data: [] } })),
    ])
      .then(([dashRes, salesRes, expensesRes, reportsRes, remindersRes]) => {
        setDashboard(dashRes.data.data);
        setRecentSales(salesRes.data.data);
        setRecentExpenses(expensesRes.data.data);
        setRecentReports(reportsRes.data.data);
        setReminders(remindersRes.data.data || []);
      })
      .finally(() => setIsLoading(false));
  }, [activeBusiness]);

  // ─── Empty State ────────────────────────────────────────

  if (!activeBusiness) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-2xl bg-primary-200 blur-2xl opacity-40 animate-pulse-soft" />
          <div className="relative rounded-2xl bg-gradient-to-br from-primary-50 to-white p-8 border border-primary-100 shadow-sm animate-float">
            <Plus className="h-10 w-10 text-primary-400" />
          </div>
        </div>
        <p className="text-xl font-bold text-gray-900">Welcome to PayMyTax</p>
        <p className="text-sm text-gray-400 mt-2 mb-8 text-center max-w-sm">Create your first business to start tracking sales, expenses, and tax compliance.</p>
        <Button onClick={() => setShowCreateBiz(true)}>
          Get Started
        </Button>
        <CreateBusinessModal
          isOpen={showCreateBiz}
          onClose={() => setShowCreateBiz(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary-200 blur-lg opacity-40 animate-pulse-soft" />
            <div className="relative h-12 w-12 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Loading your dashboard</p>
            <p className="text-[12px] text-gray-300 mt-1">Crunching the numbers...</p>
          </div>
        </div>
      </div>
    );
  }

  const lt = dashboard?.lifetime;
  const currentMonth = dashboard?.currentMonth;
  const trends = dashboard?.trends || [];
  const health = getHealthScore(lt, dashboard?.unpaidCount ?? 0);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.email?.split('@')[0] || '';

  // Calculate max sales for trend bar visualization
  const maxSales = Math.max(...trends.map(t => Number(t.totalSales)), 1);

  // Profit margin for the current month visual
  const currentMargin = currentMonth ? Number(currentMonth.grossProfit) / Math.max(Number(currentMonth.totalSales), 1) * 100 : 0;

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ───────────────────────────── */}
      <div className="animate-slide-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 text-white shadow-lg shadow-primary-900/15">
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-4 top-8 h-24 w-24 rounded-full bg-white/[0.06]" />
        <div className="absolute left-1/3 -bottom-14 h-36 w-36 rounded-full bg-white/[0.03]" />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-primary-200 text-sm font-medium flex items-center gap-1.5">
              {greeting()} <span className="text-base">{getGreetingEmoji()}</span>
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight capitalize">
              {userName}
            </h1>
            <p className="mt-2 text-primary-200/80 text-[13px]">
              Here's your overview for <span className="text-white font-semibold">{activeBusiness.businessName}</span>
            </p>

            {/* Business health indicator */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5">
                <Heart className="h-3.5 w-3.5 text-primary-200" />
                <span className="text-[12px] font-medium text-primary-100">Tax Health</span>
                <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className={`h-full rounded-full ${health.bg} transition-all duration-1000`} style={{ width: `${health.score}%` }} />
                </div>
                <span className="text-[11px] font-bold text-white">{health.score}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/sales">
              <button className="flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2 sm:px-3.5 sm:py-2.5 text-[12px] sm:text-[13px] font-medium text-white hover:bg-white/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add</span> Sale
              </button>
            </Link>
            <Link to="/tax">
              <button className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 text-[12px] sm:text-[13px] font-semibold text-primary-700 hover:bg-primary-50 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                <FileText className="h-3.5 w-3.5" /> Reports
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Alert: Unpaid Reports ───────────────────── */}
      {(dashboard?.unpaidCount ?? 0) > 0 && (
        <div className="animate-scale-in flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border border-amber-200/60 px-5 py-3.5 hover:border-amber-300/80 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100/80">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-[13px] text-amber-700 font-medium">
              <span className="font-bold">{dashboard!.unpaidCount}</span> unpaid report{dashboard!.unpaidCount > 1 ? 's' : ''} awaiting payment
            </p>
          </div>
          <Link to="/tax" className="group text-[13px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 transition-colors">
            Pay now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {/* ── Active Reminders ────────────────────────── */}
      {reminders.length > 0 && (
        <div className="animate-scale-in flex items-start gap-3 rounded-xl bg-blue-50/60 border border-blue-200/50 px-5 py-3.5 hover:border-blue-300/60 transition-colors duration-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100/80 shrink-0 mt-0.5">
            <Bell className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {reminders.slice(0, 3).map((r) => (
              <p key={r.id} className="text-[13px] text-blue-700 truncate">
                {r.message} <span className="text-blue-400">\u00B7 {formatDate(r.scheduledDate)}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children">
        <StatCard
          label="Total Sales"
          value={formatNaira(lt?.totalSales ?? 0)}
          icon={ArrowUpRight}
          gradient="from-emerald-500 to-emerald-600"
          bgLight="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Total Expenses"
          value={formatNaira(lt?.totalExpenses ?? 0)}
          icon={ArrowDownRight}
          gradient="from-amber-500 to-orange-500"
          bgLight="bg-amber-50"
          iconColor="text-amber-500"
        />
        <StatCard
          label="Tax Payable"
          value={formatNaira(lt?.totalTaxPayable ?? 0)}
          icon={CircleDollarSign}
          gradient="from-red-500 to-rose-500"
          bgLight="bg-red-50"
          iconColor="text-red-500"
        />
        <StatCard
          label="Reports Filed"
          value={String(lt?.reportsCount ?? 0)}
          icon={CheckCircle2}
          gradient="from-blue-500 to-indigo-500"
          bgLight="bg-blue-50"
          iconColor="text-blue-500"
        />
      </div>

      {/* ── Current Month + Trends ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 stagger-children">
        {/* Current Month */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary-400 animate-pulse-soft" />
              <h2 className="text-sm font-semibold text-gray-900">This Month</h2>
            </div>
            {currentMonth && statusDot(currentMonth.paymentStatus)}
          </div>
          {currentMonth ? (
            <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-3 sm:space-y-3.5">
              {/* Mini profit margin ring */}
              <div className="flex items-center justify-center pb-2">
                <div className="relative h-16 sm:h-20 w-16 sm:w-20">
                  <svg className="h-16 sm:h-20 w-16 sm:w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="url(#marginGradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(currentMargin / 100) * 213.6} 213.6`}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="marginGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[13px] sm:text-[15px] font-bold text-gray-900 tabular-nums">{currentMargin.toFixed(0)}%</span>
                    <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium uppercase tracking-wide">Margin</span>
                  </div>
                </div>
              </div>

              <MetricRow label="Sales" value={formatNaira(Number(currentMonth.totalSales))} icon={<ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />} />
              <MetricRow label="Expenses" value={formatNaira(Number(currentMonth.totalExpenses))} icon={<ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />} />
              <MetricRow label="Gross Profit" value={formatNaira(Number(currentMonth.grossProfit))} icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />} />
              <div className="border-t border-gray-50 pt-3 sm:pt-3.5">
                <MetricRow label={`Tax @ ${Number(currentMonth.taxRate)}%`} value={formatNaira(Number(currentMonth.taxPayable))} icon={<CircleDollarSign className="h-3.5 w-3.5 text-red-500" />} bold />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {currentMonth.isFinalized ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 border border-emerald-100">
                    <CheckCircle2 className="h-3 w-3" /> Finalized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 bg-gray-50 rounded-full px-2.5 py-1 border border-gray-100">
                    <Clock className="h-3 w-3" /> Draft
                  </span>
                )}
                {currentMonth.isLocked && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-full px-2.5 py-1 border border-blue-100">
                    <CreditCard className="h-3 w-3" /> Paid
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-5 sm:py-6">
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 py-8 sm:py-10 text-center border border-gray-100/50">
                <Sparkles className="mx-auto h-6 sm:h-7 w-6 sm:w-7 text-gray-300 animate-float" />
                <p className="mt-3 text-sm text-gray-400">No report for this month yet</p>
                <p className="text-[11px] text-gray-300 mt-1">Calculate your tax to see the numbers here</p>
                <Link to="/tax" className="mt-4 inline-block">
                  <Button size="sm" variant="secondary" className="text-[13px] rounded-lg">Calculate Tax</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Trends */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-gray-900">Monthly Trends</h2>
            </div>
            <span className="text-[11px] text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5 border border-gray-100 hidden sm:inline-flex">Last 6 months</span>
          </div>
          {trends.length > 0 ? (
            <div className="px-4 sm:px-5 py-3 sm:py-4 overflow-x-auto">
              <div className="min-w-[500px]">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 text-left">Month</th>
                      <th className="pb-3 text-left pl-3" style={{ width: '30%' }}>Sales</th>
                      <th className="pb-3 text-right">Tax</th>
                      <th className="pb-3 text-right">Margin</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px]">
                    {trends.slice().reverse().map((t, i) => {
                      const barWidth = Math.max((Number(t.totalSales) / maxSales) * 100, 4);
                      return (
                        <tr key={t.taxMonth} className={`group hover:bg-gray-50/50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                          <td className="py-3 text-gray-700 font-medium whitespace-nowrap">{formatMonth(t.taxMonth)}</td>
                          <td className="py-3 pl-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-700 ease-out"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="text-gray-500 tabular-nums text-[12px] shrink-0">{formatNaira(Number(t.totalSales))}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right text-gray-500 tabular-nums">{formatNaira(Number(t.taxPayable))}</td>
                          <td className="py-3 text-right">
                            <span className={`tabular-nums font-medium ${Number(t.profitMargin) >= 40 ? 'text-emerald-600' : Number(t.profitMargin) >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                              {Number(t.profitMargin).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 text-right">{statusDot(t.paymentStatus)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-5 sm:py-6">
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 py-8 sm:py-10 text-center border border-gray-100/50">
                <Activity className="mx-auto h-6 sm:h-7 w-6 sm:w-7 text-gray-300 animate-float" />
                <p className="mt-3 text-sm text-gray-400">No trend data yet</p>
                <p className="text-[11px] text-gray-300 mt-1">Your monthly overview will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Sales + Expenses ─────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 stagger-children">
        {/* Recent Sales */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/70">
                <Receipt className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Recent Sales</h2>
            </div>
            <Link to="/sales" className="group text-[12px] font-medium text-gray-400 hover:text-primary-600 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {recentSales.length > 0 ? (
            <div className="px-3 sm:px-5 py-2">
              {recentSales.map((sale, i) => (
                <div key={sale.id} className={`group flex items-center justify-between py-2.5 sm:py-3 transition-colors hover:bg-gray-50/50 -mx-1 px-1 sm:-mx-2 sm:px-2 rounded-lg ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <Receipt className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 truncate">
                        {sale.description || sale.source}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{formatDate(sale.transactionDate)}</p>
                    </div>
                  </div>
                  <p className="text-[12px] sm:text-[13px] font-semibold text-emerald-600 shrink-0 ml-2 sm:ml-3 tabular-nums">
                    +{formatNaira(Number(sale.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-4 sm:py-5">
              <EmptyMini icon={Receipt} message="No sales recorded yet" subMessage="Start tracking your income" linkTo="/sales" linkLabel="Add Sale" />
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-orange-50">
                <Wallet className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Recent Expenses</h2>
            </div>
            <Link to="/expenses" className="group text-[12px] font-medium text-gray-400 hover:text-primary-600 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {recentExpenses.length > 0 ? (
            <div className="px-3 sm:px-5 py-2">
              {recentExpenses.map((exp, i) => (
                <div key={exp.id} className={`group flex items-center justify-between py-2.5 sm:py-3 transition-colors hover:bg-gray-50/50 -mx-1 px-1 sm:-mx-2 sm:px-2 rounded-lg ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <Wallet className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] sm:text-[13px] font-medium text-gray-700 truncate">
                        {exp.description || exp.category}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                        <span className="capitalize">{exp.category}</span> \u00B7 {formatDate(exp.expenseDate)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[12px] sm:text-[13px] font-semibold text-red-500 shrink-0 ml-2 sm:ml-3 tabular-nums">
                    -{formatNaira(Number(exp.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 sm:px-5 py-4 sm:py-5">
              <EmptyMini icon={Wallet} message="No expenses recorded yet" subMessage="Track your business spending" linkTo="/expenses" linkLabel="Add Expense" />
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Tax Reports ──────────────────────── */}
      {recentReports.length > 0 && (
        <div className="animate-slide-up rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-50 to-primary-100/50">
                <FileText className="h-3.5 w-3.5 text-primary-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Recent Reports</h2>
            </div>
            <Link to="/tax" className="group text-[12px] font-medium text-gray-400 hover:text-primary-600 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="px-4 sm:px-5 py-3 sm:py-4 overflow-x-auto">
            <div className="min-w-[500px]">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 text-left">Period</th>
                    <th className="pb-3 text-right">Sales</th>
                    <th className="pb-3 text-right">Expenses</th>
                    <th className="pb-3 text-right">Tax Due</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {recentReports.map((report, i) => (
                    <tr key={report.id} className={`group hover:bg-gray-50/50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <td className="py-3 text-gray-700 font-medium">
                        <div className="flex items-center gap-2">
                          {formatMonth(report.taxMonth)}
                          {report.isFinalized && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        </div>
                      </td>
                      <td className="py-3 text-right text-gray-500 tabular-nums">{formatNaira(Number(report.totalSales))}</td>
                      <td className="py-3 text-right text-gray-500 tabular-nums">{formatNaira(Number(report.totalExpenses))}</td>
                      <td className="py-3 text-right font-semibold text-gray-900 tabular-nums">{formatNaira(Number(report.taxPayable))}</td>
                      <td className="py-3 text-right">{statusDot(report.paymentStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────── */}
      {dashboard?.taxConfig && (
        <div className="flex items-center justify-center gap-3 py-4 animate-fade-in">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-gray-300" />
            <p className="text-[11px] text-gray-300 font-medium whitespace-nowrap">
              {dashboard.taxConfig.authority} \u00B7 {dashboard.taxConfig.currentRate}% \u00B7 {dashboard.taxConfig.currency}
            </p>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatCard({ label, value, icon: Icon, gradient, bgLight, iconColor }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgLight: string;
  iconColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default">
      {/* Gradient accent on top */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient} opacity-80 transition-all duration-300 group-hover:h-1.5`} />
      {/* Subtle background glow on hover */}
      <div className={`absolute -right-4 -bottom-4 h-20 w-20 rounded-full ${bgLight} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60`} />
      <div className="relative flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-lg sm:text-xl font-bold text-gray-900 truncate tabular-nums">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgLight} shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, icon, bold }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2.5">
        <span className="transition-transform duration-200 group-hover:scale-110">{icon}</span>
        <span className="text-[13px] text-gray-500">{label}</span>
      </div>
      <span className={`text-[13px] tabular-nums ${bold ? 'font-bold text-gray-900 text-[14px]' : 'font-medium text-gray-600'}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyMini({ icon: Icon, message, subMessage, linkTo, linkLabel }: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  subMessage?: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 py-8 text-center border border-gray-100/50">
      <Icon className="mx-auto h-7 w-7 text-gray-300 animate-float" />
      <p className="mt-3 text-sm text-gray-400">{message}</p>
      {subMessage && <p className="text-[11px] text-gray-300 mt-1">{subMessage}</p>}
      <Link to={linkTo} className="mt-3 inline-block">
        <Button size="sm" variant="secondary" className="text-[13px] rounded-lg">{linkLabel}</Button>
      </Link>
    </div>
  );
}
