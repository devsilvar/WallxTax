import { useEffect, useState } from 'react';
import { CreditCard, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { TaxPayment, Pagination } from '@/types/index.ts';

const STATUSES = ['pending', 'processing', 'completed', 'failed', 'refunded'] as const;

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function statusBadge(s: string) {
  const m: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', processing: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', refunded: 'bg-purple-100 text-purple-700' };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${m[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
}

export default function Payments() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const taxPath = biz ? `/businesses/${biz.id}/tax` : '';

  const fetchPayments = () => {
    if (!biz) return;
    setIsLoading(true);
    const params: Record<string, any> = { page, limit: 15 };
    if (filterStatus) params.status = filterStatus;
    api.get(`${taxPath}/payments`, { params })
      .then((r) => { setPayments(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchPayments(); }, [biz, page, filterStatus]);

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      await api.get(`${taxPath}/payments/${id}/verify`);
      toast.success('Payment verified');
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Verification failed');
    } finally { setVerifying(null); }
  };

  if (!biz) return <p className="py-20 text-center text-gray-400">Select a business first.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 font-body text-sm text-gray-500">View and track all tax payments.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {pagination && <span className="font-body text-xs text-gray-400">{pagination.total} total</span>}
      </div>

      {isLoading && (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      )}

      {!isLoading && payments.length === 0 && (
        <Card className="py-12 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-body text-sm text-gray-400">No payments found.</p>
        </Card>
      )}

      {!isLoading && payments.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body text-sm">
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.transactionReference}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{p.paymentMethod}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatNaira(Number(p.amountPaid))}</td>
                  <td className="px-4 py-3">{statusBadge(p.paymentStatus)}</td>
                  <td className="px-4 py-3 text-right">
                    {(p.paymentStatus === 'pending' || p.paymentStatus === 'processing') && (
                      <Button size="sm" variant="ghost" onClick={() => handleVerify(p.id)} isLoading={verifying === p.id}>
                        <RefreshCw className="h-3.5 w-3.5" /> Verify
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{formatNaira(Number(p.amountPaid))}</span>
                    {statusBadge(p.paymentStatus)}
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-gray-400 truncate">{p.transactionReference}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(p.createdAt)} · <span className="capitalize">{p.paymentMethod}</span>
                  </p>
                </div>
                {(p.paymentStatus === 'pending' || p.paymentStatus === 'processing') && (
                  <Button size="sm" variant="ghost" onClick={() => handleVerify(p.id)} isLoading={verifying === p.id} className="shrink-0">
                    <RefreshCw className="h-3.5 w-3.5" /> Verify
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
        </>
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
