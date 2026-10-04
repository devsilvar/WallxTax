import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { AdminUser, Pagination } from '@/types/index.ts';
import PageHeader from './shared/PageHeader';
import PaginationBar from './shared/Pagination';
import { Panel, PanelEmpty } from './shared/Panel';
import StatusPill from './shared/StatusPill';
import { formatDate } from './shared/format';

const iconButton =
  'rounded p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [togglingPayout, setTogglingPayout] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setIsLoading(true);
    api.get('/admin/users', { params: { page, limit: 15 } })
      .then((r) => { setUsers(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setIsLoading(false));
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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

  const handleToggleVerification = async (u: AdminUser) => {
    setVerifying(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/email-verification`, { isVerified: !u.isVerified });
      toast.success(`Email ${u.isVerified ? 'unverified' : 'verified'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update verification');
    } finally { setVerifying(null); }
  };

  const handleToggleAutoPayout = async (u: AdminUser) => {
    setTogglingPayout(u.id);
    const newEnabled = !u.autoPayoutEnabled;
    try {
      await api.patch(`/admin/users/${u.id}/auto-payout`, { enabled: newEnabled });
      toast.success(`User payout mode set to ${newEnabled ? 'Automatic' : 'Manual'}`);
      setUsers((prev) =>
        prev.map((usr) => (usr.id === u.id ? { ...usr, autoPayoutEnabled: newEnabled } : usr))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update payout mode');
    } finally {
      setTogglingPayout(null);
    }
  };

  return (
    <div className='space-y-4'>
      <PageHeader
        title='Users Directory'
        hint='Manage platform accounts, security clearance, and business associations.'
        actions={
          pagination && (
            <span className='text-[11px] text-ink-muted'>
              {pagination.total} registered {pagination.total === 1 ? 'account' : 'accounts'}
            </span>
          )
        }
      />

      {isLoading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : users.length === 0 ? (
        <Panel>
          <PanelEmpty icon={Users} title='No users found' hint='No user accounts are registered matching the criteria.' />
        </Panel>
      ) : (
        <Panel className='overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[760px] text-left text-xs'>
              <thead className='border-b border-hairline-strong bg-panel-subtle text-[10px] font-semibold uppercase tracking-wider text-ink-muted'>
                <tr>
                  <th scope='col' className='px-3 py-1.5'>Email</th>
                  <th scope='col' className='px-3 py-1.5'>Role</th>
                  <th scope='col' className='w-[70px] px-3 py-1.5 text-right'>Biz.</th>
                  <th scope='col' className='px-3 py-1.5'>Payout Mode</th>
                  <th scope='col' className='px-3 py-1.5'>Verified</th>
                  <th scope='col' className='px-3 py-1.5'>Status</th>
                  <th scope='col' className='px-3 py-1.5'>Joined</th>
                  <th scope='col' className='w-[110px] px-3 py-1.5 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-hairline'>
                {users.map((u) => (
                  <tr key={u.id} className='transition-colors hover:bg-panel-subtle'>
                    <td className='px-3 py-1.5'>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className='font-medium text-ink hover:text-primary-600 hover:underline focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none'
                      >
                        {u.email}
                      </Link>
                    </td>
                    <td className='px-3 py-1.5'>
                      {u.role === 'admin' ? (
                        <StatusPill tone='neutral'>Admin</StatusPill>
                      ) : (
                        <span className='text-ink-muted'>User</span>
                      )}
                    </td>
                    <td className='px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted'>
                      {u._count.businesses}
                    </td>
                    <td className='px-3 py-1.5'>
                      <div className='flex items-center gap-1.5'>
                        <StatusPill tone={u.autoPayoutEnabled ? 'success' : 'neutral'}>
                          {u.autoPayoutEnabled ? '⚡ Automatic' : '🔒 Manual'}
                        </StatusPill>
                        <button
                          type='button'
                          disabled={togglingPayout === u.id}
                          onClick={() => handleToggleAutoPayout(u)}
                          title={
                            u.autoPayoutEnabled
                              ? 'Switch user to manual withdrawal review'
                              : 'Switch user to instant automatic payouts'
                          }
                          className='text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {togglingPayout === u.id ? 'Saving…' : u.autoPayoutEnabled ? 'To Manual' : 'To Auto'}
                        </button>
                      </div>
                    </td>
                    <td className='px-3 py-1.5'>
                      <StatusPill tone={u.isVerified ? 'success' : 'warning'}>
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </StatusPill>
                    </td>
                    <td className='px-3 py-1.5'>
                      <StatusPill tone={u.isActive ? 'success' : 'danger'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </StatusPill>
                    </td>
                    <td className='px-3 py-1.5 whitespace-nowrap text-ink-muted'>{formatDate(u.createdAt)}</td>
                    <td className='px-3 py-1.5'>
                      <div className='flex items-center justify-end gap-0.5'>
                        <button
                          onClick={() => handleToggleVerification(u)}
                          disabled={verifying === u.id}
                          aria-label={u.isVerified ? 'Unverify email' : 'Verify email'}
                          title={u.isVerified ? 'Unverify email' : 'Verify email'}
                          className={`${iconButton} ${
                            u.isVerified
                              ? 'text-success-600 hover:bg-success-50'
                              : 'text-warning-600 hover:bg-warning-50'
                          } disabled:opacity-40`}
                        >
                          {u.isVerified ? <ShieldCheck className='h-3.5 w-3.5' /> : <ShieldAlert className='h-3.5 w-3.5' />}
                        </button>
                        <Link
                          to={`/admin/users/${u.id}`}
                          aria-label={`View ${u.email}`}
                          title='View details'
                          className={`${iconButton} text-ink-subtle hover:bg-panel-subtle hover:text-ink`}
                        >
                          <Eye className='h-3.5 w-3.5' />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={toggling === u.id}
                          aria-label={u.isActive ? 'Deactivate user' : 'Activate user'}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          className={`${iconButton} ${
                            u.isActive
                              ? 'text-ink-subtle hover:bg-danger-50 hover:text-danger-600'
                              : 'text-success-600 hover:bg-success-50'
                          } disabled:opacity-40`}
                        >
                          {u.isActive ? <ToggleRight className='h-3.5 w-3.5' /> : <ToggleLeft className='h-3.5 w-3.5' />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && <PaginationBar pagination={pagination} onPageChange={setPage} noun='users' />}
        </Panel>
      )}
    </div>
  );
}