import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Landmark, Copy, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  Building2, Share2, ArrowDownLeft, Download,
  Clock, CheckCheck, Phone, ShieldCheck, Lock,
  Search, ChevronRight, Eye, EyeOff, Wallet, ArrowUpRight, ArrowRight,
  Zap, FileCheck, XCircle
} from 'lucide-react';

import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import PhoneInput from '@/components/ui/PhoneInput.tsx';
import BankSelect from '@/components/BankSelect.tsx';

import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Bank, DvaTransactionRow, DvaTransactionsResponse } from '@/types';
import { mapPaystackError, type BackendErrorLike } from '@/lib/paystack-errors';
import TransactionDetailPanel, { type TransactionDetailData } from '@/components/TransactionDetailPanel';
import { useSettlementStore } from '@/stores/settlement.store.ts';
import PayoutWithdrawalModal from '@/components/PayoutWithdrawalModal.tsx';
import PinModal from '@/components/PinModal.tsx';
import StatementExportModal from '@/components/StatementExportModal.tsx';

// Lazy-load QR renderer
const QRCode = lazy(() =>
  import('qrcode.react').then((m) => ({ default: m.QRCodeSVG }))
);

interface DVAData {
  status: 'active' | 'pending' | 'none' | 'failed';
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  message?: string;
  failedAt?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'inbound';
  status: 'completed' | 'pending';
  description: string;
  date: string;
  referenceId?: string;
  needsVerification: boolean;
  customerHint?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const message = (err as BackendErrorLike | undefined)?.response?.data?.error?.message;
  return message || fallback;
}

