import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, Copy, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  Building2, Share2, Wallet, TrendingUp, ArrowDownLeft, QrCode, Download,
  CreditCard, Clock, CheckCheck, Phone, ShieldCheck, BadgeCheck, ChevronRight
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import BankSelect from '@/components/BankSelect.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Bank } from '@/types';
import { mapPaystackError, type BackendErrorLike } from '@/lib/paystack-errors';

// Lazy-load the QR renderer so qrcode.react stays out of the main bundle —
// it only mounts when the "Scan to Pay" modal opens. The library exposes
// QRCodeSVG as a named export; remap to default for React.lazy.
const QRCode = lazy(() =>
  import('qrcode.react').then((m) => ({ default: m.QRCodeSVG }))
);

interface DVAData {
  status: 'active' | 'pending' | 'none' | 'failed';
  accountNumber?: string;
  bankName?: string;
  message?: string;
  failedAt?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'inbound' | 'tax_payment';
  status: 'completed' | 'pending' | 'processing';
  description: string;
  date: string;
  referenceId?: string;
}

// Shapes of the raw rows returned by GET /sales and GET /tax/payments —
// just enough fields to build a Transaction, typed instead of `any` so
// fetchTransactions' mapping is checked at compile time.
interface SalesApiRow {
  id: string;
  amount: number | string;
  status: string;
  customerName?: string | null;
  description?: string | null;
  transactionDate: string;
  referenceId?: string | null;
}

interface PaymentApiRow {
  id: string;
  amountPaid: number | string;
  paymentStatus: string;
  paymentDate?: string | null;
  createdAt: string;
  transactionReference?: string | null;
}

/** Extracts a backend `AppError` message from an Axios-shaped error, without resorting to `any`. */
function getErrorMessage(err: unknown, fallback: string): string {
  const message = (err as BackendErrorLike | undefined)?.response?.data?.error?.message;
  return message || fallback;
}

