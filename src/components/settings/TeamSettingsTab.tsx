import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeamStore } from '@/stores/team.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import type {
  BusinessRole,
  BusinessMember,
  TeamInvitation,
  PermissionKey,
} from '@/types/index.ts';

// ── Role Definitions & Descriptions ─────────────────────────

const ROLE_INFO: Record<
  Exclude<BusinessRole, 'owner'>,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    desc: string;
    capabilities: string[];
  }
> = {
  manager: {
    label: 'Manager',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    desc: 'Full operational access. Can manage sales, expenses, invoices, tax calculations, and team members.',
    capabilities: [
      'Record sales & manage invoices',
      'Record & categorize expenses',
      'Calculate NRS tax liability',
      'Invite & manage staff and accountants',
    ],
  },
  sales_staff: {
    label: 'Sales Staff',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: 'Counter sales & invoicing. Only sees their own recorded sales and counter bank transfers.',
    capabilities: [
      'Record new cash & counter sales',
      'Create and issue invoices',
      'Confirm customer bank transfer payments',
      'Row-scoped: cannot see company-wide expenses',
    ],
  },
  accountant: {
    label: 'Accountant',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: 'Bookkeeping & tax calculations. Manages expenses, reconciles debtors, and downloads tax statements.',
    capabilities: [
      'Log allowable business expenses',
      'Reconcile invoices and debtor payments',
      'Calculate monthly NRS tax reports',
      'Download audit-ready statements and slips',
    ],
  },
  viewer: {
    label: 'Viewer',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    desc: 'Read-only access for external auditors, investors, or silent partners.',
    capabilities: [
      'View sales & expense analytics',
      'View debtor summaries and history',
      'Download statements and tax slips',
      'Cannot record, edit, or delete any transactions',
    ],
  },
};

const OVERRIDABLE_PERMS: Array<{
  key: PermissionKey;
  label: string;
  category: string;
}> = [
  // Sales
  { key: 'sales.read', label: 'View sales transactions', category: 'Sales' },
  { key: 'sales.create', label: 'Create sales', category: 'Sales' },
  { key: 'sales.update', label: 'Edit sales', category: 'Sales' },
  { key: 'sales.delete', label: 'Delete sales', category: 'Sales' },
  { key: 'sales.import', label: 'Bulk import sales', category: 'Sales' },
  // Expenses
  { key: 'expenses.read', label: 'View business expenses', category: 'Expenses' },
  { key: 'expenses.create', label: 'Log expenses', category: 'Expenses' },
  { key: 'expenses.update', label: 'Edit expenses', category: 'Expenses' },
  { key: 'expenses.delete', label: 'Delete expenses', category: 'Expenses' },
  // Invoices
  { key: 'invoices.read', label: 'View customer invoices', category: 'Invoices' },
  { key: 'invoices.create', label: 'Create invoices', category: 'Invoices' },
  { key: 'invoices.send', label: 'Send invoices', category: 'Invoices' },
  { key: 'invoices.mark_paid', label: 'Mark invoices paid', category: 'Invoices' },
  // Debtors
  { key: 'debtors.read', label: 'View debtors & credits', category: 'Debtors' },
  { key: 'debtors.manage', label: 'Manage debtors & credit', category: 'Debtors' },
  // Tax
  { key: 'tax.read', label: 'View tax reports & analytics', category: 'Tax' },
  { key: 'tax.calculate', label: 'Calculate taxes', category: 'Tax' },
  { key: 'tax.finalize', label: 'Finalize tax reports', category: 'Tax' },
  // Payments & Banking
  { key: 'payments.read', label: 'View payment history', category: 'Payments' },
  { key: 'wallet.read', label: 'View wallet balance & history', category: 'Wallet' },
  // Overview, Settings & Admin
  { key: 'dashboard.read', label: 'View dashboard overview', category: 'Overview' },
  { key: 'settings.read', label: 'View business settings', category: 'Settings' },
  { key: 'team.manage', label: 'Manage team members & invitations', category: 'Team' },
  { key: 'statements.download', label: 'Download tax slips & statements', category: 'Reports' },
  { key: 'reminders.read', label: 'View compliance reminders', category: 'Reminders' },
  { key: 'ai.use', label: 'Use AI tax advisor', category: 'AI' },
];

const WRITE_IMPLIES_READ_CLIENT: Record<string, string[]> = {
  'sales.read': ['sales.create', 'sales.update', 'sales.delete', 'sales.import'],
  'expenses.read': ['expenses.create', 'expenses.update', 'expenses.delete'],
  'invoices.read': ['invoices.create', 'invoices.send', 'invoices.mark_paid'],
  'debtors.read': ['debtors.manage'],
  'tax.read': ['tax.calculate', 'tax.finalize'],
};

