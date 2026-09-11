import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
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

const statCards = [
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'bg-gray-900 text-white' },
  { key: 'totalBusinesses' as const, label: 'Total Businesses', icon: Building2, color: 'bg-gray-900 text-white' },
  { key: 'totalTaxReports' as const, label: 'Tax Reports', icon: FileText, color: 'bg-gray-900 text-white' },
  { key: 'totalRevenueProcessed' as const, label: 'Revenue Processed', icon: TrendingUp, color: 'bg-gray-900 text-white', isCurrency: true },
];

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Overview Stats
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

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
  useEffect(() => {
    api.get('/admin/dashboard')
      .then((r) => setStats(r.data.data))
      .finally(() => setIsStatsLoading(false));
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
    const standardTiers = [5000, 10000, 50000, 100000];
    const rawAmounts = [minAmt, ...standardTiers.filter((t) => t > minAmt)];
    // Deduplicate and sort numerically
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

  if (isStatsLoading && !stats) {
    return <div className="py-20 text-center text-gray-400">Loading admin portal...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Admin Portal
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Treasury profit & loss, platform overview, and global withdrawal fee controls.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80 self-start">
          <button
            onClick={() => handleTabChange('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Overview
          </button>
          <button
            onClick={() => handleTabChange('treasury')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'treasury'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            Treasury & P&L
          </button>
          <button
            onClick={() => handleTabChange('fee-settings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'fee-settings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Fee Settings
          </button>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(({ key, label, icon: Icon, color, isCurrency }) => (
              <Card key={key} className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">
                      {isCurrency ? formatNaira(stats[key] as number) : stats[key]}
                    </p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {stats.withdrawalSla && stats.withdrawalSla.pendingCount > 0 && (
            <Link
              to="/admin/withdrawals?status=pending"
              className="block transition-transform hover:-translate-y-0.5"
            >
              <Card className={`p-5 border-l-4 ${stats.withdrawalSla.breachedCount > 0 ? 'border-l-amber-500 bg-amber-50/40' : 'border-l-primary-500'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stats.withdrawalSla.breachedCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-primary-100 text-primary-800'}`}>
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Withdrawals Awaiting Approval: {stats.withdrawalSla.pendingCount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {stats.withdrawalSla.breachedCount > 0
                          ? `${stats.withdrawalSla.breachedCount} request(s) pending > 24 hours (oldest: ${stats.withdrawalSla.oldestPendingHours}h)`
                          : 'All requests within 24h SLA target'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary-600 hover:underline">
                    Review queue →
                  </span>
                </div>
              </Card>
            </Link>
          )}

          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-gray-900">Recent Signups</h2>
            </div>
            {stats.recentSignups.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400">No recent signups.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.recentSignups.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <span className="text-sm font-medium text-gray-600">
                          {u.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo(u.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 2: TREASURY & PROFIT/LOSS ─────────────────────────── */}
      {activeTab === 'treasury' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Strip */}
          {treasury?.kpis && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Inflows</p>
                <p className="mt-1 text-xl font-bold font-mono text-gray-900">
                  {formatNaira(treasury.kpis.totalGrossInflows)}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">Total DVA deposits</p>
              </Card>

              <Card className="p-4 bg-rose-50/50 border-rose-100">
                <p className="text-xs font-medium text-rose-700 uppercase tracking-wide">Inflow Fee Absorbed</p>
                <p className="mt-1 text-xl font-bold font-mono text-rose-600">
                  −{formatNaira(treasury.kpis.totalInflowFeesAbsorbed)}
                </p>
                <p className="mt-1 text-[11px] text-rose-500">Paystack 1% DVA cost</p>
              </Card>

              <Card className="p-4 bg-white">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Outflows</p>
                <p className="mt-1 text-xl font-bold font-mono text-gray-900">
                  {formatNaira(treasury.kpis.totalGrossOutflows)}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">Merchant withdrawals</p>
              </Card>

              <Card className="p-4 bg-emerald-50/50 border-emerald-100">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Withdrawal Fees</p>
                <p className="mt-1 text-xl font-bold font-mono text-emerald-700">
                  +{formatNaira(treasury.kpis.totalWithdrawalFeesCollected)}
                </p>
                <p className="mt-1 text-[11px] text-emerald-600">Revenue collected</p>
              </Card>

              <Card className="p-4 bg-rose-50/50 border-rose-100">
                <p className="text-xs font-medium text-rose-700 uppercase tracking-wide">Disbursement Cost</p>
                <p className="mt-1 text-xl font-bold font-mono text-rose-600">
                  −{formatNaira(treasury.kpis.totalDisbursementCost)}
                </p>
                <p className="mt-1 text-[11px] text-rose-500">Transfer fees + duty</p>
              </Card>

              <Card
                className={`p-4 border-2 ${
                  treasury.kpis.isProfitable
                    ? 'border-emerald-500/40 bg-emerald-50/60'
                    : 'border-rose-500/40 bg-rose-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Net Platform P&L</p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      treasury.kpis.isProfitable
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {treasury.kpis.isProfitable ? 'Profit' : 'Loss'}
                  </span>
                </div>
                <p
                  className={`mt-1 text-xl font-black font-mono ${
                    treasury.kpis.isProfitable ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {treasury.kpis.isProfitable
                    ? `+${formatNaira(treasury.kpis.netPlatformMargin)}`
                    : `−${formatNaira(Math.abs(treasury.kpis.netPlatformMargin))}`}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">Cumulative Treasury margin</p>
              </Card>
            </div>
          )}

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Type:
              </span>
              {(['all', 'inflow', 'outflow'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTreasuryType(t);
                    setTreasuryPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    treasuryType === t
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'all' ? 'All Transfers' : t === 'inflow' ? 'Inflows (DVA)' : 'Outflows (Withdrawals)'}
                </button>
              ))}

              <span className="text-xs font-semibold text-gray-500 ml-2 mr-1">Outcome:</span>
              {(['all', 'profit', 'loss'] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => {
                    setTreasuryOutcome(o);
                    setTreasuryPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    treasuryOutcome === o
                      ? o === 'profit'
                        ? 'bg-emerald-700 text-white'
                        : o === 'loss'
                        ? 'bg-rose-700 text-white'
                        : 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {o === 'all' ? 'All' : o === 'profit' ? 'Profits (+₦)' : 'Losses (−₦)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reference or merchant..."
                  value={treasurySearch}
                  onChange={(e) => setTreasurySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTreasury()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() => {
                  setTreasuryPage(1);
                  fetchTreasury();
                }}
                className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                title="Refresh table"
              >
                <RefreshCw className={`h-4 w-4 ${isTreasuryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Unified Transfers Margin Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Date & Reference</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Merchant / Business</th>
                    <th className="px-4 py-3.5 text-right">Gross Amount</th>
                    <th className="px-4 py-3.5 text-right">Platform Fee</th>
                    <th className="px-4 py-3.5 text-right">Gateway Cost</th>
                    <th className="px-5 py-3.5 text-right">Net Margin</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isTreasuryLoading && !treasury ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                        Loading treasury records...
                      </td>
                    </tr>
                  ) : treasury?.transfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                        No transactions found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    treasury?.transfers.map((item) => {
                      const isLoss = item.netMargin < 0;
                      const isInflow = item.type === 'inflow';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() => handleOpenDetail(item.id, item.type)}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-mono font-medium text-gray-900">{item.reference}</p>
                            <p className="text-[11px] text-gray-400">
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                <ArrowDownLeft className="h-3 w-3" /> DVA Inflow
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                                <ArrowUpRight className="h-3 w-3" /> Withdrawal
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-medium text-gray-800">
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
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                                −{formatNaira(Math.abs(item.netMargin))}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                +{formatNaira(item.netMargin)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenDetail(item.id, item.type)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-primary-200"
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
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Showing page {treasury.pagination.page} of {treasury.pagination.totalPages} ({treasury.pagination.total} transfers)
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={!treasury.pagination.hasPrev}
                    onClick={() => setTreasuryPage((p) => Math.max(p - 1, 1))}
                    className="p-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={!treasury.pagination.hasNext}
                    onClick={() => setTreasuryPage((p) => p + 1)}
                    className="p-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white"
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
        <div className="space-y-6 animate-fade-in max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuration Form Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <Sliders className="h-5 w-5 text-primary-600" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Global Withdrawal Fee Policy</h2>
                  <p className="text-xs text-gray-500">
                    Applies dynamically to all merchant withdrawals across the platform.
                  </p>
                </div>
              </div>

              {isFeeLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading current configuration...</div>
              ) : (
                <form onSubmit={handleSaveFeeConfig} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Withdrawal Fee Percentage (%)
                    </label>
                    <div className="relative rounded-lg shadow-sm">
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Standard fee charged to customer on withdrawal (Default: 1.00%).
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Maximum Fee Cap (₦)
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
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
                        className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Maximum fee collected regardless of withdrawal volume (Default: ₦300.00).
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Minimum Withdrawal Floor (₦)
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
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
                        className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Minimum allowable withdrawal request amount (Default: ₦1,000.00).
                    </p>
                  </div>

                  {feeConfig?.updatedAt && (
                    <div className="rounded-lg bg-gray-50 p-2.5 text-[11px] text-gray-500 flex items-center justify-between">
                      <span>Last updated:</span>
                      <span className="font-mono text-gray-700 font-medium">
                        {new Date(feeConfig.updatedAt).toLocaleString('en-NG')}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isFeeSaving}
                    className="w-full mt-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {isFeeSaving ? 'Saving Configuration...' : 'Save Fee Configuration'}
                  </button>
                </form>
              )}
            </Card>

            {/* Live Interactive Simulation Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <Scale className="h-5 w-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Live Margin Simulator</h2>
                  <p className="text-xs text-gray-500">
                    Real-time projected platform revenue vs Paystack gateway costs.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-2 py-2">Requested</th>
                      <th className="px-2 py-2 text-right">Fee</th>
                      <th className="px-2 py-2 text-right">Cost</th>
                      <th className="px-2 py-2 text-right">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {simulatedTiers.map((tier) => (
                      <tr key={tier.amount} className="hover:bg-gray-50/50">
                        <td className="px-2 py-2.5 font-bold font-mono text-gray-900">
                          {formatNaira(tier.amount)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-emerald-700 font-semibold">
                          +{formatNaira(tier.customerFee)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-rose-600">
                          −{formatNaira(tier.totalGatewayCost)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-bold">
                          {tier.isProfit ? (
                            <span className="text-emerald-700">+{formatNaira(tier.netMargin)}</span>
                          ) : (
                            <span className="text-rose-600">−{formatNaira(Math.abs(tier.netMargin))}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-lg bg-blue-50/60 border border-blue-200/60 p-3 text-[11px] text-blue-900 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-blue-600" /> Paystack Outflow Cost Schedule:
                </p>
                <p>• ₦10 fee on transfers $\le$ ₦5,000</p>
                <p>• ₦25 fee on transfers ₦5,001 – ₦50,000</p>
                <p>• ₦50 fee on transfers &gt; ₦50,000</p>
                <p>• ₦50 Federal EMTL / Stamp Duty on transfers $\ge$ ₦10,000</p>
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
