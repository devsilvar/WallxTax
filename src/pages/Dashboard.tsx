import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CreateBusinessModal from '@/components/CreateBusinessModal.tsx';
import PinModal from '@/components/PinModal.tsx';
import DashboardSkeleton from '@/pages/Dashboard.skeleton.tsx';
import SalesExpenseChart from '@/components/dashboard/SalesExpenseChart.tsx';
import { STALE, isFresh } from '@/lib/cache.ts';


import { useDashboardEvents } from '@/stores/dashboard.store.ts';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Receipt,
  Heart,
  BarChart3,
  Activity,
  Sparkles,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CircleDollarSign,
  Plus,
  FileText,
  Zap,
  Copy,
  BadgeCheck,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';
import type { TaxReport, SalesTransaction, Expense } from '@/types/index.ts';


// ─── Merchant ID display format ─────────────────────────────
// Stored form (DB): `PMTW` + 7 digits, e.g. `PMTW0000001`.
// User-facing form: `PMT-0000001` — shorter and delimited per product ask.
// We format on display only; the stored value stays the source of truth.
function formatMerchantId(id: string | null | undefined): string {
  if (!id) return 'PMT-0000000';
  const digits = id.replace(/^PMTW/i, '').replace(/^PMT-?/i, '');
  return `PMT-${digits}`;
}

// ─── BVN masking helper ─────────────────────────────────────
// Shows: ••••••• 1234 when masked, full 11 digits when revealed
function maskBvn(bvn: string | null, revealed: boolean): string {
  if (revealed && bvn) return bvn;
  if (bvn) return `•••••••${bvn.slice(-4)}`;
  return '•••••••••••';
}

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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${labelMap[status] || 'text-gray-500 bg-gray-50 border-gray-100'}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full animate-pulse-soft ${colorMap[status] || 'bg-gray-400'}`}
      />
      {status}
    </span>
  );
}

// Time-of-day icon. We render a small inline SVG instead of an emoji so the
// glyph is consistent across OS/browsers (emoji fonts vary wildly) and we can
// theme it to the gradient banner. Five buckets: pre-dawn, sunrise, midday,
// golden hour, night.
type TimeBucket = 'predawn' | 'sunrise' | 'midday' | 'sunset' | 'night';

function getTimeBucket(hour: number): TimeBucket {
  if (hour < 5) return 'night';
  if (hour < 8) return 'sunrise';
  if (hour < 16) return 'midday';
  if (hour < 20) return 'sunset';
  return 'night';
}

function TimeOfDayIcon({ bucket, className = 'h-7 w-7' }: { bucket: TimeBucket; className?: string }) {
  // Two-stop radial gradient that varies by bucket. The orb sits on a thin
  // horizon line for sunrise / sunset, suspended for midday and night.
  const orbStops: Record<TimeBucket, [string, string]> = {
    predawn: ['#FDE68A', '#F59E0B'],
    sunrise: ['#FCD34D', '#F97316'],
    midday: ['#FEF3C7', '#FBBF24'],
    sunset: ['#FCA5A5', '#EF4444'],
    night: ['#E0E7FF', '#A78BFA'],
  };
  const [stop1, stop2] = orbStops[bucket];
  const gradId = `tod-${bucket}`;

  // Horizon visible only for sunrise / sunset.
  const showHorizon = bucket === 'sunrise' || bucket === 'sunset';
  // Stars only at night.
  const showStars = bucket === 'night';
  // Crescent cutout transforms the orb into a moon at night.
  const isMoon = bucket === 'night';

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stop1} />
          <stop offset="100%" stopColor={stop2} />
        </radialGradient>
        {/* Soft outer halo */}
        <radialGradient id={`${gradId}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stop2} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stop2} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo glow */}
      <circle cx="16" cy={showHorizon ? 18 : 15} r="13" fill={`url(#${gradId}-halo)`} />

      {/* Sun rays — only for sunrise and midday */}
      {(bucket === 'sunrise' || bucket === 'midday') && (
        <g stroke={stop2} strokeWidth="1.25" strokeLinecap="round" opacity={bucket === 'midday' ? 0.85 : 0.7}>
          <line x1="16" y1="3" x2="16" y2="6" />
          <line x1="16" y1={bucket === 'midday' ? '24' : '22'} x2="16" y2={bucket === 'midday' ? '27' : '24'} />
          <line x1="3" y1="16" x2="6" y2="16" />
          <line x1="26" y1="16" x2="29" y2="16" />
          <line x1="6.5" y1="6.5" x2="8.5" y2="8.5" />
          <line x1="23.5" y1="6.5" x2="25.5" y2="8.5" />
          <line x1="6.5" y1="25.5" x2="8.5" y2="23.5" />
          <line x1="23.5" y1="25.5" x2="25.5" y2="23.5" />
        </g>
      )}

      {/* The orb itself — sun, or moon with a crescent cutout for night */}
      {isMoon ? (
        <g>
          {/* Moon body */}
          <circle cx="16" cy="15" r="7" fill={`url(#${gradId})`} />
          {/* Crescent: a smaller circle in the banner color "bites" out the right side */}
          <circle cx="19" cy="13" r="6" fill="#1e3a8a" />
          {/* A few stars sprinkled in the corners */}
          <g fill="#FEF9C3">
            <circle cx="6" cy="6" r="0.9" />
            <circle cx="26" cy="9" r="0.7" />
            <circle cx="9" cy="11" r="0.55" />
            <circle cx="24" cy="22" r="0.6" />
          </g>
        </g>
      ) : (
        <circle
          cx="16"
          cy={showHorizon ? 16 : 15}
          r={bucket === 'midday' ? 7 : 6.25}
          fill={`url(#${gradId})`}
        />
      )}

      {/* Horizon line for sunrise / sunset — sun is partially submerged */}
      {showHorizon && (
        <g>
          <rect x="0" y="22" width="32" height="10" fill="#1e3a8a" opacity="0.0" />
          <line
            x1="3"
            y1="22"
            x2="29"
            y2="22"
            stroke={stop2}
            strokeOpacity="0.5"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />
        </g>
      )}

      {/* Stars duplicate for non-moon night case (kept above for moon) */}
      {showStars && !isMoon && (
        <g fill="#FEF9C3">
          <circle cx="5" cy="6" r="0.8" />
          <circle cx="27" cy="10" r="0.6" />
        </g>
      )}
    </svg>
  );
}