function isPermImplied(permMap: Record<string, boolean>, key: string): boolean {
  const writers = WRITE_IMPLIES_READ_CLIENT[key];
  return Boolean(writers && writers.some((w) => permMap[w] === true));
}

function updatePermWithImplications(
  permMap: Record<string, boolean>,
  key: string,
  checked: boolean
): Record<string, boolean> {
  const next = { ...permMap, [key]: checked };
  for (const [readKey, writeKeys] of Object.entries(WRITE_IMPLIES_READ_CLIENT)) {
    if (writeKeys.includes(key) && checked) {
      next[readKey] = true;
    }
  }
  return next;
}

export default function TeamSettingsTab() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);
  const user = useAuthStore((s) => s.user);

  const {
    members,
    pendingInvitations,
    cap,
    fetchTeam,
    fetchRoleDefaults,
    roleDefaults,
    inviteMember,
    updateMember,
    removeMember,
    revokeInvitation,
    resendInvitation,
  } = useTeamStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BusinessMember | null>(
    null,
  );
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] =
    useState<Exclude<BusinessRole, 'owner'>>('sales_staff');
  const [showCustomPerms, setShowCustomPerms] = useState(false);
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit member modal state
  const [editRole, setEditRole] = useState<BusinessRole>('sales_staff');
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({});

  const myRole =
    activeBusiness?.myRole ||
    (activeBusiness?.userId === user?.id ? 'owner' : 'viewer');
  const isOwner = myRole === 'owner';
  const canManageTeam = isOwner || myRole === 'manager';

  const getRoleDefaultsFor = useCallback(
    (role: string): Record<string, boolean> => {
      if (role === 'owner') return {};
      return roleDefaults?.[role] || {};
    },
    [roleDefaults]
  );

  useEffect(() => {
    if (activeBusiness?.id) {
      fetchTeam(activeBusiness.id);
      fetchRoleDefaults(activeBusiness.id);
    }
  }, [activeBusiness?.id, fetchTeam, fetchRoleDefaults]);

  const handleOpenInvite = () => {
    setInviteEmail('');
    setInviteRole('sales_staff');
    setShowCustomPerms(false);
    setCustomPerms({ ...getRoleDefaultsFor('sales_staff') });
    setShowInviteModal(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const overrides: Record<string, boolean> = {};
      const defaults = getRoleDefaultsFor(inviteRole);
      for (const { key } of OVERRIDABLE_PERMS) {
        if (
          typeof customPerms[key] === 'boolean' &&
          customPerms[key] !== defaults[key]
        ) {
          overrides[key] = customPerms[key];
        }
      }

      const payload: any = {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      };
      if (Object.keys(overrides).length > 0) {
        payload.permissions = overrides;
      }
      await inviteMember(activeBusiness.id, payload);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to send invitation',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (member: BusinessMember) => {
    setSelectedMember(member);
    setEditRole(member.role);
    const defaults = getRoleDefaultsFor(member.role);
    const memberPerms = (member.permissions as Record<string, any>) || {};
    const resolved: Record<string, boolean> = { ...defaults };
    for (const { key } of OVERRIDABLE_PERMS) {
      if (typeof memberPerms[key] === 'boolean') {
        resolved[key] = memberPerms[key];
      }
    }
    setEditPerms(resolved);
  };

  const handleSaveMember = async () => {
    if (!activeBusiness?.id || !selectedMember) return;
    setIsSubmitting(true);
    try {
      const overrides: Record<string, boolean> = {};
      const defaults =
        editRole !== 'owner'
          ? getRoleDefaultsFor(editRole)
          : {};
      for (const { key } of OVERRIDABLE_PERMS) {
        if (
          typeof editPerms[key] === 'boolean' &&
          editPerms[key] !== defaults[key]
        ) {
          overrides[key] = editPerms[key];
        }
      }

      await updateMember(activeBusiness.id, selectedMember.id, {
        role: editRole,
        permissions: Object.keys(overrides).length > 0 ? overrides : {},
      });
      toast.success('Member role and permissions updated');
      setSelectedMember(null);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to update member',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: BusinessMember) => {
    if (!activeBusiness?.id) return;
    if (
      !confirm(
        `Are you sure you want to remove ${member.user.email} from the team?`,
      )
    )
      return;

    try {
      await removeMember(activeBusiness.id, member.id);
      toast.success('Team member removed');
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to remove member',
      );
    }
  };

  const handleResendInvite = async (inv: TeamInvitation) => {
    if (!activeBusiness?.id) return;
    setResendingId(inv.id);
    try {
      await resendInvitation(activeBusiness.id, inv.id);
      toast.success(`Invitation resent to ${inv.email}`);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to resend invitation',
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeInvite = async (inv: TeamInvitation) => {
    if (!activeBusiness?.id) return;
    if (!confirm(`Revoke invitation for ${inv.email}?`)) return;

    try {
      await revokeInvitation(activeBusiness.id, inv.id);
      toast.success('Invitation revoked');
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to revoke invitation',
      );
    }
  };

  const handleSelfLeave = async () => {
    if (!activeBusiness?.id) return;
    const myMembership = members.find((m) => m.userId === user?.id);
    if (!myMembership) return;

    try {
      await removeMember(activeBusiness.id, myMembership.id);
      toast.success('You have left the business team');
      setShowLeaveModal(false);
      await fetchBusinesses(true);
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to leave business',
      );
    }
  };

  const activeInvitedCount =
    cap?.activeInvitedCount ?? members.filter((m) => m.role !== 'owner').length;
  const pendingCount = cap?.pendingCount ?? pendingInvitations.length;
  const remainingSlots =
    cap?.remainingSlots ?? Math.max(0, 3 - activeInvitedCount - pendingCount);

  return (
    <div className='space-y-6'>
      {/* ── Top Summary & Invite Action Card ── */}
      <div className='bg-white rounded-2xl border border-gray-100 p-6 shadow-sm'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg font-bold text-gray-900'>Team & Roles</h2>
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100'>
                {activeInvitedCount} of 3 Seats Used
              </span>
            </div>
            <p className='text-sm text-gray-500 mt-1'>
              Invite up to 3 staff members, managers, or accountants to
              collaborate on {activeBusiness?.businessName}.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            {!isOwner && (
              <button
                onClick={() => setShowLeaveModal(true)}
                className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors'
              >
                <LogOut className='h-3.5 w-3.5' />
                Leave Business
              </button>
            )}

            {canManageTeam && (
              <button
                onClick={handleOpenInvite}
                disabled={remainingSlots <= 0}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all ${
                  remainingSlots <= 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                }`}
              >
                <UserPlus className='h-4 w-4' />
                Invite Member
              </button>
            )}
          </div>
        </div>

        {/* Seat Usage Progress Bar */}
        <div className='mt-5 pt-4 border-t border-gray-50'>
          <div className='flex items-center justify-between text-xs text-gray-500 mb-1.5'>
            <span>Seat Capacity</span>
            <span>
              {remainingSlots > 0
                ? `${remainingSlots} seat${remainingSlots > 1 ? 's' : ''} available`
                : 'Team seat cap reached'}
            </span>
          </div>
          <div className='w-full bg-gray-100 rounded-full h-2 overflow-hidden flex'>
            <div
              className='bg-primary-600 h-full transition-all duration-300'
              style={{ width: `${(activeInvitedCount / 3) * 100}%` }}
              title={`${activeInvitedCount} active member(s)`}
            />
            <div
              className='bg-amber-400 h-full transition-all duration-300'
              style={{ width: `${(pendingCount / 3) * 100}%` }}
              title={`${pendingCount} pending invitation(s)`}
            />
          </div>
          <div className='flex items-center gap-4 text-[11px] text-gray-400 mt-2'>
            <div className='flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-primary-600 inline-block' />
              <span>Active Invited ({activeInvitedCount})</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-amber-400 inline-block' />
              <span>Pending Invites ({pendingCount})</span>
            </div>
            <span className='text-gray-300'>•</span>
            <span>Owner is exempt from the 3-seat cap</span>
          </div>
        </div>
      </div>

      {/* ── Active Members Roster ── */}
      <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm'>
        <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
          <h3 className='text-sm font-bold text-gray-900 flex items-center gap-2'>
            <Users className='h-4 w-4 text-gray-400' />
            Active Team Members ({members.length})
          </h3>
        </div>

        <div className='divide-y divide-gray-50'>
          {members.map((member) => {
            const roleConfig =
              member.role === 'owner'
                ? {
                    label: 'Owner',
                    color: 'text-purple-700',
                    bg: 'bg-purple-50',
                    border: 'border-purple-200',
                  }
                : ROLE_INFO[member.role as Exclude<BusinessRole, 'owner'>];

            const isCurrentCaller = member.userId === user?.id;
            const canModifyThisMember =
              canManageTeam && member.role !== 'owner' && !isCurrentCaller;

            return (
              <div
                key={member.id}
                className='px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors'
              >
                <div className='flex items-center gap-3.5'>
                  <div className='h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-sm text-gray-700 shrink-0'>
                    {member.user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-semibold text-gray-900'>
                        {member.user.email}
                      </span>
                      {isCurrentCaller && (
                        <span className='text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'>
                          You
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-3 text-xs text-gray-400 mt-0.5'>
                      <span>
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                      {member.permissions &&
                        Object.keys(member.permissions).length > 0 && (
                          <span className='text-primary-600 font-medium'>
                            Custom permissions applied
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-3 self-end sm:self-center'>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}
                  >
                    <Shield className='h-3 w-3 mr-1' />
                    {roleConfig.label}
                  </span>

                  {canModifyThisMember && (
                    <div className='flex items-center gap-1'>
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className='p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
                        title='Edit Role & Permissions'
                      >
                        <Edit2 className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className='p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors'
                        title='Remove Member'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pending Invitations Section ── */}
      {pendingInvitations.length > 0 && (
        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm'>
          <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between'>
            <h3 className='text-sm font-bold text-gray-900 flex items-center gap-2'>
              <Clock className='h-4 w-4 text-amber-500' />
              Pending Invitations ({pendingInvitations.length})
            </h3>
          </div>

          <div className='divide-y divide-gray-50'>
            {pendingInvitations.map((inv) => {
              const roleConfig =
                ROLE_INFO[inv.role as Exclude<BusinessRole, 'owner'>];
              const daysLeft = Math.ceil(
                (new Date(inv.expiresAt).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              );

              return (
                <div
                  key={inv.id}
                  className='px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div className='h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0'>
                      <Mail className='h-4 w-4' />
                    </div>
                    <div>
                      <span className='text-sm font-medium text-gray-900'>
                        {inv.email}
                      </span>
                      <p className='text-xs text-gray-400'>
                        Expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 self-end sm:self-center'>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}
                    >
                      {roleConfig.label}
                    </span>

                    {canManageTeam && (
                      <div className='flex items-center gap-1.5'>
                        <button
                          onClick={() => handleResendInvite(inv)}
                          disabled={resendingId === inv.id}
                          className='text-xs font-semibold text-primary-600 hover:text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50'
                        >
                          {resendingId === inv.id ? 'Resending...' : 'Resend'}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv)}
                          className='text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors'
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Invite Member Modal ── */}
      {showInviteModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs'>
          <div className='bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between pb-4 border-b border-gray-100'>
              <div className='flex items-center gap-2'>
                <div className='h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center'>
                  <UserPlus className='h-5 w-5' />
                </div>
                <div>
                  <h3 className='text-base font-bold text-gray-900'>
                    Invite Team Member
                  </h3>
                  <p className='text-xs text-gray-500'>
                    Send an invitation link via email
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className='mt-5 space-y-4'>
              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5'>
                  Email Address
                </label>
                <input
                  type='email'
                  required
                  placeholder='colleague@example.com'
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className='w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
                />
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2'>
                  Select Role
                </label>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                  {(
                    ['sales_staff', 'accountant', 'manager', 'viewer'] as const
                  ).map((r) => {
                    const info = ROLE_INFO[r];
                    const isSelected = inviteRole === r;
                    return (
                      <div
                        key={r}
                        onClick={() => {
                          setInviteRole(r);
                          setCustomPerms({ ...getRoleDefaultsFor(r) });
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/30'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs font-bold text-gray-900'>
                            {info.label}
                          </span>
                          <span
                            className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-primary-600 bg-primary-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <span className='h-1.5 w-1.5 rounded-full bg-white' />
                            )}
                          </span>
                        </div>
                        <p className='text-[11px] text-gray-500 leading-tight'>
                          {info.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Role Capability Preview */}
              <div className='p-3.5 bg-gray-50 rounded-xl border border-gray-100'>
                <p className='text-xs font-semibold text-gray-700 mb-1.5'>
                  Included capabilities for {ROLE_INFO[inviteRole].label}:
                </p>
                <ul className='text-xs text-gray-600 space-y-1'>
                  {ROLE_INFO[inviteRole].capabilities.map((c, i) => (
                    <li key={i} className='flex items-center gap-1.5'>
                      <CheckCircle className='h-3 w-3 text-emerald-600 shrink-0' />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Collapsible Granular Permission Overrides */}
              <div className='border border-gray-100 rounded-xl overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setShowCustomPerms(!showCustomPerms)}
                  className='w-full px-4 py-2.5 bg-gray-50/50 flex items-center justify-between text-xs font-semibold text-gray-700 hover:bg-gray-100/50 transition-colors'
                >
                  <span className='flex items-center gap-1.5'>
                    <Shield className='h-3.5 w-3.5 text-gray-400' />
                    Customize Additional Permissions (Optional)
                  </span>
                  {showCustomPerms ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                </button>

                {showCustomPerms && (
                  <div className='p-4 bg-white border-t border-gray-100 max-h-48 overflow-y-auto divide-y divide-gray-50'>
                    {OVERRIDABLE_PERMS.map(({ key, label }) => {
                      const implied = isPermImplied(customPerms, key);
                      const isChecked = implied || (customPerms[key] ?? false);
                      return (
                        <label
                          key={key}
                          className={`flex items-center justify-between py-2 text-xs ${
                            implied ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                          }`}
                          title={implied ? 'Implied by enabled action permission' : undefined}
                        >
                          <span className='text-gray-700'>
                            {label}
                            {implied && (
                              <span className='ml-2 text-[10px] text-primary-600 font-medium'>
                                (implied)
                              </span>
                            )}
                          </span>
                          <input
                            type='checkbox'
                            checked={isChecked}
                            disabled={implied}
                            onChange={(e) =>
                              setCustomPerms(
                                updatePermWithImplications(customPerms, key, e.target.checked)
                              )
                            }
                            className='rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 disabled:opacity-60'
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className='flex items-center justify-end gap-2 pt-3 border-t border-gray-100'>
                <button
                  type='button'
                  onClick={() => setShowInviteModal(false)}
                  className='px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50'
                >
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Member Modal ── */}
      {selectedMember && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs'>
          <div className='bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100'>
            <div className='flex items-center justify-between pb-3 border-b border-gray-100'>
              <div>
                <h3 className='text-base font-bold text-gray-900'>
                  Edit Member Role
                </h3>
                <p className='text-xs text-gray-500'>
                  {selectedMember.user.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-lg'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='mt-4 space-y-4'>
              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5'>
                  Business Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const newRole = e.target.value as BusinessRole;
                    setEditRole(newRole);
                    if (newRole !== 'owner') {
                      setEditPerms({
                        ...getRoleDefaultsFor(newRole),
                      });
                    }
                  }}
                  className='w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                >
                  <option value='sales_staff'>Sales Staff</option>
                  <option value='accountant'>Accountant</option>
                  {isOwner && <option value='manager'>Manager</option>}
                  <option value='viewer'>Viewer</option>
                </select>
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2'>
                  Permission Overrides
                </label>
                <div className='max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl p-3 bg-gray-50/50'>
                  {OVERRIDABLE_PERMS.map(({ key, label }) => {
                    const implied = isPermImplied(editPerms, key);
                    const isChecked = implied || (editPerms[key] ?? false);
                    return (
                      <label
                        key={key}
                        className={`flex items-center justify-between py-2 text-xs ${
                          implied ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                        }`}
                        title={implied ? 'Implied by enabled action permission' : undefined}
                      >
                        <span className='text-gray-700'>
                          {label}
                          {implied && (
                            <span className='ml-2 text-[10px] text-primary-600 font-medium'>
                              (implied)
                            </span>
                          )}
                        </span>
                        <input
                          type='checkbox'
                          checked={isChecked}
                          disabled={implied}
                          onChange={(e) =>
                            setEditPerms(
                              updatePermWithImplications(editPerms, key, e.target.checked)
                            )
                          }
                          className='rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 disabled:opacity-60'
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className='flex items-center justify-end gap-2 pt-3 border-t border-gray-100'>
                <button
                  type='button'
                  onClick={() => setSelectedMember(null)}
                  className='px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSaveMember}
                  disabled={isSubmitting}
                  className='px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50'
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Self Leave Modal ── */}
      {showLeaveModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs'>
          <div className='bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100'>
            <div className='flex items-center gap-3 text-amber-600 mb-3'>
              <AlertTriangle className='h-6 w-6' />
              <h3 className='text-base font-bold text-gray-900'>
                Leave Business Team
              </h3>
            </div>
            <p className='text-xs text-gray-600 leading-relaxed'>
              Are you sure you want to leave{' '}
              <strong>{activeBusiness?.businessName}</strong>? You will
              immediately lose access to all transactions, reports, and invoices
              for this business.
            </p>
            <div className='flex items-center justify-end gap-2 mt-5'>
              <button
                type='button'
                onClick={() => setShowLeaveModal(false)}
                className='px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSelfLeave}
                className='px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl'
              >
                Yes, Leave Business
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
