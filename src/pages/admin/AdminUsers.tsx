import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft, ChevronRight, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { AdminUser, Pagination } from '@/types/index.ts';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = () => {
    setIsLoading(true);
    api.get('/admin/users', { params: { page, limit: 15 } })
      .then((r) => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleToggleStatus = async (u: AdminUser) => {
    setToggling(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/status`, { isActive: !u.isActive });
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally { setToggling(null); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Users</h1>
        <p className="mt-2 text-sm text-gray-500">Manage all registered users.</p>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      )}

      {!isLoading && users.length === 0 && (
        <Card className="py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm text-gray-400">No users found.</p>
        </Card>
      )}

      {!isLoading && users.length > 0 && (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Businesses</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Verified</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium capitalize ${u.role === 'admin' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">{u._count.businesses}</td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${u.isVerified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {u.isVerified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/admin/users/${u.id}`)} className="rounded-md p-2 text-gray-300 hover:bg-gray-100 hover:text-gray-700" title="View details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(u)} disabled={toggling === u.id} className={`rounded-md p-2 ${u.isActive ? 'text-gray-300 hover:bg-red-50 hover:text-red-600' : 'text-gray-300 hover:bg-green-50 hover:text-green-600'}`} title={u.isActive ? 'Deactivate' : 'Activate'}>
                          {u.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {users.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{u.email}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium capitalize ${u.role === 'admin' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Joined {formatDate(u.createdAt)} · {u._count.businesses} business{u._count.businesses !== 1 ? 'es' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => navigate(`/admin/users/${u.id}`)} className="rounded-md p-2 text-gray-300 hover:bg-gray-100 hover:text-gray-700"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => handleToggleStatus(u)} disabled={toggling === u.id} className={`rounded-md p-2 ${u.isActive ? 'text-gray-300 hover:bg-red-50 hover:text-red-600' : 'text-gray-300 hover:bg-green-50 hover:text-green-600'}`}>
                    {u.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        </>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="secondary" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