function getGreetingLabel(): string {
  const hour = new Date().getHours();
  const bucket = getTimeBucket(hour);
  if (bucket === 'sunrise' || bucket === 'midday') return hour < 12 ? 'Good morning' : 'Good afternoon';
  if (bucket === 'sunset') return 'Good evening';
  return hour < 5 ? 'Working late' : 'Good evening';
}

function getHealthScore(
  lt: DashboardData['lifetime'] | undefined,
  unpaidCount: number,
): { score: number; label: string; color: string; bg: string } {
  if (!lt)
    return {
      score: 0,
      label: 'No data',
      color: 'text-gray-400',
      bg: 'bg-gray-200',
    };
  let score = 50;
  if (lt.reportsCount > 0) score += 15;
  if (lt.totalSales > 0) score += 15;
  if (unpaidCount === 0) score += 20;
  else score -= unpaidCount * 10;
  score = Math.max(0, Math.min(100, score));
  if (score >= 80)
    return {
      score,
      label: 'Excellent',
      color: 'text-emerald-600',
      bg: 'bg-emerald-400',
    };
  if (score >= 60)
    return { score, label: 'Good', color: 'text-blue-600', bg: 'bg-blue-400' };
  if (score >= 40)
    return {
      score,
      label: 'Fair',
      color: 'text-amber-600',
      bg: 'bg-amber-400',
    };
  return {
    score,
    label: 'Needs attention',
    color: 'text-red-500',
    bg: 'bg-red-400',
  };
}

// ─── Module-level cache ─────────────────────────────────────
// One bundle of data per business. The dashboard fires 5 requests in parallel
// on mount; caching the bundle by businessId means switching businesses then
// switching back is instant. Stale-while-revalidate: serve cached frame on
// mount, refetch in background if older than STALE.short (30s).
//
// Survives navigation (Dashboard → Sales → Dashboard) but not a hard reload —
// that's fine; the cache is a nicety, not durable state.

interface DashboardBundle {
  dashboard: DashboardData;
  recentSales: SalesTransaction[];
  recentExpenses: Expense[];
  recentReports: TaxReport[];
}

interface CachedBundle {
  data: DashboardBundle;
  fetchedAt: number;
}

const dashboardCache = new Map<string, CachedBundle>();

async function fetchDashboardBundle(bid: string): Promise<DashboardBundle> {
  const [dashRes, salesRes, expensesRes, reportsRes] =
    await Promise.all([
      api.get(`/businesses/${bid}/tax/dashboard?months=6`),
      api.get(`/businesses/${bid}/sales?limit=5`),
      api.get(`/businesses/${bid}/expenses?limit=5`),
      api.get(`/businesses/${bid}/tax/reports?limit=3`),
    ]);
  return {
    dashboard: dashRes.data.data,
    recentSales: salesRes.data.data,
    recentExpenses: expensesRes.data.data,
    recentReports: reportsRes.data.data,
  };
}

