import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Clock,
  Lock,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ListChecks,
} from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { TaxReport, Pagination } from '@/types/index.ts';

// Lazy-load the Analytics tab so Recharts (~150kB gz) only ships when needed.
const LazyTaxAnalytics = lazy(() => import('./TaxAnalytics.tsx'));

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatMonth(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}
function statusBadge(s: string) {
  const m: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700' };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${m[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
}

// ─── Shell ──────────────────────────────────────────────────
// Owns the header + tab switcher. Tab state is URL-backed (?tab=analytics),
// so bookmarking, back-button, and bar-click-to-jump all "just work".

type TabKey = 'reports' | 'analytics';

export default function TaxReports() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get('tab') === 'analytics' ? 'analytics' : 'reports';
  const highlight = params.get('highlight');

  const setTab = (next: TabKey) => {
    const p = new URLSearchParams(params);
    if (next === 'analytics') p.set('tab', 'analytics');
    else p.delete('tab');
    p.delete('highlight'); // manual tab change clears any drill-through highlight
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax Reports</h1>
        <p className="mt-1 font-body text-sm text-gray-500">
          Calculate, finalize, and pay your monthly tax — with a visual history view.
        </p>
      </div>

      <Tabs value={tab} onChange={setTab} />

      {tab === 'reports' ? (
        <TaxReportsList highlightedReportId={highlight} />
      ) : (
        <Suspense fallback={<ChartSkeleton />}>
          <LazyTaxAnalytics />
        </Suspense>
      )}
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────

function Tabs({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const base =
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  const active = 'bg-primary-600 text-white shadow-sm';
  const inactive = 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50';

  return (
    <div role="tablist" aria-label="Tax views" className="flex gap-2">
      <button
        role="tab"
        aria-selected={value === 'reports'}
        className={`${base} ${value === 'reports' ? active : inactive}`}
        onClick={() => onChange('reports')}
      >
        <ListChecks className="h-4 w-4" /> Reports
      </button>
      <button
        role="tab"
        aria-selected={value === 'analytics'}
        className={`${base} ${value === 'analytics' ? active : inactive}`}
        onClick={() => onChange('analytics')}
      >
        <BarChart3 className="h-4 w-4" /> Analytics
      </button>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-80 animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}

// ─── Reports List (previously the whole page) ───────────────

function TaxReportsList({ highlightedReportId }: { highlightedReportId: string | null }) {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const [reports, setReports] = useState<TaxReport[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate form
  const [showCalc, setShowCalc] = useState(false);
  const [calcMonth, setCalcMonth] = useState(String(new Date().getMonth() + 1));
  const [calcYear, setCalcYear] = useState(String(new Date().getFullYear()));
  const [calculating, setCalculating] = useState(false);

  // Warnings from calculation
  const [warnings, setWarnings] = useState<{ type: string; message: string }[]>([]);

  // Pay state
  const [paying, setPaying] = useState<string | null>(null);

  // Highlight-on-scroll: track the currently-flashing row so we can strip the
  // class after a timeout. Using a ref map lets us scroll to the element
  // directly without query-selector gymnastics.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  const taxPath = biz ? `/businesses/${biz.id}/tax` : '';

  const fetchReports = () => {
    if (!biz) return;
    setIsLoading(true);
    api.get(`${taxPath}/reports`, { params: { page, limit: 12 } })
      .then((r) => { setReports(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchReports(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [biz, page]);

  // When a report ID is passed in via `?highlight=`, scroll to it and flash
  // the ring for 2 seconds. Re-runs if the ID changes (e.g., user jumps from
  // analytics → reports → analytics → reports with a different bar).
  useEffect(() => {
    if (!highlightedReportId || isLoading) return;
    const el = cardRefs.current[highlightedReportId];
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(highlightedReportId);
    const timer = setTimeout(() => setFlashId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedReportId, reports, isLoading]);

  const handleCalculate = async (e: FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    try {
      const res = await api.post(`${taxPath}/calculate`, { month: Number(calcMonth), year: Number(calcYear) });
      toast.success('Tax calculated');
      setWarnings(res.data.warnings || []);
      setShowCalc(false); fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Calculation failed');
    } finally { setCalculating(false); }
  };

  const handleFinalize = async (id: string) => {
    try {
      await api.post(`${taxPath}/reports/${id}/finalize`);
      toast.success('Report finalized');
      fetchReports();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const handleUnfinalize = async (id: string) => {
    try {
      await api.post(`${taxPath}/reports/${id}/unfinalize`);
      toast.success('Report un-finalized');
      fetchReports();
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const handlePay = async (reportId: string) => {
    setPaying(reportId);
    try {
      const { data } = await api.post(`${taxPath}/pay`, { taxReportId: reportId });
      const url = data.data.authorizationUrl;
      if (url) {
        window.open(url, '_blank');
        toast.success('Redirecting to payment...');
      }
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Payment failed');
    } finally { setPaying(null); }
  };

  if (!biz) return <p className="py-20 text-center text-gray-400">Select a business first.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCalc(!showCalc)}><Calculator className="h-4 w-4" /> Calculate Tax</Button>
      </div>

      {showCalc && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Calculate Monthly Tax</h2>
          <form onSubmit={handleCalculate} className="flex items-end gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Month</label>
              <select value={calcMonth} onChange={(e) => setCalcMonth(e.target.value)} className="block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <Input label="Year" type="number" min="2020" max="2100" value={calcYear} onChange={(e) => setCalcYear(e.target.value)} required />
            <Button type="submit" isLoading={calculating}>Calculate</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCalc(false)}>Cancel</Button>
          </form>
        </Card>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      ) : reports.length === 0 ? (
        <Card className="py-12 text-center">
          <Calculator className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-body text-sm text-gray-400">No tax reports yet. Calculate your first tax report above.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const isFlashing = flashId === r.id;
            return (
              <div
                key={r.id}
                ref={(el) => { cardRefs.current[r.id] = el; }}
                className={`rounded-lg transition-shadow duration-500 ${isFlashing ? 'ring-2 ring-primary-400 ring-offset-2' : ''}`}
              >
                <Card>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900">{formatMonth(r.taxMonth)}</h3>
                        {statusBadge(r.paymentStatus)}
                        {r.isFinalized && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Finalized
                          </span>
                        )}
                        {r.isLocked && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600">
                            <Lock className="h-3.5 w-3.5" /> Locked
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 font-body text-sm sm:grid-cols-4">
                        <div><span className="text-gray-400">Sales</span><p className="font-medium text-gray-700">{formatNaira(Number(r.totalSales))}</p></div>
                        <div><span className="text-gray-400">Expenses</span><p className="font-medium text-gray-700">{formatNaira(Number(r.totalExpenses))}</p></div>
                        <div><span className="text-gray-400">Profit</span><p className="font-medium text-gray-700">{formatNaira(Number(r.grossProfit))}</p></div>
                        <div><span className="text-gray-400">Tax @ {Number(r.taxRate)}%</span><p className="font-bold text-gray-900">{formatNaira(Number(r.taxPayable))}</p></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!r.isLocked && !r.isFinalized && (
                        <Button size="sm" variant="secondary" onClick={() => handleFinalize(r.id)}>
                          <CheckCircle2 className="h-4 w-4" /> Finalize
                        </Button>
                      )}
                      {r.isFinalized && !r.isLocked && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleUnfinalize(r.id)}>
                            <Clock className="h-4 w-4" /> Un-finalize
                          </Button>
                          {r.paymentStatus !== 'completed' && (
                            <Button size="sm" onClick={() => handlePay(r.id)} isLoading={paying === r.id}>
                              <CreditCard className="h-4 w-4" /> Pay Now
                            </Button>
                          )}
                        </>
                      )}
                      {r.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

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
