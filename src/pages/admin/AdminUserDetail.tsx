import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Mail, Phone, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import Button from '@/components/ui/Button.tsx';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { AdminUserDetail as AdminUserDetailType } from '@/types/index.ts';
import PageHeader from './shared/PageHeader';
import { Panel, PanelEmpty, PanelHeader } from './shared/Panel';
import StatusPill from './shared/StatusPill';
import { formatDate } from './shared/format';

function ProfileRow({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-2 py-1 text-xs text-ink'>
      <Icon className='h-3.5 w-3.5 shrink-0 text-ink-subtle' aria-hidden='true' />
      <span className='min-w-0 truncate'>{children}</span>
    </div>
  );
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUserDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [togglingPayout, setTogglingPayout] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleToggleUserAutoPayout = async () => {
    if (!user) return;
    setTogglingPayout(true);
    const newEnabled = !user.autoPayoutEnabled;
    try {
      await api.patch(`/admin/users/${user.id}/auto-payout`, { enabled: newEnabled });
      toast.success(`User payout mode set to ${newEnabled ? 'Automatic' : 'Manual'}`);
      setUser({
        ...user,
        autoPayoutEnabled: newEnabled,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update payout mode');
    } finally {
      setTogglingPayout(false);
    }
  };

  useEffect(() => {
    api.get(`/admin/users/${userId}`)
      .then((r) => setUser(r.data.data))
      .finally(() => setIsLoading(false));
  }, [userId]);

  const handleToggle = async () => {
    if (!user) return;
    setToggling(true);
    try {
      await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      setUser({ ...user, isActive: !user.isActive });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally { setToggling(false); }
  };

  const handleVerifyEmail = async () => {
    if (!user) return;
    setVerifying(true);
    try {
      await api.patch(`/admin/users/${user.id}/email-verification`, { isVerified: !user.isVerified });
      toast.success(`Email ${user.isVerified ? 'unverified' : 'verified'} successfully`);
      setUser({ ...user, isVerified: !user.isVerified });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update verification status');
    } finally { setVerifying(false); }
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton width={280} height={24} rounded='lg' />
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <Skeleton height={280} rounded='lg' />
          <div className='lg:col-span-2'>
            <Skeleton width='100%' height={280} rounded='lg' />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Panel>
        <PanelEmpty icon={Shield} title='User not found' hint='This account may have been deleted.' />
      </Panel>
    );
  }

  const payoutToggleClass =
    'shrink-0 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className='space-y-4'>
      <div className='flex items-start gap-2'>
        <Link
          to='/admin/users'
          aria-label='Back to users'
          className='mt-0.5 rounded p-1.5 text-ink-subtle transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none'
        >
          <ArrowLeft className='h-4 w-4' />
        </Link>
        <PageHeader
          title={user.email}
          hint='User details and associated businesses.'
          actions={
            <div className='flex items-center gap-1.5'>
              <StatusPill tone={user.isVerified ? 'success' : 'warning'}>
                {user.isVerified ? 'Verified' : 'Unverified'}
              </StatusPill>
              <StatusPill tone={user.isActive ? 'success' : 'danger'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </StatusPill>
            </div>
          }
        />
      </div>

      <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-3'>
        <Panel>
          <PanelHeader title='Profile' />
          <div className='space-y-1 px-3 py-2.5'>
            <ProfileRow icon={Mail}>{user.email}</ProfileRow>
            {user.phone && <ProfileRow icon={Phone}>{user.phone}</ProfileRow>}
            <ProfileRow icon={Shield}>
              <span className='capitalize'>{user.role}</span>
            </ProfileRow>
            <ProfileRow icon={Calendar}>Joined {formatDate(user.createdAt)}</ProfileRow>
          </div>

          <div className='border-t border-hairline px-3 py-2.5'>
            <div className='flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-[13px] font-semibold text-ink'>Payout Mode</p>
                <p className='text-[10px] text-ink-subtle'>Account-level withdrawal flow</p>
              </div>
              <div className='flex shrink-0 items-center gap-1.5'>
                <StatusPill tone={user.autoPayoutEnabled ? 'success' : 'neutral'}>
                  {user.autoPayoutEnabled ? '⚡ Automatic' : '🔒 Manual'}
                </StatusPill>
                <button
                  type='button'
                  disabled={togglingPayout}
                  onClick={handleToggleUserAutoPayout}
                  className={payoutToggleClass}
                >
                  {togglingPayout ? 'Saving…' : user.autoPayoutEnabled ? 'To Manual' : 'To Auto'}
                </button>
              </div>
            </div>
          </div>

          <div className='space-y-2 border-t border-hairline px-3 py-2.5'>
            <Button
              size='sm'
              variant={user.isActive ? 'danger' : 'primary'}
              onClick={handleToggle}
              isLoading={toggling}
              className='w-full'
            >
              {user.isActive ? 'Deactivate user' : 'Activate user'}
            </Button>
            <Button
              size='sm'
              variant={user.isVerified ? 'secondary' : 'primary'}
              onClick={handleVerifyEmail}
              isLoading={verifying}
              className='w-full'
            >
              {user.isVerified ? 'Unverify email' : 'Verify email'}
            </Button>
          </div>
        </Panel>

        <Panel className='lg:col-span-2'>
          <PanelHeader
            title={`Businesses (${user.businesses.length})`}
          />
          {user.businesses.length === 0 ? (
            <PanelEmpty icon={Building2} title='No businesses registered' />
          ) : (
            <div className='divide-y divide-hairline'>
              {user.businesses.map((b) => (
                <div key={b.id} className='flex items-center gap-3 px-3 py-2'>
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary-50 text-primary-600'>
                    <Building2 className='h-3.5 w-3.5' aria-hidden='true' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-xs font-medium text-ink'>{b.businessName}</p>
                    <p className='truncate text-[10px] text-ink-subtle'>
                      {b.businessType} · {b.ownerName} · {formatDate(b.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}