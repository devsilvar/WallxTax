import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle,
  Shield,
  ArrowRight,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Building2,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useTeamStore } from '@/stores/team.store.ts';
import OptimizedLogo from '@/components/ui/OptimizedLogo.tsx';
import type { ValidateInviteResponse } from '@/types/index.ts';

const ROLE_LABELS: Record<
  string,
  { label: string; desc: string; color: string; bg: string; border: string }
> = {
  manager: {
    label: 'Manager',
    desc: 'Full operational access to record transactions, manage invoices, view tax reports, and invite team members.',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  sales_staff: {
    label: 'Sales Staff',
    desc: 'Record counter sales, issue invoices to customers, and verify counter bank transfers.',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  accountant: {
    label: 'Accountant',
    desc: 'Log deductible business expenses, reconcile invoices and debtor payments, and calculate tax reports.',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  viewer: {
    label: 'Viewer',
    desc: 'Read-only access to view business performance, statements, tax reports, and transaction history.',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

function PasswordRuleChip({ met, label }: { met: boolean; label: string }) {
  return (
    <div className='flex items-center gap-1.5'>
      {met ? (
        <Check
          className='h-3.5 w-3.5 text-emerald-500 shrink-0'
          strokeWidth={2.5}
        />
      ) : (
        <X className='h-3.5 w-3.5 text-gray-300 shrink-0' strokeWidth={2.5} />
      )}
      <span
        className={`text-xs ${met ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}
      >
        {label}
      </span>
    </div>
  );
}

export default function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const setAuthSession = useAuthStore((s) => s.setAuthSession);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);

  const {
    validateInviteToken,
    acceptOnboarding,
    myInvitations,
    fetchMyInvitations,
  } = useTeamStore();

  // State for token-based onboarding flow
  const [isValidating, setIsValidating] = useState(!!tokenFromUrl);
  const [inviteDetails, setInviteDetails] =
    useState<ValidateInviteResponse | null>(null);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processedSuccess, setProcessedSuccess] = useState<string | null>(null);

  // Password rules validation
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  // 1. Session Isolation: If a token is in URL and browser was logged in, auto-logout prior session
  useEffect(() => {
    if (tokenFromUrl && isAuthenticated) {
      logout();
    }
  }, [tokenFromUrl]);

  // 2. Validate token on mount
  useEffect(() => {
    if (!tokenFromUrl) {
      setIsValidating(false);
      if (isAuthenticated) {
        fetchMyInvitations();
      }
      return;
    }

    let isMounted = true;
    const runValidation = async () => {
      setIsValidating(true);
      try {
        const res = await validateInviteToken(tokenFromUrl);
        if (isMounted) {
          setInviteDetails(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setInviteDetails({
            valid: false,
            reason: err.response?.data?.error?.code || 'not_found',
          });
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    runValidation();
    return () => {
      isMounted = false;
    };
  }, [tokenFromUrl, validateInviteToken]);

  // 3. Handle Onboarding Submission
  const handleOnboardingSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!tokenFromUrl || !inviteDetails?.valid) return;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!allRulesMet) {
      toast.error('Password does not meet security requirements');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await acceptOnboarding({
        token: tokenFromUrl,
        password,
        fullName: fullName.trim() || undefined,
      });

      // Synchronize session and active business
      setAuthSession(res.user, res.accessToken, res.refreshToken);
      localStorage.setItem('activeBusinessId', res.business.id);

      toast.success(`Welcome to ${res.business.businessName}!`);
      setProcessedSuccess(res.business.businessName);

      await fetchBusinesses(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || 'Failed to complete registration',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Flow A: Token Provided in URL ──────────────────────────────

  if (tokenFromUrl) {
    // 1. Loading Skeleton
    if (isValidating) {
      return (
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4'>
            <OptimizedLogo size='md' className='mx-auto h-10 animate-pulse' />
            <h2 className='text-xl font-bold text-gray-900'>
              Validating your invitation...
            </h2>
            <p className='text-xs text-gray-500'>
              Checking security credentials and workspace access
            </p>
            <div className='h-2 w-48 bg-gray-200 rounded-full mx-auto overflow-hidden'>
              <div className='h-full bg-primary-600 rounded-full animate-progress' />
            </div>
          </div>
        </div>
      );
    }

    // 2. Success State
    if (processedSuccess) {
      return (
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <div className='bg-white rounded-2xl p-8 border border-emerald-100 shadow-xl text-center space-y-4 animate-fade-in'>
              <div className='h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10'>
                <CheckCircle className='h-10 w-10' />
              </div>
              <h2 className='text-2xl font-extrabold text-gray-900 tracking-tight'>
                Welcome to {processedSuccess}!
              </h2>
              <p className='text-sm text-gray-600'>
                Your account is verified and ready. Directing you to your team
                workspace...
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 3. Invalid / Expired / Revoked State
    if (!inviteDetails?.valid) {
      let title = 'Invitation Invalid';
      let description =
        'This invitation link is not valid or has already been used.';

      if (inviteDetails?.reason === 'expired') {
        title = 'Invitation Expired';
        description =
          'This team invitation has expired (links are valid for 7 days). Please contact the business owner to resend your invitation.';
      } else if (inviteDetails?.reason === 'revoked') {
        title = 'Invitation Revoked';
        description =
          'This invitation was revoked by the business administrator. If you believe this is an error, please reach out to the business owner.';
      } else if (inviteDetails?.reason === 'already_used') {
        title = 'Invitation Already Used';
        description =
          'This invitation has already been accepted. You can sign in using your email and password.';
      } else if (inviteDetails?.reason === 'account_already_registered') {
        title = 'Account Already Exists';
        description =
          'An account with this email address has already been registered on WallXERP. For security and financial data protection, existing accounts cannot be joined via invite links. Please contact the business owner.';
      }

      return (
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md text-center'>
            <OptimizedLogo size='md' className='mx-auto h-9' />
          </div>

          <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
            <div className='bg-white py-8 px-6 shadow-xl border border-gray-100 rounded-2xl sm:px-10 text-center space-y-5'>
              <div className='h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-500/10'>
                <AlertTriangle className='h-7 w-7' />
              </div>
              <h2 className='text-xl font-bold text-gray-900'>{title}</h2>
              <p className='text-sm text-gray-600 leading-relaxed'>
                {description}
              </p>

              <div className='pt-2'>
                <Link
                  to='/login'
                  className='w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm'
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 4. Valid Onboarding Form
    const roleInfo =
      ROLE_LABELS[inviteDetails.role || 'viewer'] || ROLE_LABELS.viewer;

    return (
      <div className='min-h-screen bg-linear-to-b from-gray-50 to-primary-50/20 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8'>
        <div className='sm:mx-auto sm:w-full sm:max-w-md text-center'>
          <OptimizedLogo size='md' className='mx-auto h-9' />
          <div className='mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100'>
            <Building2 className='h-3.5 w-3.5' />
            <span>Invited by {inviteDetails.business?.businessName}</span>
          </div>
          <h2 className='mt-2 text-2xl font-extrabold text-gray-900 tracking-tight'>
            Join as {roleInfo.label}
          </h2>
          <p className='mt-1 text-xs text-gray-500'>
            Set up your password below to immediately access your company
            workspace.
          </p>
        </div>

        <div className='mt-6 sm:mx-auto sm:w-full sm:max-w-md'>
          <div className='bg-white py-8 px-6 shadow-xl border border-gray-100 rounded-2xl sm:px-10 space-y-6'>
            {/* Role Capabilities Preview */}
            <div
              className={`p-4 rounded-xl border ${roleInfo.bg} ${roleInfo.border} space-y-1`}
            >
              <div className='flex items-center gap-2'>
                <Shield className={`h-4 w-4 ${roleInfo.color}`} />
                <span className={`text-xs font-bold ${roleInfo.color}`}>
                  {roleInfo.label} Role
                </span>
              </div>
              <p className='text-xs text-gray-600 leading-relaxed'>
                {roleInfo.desc}
              </p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className='space-y-4'>
              {/* Read-Only Email Field */}
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Email Address
                </label>
                <div className='relative'>
                  <input
                    type='email'
                    value={inviteDetails.email || ''}
                    disabled
                    readOnly
                    className='w-full pl-9 pr-4 py-2.5 bg-gray-100/80 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 cursor-not-allowed select-none'
                  />
                  <Lock className='h-4 w-4 text-gray-400 absolute left-3 top-3' />
                </div>
                <p className='mt-1 text-[11px] text-gray-400'>
                  This invitation is strictly linked to this email address.
                </p>
              </div>

              {/* Full Name Field (Optional) */}
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Full Name{' '}
                  <span className='text-gray-400 font-normal'>(Optional)</span>
                </label>
                <input
                  type='text'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder='e.g. Adeola Johnson'
                  className='w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-hidden'
                />
              </div>

              {/* Password Field */}
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Create Password
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Enter a secure password'
                    required
                    className='w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-hidden'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors'
                  >
                    {showPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>

                {/* Password Rule Chips */}
                {password.length > 0 && (
                  <div className='mt-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-2 animate-fade-in'>
                    <PasswordRuleChip
                      met={rules.length}
                      label='8+ Characters'
                    />
                    <PasswordRuleChip
                      met={rules.uppercase}
                      label='Uppercase letter'
                    />
                    <PasswordRuleChip
                      met={rules.lowercase}
                      label='Lowercase letter'
                    />
                    <PasswordRuleChip met={rules.number} label='Number' />
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Confirm Password
                </label>
                <div className='relative'>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder='Repeat your password'
                    required
                    className='w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-hidden'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirm(!showConfirm)}
                    className='absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors'
                  >
                    {showConfirm ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className='pt-2'>
                <button
                  type='submit'
                  disabled={
                    isSubmitting || !allRulesMet || password !== confirmPassword
                  }
                  className='w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm'
                >
                  {isSubmitting ? (
                    <>
                      <div className='h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account & Join Team</span>
                      <ArrowRight className='h-4 w-4' />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className='text-center pt-1 border-t border-gray-100'>
              <p className='text-[11px] text-gray-400'>
                By joining, your account is immediately verified with secure
                single-session access.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Flow B: No Token in URL (Direct Visit) ─────────────────────

  if (!isAuthenticated) {
    return (
      <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8'>
        <div className='sm:mx-auto sm:w-full sm:max-w-md text-center'>
          <OptimizedLogo size='md' className='mx-auto h-10' />
          <h2 className='mt-6 text-2xl font-extrabold text-gray-900 tracking-tight'>
            Team Invitation
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            To accept a team invitation, please click the secure link sent
            directly to your email inbox.
          </p>
        </div>

        <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
          <div className='bg-white py-8 px-6 shadow-xl border border-gray-100 rounded-2xl sm:px-10 text-center space-y-4'>
            <div className='h-12 w-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto'>
              <Mail className='h-6 w-6' />
            </div>
            <p className='text-xs text-gray-500'>
              Already have an account as a business owner?
            </p>
            <Link
              to='/login'
              className='w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm'
            >
              Sign In to Your Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user listing invitations (fallback view)
  return (
    <div className='min-h-screen bg-gray-50/60 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-xl mx-auto space-y-6'>
        <div className='text-center'>
          <OptimizedLogo size='md' className='mx-auto h-9' />
          <h1 className='mt-4 text-2xl font-bold text-gray-900'>
            Your Invitations
          </h1>
          <p className='mt-1 text-sm text-gray-500'>
            Pending invitations linked to your email address.
          </p>
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm'>
          <div className='px-6 py-4 border-b border-gray-100'>
            <h2 className='text-sm font-bold text-gray-900 flex items-center gap-2'>
              <Clock className='h-4 w-4 text-gray-400' />
              Pending Invitations ({myInvitations.length})
            </h2>
          </div>

          {myInvitations.length === 0 ? (
            <div className='p-8 text-center text-sm text-gray-400'>
              You have no pending invitations at this time.
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {myInvitations.map((inv: any) => {
                const roleConfig = ROLE_LABELS[inv.role] || ROLE_LABELS.viewer;
                return (
                  <div
                    key={inv.id}
                    className='p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'
                  >
                    <div>
                      <h3 className='text-base font-bold text-gray-900'>
                        {inv.business?.businessName}
                      </h3>
                      <div className='flex items-center gap-2 mt-1'>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}
                        >
                          {roleConfig.label}
                        </span>
                        <span className='text-xs text-gray-400'>
                          Expires in{' '}
                          {Math.max(
                            0,
                            Math.ceil(
                              (new Date(inv.expiresAt).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24),
                            ),
                          )}{' '}
                          days
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
