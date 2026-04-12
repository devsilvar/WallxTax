import { useEffect, useState } from 'react';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import api from '@/lib/axios.ts';
import type { AuditLog, Pagination } from '@/types/index.ts';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function actionBadge(a: string) {
  const colors: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    login: 'bg-purple-100 text-purple-700',
  };
  const prefix = a.split('_')[0];
  const cls = colors[prefix] || 'bg-gray-100 text-gray-600';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{a}</span>;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, unknown> = { page, limit: 20 };
    if (filterAction) params.action = filterAction;
    api.get('/admin/audit-logs', { params })
      .then((r) => { setLogs(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  }, [page, filterAction]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 font-body text-sm text-gray-500">Track all platform activity.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Filter by action..."
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {pagination && <span className="font-body text-xs text-gray-400">{pagination.total} total</span>}
      </div>

      {isLoading && (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      )}

      {!isLoading && logs.length === 0 && (
        <Card className="py-12 text-center">
          <ScrollText className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-body text-sm text-gray-400">No audit logs found.</p>
        </Card>
      )}

      {!isLoading && logs.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3 hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="font-body text-sm">
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{l.user?.email || '—'}</td>
                  <td className="px-4 py-3">{actionBadge(l.action)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {l.entity}
                    {l.entityId && <span className="ml-1 font-mono text-xs text-gray-400">#{l.entityId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden lg:table-cell">{l.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {logs.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {actionBadge(l.action)}
                    <span className="text-xs text-gray-400">{formatDate(l.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-600 truncate">{l.user?.email || '—'}</p>
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    {l.entity}{l.entityId && ` #${l.entityId.slice(0, 8)}`}
                  </p>
                </div>
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
