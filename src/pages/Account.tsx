import { useEffect, useState, useRef } from 'react';
import {
  Landmark,
  Copy,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Building2,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Bank } from '@/types';
import { mapPaystackError } from '@/lib/paystack-errors';

interface DVAData {
  status: 'active' | 'pending' | 'none';
  accountNumber?: string;
  bankName?: string;
  message?: string;
  needsValidation?: boolean;
}

export default function Account() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const [dva, setDva] = useState<DVAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [showBvnForm, setShowBvnForm] = useState(false);
  const [bvn, setBvn] = useState('');
  const [bvnError, setBvnError] = useState('');
  // Bank-account fields required by Paystack's current validation shape
  // (`type: 'bank_account'`). Bank dropdown is populated from /api/v1/banks
  // when the form is first opened — cached for the rest of the page-life.
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState('');
  // Inline phone capture — fired when setupVirtualAccount returns
  // USER_PHONE_REQUIRED. Path (b) from paymentPlan.md §2.3.
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const isMountedRef = useRef(true);

  // Settlement bank connection state
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementBankCode, setSettlementBankCode] = useState('');
  const [settlementAccountNumber, setSettlementAccountNumber] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [connectingSettlement, setConnectingSettlement] = useState(false);
  const [settlementError, setSettlementError] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchDVA = async () => {
    if (!biz) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/businesses/${biz.id}/dva/virtual-account`);
      setDva(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDVA();
  }, [biz?.id]);

  // Lazy-fetch the bank list the first time the BVN form opens. We don't
  // pre-load on page mount — most users won't see the BVN form (DVA
  // already active, or test-mode no-validation flow). Cached server-side for
  // 24h; first call may be ~600ms (Paystack fetch + DB upsert), subsequent
  // calls in the same SPA session reuse `banks` state.
  useEffect(() => {
    if (!showBvnForm || banks !== null) return;
    let cancelled = false;
    setBanksLoading(true);
    setBanksError('');
    api
      .get('/banks')
      .then((res) => {
        if (cancelled) return;
        setBanks(res.data.data as Bank[]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { response?: { data?: { error?: { message?: string } } } };
        setBanksError(
          e.response?.data?.error?.message ||
            'Could not load the bank list. Please try again.',
        );
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showBvnForm, banks]);

  const handleSetup = async () => {
    if (!biz) return;
    setSettingUp(true);
    setError('');
    try {
      const res = await api.post(`/businesses/${biz.id}/dva/setup-virtual-account`);
      const data = res.data.data;
      setDva(data);
      if (data.status === 'active') {
        toast.success('Virtual account created!');
        fetchBusinesses();
      } else {
        toast.success('Account setup initiated — check back shortly.');
      }
    } catch (err: unknown) {
      const e = err as Parameters<typeof mapPaystackError>[0] & {
        response?: { data?: { error?: { code?: string; message?: string; details?: { paystackCode?: string } } } };
      };
      const code = e.response?.data?.error?.code;
      const paystackCode = e.response?.data?.error?.details?.paystackCode;

      // Path (b) — user has no phone on their profile. We surface our own
      // 400/USER_PHONE_REQUIRED before any Paystack call, so this branch
      // comes first and short-circuits before the Paystack mapper runs.
      if (code === 'USER_PHONE_REQUIRED') {
        setShowPhoneForm(true);
        setError('');
        toast('Add your phone number to continue.', { icon: 'i' });
        return;
      }

      // BVN/bank-account validation needed → swing the BVN form open. The
      // Paystack-code variants of "validation required" all collapse to
      // the same UX. Special-cased before the generic mapper because the
      // UX is form-toggle, not message-display.
      if (paystackCode === 'validation_required') {
        setShowBvnForm(true);
        setError('');
        toast('Identity verification is required before creating a virtual account.', { icon: 'i' });
        return;
      }

      // Map all other errors through the typed lookup.
      const mapped = mapPaystackError(e);
      switch (mapped.intent) {
        case 'silent':
          // Service self-heals (e.g. customer_not_found). Don't surface
          // anything — a UI flash would be more confusing than nothing.
          break;
        case 'inline':
          // Card-level banner. Used for actionable errors that need a
          // persistent surface (e.g. disabled_merchant — user must email
          // support before retry will work).
          setError(`${mapped.title}. ${mapped.body}`);
          break;
        case 'toast':
        default:
          setError(mapped.body);
          toast.error(`${mapped.title}: ${mapped.body}`);
          break;
      }
    } finally {
      setSettingUp(false);
    }
  };

  /**
   * Inline phone-capture flow (path b — paymentPlan.md §2.3).
   *
   * Triggered when setupVirtualAccount returns USER_PHONE_REQUIRED. PATCHes
   * /auth/me, refreshes the auth store (so the sidebar/profile reflect the
   * new value), then auto-retries setupVirtualAccount so the user doesn't
   * have to click again. If retry fails for any other reason, fall back to
   * the normal error-handling branches of handleSetup.
   */
  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz) return;

    setPhoneError('');
    // E.164: optional leading +, then 1-15 digits starting 1-9. Mirrors
    // backend/src/validators/auth.validator.ts → updateMeSchema.
    if (!/^\+?[1-9]\d{1,14}$/.test(phone.trim())) {
      setPhoneError('Enter a valid phone number (e.g. +2348012345678)');
      return;
    }

    setSavingPhone(true);
    try {
      await api.patch('/auth/me', { phone: phone.trim() });
      await fetchMe();
      toast.success('Phone number saved.');
      setShowPhoneForm(false);
      setPhone('');
      // Retry setup — if it still fails (e.g. BVN required next), the
      // existing error branches in handleSetup will route correctly.
      await handleSetup();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      const code = e.response?.data?.error?.code;
      const msg = e.response?.data?.error?.message || 'Failed to save phone number';
      // Surface duplicate-phone as a field error (most common failure).
      if (code === 'PHONE_IN_USE') {
        setPhoneError('That phone number is already used by another account.');
      } else {
        setPhoneError(msg);
      }
    } finally {
      setSavingPhone(false);
    }
  };

  const handleValidateBvn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz) return;

    setBvnError('');
    // Client-side mirrors of the server-side Zod rules in
    // backend/src/validators/dva.validator.ts — keep them in sync.
    if (!/^\d{11}$/.test(bvn)) {
      setBvnError('BVN must be exactly 11 digits');
      return;
    }
    if (!bankCode) {
      setBvnError('Select the bank where your account is held');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setBvnError('Account number must be exactly 10 digits (NUBAN)');
      return;
    }

    setValidating(true);
    try {
      await api.post(`/businesses/${biz.id}/dva/validate-customer`, {
        bvn,
        bankCode,
        accountNumber,
      });
      toast.success('BVN submitted for verification.');
      setShowBvnForm(false);
      setBvn('');
      setBankCode('');
      setAccountNumber('');

      setTimeout(async () => {
        if (!isMountedRef.current) return;
        try {
          const res = await api.post(`/businesses/${biz.id}/dva/setup-virtual-account`);
          if (!isMountedRef.current) return;
          const data = res.data.data;
          setDva(data);
          if (data.status === 'active') {
            toast.success('Virtual account created!');
            fetchBusinesses();
          } else if (data.status === 'pending') {
            toast.success('Account setup in progress. Check back shortly.');
          }
        } catch (err) {
          console.error('DVA setup failed:', err);
          if (isMountedRef.current) {
            setDva({ status: 'pending', message: 'Account setup in progress. Please check back shortly.' });
          }
        }
      }, 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = error.response?.data?.error?.message || 'BVN validation failed';
      setBvnError(msg);
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  };

  const handleResolveSettlement = async () => {
    if (!biz) return;
    if (!/^\d{10}$/.test(settlementAccountNumber)) {
      setSettlementError('Account number must be exactly 10 digits');
      return;
    }
    if (!settlementBankCode) {
      setSettlementError('Select a bank');
      return;
    }

    setSettlementError('');
    setResolvingAccount(true);
    try {
      const res = await api.post(`/businesses/${biz.id}/dva/settlement/resolve`, {
        bankCode: settlementBankCode,
        accountNumber: settlementAccountNumber,
      });
      setResolvedAccountName(res.data.data.accountName);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setSettlementError(error.response?.data?.error?.message || 'Failed to verify account');
    } finally {
      setResolvingAccount(false);
    }
  };

  const handleConnectSettlement = async () => {
    if (!biz || !resolvedAccountName) return;

    setConnectingSettlement(true);
    try {
      const bankName = banks?.find((b) => b.code === settlementBankCode)?.name || '';
      await api.post(`/businesses/${biz.id}/dva/settlement/connect`, {
        bankCode: settlementBankCode,
        bankName,
        accountNumber: settlementAccountNumber,
        commissionPct: 0, // Default 0% commission
      });
      toast.success('Settlement account connected!');
      setShowSettlementForm(false);
      setSettlementBankCode('');
      setSettlementAccountNumber('');
      setResolvedAccountName('');
      await fetchBusinesses(); // Refresh to show connected account
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setSettlementError(error.response?.data?.error?.message || 'Failed to connect account');
    } finally {
      setConnectingSettlement(false);
    }
  };

  const handleRequeryDVA = async () => {
    if (!biz || !dva?.accountNumber) return;
    
    const toastId = toast.loading('Checking for new transactions...');
    try {
      await api.post(`/businesses/${biz.id}/dva/requery`);
      toast.success('DVA requeried. Any missing transfers will appear shortly.', { id: toastId });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Failed to requery DVA', { id: toastId });
    }
  };

  if (!biz) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Building2 className="h-8 w-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Select or create a business first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[13px] text-gray-400">
          Manage the dedicated bank account for <span className="font-medium text-gray-500">{biz.businessName}</span>
        </p>
      </div>

      {/* Business Info Bar */}
      <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white shadow-sm px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white text-sm font-bold shrink-0">
          {biz.businessName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">{biz.businessName}</p>
          <p className="text-[12px] text-gray-400">{biz.ownerName} · {biz.businessType || 'Business'}</p>
        </div>
        {dva?.status === 'active' && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        )}
      </div>

      {/* Virtual Account Card */}
      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
              <Landmark className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">Virtual Account</h2>
              <p className="text-[12px] text-gray-400">Transfers are auto-recorded as sales</p>
            </div>
          </div>
          {dva && dva.status !== 'none' && (
            <button
              onClick={fetchDVA}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        <div className="px-5 pb-5">
          {/* Loading */}
          {loading && !dva && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 mb-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-red-700">{error}</p>
                  <button
                    onClick={() => { setError(''); fetchDVA(); }}
                    className="mt-1.5 text-[12px] font-medium text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors"
                  >
                    Try again <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inline phone capture (path b — fired by USER_PHONE_REQUIRED) */}
          {showPhoneForm && !loading && (
            <div className="rounded-md bg-blue-50 border border-blue-100 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-blue-800">Add your phone number</h3>
              </div>
              <p className="text-[13px] text-gray-600 mb-4">
                Paystack requires a phone number on your profile before issuing a virtual account. We'll save it to your account and continue setup automatically.
              </p>
              <form onSubmit={handleSavePhone} className="space-y-3">
                <Input
                  label="Phone number"
                  type="tel"
                  inputMode="tel"
                  placeholder="+2348012345678"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  error={phoneError}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" isLoading={savingPhone}>
                    Save and continue
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => { setShowPhoneForm(false); setPhone(''); setPhoneError(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* BVN + Bank Account Form */}
          {showBvnForm && !loading && (
            <div className="rounded-md bg-blue-50 border border-blue-100 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-blue-800">Identity Verification Required</h3>
              </div>
              <p className="text-[13px] text-gray-600 mb-4">
                Paystack verifies your identity by matching your BVN against a bank account registered in your name. All three fields must match the same NIBSS record. None of these values are stored on our servers — they are sent directly to Paystack.
              </p>
              <form onSubmit={handleValidateBvn} className="space-y-3">
                <Input
                  label="BVN (11 digits)"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="Enter your 11-digit BVN"
                  value={bvn}
                  onChange={(e) => { setBvn(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                />
                {/* Bank dropdown sourced from /api/v1/banks (server-cached) */}
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Bank
                  </label>
                  <select
                    value={bankCode}
                    onChange={(e) => { setBankCode(e.target.value); setBvnError(''); }}
                    disabled={banksLoading || !!banksError}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {banksLoading ? 'Loading banks…' : banksError ? '— unavailable —' : 'Select your bank'}
                    </option>
                    {banks?.map((b) => (
                      <option key={b.id} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                  {banksError && (
                    <p className="mt-1 text-[11px] text-red-600">{banksError}</p>
                  )}
                </div>
                <Input
                  label="Account number (10 digits)"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="NUBAN account registered with your BVN"
                  value={accountNumber}
                  onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                  error={bvnError}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" isLoading={validating} disabled={banksLoading || !!banksError}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Verify
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setShowBvnForm(false);
                      setBvn('');
                      setBankCode('');
                      setAccountNumber('');
                      setBvnError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Active Account */}
          {!loading && dva?.status === 'active' && (
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Account Number</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 tracking-widest tabular-nums">{dva.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dva.accountNumber || '');
                        toast.success('Copied!');
                      }}
                      className="flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:bg-white/60 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Bank</p>
                  <span className="text-lg font-semibold text-gray-900">{dva.bankName || 'Wema Bank'}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-200/60">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-gray-500">
                    Any transfer to this account is automatically captured as a confirmed sale for <strong>{biz.businessName}</strong>. Share this with customers for direct payments.
                  </p>
                  <button
                    onClick={handleRequeryDVA}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-white/80 hover:text-gray-700 transition-colors shrink-0"
                    title="Check for missed transfers"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Requery
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Settlement Bank Connection - World-Class Banking UI */}
          {!loading && dva?.status === 'active' && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900">Settlement Account</h3>
                      <p className="text-[12px] text-gray-500">Where your revenue lands automatically</p>
                    </div>
                  </div>
                  {!biz.settlementAccountNumber && !showSettlementForm && (
                    <button
                      onClick={() => {
                        setShowSettlementForm(true);
                        // Lazy-load banks
                        if (!banks) {
                          setBanksLoading(true);
                          api.get('/banks')
                            .then((res) => setBanks(res.data.data as Bank[]))
                            .catch(() => setBanksError('Failed to load banks'))
                            .finally(() => setBanksLoading(false));
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Building2 className="h-4 w-4" />
                      Connect Bank
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {/* Connected State - Beautiful Display */}
                {biz.settlementAccountNumber && !showSettlementForm ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow-md">
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                              <CheckCircle2 className="h-3 w-3" /> ACTIVE
                            </span>
                          </div>
                          <h4 className="text-[15px] font-bold text-gray-900 mb-1">{biz.settlementAccountName}</h4>
                          <div className="flex items-center gap-2 text-[13px] text-gray-600">
                            <span className="font-medium">{biz.settlementBankName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="font-mono">••••{biz.settlementAccountNumber.slice(-4)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* How It Works - Clear Explanation */}
                    <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4">
                      <h5 className="text-[13px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                        How Revenue Settlement Works
                      </h5>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold mt-0.5">1</div>
                          <p className="text-[13px] text-gray-700">Customer sends money to your Virtual Account</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold mt-0.5">2</div>
                          <p className="text-[13px] text-gray-700">
                            Paystack auto-settles to <strong>{biz.settlementAccountName}</strong>
                            {biz.platformCommissionPct && biz.platformCommissionPct > 0 && (
                              <span className="block mt-1 text-[12px] text-gray-500">
                                ({100 - biz.platformCommissionPct}% to you, {biz.platformCommissionPct}% platform fee)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold mt-0.5">3</div>
                          <p className="text-[13px] text-gray-700">Transaction recorded for tax calculation</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400">
                        Connected {biz.settlementConnectedAt ? new Date(biz.settlementConnectedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'recently'}
                      </p>
                    </div>
                  </div>
                ) : !biz.settlementAccountNumber && !showSettlementForm ? (
                  /* Not Connected State */
                  <div className="py-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-[14px] font-semibold text-gray-900 mb-2">No Settlement Account Connected</h4>
                    <p className="text-[13px] text-gray-500 max-w-md mx-auto mb-6">
                      Connect your bank account to automatically receive customer payments. Money settles directly to your account within 24 hours.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-[12px]">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Instant setup</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Automatic splits</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Secure</span>
                      </div>
                    </div>
                  </div>
                ) : showSettlementForm ? (
                  /* Connection Form - Professional Banking Flow */
                  <div className="space-y-5">
                    <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4">
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-[13px] font-semibold text-blue-900 mb-1">Secure Account Verification</h5>
                          <p className="text-[12px] text-gray-600">
                            We'll verify your account name with your bank before connecting. Your account details are sent directly to Paystack.
                          </p>
                        </div>
                      </div>
                    </div>

                    {settlementError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          <p className="text-[12px] text-red-700">{settlementError}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                          Select Your Bank
                        </label>
                        <select
                          value={settlementBankCode}
                          onChange={(e) => {
                            setSettlementBankCode(e.target.value);
                            setSettlementError('');
                            setResolvedAccountName('');
                          }}
                          disabled={banksLoading || !!banksError || resolvingAccount || connectingSettlement}
                          className="block w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[14px] text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                        >
                          <option value="">
                            {banksLoading ? 'Loading banks...' : banksError ? 'Failed to load banks' : '-- Select your bank --'}
                          </option>
                          {banks?.map((b) => (
                            <option key={b.id} value={b.code}>{b.name}</option>
                          ))}
                        </select>
                        {banksError && (
                          <p className="mt-1.5 text-[11px] text-red-600">{banksError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                          Account Number (10 digits)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="0123456789"
                          value={settlementAccountNumber}
                          onChange={(e) => {
                            setSettlementAccountNumber(e.target.value.replace(/\D/g, ''));
                            setSettlementError('');
                            setResolvedAccountName('');
                          }}
                          disabled={resolvingAccount || connectingSettlement}
                          className="block w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[14px] font-mono text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-gray-100 transition-colors"
                        />
                        <p className="mt-1.5 text-[11px] text-gray-500">
                          Enter the 10-digit NUBAN account number
                        </p>
                      </div>

                      {!resolvedAccountName && (
                        <Button
                          size="lg"
                          onClick={handleResolveSettlement}
                          isLoading={resolvingAccount}
                          disabled={!settlementBankCode || settlementAccountNumber.length !== 10 || banksLoading}
                          className="w-full"
                        >
                          {resolvingAccount ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying Account...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4" />
                              Verify Account Name
                            </>
                          )}
                        </Button>
                      )}

                      {resolvedAccountName && (
                        <div className="rounded-lg bg-emerald-50 border-2 border-emerald-300 p-4 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] font-semibold text-emerald-900 uppercase tracking-wide mb-1">Verified Account</p>
                              <h4 className="text-[16px] font-bold text-gray-900 mb-1">{resolvedAccountName}</h4>
                              <div className="flex items-center gap-2 text-[13px] text-gray-600">
                                <span className="font-medium">{banks?.find((b) => b.code === settlementBankCode)?.name}</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-mono">{settlementAccountNumber}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-3 border-t border-emerald-200">
                            <Button
                              size="lg"
                              onClick={handleConnectSettlement}
                              isLoading={connectingSettlement}
                              className="flex-1"
                            >
                              {connectingSettlement ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Connect This Account
                                </>
                              )}
                            </Button>
                            <Button
                              size="lg"
                              variant="secondary"
                              onClick={() => {
                                setShowSettlementForm(false);
                                setSettlementBankCode('');
                                setSettlementAccountNumber('');
                                setResolvedAccountName('');
                                setSettlementError('');
                              }}
                              disabled={connectingSettlement}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Pending */}
          {!loading && dva?.status === 'pending' && (
            <div className="rounded-md bg-amber-50 border border-amber-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <p className="text-[13px] font-semibold text-amber-700">Setup In Progress</p>
              </div>
              <p className="text-[13px] text-gray-600 mb-4">
                {dva.message || 'Paystack is assigning your dedicated account number. This usually takes a few seconds.'}
              </p>
              <Button variant="secondary" size="sm" onClick={fetchDVA} isLoading={loading}>
                <RefreshCw className="h-3.5 w-3.5" /> Check Status
              </Button>
            </div>
          )}

          {/* Not Set Up */}
          {!loading && dva?.status === 'none' && !error && !showBvnForm && !showPhoneForm && (
            <div>
              <div className="rounded-md bg-gray-50/80 border border-gray-100 p-5 mb-4">
                <h3 className="text-[13px] font-semibold text-gray-900 mb-3">How it works</h3>
                <div className="space-y-3">
                  {[
                    'We verify your identity with your BVN (required by Paystack)',
                    'A dedicated bank account number is created for your business',
                    'Share it with customers — every transfer is logged as a confirmed sale',
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-[13px] text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleSetup} isLoading={settingUp} size="sm">
                <Landmark className="h-3.5 w-3.5" /> Set Up Virtual Account
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-2">
        <img src="/logo.png" alt="PayMyTax" className="h-4 opacity-20" />
        <span className="text-[11px] text-gray-300">Powered by Paystack</span>
      </div>
    </div>
  );
}
