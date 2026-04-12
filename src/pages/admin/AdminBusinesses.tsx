import { useEffect, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import api from '@/lib/axios.ts';
import type { AdminBusiness, Pagination } from '@/types/index.ts';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get('/admin/businesses', { params: { page, limit: 15 } })
      .then((r) => { setBusinesses(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <p className="mt-1 font-body text-sm text-gray-500">All registered businesses on the platform.</p>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      )}

      {!isLoading && businesses.length === 0 && (
        <Card className="py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-body text-sm text-gray-400">No businesses found.</p>
        </Card>
      )}

      {!isLoading && businesses.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 hidden lg:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody className="font-body text-sm">
              {businesses.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{b.businessName}</p>
                    {b.taxId && <p className="text-xs text-gray-400">TIN: {b.taxId}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.ownerName}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{b.businessType}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{[b.city, b.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{b.user.email}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {businesses.map((b) => (
            <Card key={b.id} className="p-4">
              <p className="font-medium text-gray-900">{b.businessName}</p>
              {b.taxId && <p className="text-xs text-gray-400 mt-0.5">TIN: {b.taxId}</p>}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">{b.businessType}</span>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                <p>Owner: <span className="text-gray-600">{b.ownerName}</span></p>
                <p>User: <span className="text-gray-600">{b.user.email}</span></p>
                {([b.city, b.state].filter(Boolean).join(', ')) && <p>Location: <span className="text-gray-600">{[b.city, b.state].filter(Boolean).join(', ')}</span></p>}
                <p>Registered: <span className="text-gray-600">{formatDate(b.createdAt)}</span></p>
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