export default function Account() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);

  const [dva, setDva] = useState<DVAData | null>(() => {
    if (biz?.virtualAccountNumber) {
      return {
        status: 'active',
        accountNumber: biz.virtualAccountNumber,
        bankName: biz.virtualAccountBank || 'Wema Bank',
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !biz?.virtualAccountNumber);
  const [validating, setValidating] = useState(false);
  const [bvn, setBvn] = useState('');
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
  const [awaitingValidation, setAwaitingValidation] = useState(false);

  // Fintech Wallet Balance & Inflows
  const [hideBalance, setHideBalance] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [moneyIn, setMoneyIn] = useState({ totalBalance: 0, receivedThisMonth: 0, pendingVerification: 0 });
  const [txnFilter, setTxnFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<TransactionDetailData | null>(null);

  // Settlement & Payout state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const settlementPreview = useSettlementStore((s) => s.preview);
  const fetchSettlementPreview = useSettlementStore((s) => s.fetchPreview);
  const toggleAutoSplit = useSettlementStore((s) => s.toggleAutoSplit);
  const updatingAutoSplit = useSettlementStore((s) => s.updatingAutoSplit);
  const payoutHistory = useSettlementStore((s) => s.history);
  const fetchPayoutHistory = useSettlementStore((s) => s.fetchHistory);
  const loadingPayoutHistory = useSettlementStore((s) => s.loadingHistory);
  const payoutPagination = useSettlementStore((s) => s.pagination);
  const [showAutoSplitPinModal, setShowAutoSplitPinModal] = useState(false);

  // Tab & search states for Feed
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeFeedTab, setActiveFeedTab] = useState<'inflows' | 'withdrawals'>(
    urlTab === 'withdrawals' ? 'withdrawals' : 'inflows'
  );
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [payoutSearch, setPayoutSearch] = useState('');

  // Settlement connection state
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [settlementBank, setSettlementBank] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [connectingSettlement, setConnectingSettlement] = useState(false);
  const [settlementError, setSettlementError] = useState('');

  const fetchDVA = useCallback(async () => {
    if (!biz) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${biz.id}/dva/virtual-account`);
      const dvaData = res.data.data;
      setDva(dvaData);

      if (dvaData.status === 'active') {
        if (awaitingValidation) {
          setAwaitingValidation(false);
          toast.success('🎉 Dedicated virtual account activated! Ready to receive transfers.');
          fetchBusinesses();
        }
      } else if (dvaData.status === 'failed') {
        setAwaitingValidation(false);
        setBvnError(dvaData.message || 'Identity verification failed. Please check your details and try again.');
        toast.error('Identity verification failed — see details below.');
      } else if (dvaData.status === 'pending') {
        setAwaitingValidation(true);
      }
    } catch (err) {
      console.error('Failed to load DVA:', err);
    } finally {
      setLoading(false);
    }
  }, [biz, awaitingValidation, fetchBusinesses]);

  // Fetch strictly DVA auto-captured inflow transactions
  const fetchTransactions = useCallback(async () => {
    if (!biz) return;
    setLoadingTransactions(true);
    try {
      const res = await api.get<DvaTransactionsResponse>(`/businesses/${biz.id}/dva/transactions`, {
        params: { page: 1, limit: 50 },
      });

      const dvaData: DvaTransactionRow[] = res.data.data || [];

      const dvaTxns: Transaction[] = dvaData.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: 'inbound' as const,
        status: t.needsVerification ? 'pending' : (t.status === 'confirmed' ? 'completed' : 'pending'),
        description: t.customerHint || t.customerName || 'Inbound Transfer',
        date: t.transactionDate,
        referenceId: t.referenceId ?? undefined,
        needsVerification: t.needsVerification,
        customerHint: t.customerHint ?? undefined,
      }));

      setTransactions(dvaTxns);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const totalBalance = dvaTxns
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const receivedThisMonth = dvaTxns
        .filter((t) => t.status === 'completed')
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingVerification = dvaTxns
        .filter((t) => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      setMoneyIn({ totalBalance, receivedThisMonth, pendingVerification });
    } catch (err) {
      console.error('DVA transaction fetch error:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [biz]);

  useEffect(() => {
    if (urlTab === 'withdrawals') {
      setActiveFeedTab('withdrawals');
    } else if (urlTab === 'inflows') {
      setActiveFeedTab('inflows');
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'inflows' | 'withdrawals') => {
    setActiveFeedTab(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    }, { replace: true });
  };

  useEffect(() => {
    if (biz?.id) {
      if (biz.virtualAccountNumber) {
        setDva({
          status: 'active',
          accountNumber: biz.virtualAccountNumber,
          bankName: biz.virtualAccountBank || 'Wema Bank',
        });
      }
      fetchDVA();
      fetchTransactions();
      fetchSettlementPreview(biz.id);
      fetchPayoutHistory(
        biz.id,
        1,
        payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
        payoutSearch
      );
    }
  }, [
    biz?.id,
    biz?.virtualAccountNumber,
    biz?.virtualAccountBank,
    fetchDVA,
    fetchTransactions,
    fetchSettlementPreview,
    fetchPayoutHistory,
    payoutStatusFilter,
    payoutSearch,
  ]);

  // Live background polling when any payout is pending or processing
  useEffect(() => {
    const hasPending = payoutHistory.some((p) => p.status === 'pending' || p.status === 'processing');
    if (!hasPending || !biz?.id) return;

    const pollInterval = setInterval(() => {
      fetchPayoutHistory(
        biz.id,
        payoutPagination.page,
        payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
        payoutSearch
      );
      fetchSettlementPreview(biz.id);
    }, 20000);

    return () => clearInterval(pollInterval);
  }, [payoutHistory, biz?.id, payoutPagination.page, payoutStatusFilter, payoutSearch, fetchPayoutHistory, fetchSettlementPreview]);

  // Always pre-load banks for onboarding or settlement
  useEffect(() => {
    if (!banks) {
      setBanksLoading(true);
      api.get('/banks')
        .then((res) => setBanks(res.data.data as Bank[]))
        .catch((err) => setBanksError(getErrorMessage(err, 'Failed to load banks')))
        .finally(() => setBanksLoading(false));
    }
  }, [banks]);

  // Polling when verification is in flight
  useEffect(() => {
    const isPending = awaitingValidation || dva?.status === 'pending';
    if (!isPending || !biz?.id) return;

    const pollInterval = setInterval(() => {
      fetchDVA();
    }, 10000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setAwaitingValidation(false);
      toast('Verification is taking longer than usual. Try refreshing in a few moments.', { icon: 'ℹ️' });
    }, 300000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [awaitingValidation, dva?.status, biz?.id, fetchDVA]);

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
      toast.success('Phone number saved');
      setShowPhoneForm(false);
    } catch (err) {
      setPhoneError(getErrorMessage(err, 'Failed to save phone'));
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11,12}$/.test(bvn)) {
      setBvnError('BVN must be 11 or 12 digits');
      return;
    }
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setBvnError('Select your bank and enter your 10-digit account number');
      return;
    }

    setValidating(true);
    setBvnError('');

    try {
      // Step 1: Ensure Paystack customer exists (creates code or handles missing phone)
      try {
        const setupRes = await api.post(`/businesses/${biz!.id}/dva/setup-virtual-account`);
        if (setupRes.data.data.status === 'active') {
          setDva(setupRes.data.data);
          setAwaitingValidation(false);
          toast.success('🎉 Dedicated virtual account activated!');
          fetchBusinesses();
          return;
        }
      } catch (setupErr) {
        const sErr = setupErr as BackendErrorLike;
        const code = sErr.response?.data?.error?.code;
        const paystackCode = sErr.response?.data?.error?.details?.paystackCode;

        if (code === 'USER_PHONE_REQUIRED') {
          setShowPhoneForm(true);
          toast('Add your phone number to continue.', { icon: 'ℹ️' });
          return;
        }

        // validation_required / not identified is expected — proceed to validateCustomer
        const isExpectedValidation =
          paystackCode === 'validation_required' ||
          /not been identified|customer.*not.*identified/i.test(sErr.response?.data?.error?.message || '');

        if (!isExpectedValidation) {
          const mapped = mapPaystackError(sErr);
          if (mapped.intent === 'inline') setBvnError(`${mapped.title}. ${mapped.body}`);
          else toast.error(mapped.body);
          return;
        }
      }

      // Step 2: Submit BVN & bank account for NIBSS identity verification
      await api.post(`/businesses/${biz!.id}/dva/validate-customer`, {
        bvn,
        bankCode,
        accountNumber,
      });

      toast.success('Verification submitted! Checking with NIBSS.');
      setAwaitingValidation(true);
      await fetchMe();
      await fetchDVA();
    } catch (rawErr) {
      const err = rawErr as BackendErrorLike;
      const errorMessage = err.response?.data?.error?.message || 'Verification failed';
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

  const displayAccountName = dva?.accountName || biz?.ownerName || biz?.businessName || '';

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  const handleShare = async () => {
    if (!dva?.accountNumber) return;
    const text = `Pay ${biz?.businessName}\nBank: ${dva.bankName || 'Wema Bank'}\nAccount Number: ${dva.accountNumber}\nAccount Name: ${displayAccountName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `Pay ${biz?.businessName}`, text });
        return;
      } catch {
        // Dismiss
      }
    }
    
    navigator.clipboard.writeText(text);
    toast.success('Account details copied to clipboard');
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
      await api.post(`/businesses/${biz.id}/dva/settlement/connect`, {
        bankCode: settlementBank,
        bankName,
        accountNumber: settlementAccount,
        commissionPct: 0
      });
      toast.success('Payout bank linked successfully');
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

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!biz) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Building2 className="h-8 w-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Select a business first.</p>
      </div>
    );
  }

  const renderSettlementForm = () => (
    <div className="space-y-3">
      {settlementError && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-2.5">
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
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleResolveSettlement} isLoading={resolvingAccount}>
            Verify Account
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowSettlementForm(false); setSettlementError(''); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-700">Account Verified</p>
            </div>
            <p className="text-sm font-bold text-gray-900">{resolvedName}</p>
            <p className="text-xs text-gray-600">{banks?.find(b => b.code === settlementBank)?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConnectSettlement} isLoading={connectingSettlement}>
              Save & Link Bank
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowSettlementForm(false); setResolvedName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const isActive = dva?.status === 'active';
  const isVerifying = !isActive && (awaitingValidation || dva?.status === 'pending');

  const filteredTransactions = transactions.filter((t) => {
    if (txnFilter === 'verified' && t.status !== 'completed') return false;
    if (txnFilter === 'pending' && t.status !== 'pending') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchRef = t.referenceId?.toLowerCase().includes(q);
      const matchAmount = String(t.amount).includes(q);
      return matchDesc || matchRef || matchAmount;
    }
    return true;
  });

  // ─── Render Section 1: In-Flight Verification Progress ─────
  const renderVerificationScreen = () => (
    <div className="mx-auto max-w-2xl animate-fade-in py-6 sm:py-10">
      <div className="rounded-2xl border border-gray-200/90 bg-white p-8 sm:p-10 shadow-lg text-center">
        {/* Animated Radar/Shield Icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-60" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 border border-primary-200/80 shadow-xs">
            <ShieldCheck className="h-10 w-10 text-primary-600" />
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Verifying Your Identity</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          Your BVN and bank account details are being cross-verified with NIBSS and Paystack.
        </p>

        {/* 3-Stage Progress Timeline */}
        <div className="my-8 max-w-sm mx-auto rounded-xl bg-gray-50/80 border border-gray-200/70 p-5 text-left space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">Identity Details Submitted</p>
              <p className="text-[11px] text-gray-500">BVN and bank account details received</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary-700">NIBSS &amp; Bank Verification</p>
              <p className="text-[11px] text-gray-500">Matching account name with BVN records in progress</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-400">
              <Landmark className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Dedicated Account Creation</p>
              <p className="text-[11px] text-gray-400">Wema Bank dedicated NUBAN assignment</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-blue-800 max-w-md mx-auto mb-6">
          <p className="leading-relaxed">
            ⏱️ <strong>This typically takes 1–3 minutes.</strong> We are automatically checking the status every 10 seconds. You may safely navigate to other pages — we'll notify you once active!
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={fetchDVA} isLoading={loading} size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Status
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAwaitingValidation(false);
            }}
          >
            Edit Details
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Render Section 2: Onboarding Wizard (Un-Onboarded / Failed) ──
  const renderOnboardingWizard = () => (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in py-4">
      {/* Hero Explainer Header */}
      <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 p-6 sm:p-8 shadow-xs text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-900 text-white shadow-md">
            <Landmark className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Activate Your Dedicated Business Account</h1>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Get an instant Nigerian NUBAN account number for <span className="font-semibold text-gray-900">{biz.businessName}</span>. Customer transfers will be auto-captured and recorded for seamless FIRS tax compliance.
            </p>

            {/* 3 Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-purple-100/80 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <Zap className="h-4 w-4 text-purple-600 shrink-0" />
                <span>Instant Auto-Capture</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero Reconciliation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <ShieldCheck className="h-4 w-4 text-primary-600 shrink-0" />
                <span>FIRS &amp; CBN Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Setup Card */}
      <div className="rounded-2xl border border-gray-200/90 bg-white p-6 sm:p-8 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <p className="text-xs text-gray-500">Loading account status…</p>
          </div>
        ) : showPhoneForm ? (
          /* Phone Number Capture (if missing on User) */
          <form onSubmit={handleSavePhone} className="space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <Phone className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add Phone Number</h3>
                <p className="text-xs text-gray-500">Required by Paystack for identity verification</p>
              </div>
            </div>
            <PhoneInput
              label="Phone number"
              required
              value={phone}
              onChange={(fullE164) => { setPhone(fullE164); setPhoneError(''); }}
              error={phoneError}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" isLoading={savingPhone}>Save &amp; Continue</Button>
              <Button variant="ghost" onClick={() => setShowPhoneForm(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          /* Single Clear BVN + Bank Account Form */
          <form onSubmit={handleSubmitOnboarding} className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Verify Your Identity</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Per CBN regulations, enter your 11-digit BVN and a bank account in your name to activate your dedicated virtual account.
              </p>
            </div>

            {/* Error Message if Failed */}
            {(bvnError || dva?.status === 'failed') && (
              <div className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">Verification Alert</p>
                  <p className="text-xs text-red-700 mt-0.5">{bvnError || dva?.message || 'Please check your details and try again.'}</p>
                </div>
              </div>
            )}

            {/* BVN Input */}
            <div>
              <Input
                label="Bank Verification Number (BVN)"
                type="text"
                maxLength={12}
                value={bvn}
                onChange={(e) => { setBvn(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                placeholder="Enter 11-digit BVN"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Dial *565*0# on your registered SIM to check your BVN</p>
            </div>

            {/* Bank Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Your Bank</label>
              <BankSelect
                banks={banks}
                loading={banksLoading}
                error={banksError}
                value={bankCode}
                onChange={(code) => { setBankCode(code); setBvnError(''); }}
              />
            </div>

            {/* Account Number Input */}
            <div>
              <Input
                label="Bank Account Number (10 digits)"
                type="text"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                placeholder="0123456789"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">The account name on this bank must match your BVN name</p>
            </div>

            {/* Privacy & Security Note */}
            <div className="rounded-lg bg-gray-50 border border-gray-200/60 p-3 text-[11px] text-gray-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Your details are securely encrypted and verified directly via NIBSS.</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto" isLoading={validating}>
                <ShieldCheck className="h-4 w-4" /> Verify &amp; Activate Account
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // ─── Render Section 3: Active Fintech Banking Hub ──────────
  const renderActiveWalletHub = () => (
    <div className="space-y-6">
      {/* ── Active Fintech Banking Hero Card (Balance + Virtual NUBAN) ── */}
      <div className="animate-slide-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 p-6 sm:p-7 text-white shadow-xl shadow-purple-950/25 border border-purple-800/40">
        {/* Ambient Glows */}
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Wallet Balance Display */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-200/80">
              <Wallet className="h-4 w-4 text-purple-300" />
              <span>Wallet Balance</span>
              <button
                type="button"
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1 hover:text-white transition-colors cursor-pointer"
                title={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Big Bold Balance */}
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                {hideBalance ? '₦ ••••••••' : formatNaira(settlementPreview?.availableForWithdrawal ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
              </span>
            </div>

            <p className="text-xs text-purple-200/60 mt-2">
              Available balance for instant withdrawal to your payout bank.
            </p>
          </div>

          {/* Right: Embedded Virtual NUBAN Card & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* NUBAN Box */}
            <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 shadow-inner">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-purple-200/80">
                  <Landmark className="h-3.5 w-3.5" />
                  <span>{dva?.bankName || 'Wema Bank'}</span>
                </div>
                <p className="font-mono text-xl sm:text-2xl font-bold text-white tracking-widest tabular-nums mt-0.5">
                  {dva?.accountNumber}
                </p>
                <div className="mt-0.5 text-[11px] text-purple-300/70 truncate max-w-[200px]">
                  {displayAccountName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(dva?.accountNumber!)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 transition-colors shrink-0 cursor-pointer"
                title="Copy Account Number"
              >
                <Copy className="h-4 w-4 text-purple-200" />
              </button>
            </div>

            {/* Actions: Download Statement & Share Details */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-purple-200" /> Statement
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-purple-950 hover:bg-purple-50 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-purple-700" /> Share Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4-Card Wallet Metric Strip ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Recorded Inflows */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium">Total Inflows</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600 stroke-[2]" />
          </div>
          <p className="text-xl font-bold text-gray-900 tracking-tight tabular-nums font-mono">
            {hideBalance ? '••••••••' : formatNaira(settlementPreview?.totalInflows ?? moneyIn.totalBalance)}
          </p>
          <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCheck className="h-3.5 w-3.5" />
            <span>{transactions.filter((t) => t.status === 'completed').length} completed transfers</span>
          </div>
        </div>

        {/* Card 2: Total Withdrawn */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium">Total Withdrawn</span>
            <ArrowUpRight className="h-4 w-4 text-purple-600 stroke-[2]" />
          </div>
          <p className="text-xl font-bold text-gray-900 tracking-tight tabular-nums font-mono">
            {hideBalance ? '••••••••' : formatNaira(settlementPreview?.totalWithdrawn ?? 0)}
          </p>
          <div className="mt-2 text-xs">
            {(settlementPreview?.pendingWithdrawn ?? 0) > 0 ? (
              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatNaira(settlementPreview!.pendingWithdrawn!)} awaiting approval
              </span>
            ) : (settlementPreview?.totalWithdrawn ?? 0) > 0 ? (
              <span className="text-gray-500">Transferred to payout bank</span>
            ) : (
              <span className="text-gray-500">No payouts requested yet</span>
            )}
          </div>
        </div>

        {/* Card 3: This Month's Inflows */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium">This Month</span>
            <ArrowDownLeft className="h-4 w-4 text-primary-600 stroke-[2]" />
          </div>
          <p className="text-xl font-bold text-gray-900 tracking-tight tabular-nums font-mono">
            {hideBalance ? '••••••••' : formatNaira(moneyIn.receivedThisMonth)}
          </p>
          <div className="mt-2 text-xs text-gray-500">Inflows this calendar month</div>
        </div>

        {/* Card 4: Payout Destination */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium">Payout Bank</span>
            <Building2 className="h-4 w-4 text-gray-500 stroke-[2]" />
          </div>
          <p className="text-base font-bold text-gray-900 truncate">
            {biz.settlementBankName || 'Not Connected'}
          </p>
          <div className="mt-2 text-xs text-gray-500 font-mono">
            {biz.settlementAccountNumber ? `•••• ${biz.settlementAccountNumber.slice(-4)}` : 'Connect bank for payouts'}
          </div>
        </div>
      </div>

      {/* ── Main Content Grid (2 Columns: Inflows + Settlement Rail) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Inflows Transfer History Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
            {/* Dual Feed Header */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleTabChange('inflows')}
                    className={`text-base font-bold transition-colors cursor-pointer pb-0.5 border-b-2 ${
                      activeFeedTab === 'inflows'
                        ? 'border-purple-900 text-gray-900 font-extrabold'
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    Customer Inflows
                  </button>
                  <span className="text-gray-300">/</span>
                  <button
                    type="button"
                    onClick={() => handleTabChange('withdrawals')}
                    className={`text-base font-bold transition-colors cursor-pointer pb-0.5 border-b-2 flex items-center gap-1.5 ${
                      activeFeedTab === 'withdrawals'
                        ? 'border-purple-900 text-gray-900 font-extrabold'
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <span>Withdrawals</span>
                    {payoutHistory.some((p) => p.status === 'pending' || p.status === 'processing') && (
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Pending withdrawal in progress" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {activeFeedTab === 'inflows'
                    ? 'Direct deposits to your dedicated account'
                    : 'Transfers sent to your commercial bank'}
                </p>
              </div>

              {/* Filter Tabs depending on active tab */}
              {activeFeedTab === 'inflows' ? (
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTxnFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      txnFilter === 'all'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All ({transactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnFilter('verified')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      txnFilter === 'verified'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Settled ({transactions.filter((t) => t.status === 'completed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnFilter('pending')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      txnFilter === 'pending'
                        ? 'bg-white text-amber-700 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pending ({transactions.filter((t) => t.status === 'pending').length})
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      payoutStatusFilter === 'all'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('completed')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      payoutStatusFilter === 'completed'
                        ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sent
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('pending')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      payoutStatusFilter === 'pending'
                        ? 'bg-white text-amber-800 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutStatusFilter('failed')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      payoutStatusFilter === 'failed'
                        ? 'bg-white text-rose-800 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Failed
                  </button>
                </div>
              )}
            </div>

            {/* ── Search Bar ──── */}
            {activeFeedTab === 'inflows' ? (
              transactions.length > 0 && (
                <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transfers…"
                    className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )
            ) : (
              (payoutHistory.length > 0 || payoutSearch) && (
                <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                    placeholder="Search by reference, bank, account, or note…"
                    className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                  {payoutSearch && (
                    <button
                      type="button"
                      onClick={() => setPayoutSearch('')}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )
            )}

            {/* ── List Rows (Inflows vs Withdrawals) ──── */}
            <div className="divide-y divide-gray-100">
              {activeFeedTab === 'inflows' ? (
                loadingTransactions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    <p className="text-xs text-gray-500">Loading transfers…</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                      <ArrowDownLeft className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {searchQuery ? 'No matching transfers' : 'No transfers yet'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      {searchQuery
                        ? 'Try different keywords.'
                        : 'Deposits to your dedicated virtual account will appear here instantly.'}
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      onClick={() =>
                        setSelectedTxn({
                          id: txn.id,
                          type: 'dva_inflow',
                          amount: txn.amount,
                          status: txn.status,
                          date: txn.date,
                          referenceId: txn.referenceId,
                          description: txn.description,
                          customerHint: txn.customerHint,
                          needsVerification: txn.needsVerification,
                          businessId: biz?.id || '',
                          virtualAccountNumber: dva?.accountNumber,
                          virtualAccountBank: dva?.bankName,
                        })
                      }
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                        <ArrowDownLeft className="h-4 w-4 stroke-[2]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                            {txn.description}
                          </p>
                          {txn.needsVerification && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 text-[10px] font-medium text-amber-700">
                              Review
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          <span>{formatDate(txn.date)}</span>
                          {txn.referenceId && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[10px] text-gray-400 truncate max-w-[130px]">
                                {txn.referenceId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums font-mono text-emerald-600">
                          +{formatNaira(txn.amount)}
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-1">
                          {txn.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <CheckCheck className="h-3 w-3" /> Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors ml-1" />
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : loadingPayoutHistory ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <p className="text-xs text-gray-500">Loading payout history…</p>
                </div>
              ) : payoutHistory.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 mb-3">
                    <ArrowUpRight className="h-5 w-5 stroke-[2]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {payoutSearch ? 'No matching withdrawals' : 'No withdrawals yet'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    {payoutSearch
                      ? 'Try different keywords or reference numbers.'
                      : 'When you transfer your wallet balance to your bank, your payout history will appear here.'}
                  </p>
                  {!payoutSearch && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowPayoutModal(true)}
                      className="mt-4 text-xs bg-purple-900 hover:bg-purple-950 text-white cursor-pointer"
                    >
                      Withdraw Funds <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              ) : (
                payoutHistory.map((payout) => {
                  const isPending = payout.status === 'pending';
                  const isProcessing = payout.status === 'processing';
                  const isCompleted = payout.status === 'completed';
                  const isFailed = payout.status === 'failed';

                  return (
                    <div
                      key={payout.id}
                      className="px-5 py-4 hover:bg-gray-50/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border mt-0.5 ${
                              isCompleted
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : isFailed
                                ? 'bg-rose-50 border-rose-100 text-rose-600'
                                : 'bg-amber-50 border-amber-100 text-amber-600'
                            }`}
                          >
                            <ArrowUpRight className="h-4 w-4 stroke-[2]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {payout.narration || `Payout to ${payout.destinationBankName}`}
                              </p>
                              {isPending && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  <Clock className="h-3 w-3" /> Awaiting Approval
                                </span>
                              )}
                              {isProcessing && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Processing
                                </span>
                              )}
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <CheckCheck className="h-3 w-3" /> Sent to Bank
                                </span>
                              )}
                              {isFailed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                  <XCircle className="h-3 w-3" /> Failed
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 flex-wrap">
                              <span>
                                {payout.destinationBankName} · •••• {payout.destinationAccountNum?.slice(-4)}
                              </span>
                              <span>·</span>
                              <span>{formatDate(payout.initiatedAt)}</span>
                              <span>·</span>
                              <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                {payout.transferReference}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(payout.transferReference);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                  title="Copy Reference"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </span>
                            </div>

                            {isFailed && payout.failureReason && (
                              <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200/80 p-2 text-xs text-rose-800 flex items-start gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                                <span className="text-[11px] font-medium">{payout.failureReason}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums font-mono text-gray-900">
                            −{formatNaira(payout.amount)}
                          </p>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            <span>Net: {formatNaira(payout.netAmount)}</span>
                            {payout.fee > 0 && (
                              <span className="text-gray-400 ml-1">({formatNaira(payout.fee)} fee)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination for Withdrawals */}
            {activeFeedTab === 'withdrawals' && payoutPagination.totalPages > 1 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Page {payoutPagination.page} of {payoutPagination.totalPages} ({payoutPagination.total} total)
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={payoutPagination.page <= 1}
                    onClick={() =>
                      fetchPayoutHistory(
                        biz?.id!,
                        payoutPagination.page - 1,
                        payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
                        payoutSearch
                      )
                    }
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded font-medium disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={payoutPagination.page >= payoutPagination.totalPages}
                    onClick={() =>
                      fetchPayoutHistory(
                        biz?.id!,
                        payoutPagination.page + 1,
                        payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
                        payoutSearch
                      )
                    }
                    className="px-2.5 py-1 bg-white border border-gray-200 rounded font-medium disabled:opacity-40 cursor-pointer hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Settlement & Identity Rail */}
        <div className="space-y-6">
          {/* Settlement Account Card */}
          <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Payout Bank</h3>
              </div>
              {biz.settlementAccountNumber && !showSettlementForm && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Linked
                </span>
              )}
            </div>

            {biz.settlementAccountNumber && !showSettlementForm ? (
              <div className="space-y-4">
                {/* Bank Details Pill */}
                <div className="rounded-xl bg-gray-50 border border-gray-200/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-900">{biz.settlementAccountName}</p>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 font-mono">
                    {biz.settlementBankName} · •••• {biz.settlementAccountNumber?.slice(-4)}
                  </p>
                </div>

                {/* Available for Instant Withdrawal Box */}
                <div className="rounded-xl bg-purple-50/60 border border-purple-100 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-900 font-semibold">Wallet Balance</span>
                    <span className="font-mono font-bold text-purple-950 text-sm">
                      {formatNaira(settlementPreview?.availableForWithdrawal ?? 0)}
                    </span>
                  </div>
                  {settlementPreview && settlementPreview.totalInflows > 0 && (
                    <div className="space-y-1 border-t border-purple-200/60 pt-1.5 text-[10px] text-purple-800/80">
                      <div className="flex justify-between">
                        <span>Total Inflows:</span>
                        <span className="font-semibold">{formatNaira(settlementPreview.totalInflows)}</span>
                      </div>
                      {settlementPreview.totalSplitSettled > 0 && (
                        <div className="flex justify-between items-center" title="Auto-routed directly to your bank account by Paystack via daily T+1 settlement">
                          <span>Auto-routed to bank (T+1):</span>
                          <span className="font-semibold">{formatNaira(settlementPreview.totalSplitSettled)}</span>
                        </div>
                      )}
                      {(settlementPreview.estimatedProcessingFees ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Paystack DVA fee (1%):</span>
                          <span className="font-semibold">−{formatNaira(settlementPreview.estimatedProcessingFees ?? 0)}</span>
                        </div>
                      )}
                      {settlementPreview.totalWithdrawn > 0 && (
                        <div className="flex justify-between">
                          <span>Withdrawn to bank:</span>
                          <span className="font-semibold text-purple-950">−{formatNaira(settlementPreview.totalWithdrawn)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPayoutModal(true)}
                    disabled={!biz.settlementAccountNumber}
                    className="w-full text-xs bg-purple-900 hover:bg-purple-950 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Withdraw Funds <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                {/* Auto-Split 7.5% Tax Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">7.5% Tax Auto-Split</p>
                    <p className="text-[10px] text-gray-500">Set aside 7.5% of every transfer for tax</p>
                  </div>
                  <button
                    type="button"
                    disabled={updatingAutoSplit}
                    onClick={() => setShowAutoSplitPinModal(true)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      settlementPreview?.autoSplit.enabled ? 'bg-purple-800' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        settlementPreview?.autoSplit.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Payout Bank Lock Notice */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 mt-3">
                  <div className="flex items-start gap-2">
                    <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-900">Bank Account Locked</p>
                      <p className="mt-0.5 text-blue-700">
                        Your payout bank is locked for security. Contact support if you need to change it.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !biz.settlementAccountNumber && !showSettlementForm ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-3">
                  Connect your Nigerian bank account to receive automatic transfers.
                </p>
                <Button size="sm" onClick={() => setShowSettlementForm(true)} className="w-full text-xs">
                  <Building2 className="h-3.5 w-3.5" /> Connect Bank
                </Button>
              </div>
            ) : (
              renderSettlementForm()
            )}
          </div>

          {/* Compliance & Verification Status */}
          <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs p-5 sm:p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Compliance &amp; Tier</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Business</span>
                <span className="font-semibold text-gray-900 truncate max-w-[150px]">{biz.businessName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Identity (BVN)</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {user?.bvnVerifiedAt ? 'Verified Tier 2' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-gray-500">Tax Status</span>
                <span className="font-semibold text-gray-800">FIRS Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-16">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Wallet &amp; Inflows</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Dedicated account for <span className="font-semibold text-gray-800">{biz.businessName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { fetchDVA(); fetchTransactions(); }}
            isLoading={loading || loadingTransactions}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {isActive && (
            <Link to="/transactions">
              <Button size="sm" variant="secondary" className="text-xs">
                Transaction History <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Mutually Exclusive State Rendering ────────────────── */}
      {loading && !dva ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl border border-gray-200/80 bg-white p-12 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-xs text-gray-500">Loading your account details…</p>
        </div>
      ) : isActive ? (
        renderActiveWalletHub()
      ) : isVerifying ? (
        renderVerificationScreen()
      ) : (
        renderOnboardingWizard()
      )}

      {/* ── Modals ────────────────────────────────────────────── */}

      {/* ── Scan to Pay QR Modal ─────────────────────────────── */}
      {showQR && dva?.accountNumber && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <h3 className="text-base font-bold text-gray-900">Scan to Transfer</h3>
              <p className="text-xs text-gray-500 mt-0.5">Show this to a customer to receive an instant transfer</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-100">
              <div className="bg-white p-4 rounded-lg flex flex-col items-center shadow-xs">
                <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-gray-300 my-12" />}>
                  <QRCode
                    value={`Pay ${biz.businessName}\nBank: ${dva.bankName || 'Wema Bank'}\nAccount Number: ${dva.accountNumber}\nAccount Name: ${displayAccountName}`}
                    size={170}
                    level="M"
                    marginSize={2}
                  />
                </Suspense>
                <p className="text-center font-mono text-2xl font-bold text-gray-900 mt-4 tracking-widest tabular-nums">{dva.accountNumber}</p>
                <p className="text-center text-xs text-gray-600 mt-1">{dva.bankName || 'Wema Bank'} · <span className="font-semibold text-gray-900">{displayAccountName}</span></p>

              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 text-xs" onClick={() => handleCopy(`${dva.bankName || 'Wema Bank'} - ${dva.accountNumber}`)}>
                <Copy className="h-3.5 w-3.5" /> Copy Details
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowQR(false)} className="text-xs">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Detail Slide-Over ─────────────────────── */}
      <TransactionDetailPanel
        isOpen={Boolean(selectedTxn)}
        onClose={() => setSelectedTxn(null)}
        transaction={selectedTxn}
        onVerifySuccess={() => {
          if (biz?.id) {
            // Refetch transactions after verification or reclassification
            api.get<DvaTransactionsResponse>(`/businesses/${biz.id}/dva/transactions`, {
              params: { page: 1, limit: 50 },
            }).then((res) => {
              const dvaData: DvaTransactionRow[] = res.data.data || [];
              setTransactions(
                dvaData.map((d: DvaTransactionRow) => ({
                  id: d.id,
                  amount: typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount,
                  type: 'inbound' as const,
                  status: (d.status === 'confirmed' || d.status === 'completed') ? 'completed' : 'pending',
                  description: d.customerName ? `From ${d.customerName}` : d.customerHint ? `Transfer - ${d.customerHint}` : 'Virtual Account Transfer',
                  date: d.transactionDate || d.createdAt,
                  referenceId: d.referenceId || undefined,
                  needsVerification: d.needsVerification,
                  customerHint: d.customerHint || undefined,
                }))
              );
            }).catch(() => {});
          }
        }}
      />

      {/* ── Statement Export Modal ────────────────────────────── */}
      {/* ── Instant Balance Withdrawal Modal ───────────────────── */}
      {biz?.id && (
        <PayoutWithdrawalModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          businessId={biz.id}
          onSuccess={() => {
            fetchDVA();
            fetchTransactions();
            fetchSettlementPreview(biz.id);
            fetchPayoutHistory(biz.id);
            handleTabChange('withdrawals');
          }}
        />
      )}

      {/* ── Auto-Split PIN Verification Modal ────────────────────── */}
      {biz?.id && (
        <PinModal
          isOpen={showAutoSplitPinModal}
          onClose={() => setShowAutoSplitPinModal(false)}
          onSuccess={async (stepUpToken: string) => {
            setShowAutoSplitPinModal(false);
            if (biz?.id) {
              await toggleAutoSplit(biz.id, {
                enabled: !settlementPreview?.autoSplit.enabled,
                stepUpToken,
              });
            }
          }}
          title="Confirm Auto-Split Update"
          description={`Enter your 4-digit transaction PIN to ${
            settlementPreview?.autoSplit.enabled ? 'disable' : 'enable'
          } 7.5% tax auto-split.`}
        />
      )}

      {/* ── Statement Export Modal ────────────────────── */}
      {biz?.id && (
        <StatementExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          businessId={biz.id}
          businessName={biz.businessName}
        />
      )}
    </div>
  );
}
