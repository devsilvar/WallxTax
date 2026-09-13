import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  FileText,
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  Search,
  Filter,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  BarChart3,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import Card from '@/components/ui/Card.tsx';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton.tsx';
import type {
  AdminDashboardStats,
  TreasuryAnalyticsData,
  PlatformFeeConfig,
} from '@/types/index.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import AdminTransferDetailModal from '@/components/admin/AdminTransferDetailModal.tsx';

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Semantic stat card configuration
const statCardsConfig = [
  {
    key: 'totalUsers' as const,
    label: 'Registered Users',
    sublabel: 'Active platform accounts',
    icon: Users,
    route: '/admin/users',
    badgeClass: 'bg-violet-100 text-violet-700',
    cardBorder: 'hover:border-violet-300',
    isCurrency: false,
  },
  {
    key: 'totalBusinesses' as const,
    label: 'Registered Businesses',
    sublabel: 'Entities filing taxes & DVA',
    icon: Building2,
    route: '/admin/businesses',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    cardBorder: 'hover:border-emerald-300',
    isCurrency: false,
  },
  {
    key: 'totalTaxReports' as const,
    label: 'Tax Reports Filed',
    sublabel: 'FIRS compliance filings',
    icon: FileText,
    route: '/admin/withdrawals',
    badgeClass: 'bg-amber-100 text-amber-700',
    cardBorder: 'hover:border-amber-300',
    isCurrency: false,
  },
  {
    key: 'totalRevenueProcessed' as const,
    label: 'Gross Volume (GMV)',
    sublabel: 'Cumulative sales processed',
    icon: TrendingUp,
    route: '/admin/withdrawals',
    badgeClass: 'bg-indigo-100 text-indigo-700',
    cardBorder: 'hover:border-indigo-300',
    isCurrency: true,
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Overview Stats State
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Treasury State
  const [treasury, setTreasury] = useState<TreasuryAnalyticsData | null>(null);
  const [isTreasuryLoading, setIsTreasuryLoading] = useState(false);
  const [treasuryPage, setTreasuryPage] = useState(1);
  const [treasuryType, setTreasuryType] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [treasuryOutcome, setTreasuryOutcome] = useState<'all' | 'profit' | 'loss'>('all');
  const [treasurySearch, setTreasurySearch] = useState('');

  // Detail Modal State
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [selectedTransferType, setSelectedTransferType] = useState<'inflow' | 'outflow' | undefined>(undefined);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fee Config State
  const [feeConfig, setFeeConfig] = useState<PlatformFeeConfig | null>(null);
  const [feeForm, setFeeForm] = useState({
    withdrawalFeePct: 1.0,
    withdrawalFeeCap: 300,
    minWithdrawalAmount: 1000,
  });
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isFeeSaving, setIsFeeSaving] = useState(false);

  // 1. Fetch Overview Stats
  const fetchOverviewStats = (showToast = false) => {
    setIsRefreshingStats(true);
    api.get('/admin/dashboard')
      .then((r) => {
        setStats(r.data.data);
        if (showToast) toast.success('Platform metrics refreshed');
      })
      .catch(() => {
        toast.error('Failed to load admin stats');
      })
      .finally(() => {
        setIsStatsLoading(false);
        setIsRefreshingStats(false);
      });
  };

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  // 2. Fetch Treasury Analytics
  const fetchTreasury = () => {
    setIsTreasuryLoading(true);
    const params = new URLSearchParams({
      page: String(treasuryPage),
      limit: '20',
      type: treasuryType,
      outcome: treasuryOutcome,
    });
    if (treasurySearch.trim()) {
      params.set('search', treasurySearch.trim());
    }

    api.get(`/admin/treasury/analytics?${params.toString()}`)
      .then((r) => setTreasury(r.data.data))
      .catch((err) => {
        toast.error(err.response?.data?.error?.message || 'Failed to fetch treasury data');
      })
      .finally(() => setIsTreasuryLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'treasury') {
      fetchTreasury();
    }
  }, [activeTab, treasuryPage, treasuryType, treasuryOutcome]);

  // 3. Fetch Fee Config
  useEffect(() => {
    if (activeTab === 'fee-settings') {
      setIsFeeLoading(true);
      api.get('/admin/settings/fees')
        .then((r) => {
          const cfg = r.data.data;
          setFeeConfig(cfg);
          setFeeForm({
            withdrawalFeePct: Number(cfg.withdrawalFeePct),
            withdrawalFeeCap: Number(cfg.withdrawalFeeCap),
            minWithdrawalAmount: Number(cfg.minWithdrawalAmount),
          });
        })
        .catch((err) => {
          toast.error(err.response?.data?.error?.message || 'Failed to load fee configuration');
        })
        .finally(() => setIsFeeLoading(false));
    }
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next);
  };

  const handleSaveFeeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFeeSaving(true);
    try {
      const res = await api.patch('/admin/settings/fees', {
        withdrawalFeePct: Number(feeForm.withdrawalFeePct),
        withdrawalFeeCap: Number(feeForm.withdrawalFeeCap),
        minWithdrawalAmount: Number(feeForm.minWithdrawalAmount),
      });
      setFeeConfig(res.data.data);
      toast.success('Platform withdrawal fee configuration saved successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update fee settings');
    } finally {
      setIsFeeSaving(false);
    }
  };

  const handleOpenDetail = (id: string, type: 'inflow' | 'outflow') => {
    setSelectedTransferId(id);
    setSelectedTransferType(type);
    setIsDetailOpen(true);
  };

  // Live simulation projections based on current form inputs
  const simulatedTiers = useMemo(() => {
    const minAmt = Math.max(100, Number(feeForm.minWithdrawalAmount) || 1000);
    const standardTiers = [5000, 10000, 50000, 100000, 250000];
    const rawAmounts = [minAmt, ...standardTiers.filter((t) => t > minAmt)];
    const amounts = Array.from(new Set(rawAmounts)).sort((a, b) => a - b);
    const pct = Number(feeForm.withdrawalFeePct) || 0;
    const cap = Number(feeForm.withdrawalFeeCap) || 0;

    return amounts.map((amt) => {
      const customerFee = Math.min((amt * pct) / 100, cap);
      const totalDebited = amt + customerFee;

      let transferFee = 50;
      if (amt <= 5000) transferFee = 10;
      else if (amt <= 50000) transferFee = 25;

      const stampDuty = amt >= 10000 ? 50 : 0;
      const totalGatewayCost = transferFee + stampDuty;
      const netMargin = customerFee - totalGatewayCost;

      return {
        amount: amt,
        customerFee,
        totalDebited,
        transferFee,
        stampDuty,
        totalGatewayCost,
        netMargin,
        isProfit: netMargin >= 0,
      };
    });
  }, [feeForm.withdrawalFeePct, feeForm.withdrawalFeeCap, feeForm.minWithdrawalAmount]);

  // Recharts visual telemetry data derived from treasury KPIs
  const treasuryVolumeChartData = useMemo(() => {
    if (!treasury?.kpis) return [];
    return [
      {
        name: 'Gross Inflows (DVA)',
        amount: treasury.kpis.totalGrossInflows,
        fill: '#3b82f6',
      },
      {
        name: 'Gross Outflows (Payouts)',
        amount: treasury.kpis.totalGrossOutflows,
        fill: '#8b5cf6',
      },
      {
        name: 'Platform Net Margin',
        amount: Math.abs(treasury.kpis.netPlatformMargin),
        fill: treasury.kpis.isProfitable ? '#10b981' : '#f43f5e',
      },
    ];
  }, [treasury]);

  const treasuryFeeWaterfallData = useMemo(() => {
    if (!treasury?.kpis) return [];
    return [
      {
        name: 'Withdrawal Fees (Revenue)',
        amount: treasury.kpis.totalWithdrawalFeesCollected,
        fill: '#10b981',
      },
      {
        name: 'DVA 1% Absorbed (Cost)',
        amount: treasury.kpis.totalInflowFeesAbsorbed,
        fill: '#f43f5e',
      },
      {
        name: 'Disbursement Cost (Cost)',
        amount: treasury.kpis.totalDisbursementCost,
        fill: '#fb7185',
      },
    ];
  }, [treasury]);

  // Full-page skeleton placeholder for zero layout shifts
  if (isStatsLoading && !stats) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton width={260} height={32} rounded="lg" />
            <Skeleton width={380} height={16} rounded="md" />
          </div>
          <Skeleton width={320} height={40} rounded="xl" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
              <Skeleton width="40%" height={14} />
              <Skeleton width="70%" height={28} />
              <Skeleton width="50%" height={12} />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <Skeleton width={180} height={20} />
          <TableSkeleton rows={5} columns={3} showHeader={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ─── HEADER & TAB SWITCHER ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
              Admin Command Center
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 border border-primary-200">
              <Activity className="h-3 w-3" /> FIRS Active
            </span>
          </div>
          <p className="mt-1.5 text-sm text-gray-500 font-body">
            Platform health telemetry, treasury unit economics (P&L), and global fee controls.
          </p>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Refresh Action */}
          <button
            onClick={() => {
              if (activeTab === 'overview') fetchOverviewStats(true);
              else if (activeTab === 'treasury') fetchTreasury();
            }}
            disabled={isRefreshingStats || isTreasuryLoading}
            aria-label="Refresh dashboard data"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-2xs disabled:opacity-50"
            title="Refresh current view"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshingStats || isTreasuryLoading ? 'animate-spin text-primary-600' : ''
              }`}
            />
          </button>

          {/* Elevated Segmented Tab Switcher */}
          <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200 shadow-2xs">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Overview
            </button>
            <button
              onClick={() => handleTabChange('treasury')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'treasury'
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              Treasury & P&L
            </button>
            <button
              onClick={() => handleTabChange('fee-settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fee-settings'
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Fee Settings
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8 animate-fade-in">
          {/* Operational SLA Notification Banner */}
          {stats.withdrawalSla && stats.withdrawalSla.pendingCount > 0 ? (
            <div
              className={`rounded-2xl p-5 border transition-all ${
                stats.withdrawalSla.breachedCount > 0
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-300/80 shadow-xs'
                  : 'bg-gradient-to-r from-primary-50 to-indigo-50/50 border-primary-200 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                      stats.withdrawalSla.breachedCount > 0
                        ? 'bg-amber-500 text-white'
                        : 'bg-primary-600 text-white'
                    }`}
                  >
                    {stats.withdrawalSla.breachedCount > 0 ? (
                      <AlertTriangle className="h-6 w-6" />
                    ) : (
                      <Wallet className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        Withdrawals Awaiting Approval: {stats.withdrawalSla.pendingCount}
                      </p>
                      {stats.withdrawalSla.breachedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-200">
                          SLA Breach ({stats.withdrawalSla.breachedCount})
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 font-body">
                      {stats.withdrawalSla.breachedCount > 0
                        ? `${stats.withdrawalSla.breachedCount} transfer(s) pending over 24 hours (oldest: ${stats.withdrawalSla.oldestPendingHours}h). Immediate review required.`
                        : 'All pending requests are within normal 24h SLA clearance time.'}
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/withdrawals?status=pending"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 shadow-xs transition-all self-start sm:self-auto shrink-0"
                >
                  Review Approval Queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-5 py-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                <span>All withdrawal queues are cleared (0 pending approvals). Platform SLA 100% compliant.</span>
              </div>
              <Link to="/admin/withdrawals" className="font-semibold text-emerald-700 hover:underline">
                View history →
              </Link>
            </div>
          )}

          {/* 4 Semantic Hero Stat Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCardsConfig.map(({ key, label, sublabel, icon: Icon, route, badgeClass, cardBorder, isCurrency }) => {
              const val = stats[key];
              return (
                <div
                  key={key}
                  onClick={() => navigate(route)}
                  className={`group relative flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs transition-all hover:shadow-md cursor-pointer ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-body">
                        {label}
                      </p>
                      <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-gray-900 tracking-tight">
                        {isCurrency ? formatNaira(val as number) : (val as number).toLocaleString()}
                      </p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-2xs transition-transform group-hover:scale-105 ${badgeClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 group-hover:text-gray-700">
                    <span className="font-body text-[11px] truncate">{sublabel}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Admin Domain Quick Command Grid */}
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-900">Operational Domains</h2>
              <p className="text-xs text-gray-500">Instant access to core administrative functions</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/admin/users"
                className="p-4 rounded-xl border border-gray-200/80 bg-white hover:border-violet-300 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Users Directory</p>
                    <p className="text-[11px] text-gray-500">{stats.totalUsers} registered users</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/businesses"
                className="p-4 rounded-xl border border-gray-200/80 bg-white hover:border-emerald-300 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Businesses</p>
                    <p className="text-[11px] text-gray-500">{stats.totalBusinesses} enterprise accounts</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/withdrawals"
                className="p-4 rounded-xl border border-gray-200/80 bg-white hover:border-amber-300 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Withdrawals & SLA</p>
                    <p className="text-[11px] text-gray-500">
                      {stats.withdrawalSla?.pendingCount || 0} pending review
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/audit-logs"
                className="p-4 rounded-xl border border-gray-200/80 bg-white hover:border-indigo-300 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Audit & Security</p>
                    <p className="text-[11px] text-gray-500">Immutable event trail</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Signups Feed */}
          <Card className="p-0 overflow-hidden border border-gray-200/80 shadow-xs">
            <div className="border-b border-gray-100 px-6 py-4.5 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Recent Signups</h2>
                <p className="text-xs text-gray-500 font-body">Latest registered accounts on the platform</p>
              </div>
              <Link
                to="/admin/users"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
              >
                View all users <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {stats.recentSignups.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No recent signups recorded.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentSignups.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs border border-primary-200/60">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.email}</p>
                        <p className="text-xs text-gray-400 font-body">
                          Registered {new Date(u.createdAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-gray-400 font-mono font-medium hidden sm:inline-block">
                        {timeAgo(u.createdAt)}
                      </span>
                      <button
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 2: TREASURY & PROFIT/LOSS ─────────────────────────── */}
      {activeTab === 'treasury' && (
        <div className="space-y-8 animate-fade-in">
          {/* Executive Balance Strip (3 Primary Cards + 3 Cost Components) */}
          {treasury?.kpis && (
            <div className="space-y-4">
              {/* Primary Balance Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* 1. Gross Inflows */}
                <Card className="p-5 bg-white border border-gray-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider font-body">
                        Gross DVA Inflows
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <ArrowDownLeft className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono text-gray-900 tracking-tight">
                      {formatNaira(treasury.kpis.totalGrossInflows)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Total merchant bank transfer deposits captured
                  </p>
                </Card>

                {/* 2. Gross Outflows */}
                <Card className="p-5 bg-white border border-gray-200/80 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider font-body">
                        Gross Outflows
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono text-gray-900 tracking-tight">
                      {formatNaira(treasury.kpis.totalGrossOutflows)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Total merchant settlement withdrawals disbursed
                  </p>
                </Card>

                {/* 3. Net Platform P&L */}
                <Card
                  className={`p-5 border-2 shadow-xs flex flex-col justify-between ${
                    treasury.kpis.isProfitable
                      ? 'border-emerald-500/50 bg-emerald-50/40'
                      : 'border-rose-500/50 bg-rose-50/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800 font-body">
                        Net Platform Margin (P&L)
                      </span>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                          treasury.kpis.isProfitable
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {treasury.kpis.isProfitable ? 'Net Profit' : 'Net Loss'}
                      </span>
                    </div>
                    <p
                      className={`mt-3 text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                        treasury.kpis.isProfitable ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {treasury.kpis.isProfitable
                        ? `+${formatNaira(treasury.kpis.netPlatformMargin)}`
                        : `−${formatNaira(Math.abs(treasury.kpis.netPlatformMargin))}`}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-gray-600 pt-2 border-t border-gray-200/60 font-medium">
                    Fees Collected − (DVA 1% Absorbed + Gateway Costs)
                  </p>
                </Card>
              </div>

              {/* Secondary Cost Breakdown Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 4. Inflow Fee Absorbed */}
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800 uppercase tracking-wide">
                      Inflow Fee Absorbed
                    </span>
                    <span className="text-[11px] font-bold text-rose-600">−1.00%</span>
                  </div>
                  <p className="mt-1 text-xl font-bold font-mono text-rose-700">
                    −{formatNaira(treasury.kpis.totalInflowFeesAbsorbed)}
                  </p>
                  <p className="mt-1 text-[11px] text-rose-600">Paystack 1% DVA cost absorbed by platform</p>
                </div>

                {/* 5. Withdrawal Fees Collected */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                      Withdrawal Fees Collected
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Revenue</span>
                  </div>
                  <p className="mt-1 text-xl font-bold font-mono text-emerald-700">
                    +{formatNaira(treasury.kpis.totalWithdrawalFeesCollected)}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-600">Customer platform fee charged on payout</p>
                </div>

                {/* 6. Disbursement Cost */}
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800 uppercase tracking-wide">
                      Disbursement Costs
                    </span>
                    <span className="text-[11px] font-bold text-rose-600">Gateway Cost</span>
                  </div>
                  <p className="mt-1 text-xl font-bold font-mono text-rose-700">
                    −{formatNaira(treasury.kpis.totalDisbursementCost)}
                  </p>
                  <p className="mt-1 text-[11px] text-rose-600">Paystack transfer schedule + ₦50 EMTL duty</p>
                </div>
              </div>
            </div>
          )}

          {/* Visual Recharts Telemetry Section */}
          {treasury?.kpis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Cashflow Volume Distribution */}
              <Card className="p-6 border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4.5 w-4.5 text-primary-600" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Cashflow Volume Breakdown</h3>
                      <p className="text-[11px] text-gray-500">Gross inflows vs Gross outflows vs Net Margin</p>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={treasuryVolumeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatNaira(Number(val)), 'Amount']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {treasuryVolumeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: Fee Economics Waterfall */}
              <Card className="p-6 border border-gray-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4.5 w-4.5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Fee Unit Economics Waterfall</h3>
                      <p className="text-[11px] text-gray-500">Revenue collected vs Gateway costs absorbed</p>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={treasuryFeeWaterfallData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `₦${Number(v).toLocaleString()}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatNaira(Number(val)), 'Amount']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {treasuryFeeWaterfallData.map((entry, index) => (
                          <Cell key={`fee-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* High-Efficiency Filter & Search Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Type:
              </span>
              {(['all', 'inflow', 'outflow'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTreasuryType(t);
                    setTreasuryPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    treasuryType === t
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                  }`}
                >
                  {t === 'all' ? 'All Transfers' : t === 'inflow' ? 'Inflows (DVA)' : 'Outflows (Payouts)'}
                </button>
              ))}

              <span className="text-xs font-bold text-gray-500 ml-2 mr-1">Outcome:</span>
              {(['all', 'profit', 'loss'] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => {
                    setTreasuryOutcome(o);
                    setTreasuryPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    treasuryOutcome === o
                      ? o === 'profit'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : o === 'loss'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                  }`}
                >
                  {o === 'all' ? 'All' : o === 'profit' ? 'Profits (+₦)' : 'Losses (−₦)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reference or business..."
                  value={treasurySearch}
                  onChange={(e) => setTreasurySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTreasury()}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-body"
                />
                {treasurySearch && (
                  <button
                    onClick={() => {
                      setTreasurySearch('');
                      setTreasuryPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setTreasuryPage(1);
                  fetchTreasury();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors shrink-0"
              >
                Apply
              </button>
            </div>
          </div>

          {/* High-Density Forensic Table */}
          <Card className="p-0 overflow-hidden border border-gray-200/80 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-body">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Date & Reference</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Merchant / Business</th>
                    <th className="px-4 py-3.5 text-right font-mono">Gross Amount</th>
                    <th className="px-4 py-3.5 text-right font-mono">Platform Fee</th>
                    <th className="px-4 py-3.5 text-right font-mono">Gateway Cost</th>
                    <th className="px-5 py-3.5 text-right font-mono">Net Margin</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isTreasuryLoading && !treasury ? (
                    <tr>
                      <td colSpan={8} className="p-6">
                        <TableSkeleton rows={6} columns={8} showHeader={false} />
                      </td>
                    </tr>
                  ) : treasury?.transfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                        <Scale className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-700">No transfer records found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
                      </td>
                    </tr>
                  ) : (
                    treasury?.transfers.map((item) => {
                      const isLoss = item.netMargin < 0;
                      const isInflow = item.type === 'inflow';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                          onClick={() => handleOpenDetail(item.id, item.type)}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-mono font-bold text-gray-900">{item.reference}</p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              {new Date(item.date).toLocaleString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </td>

                          <td className="px-4 py-3.5">
                            {isInflow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                                <ArrowDownLeft className="h-3 w-3" /> DVA Inflow
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                                <ArrowUpRight className="h-3 w-3" /> Payout
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-semibold text-gray-800">
                            {item.businessName}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                            {formatNaira(item.grossAmount)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono text-gray-600">
                            {item.feeCollected > 0 ? (
                              <span className="text-emerald-700 font-semibold">+{formatNaira(item.feeCollected)}</span>
                            ) : (
                              '₦0.00'
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right font-mono text-rose-600">
                            {item.gatewayCost > 0 ? `−${formatNaira(item.gatewayCost)}` : '₦0.00'}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-bold">
                            {isLoss ? (
                              <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-mono text-xs">
                                −{formatNaira(Math.abs(item.netMargin))}
                              </span>
                            ) : (
                              <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-mono text-xs">
                                +{formatNaira(item.netMargin)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenDetail(item.id, item.type)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-primary-200/80"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {treasury?.pagination && treasury.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-body">
                  Showing page <span className="font-semibold text-gray-800">{treasury.pagination.page}</span> of{' '}
                  <span className="font-semibold text-gray-800">{treasury.pagination.totalPages}</span> (
                  {treasury.pagination.total} records)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!treasury.pagination.hasPrev}
                    onClick={() => setTreasuryPage((p) => Math.max(p - 1, 1))}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={!treasury.pagination.hasNext}
                    onClick={() => setTreasuryPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 3: GLOBAL FEE SETTINGS ─────────────────────────────── */}
      {activeTab === 'fee-settings' && (
        <div className="space-y-8 animate-fade-in max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Configuration Form Card */}
            <Card className="p-6 border border-gray-200/80 shadow-xs">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 font-bold">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 font-sans">
                    Global Withdrawal Fee Policy
                  </h2>
                  <p className="text-xs text-gray-500 font-body">
                    Applies dynamically to all merchant disbursements across the platform.
                  </p>
                </div>
              </div>

              {isFeeLoading ? (
                <div className="py-12 space-y-4">
                  <Skeleton width="100%" height={40} rounded="lg" />
                  <Skeleton width="100%" height={40} rounded="lg" />
                  <Skeleton width="100%" height={40} rounded="lg" />
                </div>
              ) : (
                <form onSubmit={handleSaveFeeConfig} className="space-y-5 text-xs font-body">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                      Withdrawal Fee Percentage (%)
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        required
                        value={feeForm.withdrawalFeePct}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, withdrawalFeePct: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 font-mono font-medium"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        %
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Standard fee charged to merchant on withdrawal (Default: 1.00%).
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                      Maximum Fee Cap (₦)
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono">
                        ₦
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100000"
                        required
                        value={feeForm.withdrawalFeeCap}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, withdrawalFeeCap: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-xl border border-gray-300 pl-8 pr-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 font-mono font-medium"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Maximum fee collected regardless of withdrawal volume (Default: ₦300.00).
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                      Minimum Withdrawal Floor (₦)
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono">
                        ₦
                      </span>
                      <input
                        type="number"
                        step="100"
                        min="100"
                        max="1000000"
                        required
                        value={feeForm.minWithdrawalAmount}
                        onChange={(e) =>
                          setFeeForm({ ...feeForm, minWithdrawalAmount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-xl border border-gray-300 pl-8 pr-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 font-mono font-medium"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Minimum allowable withdrawal request amount (Default: ₦1,000.00).
                    </p>
                  </div>

                  {feeConfig?.updatedAt && (
                    <div className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-500 flex items-center justify-between border border-gray-200/60">
                      <span>Last policy update:</span>
                      <span className="font-mono text-gray-800 font-semibold">
                        {new Date(feeConfig.updatedAt).toLocaleString('en-NG')}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isFeeSaving}
                    className="w-full mt-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isFeeSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Saving Policy...
                      </>
                    ) : (
                      'Save & Deploy Fee Configuration'
                    )}
                  </button>
                </form>
              )}
            </Card>

            {/* Live Interactive Simulation Matrix */}
            <Card className="p-6 border border-gray-200/80 shadow-xs">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 font-sans">
                    Live Dynamic Margin Simulator
                  </h2>
                  <p className="text-xs text-gray-500 font-body">
                    Real-time projected platform revenue vs Paystack gateway fees.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-body">
                  <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Requested</th>
                      <th className="px-3 py-2.5 text-right font-mono">Cust. Fee</th>
                      <th className="px-3 py-2.5 text-right font-mono">Gateway Cost</th>
                      <th className="px-3 py-2.5 text-right font-mono">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {simulatedTiers.map((tier) => (
                      <tr key={tier.amount} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-3 font-bold font-mono text-gray-900">
                          {formatNaira(tier.amount)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-700 font-semibold">
                          +{formatNaira(tier.customerFee)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-rose-600">
                          −{formatNaira(tier.totalGatewayCost)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          {tier.isProfit ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60">
                              +{formatNaira(tier.netMargin)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/60">
                              −{formatNaira(Math.abs(tier.netMargin))}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-xl bg-blue-50/70 border border-blue-200/80 p-4 text-[11px] text-blue-900 space-y-1.5 font-body">
                <p className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" /> Paystack & Federal Cost Rules:
                </p>
                <ul className="space-y-1 pl-5 list-disc text-blue-800">
                  <li>₦10 transfer fee on amounts $\le$ ₦5,000</li>
                  <li>₦25 transfer fee on amounts ₦5,001 – ₦50,000</li>
                  <li>₦50 transfer fee on amounts &gt; ₦50,000</li>
                  <li>₦50 Federal EMTL (Electronic Money Transfer Levy) on amounts $\ge$ ₦10,000</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Forensic Transaction Detail Modal */}
      <AdminTransferDetailModal
        transferId={selectedTransferId}
        transferType={selectedTransferType}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTransferId(null);
        }}
      />
    </div>
  );
}