// ─── Component ──────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const businessStoreLoading = useBusinessStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  // Seed from cache so the first render has data on warm visits — no spinner.
  const seed = activeBusiness ? dashboardCache.get(activeBusiness.id) : null;

  const [dashboard, setDashboard] = useState<DashboardData | null>(
    seed?.data.dashboard ?? null,
  );
  const [recentSales, setRecentSales] = useState<SalesTransaction[]>(
    seed?.data.recentSales ?? [],
  );
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>(
    seed?.data.recentExpenses ?? [],
  );
  const [recentReports, setRecentReports] = useState<TaxReport[]>(
    seed?.data.recentReports ?? [],
  );
  const [isLoading, setIsLoading] = useState(!seed);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateBiz, setShowCreateBiz] = useState(false);

  // BVN reveal state (PIN-authenticated, in-memory session only)
  const [showPinModal, setShowPinModal] = useState(false);
  const [bvnRevealed, setBvnRevealed] = useState(false);
  const [fullBvn, setFullBvn] = useState<string | null>(null);
  const [revealingBvn, setRevealingBvn] = useState(false);

  const handleRevealBvn = async (stepUpToken: string) => {
    setRevealingBvn(true);
    try {
      const res = await api.post<{ success: boolean; data: { bvn: string } }>('/auth/reveal-bvn', {
        stepUpToken,
      });
      if (res.data.success && res.data.data?.bvn) {
        setFullBvn(res.data.data.bvn);
        setBvnRevealed(true);
        toast.success('BVN revealed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reveal BVN');
    } finally {
      setRevealingBvn(false);
    }
  };

  const handleToggleBvn = () => {
    if (bvnRevealed) {
      setBvnRevealed(false);
    } else if (fullBvn) {
      setBvnRevealed(true);
    } else {
      setShowPinModal(true);
    }
  };

  // Subscribe to dashboard invalidation events

  const invalidationCounter = useDashboardEvents((s) => s.invalidationCounter);
  
  // Ref for debouncing refetch calls
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!activeBusiness) return;

    const bid = activeBusiness.id;
    let cancelled = false;

    const cached = dashboardCache.get(bid);
    const hasFresh = cached && isFresh(cached.fetchedAt, STALE.short);

    // Hydrate state from the cache for the new business id (covers business
    // switches where seed was for the previous active business).
    if (cached) {
      setDashboard(cached.data.dashboard);
      setRecentSales(cached.data.recentSales);
      setRecentExpenses(cached.data.recentExpenses);
      setRecentReports(cached.data.recentReports);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // Skip the network if we just fetched — the user is likely tab-flipping.
    if (hasFresh) return;

    // Cold load: full skeleton. Warm-but-stale: keep showing data, just hint
    // with the refreshing pill.
    if (cached) setIsRefreshing(true);

    fetchDashboardBundle(bid)
      .then((bundle) => {
        if (cancelled) return;
        dashboardCache.set(bid, { data: bundle, fetchedAt: Date.now() });
        setDashboard(bundle.dashboard);
        setRecentSales(bundle.recentSales);
        setRecentExpenses(bundle.recentExpenses);
        setRecentReports(bundle.recentReports);
      })
      .catch(() => {
        // Soft failure: keep the cached frame on screen rather than wiping
        // it. The interceptor already retries transient 5xx; a final failure
        // is surfaced by the empty data shapes if there was no cache.
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBusiness]);

  // Debounced refetch helper — prevents excessive API calls when multiple
  // mutations happen rapidly (e.g., bulk import, rapid manual entries).
  // Waits 500ms after the last invalidation before refetching.
  const debouncedRefetch = useCallback((bid: string) => {
    // Clear any pending refetch
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    
    // Schedule new refetch in 500ms
    refetchTimeoutRef.current = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log('[Dashboard] Refetching due to invalidation');
      }
      
      setIsRefreshing(true);
      fetchDashboardBundle(bid)
        .then((bundle) => {
          dashboardCache.set(bid, { data: bundle, fetchedAt: Date.now() });
          setDashboard(bundle.dashboard);
          setRecentSales(bundle.recentSales);
          setRecentExpenses(bundle.recentExpenses);
          setRecentReports(bundle.recentReports);
        })
        .catch((err) => {
          if (import.meta.env.DEV) {
            console.error('[Dashboard] Refetch failed:', err);
          }
          // Soft failure — keep showing cached data
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    }, 500);
  }, []);

  // Refetch dashboard when invalidation counter changes (data mutations)
  useEffect(() => {
    if (!activeBusiness) return;
    if (invalidationCounter === 0) return; // Skip initial mount
    
    debouncedRefetch(activeBusiness.id);
    
    // Cleanup debounce timer on unmount
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, [invalidationCounter, activeBusiness, debouncedRefetch]);

  // Wait for businesses to load first — don't show empty state before we know if any exist.
  if (businessStoreLoading) {
    return <DashboardSkeleton />;
  }

  // No active business means user has no businesses yet.
  if (!activeBusiness) {
    return (
      <div className='flex flex-col items-center justify-center py-32 animate-fade-in'>
        <div className='relative mb-8'>
          <div className='absolute inset-0 rounded-2xl bg-primary-200 blur-2xl opacity-40 animate-pulse-soft' />
          <div className='relative rounded-2xl bg-gradient-to-br from-primary-50 to-white p-8 border border-primary-100 shadow-sm animate-float'>
            <Plus className='h-10 w-10 text-primary-400' />
          </div>
        </div>
        <p className='text-xl font-bold text-gray-900'>Welcome to PayMyTax</p>
        <p className='text-sm text-gray-400 mt-2 mb-8 text-center max-w-sm'>
          Create your first business to start tracking sales, expenses, and tax
          compliance.
        </p>
        <Button onClick={() => setShowCreateBiz(true)}>Get Started</Button>
        <CreateBusinessModal
          isOpen={showCreateBiz}
          onClose={() => setShowCreateBiz(false)}
        />
      </div>
    );
  }

  // Cold load only — no cached frame to show. Once we have any data (even
  // stale), we render it and let the refreshing pill communicate freshness.
  if (isLoading && !dashboard) {
    return <DashboardSkeleton />;
  }

  const lt = dashboard?.lifetime;
  const currentMonth = dashboard?.currentMonth;
  const trends = dashboard?.trends || [];
  const health = getHealthScore(lt, dashboard?.unpaidCount ?? 0);

  const userName = user?.email?.split('@')[0] || '';
  const todBucket = getTimeBucket(new Date().getHours());

  // Calculate max sales for trend bar visualization
  const maxSales = Math.max(...trends.map((t) => Number(t.totalSales)), 1);

  // Profit margin for the current month visual
  const currentMargin = currentMonth
    ? (Number(currentMonth.grossProfit) /
        Math.max(Number(currentMonth.totalSales), 1)) *
      100
    : 0;

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className='space-y-6 relative'>
      {/* DVA Diagnostics Panel - Only in development mode */}
      {/* {import.meta.env.DEV && <DVADiagnostics />} */}
      
      {/* Refreshing pill — shown while a background revalidation is in flight.
          Cached data is already on screen; this just hints at "we're checking
          for updates" so the user knows not to panic if a number ticks. */}
      {isRefreshing && (
        <div className='pointer-events-none fixed top-4 right-4 z-40 animate-fade-in'>
          <div className='flex items-center gap-2 rounded-full border border-primary-200/70 bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm'>
            <div className='h-3 w-3 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin' />
            <span className='text-[11px] font-medium text-primary-600'>
              Refreshing…
            </span>
          </div>
        </div>
      )}

      {/* ── Welcome Header (Stunning Purple Gradient) ────── */}
      <div className='animate-slide-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-5 sm:p-6 text-white shadow-xl shadow-purple-950/20 border border-purple-800/40'>
        {/* Ambient background glow accents */}
        <div className='absolute -right-10 -top-10 h-44 w-44 rounded-full bg-purple-500/20 blur-3xl pointer-events-none' />
        <div className='absolute left-1/3 -bottom-10 h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none' />

        <div className='relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          {/* Left: Identity & Info */}
          <div className='flex items-center gap-4 min-w-0'>
            {/* Business Logo or Time-of-day avatar */}
            <div className='relative shrink-0'>
              {activeBusiness.logoUrl ? (
                <div className='h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 border-white/25 ring-2 ring-white/10 shadow-lg bg-white/10 flex items-center justify-center backdrop-blur-sm'>
                  <img
                    src={activeBusiness.logoUrl}
                    alt={`${activeBusiness.businessName} logo`}
                    className='h-full w-full object-cover'
                  />
                </div>
              ) : (
                <div className='h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-white/20 bg-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner'>
                  <TimeOfDayIcon
                    bucket={todBucket}
                    className='h-8 w-8 sm:h-9 sm:w-9 text-purple-200'
                  />
                </div>
              )}
            </div>

            <div className='min-w-0'>
              <p className='text-xs font-medium text-purple-200/90 flex items-center gap-1.5'>
                <span>{getGreetingLabel()}, {userName}</span>
              </p>
              <h1 className='mt-0.5 text-xl sm:text-2xl font-bold text-white tracking-tight truncate'>
                {activeBusiness.businessName}
              </h1>

              {/* Meta Chips Row: Merchant ID · BVN · Tax Health */}
              <div className='mt-2.5 flex flex-wrap items-center gap-2'>
                {/* Merchant ID chip */}
                <button
                  type='button'
                  onClick={() => {
                    navigator.clipboard.writeText(
                      formatMerchantId(activeBusiness.merchantId),
                    );
                    toast.success('Merchant ID copied');
                  }}
                  title='Click to copy Merchant ID'
                  className='group flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 text-xs text-white hover:bg-white/20 transition-all'
                >
                  <BadgeCheck className='h-3.5 w-3.5 text-purple-200' />
                  <span className='font-mono font-medium tabular-nums text-white'>
                    {formatMerchantId(activeBusiness.merchantId)}
                  </span>
                  <Copy className='h-3 w-3 text-purple-200/70 opacity-60 group-hover:opacity-100 transition-opacity' />
                </button>

                {/* BVN display chip */}
                {user?.bvnVerifiedAt ? (
                  <button
                    type='button'
                    onClick={handleToggleBvn}
                    disabled={revealingBvn}
                    title={bvnRevealed ? 'Click to hide BVN' : 'Click to reveal BVN (PIN required)'}
                    className='group flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 text-xs text-white hover:bg-white/20 transition-all cursor-pointer'
                  >
                    <Shield className='h-3.5 w-3.5 text-emerald-300' />
                    <span className='text-purple-200 text-[11px] font-medium'>BVN:</span>
                    <span className='font-mono font-medium tabular-nums text-white'>
                      {maskBvn(fullBvn, bvnRevealed)}
                    </span>
                    {bvnRevealed ? (
                      <EyeOff className='h-3 w-3 text-purple-200/70 group-hover:text-white transition-colors' />
                    ) : (
                      <Eye className='h-3 w-3 text-purple-200/70 group-hover:text-white transition-colors' />
                    )}
                  </button>
                ) : (
                  <Link
                    to='/account'
                    className='flex items-center gap-1.5 rounded-full bg-amber-400/15 backdrop-blur-md border border-amber-300/30 px-3 py-1 text-xs text-amber-200 hover:bg-amber-400/25 transition-all'
                    title='Verify your identity'
                  >
                    <Shield className='h-3.5 w-3.5 text-amber-300' />
                    <span className='font-medium text-[11px]'>BVN Unverified</span>
                  </Link>
                )}

                {/* Tax Health chip */}
                <div className='flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 text-xs text-white'>
                  <Heart className='h-3.5 w-3.5 text-pink-300' />
                  <span className='text-[11px] text-purple-200 font-medium'>Tax Health:</span>
                  <div className='w-14 h-1.5 rounded-full bg-white/20 overflow-hidden'>
                    <div
                      className={`h-full rounded-full ${health.bg} transition-all duration-1000`}
                      style={{ width: `${health.score}%` }}
                    />
                  </div>
                  <span className='font-bold text-white text-[11px] tabular-nums'>
                    {health.score}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className='flex items-center gap-2 self-start sm:self-auto shrink-0'>
            <Link to='/sales'>
              <button
                type='button'
                className='flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]'
              >
                <Plus className='h-3.5 w-3.5' /> Add Sale
              </button>
            </Link>
            <Link to='/tax'>
              <button
                type='button'
                className='flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-purple-950 hover:bg-purple-50 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]'
              >
                <FileText className='h-3.5 w-3.5 text-purple-700' /> Tax Reports
              </button>
            </Link>
          </div>
        </div>
      </div>



      {/* ── Alert: Unpaid Reports (Compact) ───────── */}
      {(dashboard?.unpaidCount ?? 0) > 0 && (
        <div className='animate-scale-in flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50 border border-amber-200/50 px-4 py-2.5 hover:border-amber-300/80 transition-colors duration-200'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-6 w-6 items-center justify-center rounded-md bg-amber-100/80'>
              <AlertCircle className='h-3.5 w-3.5 text-amber-600' />
            </div>
            <p className='text-xs text-amber-800 font-medium'>
              <span className='font-bold'>{dashboard!.unpaidCount}</span> unpaid
              report{dashboard!.unpaidCount > 1 ? 's' : ''} awaiting payment
            </p>
          </div>
          <Link
            to='/tax'
            className='group text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors'
          >
            Pay now{' '}
            <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-0.5' />
          </Link>
        </div>
      )}

      {/* ── Tax & Compliance Metrics ──────────────────────── */}
      <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-children'>
        <div className='rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-gray-300 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-gray-500'>Total Tax Payable</span>
            <CircleDollarSign className='h-4 w-4 text-gray-400' />
          </div>
          <p className='mt-2 text-lg sm:text-xl font-bold text-gray-900 tabular-nums'>
            {formatNaira(lt?.totalTaxPayable ?? 0)}
          </p>
          <p className='mt-1 text-[11px] text-gray-400 font-body'>Across all filed periods</p>
        </div>

        <div className='rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-gray-300 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-gray-500'>This Month's Tax</span>
            <Receipt className='h-4 w-4 text-gray-400' />
          </div>
          <p className='mt-2 text-lg sm:text-xl font-bold text-gray-900 tabular-nums'>
            {formatNaira(currentMonth?.taxPayable ?? 0)}
          </p>
          <div className='mt-1 flex items-center justify-between text-[11px]'>
            <span className='text-gray-400 font-body'>
              {currentMonth ? 'Current calculation' : 'Not calculated'}
            </span>
            <Link
              to='/tax'
              className='text-primary-600 font-semibold hover:text-primary-700'
            >
              View &rarr;
            </Link>
          </div>
        </div>

        <div className='rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-gray-300 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-gray-500'>Reports Filed</span>
            <CheckCircle2 className='h-4 w-4 text-gray-400' />
          </div>
          <p className='mt-2 text-lg sm:text-xl font-bold text-gray-900 tabular-nums'>
            {String(lt?.reportsCount ?? 0)}
          </p>
          <p className='mt-1 text-[11px] text-gray-400 font-body'>FIRS compliant reports</p>
        </div>

        <div className='rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-gray-300 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-gray-500'>Tax Standard</span>
            <Shield className='h-4 w-4 text-gray-400' />
          </div>
          <p className='mt-2 text-lg sm:text-xl font-bold text-gray-900'>
            7.5% <span className='text-xs font-normal text-gray-500'>Gross Profit</span>
          </p>
          <p className='mt-1 text-[11px] text-gray-400 font-body'>FIRS VAT standard</p>
        </div>
      </div>

      {/* ── Financial Overview & Cashflow Trends ─────── */}
      <SalesExpenseChart className='stagger-children' />


      {/* ── Current Month + Trends ──────────────────── */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-5 stagger-children'>
        {/* Current Month */}
        <div className='lg:col-span-2 rounded-xl border border-gray-200/80 bg-white shadow-xs hover:border-gray-300 transition-all duration-200'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft' />
              <h2 className='text-sm font-semibold text-gray-900'>
                {t('kpis.this_month')}
              </h2>
            </div>
            {currentMonth && statusDot(currentMonth.paymentStatus)}
          </div>
          {currentMonth ? (
            <div className='px-5 py-4 space-y-3'>
              {/* Mini profit margin ring */}
              <div className='flex items-center justify-center pb-2'>
                <div className='relative h-18 w-18'>
                  <svg className='h-18 w-18 -rotate-90' viewBox='0 0 80 80'>
                    <circle
                      cx='40'
                      cy='40'
                      r='34'
                      fill='none'
                      stroke='#f1f5f9'
                      strokeWidth='6'
                    />
                    <circle
                      cx='40'
                      cy='40'
                      r='34'
                      fill='none'
                      stroke={currentMargin >= 20 ? '#10b981' : '#f59e0b'}
                      strokeWidth='6'
                      strokeLinecap='round'
                      strokeDasharray={`${Math.min((currentMargin / 100) * 213.6, 213.6)} 213.6`}
                      className='transition-all duration-1000'
                    />
                  </svg>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <span className='text-sm font-bold text-gray-900 tabular-nums'>
                      {currentMargin.toFixed(0)}%
                    </span>
                    <span className='text-[9px] text-gray-400 font-medium uppercase tracking-wide'>
                      Margin
                    </span>
                  </div>
                </div>
              </div>

              <div className='space-y-2 border-t border-gray-100 pt-3'>
                <MetricRow
                  label='Sales'
                  value={formatNaira(Number(currentMonth.totalSales))}
                  icon={<ArrowUpRight className='h-3.5 w-3.5 text-emerald-500' />}
                />
                <MetricRow
                  label='Expenses'
                  value={formatNaira(Number(currentMonth.totalExpenses))}
                  icon={<ArrowDownRight className='h-3.5 w-3.5 text-amber-500' />}
                />
                <MetricRow
                  label={t('kpis.gross_profit')}
                  value={formatNaira(Number(currentMonth.grossProfit))}
                  icon={<TrendingUp className='h-3.5 w-3.5 text-indigo-500' />}
                />
              </div>

              <div className='border-t border-gray-100 pt-3'>
                <MetricRow
                  label={`Tax @ ${Number(currentMonth.taxRate)}%`}
                  value={formatNaira(Number(currentMonth.taxPayable))}
                  icon={<CircleDollarSign className='h-3.5 w-3.5 text-rose-500' />}
                  bold
                />
              </div>

              <div className='flex flex-wrap items-center gap-2 pt-2'>
                {currentMonth.isFinalized ? (
                  <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5 border border-emerald-100'>
                    <CheckCircle2 className='h-3 w-3' /> Finalized
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 rounded-full px-2.5 py-0.5 border border-gray-200'>
                    <Clock className='h-3 w-3' /> Draft
                  </span>
                )}
                {currentMonth.isLocked && (
                  <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-full px-2.5 py-0.5 border border-blue-100'>
                    <CreditCard className='h-3 w-3' /> Paid
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className='px-5 py-8 text-center'>
              <Sparkles className='mx-auto h-6 w-6 text-gray-300' />
              <p className='mt-2 text-sm font-medium text-gray-600'>
                No report for this month yet
              </p>
              <p className='text-xs text-gray-400 mt-1 font-body'>
                Calculate your tax to see live metrics here
              </p>
              <Link to='/tax' className='mt-4 inline-block'>
                <Button size='sm' variant='secondary' className='text-xs rounded-lg'>
                  Calculate Tax
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Monthly Trends */}
        <div className='lg:col-span-3 rounded-xl border border-gray-200/80 bg-white shadow-xs hover:border-gray-300 transition-all duration-200'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <BarChart3 className='h-4 w-4 text-gray-500 stroke-[2]' />
              <h2 className='text-sm font-semibold text-gray-900'>
                Monthly Trends
              </h2>
            </div>
            <span className='text-[11px] text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5 border border-gray-150 hidden sm:inline-flex'>
              Last 6 months
            </span>
          </div>
          {trends.length > 0 ? (
            <div className='px-5 py-3 overflow-x-auto'>
              <div className='min-w-[480px]'>
                <table className='w-full'>
                  <thead>
                    <tr className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50'>
                      <th className='pb-2.5 text-left'>Month</th>
                      <th className='pb-2.5 text-left pl-3' style={{ width: '30%' }}>
                        Sales
                      </th>
                      <th className='pb-2.5 text-right'>Tax</th>
                      <th className='pb-2.5 text-right'>Margin</th>
                      <th className='pb-2.5 text-right'>Status</th>
                    </tr>
                  </thead>
                  <tbody className='text-xs'>
                    {trends
                      .slice()
                      .reverse()
                      .map((t, i) => {
                        const barWidth = Math.max(
                          (Number(t.totalSales) / maxSales) * 100,
                          4,
                        );
                        return (
                          <tr
                            key={t.taxMonth}
                            className={`group hover:bg-gray-50/60 transition-colors ${
                              i > 0 ? 'border-t border-gray-50' : ''
                            }`}
                          >
                            <td className='py-2.5 text-gray-800 font-medium whitespace-nowrap'>
                              {formatMonth(t.taxMonth)}
                            </td>
                            <td className='py-2.5 pl-3'>
                              <div className='flex items-center gap-2'>
                                <div className='flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden'>
                                  <div
                                    className='h-full rounded-full bg-emerald-500 transition-all duration-500'
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                                <span className='text-gray-500 tabular-nums text-[11px] shrink-0'>
                                  {formatNaira(Number(t.totalSales))}
                                </span>
                              </div>
                            </td>
                            <td className='py-2.5 text-right text-gray-600 tabular-nums'>
                              {formatNaira(Number(t.taxPayable))}
                            </td>
                            <td className='py-2.5 text-right'>
                              <span
                                className={`tabular-nums font-semibold ${
                                  Number(t.profitMargin) >= 40
                                    ? 'text-emerald-600'
                                    : Number(t.profitMargin) >= 20
                                    ? 'text-amber-600'
                                    : 'text-rose-500'
                                }`}
                              >
                                {Number(t.profitMargin).toFixed(1)}%
                              </span>
                            </td>
                            <td className='py-2.5 text-right'>
                              {statusDot(t.paymentStatus)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className='px-5 py-8 text-center'>
              <Activity className='mx-auto h-6 w-6 text-gray-300' />
              <p className='mt-2 text-sm font-medium text-gray-600'>No trend data yet</p>
              <p className='text-xs text-gray-400 mt-1 font-body'>
                Your monthly overview will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Sales + Expenses ─────────────────── */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 stagger-children'>
        {/* Recent Sales */}
        <div className='rounded-xl border border-gray-200/80 bg-white shadow-xs hover:border-gray-300 transition-all duration-200'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <Receipt className='h-4 w-4 text-gray-500 stroke-[2]' />
              <h2 className='text-sm font-semibold text-gray-900'>
                Recent Sales
              </h2>
            </div>
            <Link
              to='/sales'
              className='group text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors'
            >
              View all{' '}
              <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-0.5' />
            </Link>
          </div>
          {recentSales.length > 0 ? (
            <div className='px-5 py-2 divide-y divide-gray-50'>
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className='flex items-center justify-between py-2.5 hover:bg-gray-50/50 -mx-2 px-2 rounded-md transition-colors'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-gray-500 shrink-0'>
                      <Receipt className='h-3.5 w-3.5' />
                    </div>
                    <div className='min-w-0'>
                      <p className='text-xs font-medium text-gray-800 truncate'>
                        {sale.description || sale.source.replace(/_/g, ' ')}
                      </p>
                      <p className='text-[10px] text-gray-400'>
                        {formatDate(sale.transactionDate)}
                      </p>
                    </div>
                  </div>
                  <p className='text-xs font-semibold text-emerald-600 shrink-0 ml-3 tabular-nums'>
                    +{formatNaira(Number(sale.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className='px-5 py-8'>
              <EmptyMini
                icon={Receipt}
                message='No sales recorded yet'
                subMessage='Start tracking your income'
                linkTo='/sales'
                linkLabel='Add Sale'
              />
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className='rounded-xl border border-gray-200/80 bg-white shadow-xs hover:border-gray-300 transition-all duration-200'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <Wallet className='h-4 w-4 text-gray-500 stroke-[2]' />
              <h2 className='text-sm font-semibold text-gray-900'>
                Recent Expenses
              </h2>
            </div>
            <Link
              to='/expenses'
              className='group text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors'
            >
              View all{' '}
              <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-0.5' />
            </Link>
          </div>
          {recentExpenses.length > 0 ? (
            <div className='px-5 py-2 divide-y divide-gray-50'>
              {recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className='flex items-center justify-between py-2.5 hover:bg-gray-50/50 -mx-2 px-2 rounded-md transition-colors'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-gray-500 shrink-0'>
                      <Wallet className='h-3.5 w-3.5' />
                    </div>
                    <div className='min-w-0'>
                      <p className='text-xs font-medium text-gray-800 truncate'>
                        {exp.description || exp.category.replace(/_/g, ' ')}
                      </p>
                      <p className='text-[10px] text-gray-400'>
                        <span className='capitalize'>{exp.category}</span> · {formatDate(exp.expenseDate)}
                      </p>
                    </div>
                  </div>
                  <p className='text-xs font-semibold text-red-500 shrink-0 ml-3 tabular-nums'>
                    -{formatNaira(Number(exp.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className='px-5 py-8'>
              <EmptyMini
                icon={Wallet}
                message='No expenses recorded yet'
                subMessage='Track your business spending'
                linkTo='/expenses'
                linkLabel='Add Expense'
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Tax Reports ──────────────────────── */}
      {recentReports.length > 0 && (
        <div className='rounded-xl border border-gray-200/80 bg-white shadow-xs hover:border-gray-300 transition-all duration-200'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <div className='flex items-center gap-2'>
              <FileText className='h-4 w-4 text-gray-500 stroke-[2]' />
              <h2 className='text-sm font-semibold text-gray-900'>
                Recent Reports
              </h2>
            </div>
            <Link
              to='/tax'
              className='group text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors'
            >
              View all{' '}
              <ArrowRight className='h-3 w-3 transition-transform group-hover:translate-x-0.5' />
            </Link>
          </div>
          <div className='px-5 py-3 overflow-x-auto'>
            <div className='min-w-[480px]'>
              <table className='w-full'>
                <thead>
                  <tr className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50'>
                    <th className='pb-2.5 text-left'>Period</th>
                    <th className='pb-2.5 text-right'>Sales</th>
                    <th className='pb-2.5 text-right'>Expenses</th>
                    <th className='pb-2.5 text-right'>Tax Due</th>
                    <th className='pb-2.5 text-right'>Status</th>
                  </tr>
                </thead>
                <tbody className='text-xs'>
                  {recentReports.map((report, i) => (
                    <tr
                      key={report.id}
                      className={`group hover:bg-gray-50/60 transition-colors ${
                        i > 0 ? 'border-t border-gray-50' : ''
                      }`}
                    >
                      <td className='py-2.5 text-gray-800 font-medium'>
                        <div className='flex items-center gap-1.5'>
                          {formatMonth(report.taxMonth)}
                          {report.isFinalized && (
                            <CheckCircle2 className='h-3 w-3 text-emerald-500' />
                          )}
                        </div>
                      </td>
                      <td className='py-2.5 text-right text-gray-500 tabular-nums'>
                        {formatNaira(Number(report.totalSales))}
                      </td>
                      <td className='py-2.5 text-right text-gray-500 tabular-nums'>
                        {formatNaira(Number(report.totalExpenses))}
                      </td>
                      <td className='py-2.5 text-right font-semibold text-gray-900 tabular-nums'>
                        {formatNaira(Number(report.taxPayable))}
                      </td>
                      <td className='py-2.5 text-right'>
                        {statusDot(report.paymentStatus)}
                      </td>
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
        <div className='flex items-center justify-center gap-3 py-3'>
          <div className='h-px flex-1 bg-gray-100' />
          <div className='flex items-center gap-1.5 text-gray-400'>
            <Zap className='h-3 w-3 text-gray-300' />
            <p className='text-[11px] font-medium whitespace-nowrap'>
              {dashboard.taxConfig.authority} · {dashboard.taxConfig.currentRate}% · {dashboard.taxConfig.currency}
            </p>
          </div>
          <div className='h-px flex-1 bg-gray-100' />
        </div>
      )}

      {/* ── BVN Reveal PIN Modal ───────────────────────── */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleRevealBvn}
        title="Reveal BVN"
        subtitle="Enter your 4-digit transaction PIN to view your full BVN."
      />
    </div>
  );
}


// ─── Sub-components ─────────────────────────────────────────

function MetricRow({

  label,
  value,
  icon,
  bold,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className='flex items-center justify-between group'>
      <div className='flex items-center gap-2.5'>
        <span className='transition-transform duration-200 group-hover:scale-110'>
          {icon}
        </span>
        <span className='text-[13px] text-gray-500'>{label}</span>
      </div>
      <span
        className={`text-[13px] tabular-nums ${bold ? 'font-bold text-gray-900 text-[14px]' : 'font-medium text-gray-600'}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyMini({
  icon: Icon,
  message,
  subMessage,
  linkTo,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  subMessage?: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <div className='rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 py-8 text-center border border-gray-100/50'>
      <Icon className='mx-auto h-7 w-7 text-gray-300 animate-float' />
      <p className='mt-3 text-sm text-gray-400'>{message}</p>
      {subMessage && (
        <p className='text-[11px] text-gray-300 mt-1'>{subMessage}</p>
      )}
      <Link to={linkTo} className='mt-3 inline-block'>
        <Button
          size='sm'
          variant='secondary'
          className='text-[13px] rounded-lg'
        >
          {linkLabel}
        </Button>
      </Link>
    </div>
  );
}