export default function Account() {
  const navigate = useNavigate();
  const biz = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);

  const [dva, setDva] = useState<DVAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [showBvnForm, setShowBvnForm] = useState(false);
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [bvnError, setBvnError] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState('');
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  // True once the BVN form has been submitted and Paystack is verifying
  // asynchronously. Distinguishes "needs BVN" (show form) from "BVN submitted,
  // still processing" (show waiting state) — without it, a validation_required
  // response after submission re-pops the form as if the BVN were rejected.
  const [awaitingValidation, setAwaitingValidation] = useState(false);

  // Transaction + honest "money in" metrics.
  //
  // Under Option A (subaccount split-settlement) the platform holds NO
  // spendable balance — inbound money settles directly to the SME's own bank.
  // So we deliberately do NOT show an "available balance" (that would imply a
  // custody we don't have). Instead we surface accurate, clearly-scoped figures
  // derived from the SME's own recorded activity:
  //   - receivedThisMonth: confirmed inbound sales in the current calendar month
  //   - pendingVerification: auto-captured inbound awaiting the owner's review
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [moneyIn, setMoneyIn] = useState({ receivedThisMonth: 0, pendingVerification: 0 });
  const [showQR, setShowQR] = useState(false);

  // Settlement connection state
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementBank, setSettlementBank] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [connectingSettlement, setConnectingSettlement] = useState(false);
  const [settlementError, setSettlementError] = useState('');

  // fetchDVA / fetchTransactions are declared BEFORE the effects that
  // depend on them (below) and memoized with useCallback so their identity
  // stays stable across renders — required for react-hooks/exhaustive-deps
  // to be satisfiable without refetching on every render.
  const fetchDVA = useCallback(async () => {
    if (!biz) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${biz.id}/dva/virtual-account`);
      const dvaData = res.data.data;
      setDva(dvaData);

      // If we were waiting for validation and now have an active account, celebrate!
      if (awaitingValidation && dvaData.status === 'active') {
        setAwaitingValidation(false);
        toast.success('🎉 Virtual account created! You can now receive payments.');
        fetchBusinesses(); // Refresh business list to update the account number display
      } else if (dvaData.status === 'failed') {
        // Paystack already told us this failed (customeridentification.failed or
        // dedicatedaccount.assign.failed webhook) — stop spinning immediately
        // instead of waiting out the 5-minute client-side timeout below, and
        // show the real reason so the user can fix their details and retry.
        setAwaitingValidation(false);
        setShowBvnForm(true);
        setBvnError(dvaData.message || 'Identity verification failed. Please check your details and try again.');
        toast.error('Identity verification failed — see details below.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load account'));
    } finally {
      setLoading(false);
    }
  }, [biz, awaitingValidation, fetchBusinesses]);

  const fetchTransactions = useCallback(async () => {
    if (!biz) return;
    setLoadingTransactions(true);
    try {
      const [salesRes, paymentsRes] = await Promise.all([
        api.get(`/businesses/${biz.id}/sales`, { params: { page: 1, limit: 50 } }),
        api.get(`/businesses/${biz.id}/tax/payments`, { params: { page: 1, limit: 50 } })
      ]);

      const salesData: SalesApiRow[] = salesRes.data.data || [];
      const paymentsData: PaymentApiRow[] = paymentsRes.data.data || [];

      const salesTxns: Transaction[] = salesData.map((s) => ({
        id: s.id,
        amount: Number(s.amount),
        type: 'inbound' as const,
        status: s.status === 'confirmed' ? 'completed' : 'pending',
        description: s.customerName || s.description || 'Bank transfer',
        date: s.transactionDate,
        referenceId: s.referenceId ?? undefined,
      }));

      const paymentTxns: Transaction[] = paymentsData.map((p) => ({
        id: p.id,
        amount: Number(p.amountPaid),
        type: 'tax_payment' as const,
        status: p.paymentStatus as Transaction['status'],
        description: 'Tax payment',
        date: p.paymentDate || p.createdAt,
        referenceId: p.transactionReference ?? undefined,
      }));

      const allTxns = [...salesTxns, ...paymentTxns].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(allTxns);

      // Honest metrics (Option A — no spendable balance to show).
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const receivedThisMonth = salesTxns
        .filter((t) => t.status === 'completed')
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingVerification = salesTxns
        .filter((t) => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      setMoneyIn({ receivedThisMonth, pendingVerification });
    } catch (err) {
      console.error('Transaction fetch error:', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, [biz]);

  // Initial load whenever the active business changes.
  useEffect(() => {
    if (biz?.id) {
      fetchDVA();
      fetchTransactions();
    }
  }, [biz?.id, fetchDVA, fetchTransactions]);

  useEffect(() => {
    if ((showBvnForm || showSettlementForm) && !banks) {
      setBanksLoading(true);
      api.get('/banks')
        .then((res) => setBanks(res.data.data as Bank[]))
        .catch((err) => setBanksError(getErrorMessage(err, 'Failed to load banks')))
        .finally(() => setBanksLoading(false));
    }
  }, [showBvnForm, showSettlementForm, banks]);

  // Poll for DVA status when awaiting validation
  useEffect(() => {
    if (!awaitingValidation || !biz?.id) return;

    const pollInterval = setInterval(() => {
      fetchDVA();
    }, 10000); // Poll every 10 seconds

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setAwaitingValidation(false);
      toast('Validation is taking longer than expected. Try refreshing the page in a few minutes.', { icon: 'ℹ️' });
    }, 300000); // 5 minutes

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [awaitingValidation, biz?.id, fetchDVA]);

  const handleSetup = async () => {
    if (!biz) return;
    setSettingUp(true);
    setError('');
    try {
      console.log('Attempting setup for business:', biz.id);
      const res = await api.post(`/businesses/${biz.id}/dva/setup-virtual-account`);
      console.log('Setup response:', res.data);
      setDva(res.data.data);
      if (res.data.data.status === 'active') {
        setAwaitingValidation(false);
        toast.success('Virtual account created!');
        fetchBusinesses();
      }
    } catch (rawErr) {
      const err = rawErr as BackendErrorLike;
      console.error('Setup error:', err);
      console.error('Setup error response:', err.response?.data);
      
      const code = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message;
      
      console.error('Error code:', code, 'Message:', errorMessage);
      
      if (code === 'USER_PHONE_REQUIRED') {
        setShowPhoneForm(true);
        toast('Add your phone number to continue.', { icon: 'ℹ️' });
        return;
      }
      const paystackCode = err.response?.data?.error?.details?.paystackCode;
      if (paystackCode === 'validation_required') {
        console.log('✅ Paystack validation required - showing BVN form');
        if (awaitingValidation) {
          // BVN already submitted — Paystack is still verifying. Don't re-pop
          // the form (that reads as a rejection). Keep the waiting state so the
          // user can retry once verification lands (seconds to a couple minutes).
          toast('Still verifying your BVN with your bank. This can take a minute — try again shortly.', { icon: '⏳' });
        } else {
          // Show BVN form with clear instruction
          setShowBvnForm(true);
          setError('');
          toast('Please verify your identity first with BVN', { icon: 'ℹ️' });
        }
        return;
      }
      const mapped = mapPaystackError(err);
      if (mapped.intent === 'inline') setError(`${mapped.title}. ${mapped.body}`);
      else toast.error(mapped.body);
    } finally {
      setSettingUp(false);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\+?[1-9]\d{1,14}$/.test(phone.trim())) {
      setPhoneError('Enter a valid phone number');
      return;
    }
    setSavingPhone(true);
    try {
      await api.patch('/auth/me', { phone: phone.trim() });
      await fetchMe();
      toast.success('Phone saved');
      setShowPhoneForm(false);
      await handleSetup();
    } catch (err) {
      setPhoneError(getErrorMessage(err, 'Failed to save phone'));
    } finally {
      setSavingPhone(false);
    }
  };

  const handleValidateBvn = async (e: React.FormEvent) => {
    e.preventDefault();
    // Real Nigerian BVNs are 11 digits. Paystack's OWN documented test-mode
    // fixture ("222222222221") is 12 digits — rejecting it here made it
    // impossible to ever exercise their officially documented test path.
    if (!/^\d{11,12}$/.test(bvn)) {
      setBvnError('BVN must be 11 or 12 digits');
      return;
    }
    if (nin && !/^\d{11}$/.test(nin)) {
      setBvnError('NIN must be 11 digits');
      return;
    }
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setBvnError('Select bank and enter valid account number');
      return;
    }
    setValidating(true);
    setBvnError('');
    try {
      console.log('Submitting BVN validation:', { 
        businessId: biz!.id,
        bankCode,
        accountNumberLength: accountNumber.length,
        bvnLength: bvn.length,
        hasNin: !!nin
      });
      
      await api.post(`/businesses/${biz!.id}/dva/validate-customer`, { 
        bvn, 
        nin: nin || undefined,
        bankCode, 
        accountNumber 
      });
      
      console.log('BVN validation successful, waiting for Paystack to process...');
      toast.success('Identity submitted! Your account will be ready in 1-2 minutes.');
      setShowBvnForm(false);
      setAwaitingValidation(true);
      
      // Refresh user data to get the BVN stored
      await fetchMe();
      
      // DON'T retry setup immediately - Paystack processes BVN validation
      // asynchronously in live mode (takes seconds to minutes). The webhook
      // will auto-create the DVA once validation completes. Just wait.
      
    } catch (rawErr) {
      const err = rawErr as BackendErrorLike;
      console.error('BVN validation error:', err);
      console.error('Error response:', err.response?.data);
      
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message || 'Validation failed';
      const paystackCode = err.response?.data?.error?.details?.paystackCode;
      
      // Log for debugging
      console.error('Error details:', { errorCode, paystackCode, errorMessage });
      
      // Special handling for "no customer" error - means user needs to click Setup first
      if (errorCode === 'NO_CUSTOMER') {
        setBvnError('Account setup required. Close this form and click "Set Up" first.');
        toast.error('Click "Set Up" button first');
        return;
      }
      
      // Use the Paystack error mapper if available
      const mapped = mapPaystackError(err);
      if (mapped.intent === 'inline') {
        setBvnError(`${mapped.title}: ${mapped.body}`);
      } else {
        setBvnError(errorMessage);
        if (mapped.intent === 'toast') {
          toast.error(mapped.body);
        }
      }
    } finally {
      setValidating(false);
    }
  };

  const handleRequeryDVA = async () => {
    if (!biz) return;
    const toastId = toast.loading('Checking for new transactions...');
    try {
      await api.post(`/businesses/${biz.id}/dva/requery`);
      await fetchTransactions();
      toast.success('Transactions refreshed', { id: toastId });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Requery failed'), { id: toastId });
    }
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied!');
  };

  const handleShare = async () => {
    if (!dva?.accountNumber) return;
    const text = `Pay ${biz?.businessName}\n\nBank: ${dva.bankName || 'Wema Bank'}\nAccount: ${dva.accountNumber}\nName: ${biz?.businessName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `Pay ${biz?.businessName}`, text });
        return;
      } catch {
        // User dismissed the native share sheet, or the platform rejected it
        // (e.g. no share targets installed) — fall back to clipboard below.
      }
    }
    
    navigator.clipboard.writeText(text);
    toast.success('Account details copied');
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownloadStatement = async () => {
    if (!biz) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const toastId = toast.loading('Generating statement...');
    try {
      const res = await api.get(`/businesses/${biz.id}/tax/statements/monthly`, {
        params: { month, year },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement-${biz.businessName}-${month}-${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Statement downloaded', { id: toastId });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Download failed'), { id: toastId });
    }
  };

  const handleResolveSettlement = async () => {
    if (!biz) return;
    if (!/^\d{10}$/.test(settlementAccount)) {
      setSettlementError('Account number must be 10 digits');
      return;
    }
    if (!settlementBank) {
      setSettlementError('Select a bank');
      return;
    }

    setSettlementError('');
    setResolvingAccount(true);
    try {
      const res = await api.post(`/businesses/${biz.id}/dva/settlement/resolve`, {
        bankCode: settlementBank,
        accountNumber: settlementAccount
      });
      setResolvedName(res.data.data.accountName);
    } catch (err) {
      setSettlementError(getErrorMessage(err, 'Failed to verify account'));
    } finally {
      setResolvingAccount(false);
    }
  };

  const handleConnectSettlement = async () => {
    if (!biz || !resolvedName) return;

    setConnectingSettlement(true);
    try {
      const bankName = banks?.find(b => b.code === settlementBank)?.name || '';
      const res = await api.post(`/businesses/${biz.id}/dva/settlement/connect`, {
        bankCode: settlementBank,
        bankName,
        accountNumber: settlementAccount,
        commissionPct: 0
      });
      // If a DVA already existed, the backend tries to retrofit the split onto
      // it. `splitAttached: false` means the bank is saved but money isn't
      // settling yet — tell the SME plainly instead of a blanket success.
      if (res.data?.data?.splitAttached === false && dva?.status === 'active') {
        toast('Bank saved, but we couldn\'t link it to your account yet. Please try again shortly.', { icon: '⚠️' });
      } else {
        toast.success('Payout bank connected! Your money will settle here.');
      }
      setShowSettlementForm(false);
      setSettlementBank('');
      setSettlementAccount('');
      setResolvedName('');
      await fetchBusinesses(true);
    } catch (err) {
      setSettlementError(getErrorMessage(err, 'Connection failed'));
    } finally {
      setConnectingSettlement(false);
    }
  };

  if (!biz) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Building2 className="h-8 w-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Select a business first.</p>
      </div>
    );
  }

  const settlementConnected = !!biz.settlementAccountNumber;

  // Settlement connect form (bank dropdown → account number → verify name →
  // connect). Reused both as the bank-first onboarding step (before a DVA
  // exists) and from the "Settlement Account" manage card. Pure render of
  // existing state/handlers — no new logic.
  const renderSettlementForm = () => (
    <div className="space-y-3">
      {settlementError && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-2">
          <p className="text-xs text-red-700">{settlementError}</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bank</label>
        <BankSelect
          banks={banks}
          loading={banksLoading}
          error={banksError}
          value={settlementBank}
          onChange={(code) => { setSettlementBank(code); setSettlementError(''); setResolvedName(''); }}
        />
      </div>

      <Input
        label="Account number"
        type="text"
        maxLength={10}
        value={settlementAccount}
        onChange={(e) => { setSettlementAccount(e.target.value.replace(/\D/g, '')); setSettlementError(''); setResolvedName(''); }}
        placeholder="0123456789"
      />

      {!resolvedName ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleResolveSettlement} isLoading={resolvingAccount}>
            Verify
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowSettlementForm(false); setSettlementError(''); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-600">Verified</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{resolvedName}</p>
            <p className="text-xs text-gray-500">{banks?.find(b => b.code === settlementBank)?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConnectSettlement} isLoading={connectingSettlement}>
              Connect
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowSettlementForm(false); setResolvedName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Purely presentational progress model for the setup stepper — derived
  // from existing state, doesn't change any request/response logic below.
  const stepBankDone = settlementConnected;
  const stepIdentityDone = !!user?.bvnVerifiedAt;
  const stepAccountDone = dva?.status === 'active';
  const steps = [
    { key: 'bank', label: 'Connect payout bank', icon: Building2, done: stepBankDone },
    { key: 'identity', label: 'Verify identity', icon: ShieldCheck, done: stepIdentityDone },
    { key: 'account', label: 'Activate account', icon: Landmark, done: stepAccountDone },
  ] as const;

  const initials = biz.businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'B';

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account</h1>
          <p className="mt-1 text-sm text-gray-500">Payments, transfers &amp; settlements for {biz.businessName}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { fetchDVA(); fetchTransactions(); }} isLoading={loading || loadingTransactions}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Setup progress — a real stepper instead of two disconnected numbered
          cards. Purely a status readout; each step's own card below still
          owns its interactive form/logic untouched. */}
      {dva?.status !== 'active' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 sm:p-6">
          <div className="flex items-center">
            {steps.map((step, i) => {
              const isCurrent = !step.done && steps.slice(0, i).every((s) => s.done);
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        step.done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isCurrent
                          ? 'border-primary-500 bg-primary-50 text-primary-600'
                          : 'border-gray-200 bg-gray-50 text-gray-300'
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-[11px] font-medium text-center leading-tight max-w-[90px] ${step.done ? 'text-emerald-600' : isCurrent ? 'text-primary-600' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mx-2 sm:mx-3 mb-5 h-0.5 flex-1 rounded-full ${step.done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account + Wallet + Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connect payout bank (bank-first). Shown until a DVA is active;
              once active, settlement is managed from the card in the right
              column. Connecting first means the DVA is born attached so
              money settles straight to the SME's bank. */}
          {dva?.status !== 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${settlementConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600'}`}>
                  {settlementConnected ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Building2 className="h-4.5 w-4.5" />}
                </div>
                <h3 className="text-sm font-bold text-gray-900">Connect your payout bank</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 ml-12">Where your money settles. Connect this first so your virtual account pays straight into your bank.</p>

              {settlementConnected && !showSettlementForm ? (
                <div className="ml-12 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{biz.settlementAccountName}</p>
                    <p className="text-xs text-gray-500">{biz.settlementBankName} •••• {biz.settlementAccountNumber!.slice(-4)}</p>
                  </div>
                  <button onClick={() => { setShowSettlementForm(true); setResolvedName(''); }} className="text-xs font-semibold text-primary-600 hover:text-primary-700">Change</button>
                </div>
              ) : showSettlementForm ? (
                <div className="ml-12">{renderSettlementForm()}</div>
              ) : (
                <div className="ml-12">
                  <Button size="sm" onClick={() => setShowSettlementForm(true)}>
                    <Building2 className="h-4 w-4" /> Connect Bank
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Virtual Account Card */}
          {dva?.status === 'active' ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-6 sm:p-7 text-white shadow-xl shadow-primary-900/30">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-400/20 blur-3xl" />
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between mb-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/10">
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">Dedicated Account</p>
                      <p className="text-sm font-semibold">{dva.bankName || 'Wema Bank'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Verified &amp; Active
                    </span>
                    <span className="text-[11px] text-white/40 font-mono">{biz.merchantId}</span>
                  </div>
                </div>

                <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">Account Number</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.12em]">{dva.accountNumber}</span>
                  <button onClick={() => handleCopy(dva.accountNumber!)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition" aria-label="Copy account number">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/50">Account Name</p>
                    <p className="mt-1 text-sm font-semibold">{biz.businessName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowQR(true)} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition">
                      <QrCode className="h-4 w-4" /> QR Code
                    </button>
                    <button onClick={handleRequeryDVA} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition">
                      <RefreshCw className="h-4 w-4" /> Requery
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition">
                      <Share2 className="h-4 w-4" /> Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                  <p className="text-xs text-gray-400">Loading your account…</p>
                </div>
              ) : error ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-700">{error}</p>
                      <button onClick={() => { setError(''); fetchDVA(); }} className="mt-2 text-sm font-semibold text-red-600 hover:text-red-800">Try again</button>
                    </div>
                  </div>
                </div>
              ) : showPhoneForm ? (
                <form onSubmit={handleSavePhone} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Phone className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Add your phone number</h3>
                  </div>
                  <p className="text-sm text-gray-500 ml-12 -mt-2">Paystack requires a phone number on file before it can verify your identity.</p>
                  <div className="ml-12">
                    <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={phoneError} />
                    <div className="flex gap-2 mt-3">
                      <Button type="submit" isLoading={savingPhone}>Save &amp; continue</Button>
                      <Button variant="ghost" onClick={() => setShowPhoneForm(false)}>Cancel</Button>
                    </div>
                  </div>
                </form>
              ) : awaitingValidation ? (
                <div className="text-center py-10">
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-60" />
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                      <ShieldCheck className="h-7 w-7 text-primary-500" />
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Verifying your identity</h3>
                  <p className="text-sm text-gray-500 mb-1 max-w-sm mx-auto">
                    Your BVN is being verified with Paystack. This usually takes 1-2 minutes, but can take up to 5 minutes.
                  </p>
                  <p className="text-xs text-gray-400 mb-5">We're checking every 10 seconds — feel free to leave this page, your account will appear automatically once verified.</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={fetchDVA} isLoading={loading}><RefreshCw className="h-4 w-4" /> Refresh status</Button>
                    <Button variant="ghost" onClick={() => { setAwaitingValidation(false); setShowBvnForm(true); }}>Re-enter details</Button>
                  </div>
                </div>
              ) : showBvnForm ? (
                <form onSubmit={handleValidateBvn} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 leading-tight">Verify your identity</h3>
                      <p className="text-xs text-gray-500">Required once, before we can issue your virtual account</p>
                    </div>
                  </div>

                  {/* Test mode helper — this is Paystack's OWN documented test-mode
                      fixture (see https://paystack.com/docs/identity-verification/validate-customer/).
                      Any other made-up BVN/account combo will NOT trigger Paystack's
                      simulated success in test mode, and may never resolve. The BVN is
                      genuinely 12 digits per Paystack's docs (real BVNs are 11) — search
                      for bank code "007" below, the exact bank name can vary. */}
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Test mode — use Paystack's exact fixture (anything else won't verify)</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-blue-500">BVN</p>
                        <p className="text-xs font-mono font-semibold text-blue-900">222222222221</p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-blue-500">Bank code</p>
                        <p className="text-xs font-mono font-semibold text-blue-900">007</p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-blue-500">Account</p>
                        <p className="text-xs font-mono font-semibold text-blue-900">0111111111</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-600 mt-2">Search "007" in the bank field below — the exact bank name can vary.</p>
                  </div>

                  {bvnError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-700">{bvnError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    label="BVN"
                    type="text"
                    maxLength={12}
                    value={bvn}
                    onChange={(e) => { setBvn(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                    required
                  />
                  <Input
                    label="NIN (11 digits) — optional"
                    type="text"
                    maxLength={11}
                    value={nin}
                    onChange={(e) => { setNin(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                    placeholder="Recommended for faster verification"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                    <BankSelect banks={banks} loading={banksLoading} error={banksError} value={bankCode} onChange={(code) => { setBankCode(code); setBvnError(''); }} />
                  </div>
                  <Input
                    label="Account number"
                    type="text"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                    placeholder="0123456789"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" isLoading={validating}>Verify identity</Button>
                    <Button variant="ghost" onClick={() => { setShowBvnForm(false); setBvnError(''); }}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
                    <Landmark className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Activate your virtual account</h3>
                  <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">Get a dedicated bank account number that auto-records every transfer as a confirmed sale.</p>
                  {!settlementConnected && (
                    <div className="mx-auto mb-5 max-w-sm flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-left">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      <p className="text-xs text-amber-700">Connect your payout bank above first so money settles to you. You can still set up now and connect later.</p>
                    </div>
                  )}
                  <Button onClick={handleSetup} isLoading={settingUp}><Landmark className="h-4 w-4" /> Activate account</Button>
                </div>
              )}
            </div>
          )}

          {/* Money In — honest metrics (no spendable balance under Option A) */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                    <Wallet className="h-4.5 w-4.5 text-primary-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">Money In</h2>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">This month</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-100 mt-5">
                <div className="px-6 pb-6">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" /> Received</p>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatNaira(moneyIn.receivedThisMonth)}</p>
                </div>
                <div className="px-6 pb-6">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> Pending verification</p>
                  <p className="text-2xl font-bold text-amber-600 tabular-nums">{formatNaira(moneyIn.pendingVerification)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-gray-50 px-6 py-3.5 border-t border-gray-100">
                <Building2 className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                {biz.settlementAccountNumber ? (
                  <p className="text-xs text-gray-600">
                    Payments settle to <span className="font-medium text-gray-900">{biz.settlementAccountName}</span> — {biz.settlementBankName} (••••{biz.settlementAccountNumber.slice(-4)})
                  </p>
                ) : (
                  <p className="text-xs text-gray-600">
                    Money is held by Paystack until you connect a payout bank. <span className="font-medium text-amber-700">Connect one to get paid.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transaction History */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Transaction History</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Most recent activity on this account</p>
                </div>
                <button
                  onClick={() => navigate('/sales')}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium shrink-0"
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {loadingTransactions ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center px-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
                      <TrendingUp className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No transactions yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[220px]">Transfers to your account will show up here the moment they land</p>
                  </div>
                ) : (
                  transactions.slice(0, 10).map((txn) => (
                    <div key={txn.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${txn.type === 'inbound' ? 'bg-emerald-50' : 'bg-primary-50'}`}>
                        {txn.type === 'inbound' ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" /> : <CreditCard className="h-5 w-5 text-primary-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{txn.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(txn.date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${txn.type === 'inbound' ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {txn.type === 'inbound' ? '+' : '-'}{formatNaira(txn.amount)}
                        </p>
                        {txn.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCheck className="h-3 w-3" /> Completed</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3 w-3" /> Pending</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Account Details + Quick Actions + Payment Flow */}
        <div className="space-y-6">
          {/* Account Details — identity + verification status, surfaced up front
              now that the DVA is live so the SME can see everything Paystack
              verified them against in one place. */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{biz.businessName}</h3>
                  <p className="text-xs text-gray-500 font-mono">{biz.merchantId}</p>
                </div>
              </div>
              <dl className="px-6 pb-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-gray-500">Owner</dt>
                  <dd className="text-sm font-medium text-gray-900 text-right">{biz.ownerName}</dd>
                </div>
                {biz.businessType && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-gray-500">Business type</dt>
                    <dd className="text-sm font-medium text-gray-900 capitalize text-right">{biz.businessType}</dd>
                  </div>
                )}
                {user?.phone && (
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-gray-500">Phone</dt>
                    <dd className="text-sm font-medium text-gray-900">{user.phone}</dd>
                  </div>
                )}
              </dl>
              <div className="flex items-center gap-2.5 bg-emerald-50 border-t border-emerald-100 px-6 py-3.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-emerald-700">Identity verified</p>
                  {user?.bvnVerifiedAt && (
                    <p className="text-[11px] text-emerald-600">BVN confirmed {formatDate(user.bvnVerifiedAt)}</p>
                  )}
                </div>
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              </div>
            </div>
          )}

          {/* Quick Actions — compact icon grid, not a stacked list of full-width
              rows. Reads as a set of equally-weighted shortcuts rather than a
              menu, and scans much faster at a glance. */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { key: 'qr', icon: QrCode, label: 'QR Code', color: 'bg-primary-50 text-primary-600', onClick: () => setShowQR(true) },
                  { key: 'statement', icon: Download, label: 'Statement', color: 'bg-emerald-50 text-emerald-600', onClick: handleDownloadStatement },
                  { key: 'share', icon: Share2, label: 'Share', color: 'bg-blue-50 text-blue-600', onClick: handleShare },
                ].map(({ key, icon: Icon, label, color, onClick }) => (
                  <button
                    key={key}
                    onClick={onClick}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 px-2 py-4 hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-0.5 transition"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Flow Diagram */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="mb-5">
                <h3 className="text-sm font-bold text-gray-900">How Payments Work</h3>
                <p className="text-xs text-gray-500 mt-0.5">From bank transfer to tax-ready — fully automatic</p>
              </div>
              <div>
                {[
                  {
                    icon: Phone,
                    label: 'Customer transfers to your account',
                    caption: 'They pay your dedicated account number directly',
                    color: 'bg-blue-500',
                    soft: 'bg-blue-50 text-blue-600',
                  },
                  {
                    icon: CheckCircle2,
                    label: 'Auto-recorded as a confirmed sale',
                    caption: 'No manual entry — it lands in Sales instantly',
                    color: 'bg-emerald-500',
                    soft: 'bg-emerald-50 text-emerald-600',
                  },
                  {
                    icon: Building2,
                    label: 'Settles to your payout bank',
                    caption: 'Moves to the bank account you connected',
                    color: 'bg-purple-500',
                    soft: 'bg-purple-50 text-purple-600',
                  },
                  {
                    icon: TrendingUp,
                    label: 'Counted in your tax reports',
                    caption: 'Rolled into that month\u2019s gross profit automatically',
                    color: 'bg-primary-500',
                    soft: 'bg-primary-50 text-primary-600',
                  },
                ].map(({ icon: Icon, label, caption, color, soft }, i, arr) => (
                  <div key={i} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${soft}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`my-1 w-0.5 flex-1 min-h-[22px] rounded-full ${color} opacity-20`} />
                      )}
                    </div>
                    <div className={`min-w-0 ${i < arr.length - 1 ? 'pb-5' : ''}`}>
                      <p className="text-sm font-medium text-gray-900 pt-1.5">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlement Account */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                  <Building2 className="h-4.5 w-4.5 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Settlement Account</h3>
              </div>

              {settlementConnected && !showSettlementForm ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{biz.settlementAccountName}</p>
                      <p className="text-xs text-gray-500">{biz.settlementBankName} · •••• {biz.settlementAccountNumber!.slice(-4)}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  </div>
                  <button onClick={() => { setShowSettlementForm(true); setResolvedName(''); }} className="text-xs font-semibold text-primary-600 hover:text-primary-700">Change bank</button>
                </div>
              ) : !settlementConnected && !showSettlementForm ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500 mb-4">Connect your bank to receive settlements</p>
                  <Button size="sm" onClick={() => setShowSettlementForm(true)}>
                    <Building2 className="h-4 w-4" /> Connect Bank
                  </Button>
                </div>
              ) : showSettlementForm ? (
                renderSettlementForm()
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && dva?.accountNumber && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-gray-900">Scan to Pay</h3>
              <p className="text-xs text-gray-500 mt-0.5">Share this with a customer for an instant transfer</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-primary-50/40 rounded-2xl p-6 mb-5">
              <div className="bg-white p-4 rounded-xl flex flex-col items-center shadow-sm">
                <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-gray-300 my-12" />}>
                  <QRCode
                    value={`Pay ${biz.businessName}\nBank: ${dva.bankName || 'Wema Bank'}\nAccount: ${dva.accountNumber}\nName: ${biz.businessName}`}
                    size={180}
                    level="M"
                    marginSize={2}
                  />
                </Suspense>
                <p className="text-center font-mono text-xl font-bold text-gray-900 mt-4 tracking-wider">{dva.accountNumber}</p>
                <p className="text-center text-sm text-gray-600 mt-1">{dva.bankName || 'Wema Bank'} · {biz.businessName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleCopy(`${dva.bankName || 'Wema Bank'} - ${dva.accountNumber}`)}>
                <Copy className="h-4 w-4" /> Copy Details
              </Button>
              <Button variant="ghost" onClick={() => setShowQR(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
