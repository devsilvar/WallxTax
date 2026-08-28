import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Landmark, Copy, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  Building2, Share2, ArrowDownLeft, Download,
  Clock, CheckCheck, Phone, ShieldCheck,
  Search, ChevronRight, ChevronLeft, Eye, EyeOff, Wallet, ArrowUpRight,
  BookOpen, ArrowRight, Receipt
} from 'lucide-react';

import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import PhoneInput from '@/components/ui/PhoneInput.tsx';
import BankSelect from '@/components/BankSelect.tsx';

import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useLedgerStore } from '@/stores/ledger.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Bank, DvaTransactionRow, DvaTransactionsResponse } from '@/types';
import { mapPaystackError, type BackendErrorLike } from '@/lib/paystack-errors';
import TransactionDetailPanel, { type TransactionDetailData } from '@/components/TransactionDetailPanel';
import StatementExportModal from '@/components/StatementExportModal';
import { useSettlementStore } from '@/stores/settlement.store.ts';
import PayoutWithdrawalModal from '@/components/PayoutWithdrawalModal.tsx';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [salesChannelFilter, setSalesChannelFilter] = useState<'all' | 'dva' | 'cash_pos' | 'invoices'>('all');

  // URL Tab Support (?tab=wallet | ?tab=ledger)
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'ledger' ? 'ledger' : 'wallet';

  // Ledger Store State
  const ledgerItems = useLedgerStore((s) => s.items);
  const ledgerSummary = useLedgerStore((s) => s.summary);
  const ledgerScope = useLedgerStore((s) => s.scope);
  const ledgerType = useLedgerStore((s) => s.typeFilter);
  const ledgerSearch = useLedgerStore((s) => s.searchQuery);
  const ledgerLoading = useLedgerStore((s) => s.loading);
  const ledgerPagination = useLedgerStore((s) => s.pagination);
  const fetchLedger = useLedgerStore((s) => s.fetchLedger);
  const setLedgerScope = useLedgerStore((s) => s.setScope);
  const setLedgerType = useLedgerStore((s) => s.setTypeFilter);
  const setLedgerSearch = useLedgerStore((s) => s.setSearchQuery);
  const setLedgerPage = useLedgerStore((s) => s.setPage);

  // Settlement & Payout state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const settlementPreview = useSettlementStore((s) => s.preview);
  const fetchSettlementPreview = useSettlementStore((s) => s.fetchPreview);
  const toggleAutoSplit = useSettlementStore((s) => s.toggleAutoSplit);
  const updatingAutoSplit = useSettlementStore((s) => s.updatingAutoSplit);

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

      if (awaitingValidation && dvaData.status === 'active') {
        setAwaitingValidation(false);
        toast.success('🎉 Virtual account activated! Ready to receive transfers.');
        fetchBusinesses();
      } else if (dvaData.status === 'failed') {
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
      toast.error('Failed to load wallet transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, [biz]);

  useEffect(() => {
    if (biz?.id) {
      fetchDVA();
      fetchTransactions();
      fetchSettlementPreview(biz.id);
    }
  }, [biz?.id, fetchDVA, fetchTransactions, fetchSettlementPreview]);

  useEffect(() => {
    if ((showBvnForm || showSettlementForm) && !banks) {
      setBanksLoading(true);
      api.get('/banks')
        .then((res) => setBanks(res.data.data as Bank[]))
        .catch((err) => setBanksError(getErrorMessage(err, 'Failed to load banks')))
        .finally(() => setBanksLoading(false));
    }
  }, [showBvnForm, showSettlementForm, banks]);

  useEffect(() => {
    if (biz?.id && activeTab === 'ledger') {
      fetchLedger(biz.id);
    }
  }, [biz?.id, activeTab, fetchLedger]);

  useEffect(() => {
    if (!awaitingValidation || !biz?.id) return;

    const pollInterval = setInterval(() => {
      fetchDVA();
    }, 10000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setAwaitingValidation(false);
      toast('Validation is taking longer than expected. Try refreshing the page in a few minutes.', { icon: 'ℹ️' });
    }, 300000);

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
      const res = await api.post(`/businesses/${biz.id}/dva/setup-virtual-account`);
      setDva(res.data.data);
      if (res.data.data.status === 'active') {
        setAwaitingValidation(false);
        toast.success('Virtual account activated!');
        fetchBusinesses();
      }
    } catch (rawErr) {
      const err = rawErr as BackendErrorLike;
      const code = err.response?.data?.error?.code;
      const paystackCode = err.response?.data?.error?.details?.paystackCode;
      
      if (code === 'USER_PHONE_REQUIRED') {
        setShowPhoneForm(true);
        toast('Add your phone number to continue.', { icon: 'ℹ️' });
        return;
      }
      if (paystackCode === 'validation_required') {
        if (awaitingValidation) {
          toast('Still verifying your BVN with your bank. Try again shortly.', { icon: '⏳' });
        } else {
          setShowBvnForm(true);
          setError('');
          toast('Verify identity with BVN to proceed', { icon: 'ℹ️' });
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
      toast.success('Phone number saved');
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
    if (!/^\d{11,12}$/.test(bvn)) {
      setBvnError('BVN must be 11 or 12 digits');
      return;
    }
    if (nin && !/^\d{11}$/.test(nin)) {
      setBvnError('NIN must be 11 digits');
      return;
    }
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setBvnError('Select bank and enter account number');
      return;
    }
    setValidating(true);
    setBvnError('');
    try {
      await api.post(`/businesses/${biz!.id}/dva/validate-customer`, { 
        bvn, 
        nin: nin || undefined,
        bankCode, 
        accountNumber 
      });
      toast.success('Verification submitted! Processing with bank.');
      setShowBvnForm(false);
      setAwaitingValidation(true);
      await fetchMe();
    } catch (rawErr) {
      const err = rawErr as BackendErrorLike;
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message || 'Validation failed';
      
      if (errorCode === 'NO_CUSTOMER') {
        setBvnError('Account setup required. Close this form and click "Activate" first.');
        toast.error('Click Activate first');
        return;
      }
      
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

  const settlementConnected = !!biz.settlementAccountNumber;

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

  const stepBankDone = settlementConnected;
  const stepIdentityDone = !!user?.bvnVerifiedAt;
  const stepAccountDone = dva?.status === 'active';
  const steps = [
    { key: 'bank', label: 'Connect payout bank', icon: Building2, done: stepBankDone },
    { key: 'identity', label: 'Verify identity', icon: ShieldCheck, done: stepIdentityDone },
    { key: 'account', label: 'Activate account', icon: Landmark, done: stepAccountDone },
  ] as const;

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

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-16">
      {/* ── Minimalist Page Header ────────────────────────────── */}
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Bank Statement
          </Button>
          <Link to="/sales">
            <Button size="sm" variant="secondary" className="text-xs">
              Sales Ledger <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Tab Switcher ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-px">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'wallet' })}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'wallet'
              ? 'border-primary-600 text-primary-600 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Digital Account &amp; NUBAN</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'ledger' })}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-primary-600 text-primary-600 bg-primary-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Financial Ledger &amp; Statements</span>
        </button>
      </div>

      {/* ── Wallet Tab Content ─────────────────────────────────── */}
      {activeTab === 'wallet' && (
        <>
          {/* ── Onboarding Stepper (if not active yet) ───────────────── */}
          {dva?.status !== 'active' && (
        <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs p-5 sm:p-6">
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
                          ? 'border-primary-600 bg-primary-50 text-primary-600'
                          : 'border-gray-200 bg-gray-50 text-gray-300'
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-[11px] font-medium text-center leading-tight max-w-[90px] ${step.done ? 'text-emerald-600' : isCurrent ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
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

      {/* ── Active Fintech Banking Hero Card (Balance + Virtual NUBAN) ── */}
      {dva?.status === 'active' && (
        <div className="animate-slide-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 p-6 sm:p-7 text-white shadow-xl shadow-purple-950/25 border border-purple-800/40">
          {/* Ambient Glows */}
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-10 h-40 w-40 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Wallet Balance Display */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-purple-200/80">
                <Wallet className="h-4 w-4 text-purple-300" />
                <span>Wallet Inflow Balance</span>
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
                  {hideBalance ? '₦ ••••••••' : formatNaira(moneyIn.totalBalance)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              </div>

              <p className="text-xs text-purple-200/60 mt-2">
                All direct customer bank transfers auto-captured and recorded for tax compliance.
              </p>
            </div>

            {/* Right: Embedded Virtual NUBAN Card & Single Clean Share Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* NUBAN Box */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 shadow-inner">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-200/80">
                    <Landmark className="h-3.5 w-3.5" />
                    <span>{dva.bankName || 'Wema Bank'}</span>
                  </div>
                  <p className="font-mono text-xl sm:text-2xl font-bold text-white tracking-widest tabular-nums mt-0.5">
                    {dva.accountNumber}
                  </p>
                  <div className="mt-0.5 text-[11px] text-purple-300/70 truncate max-w-[200px]">
                    {displayAccountName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(dva.accountNumber!)}
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
      )}

      {/* ── 4-Card Wallet Metric Strip (Refined & Minimalist) ──── */}
      {dva?.status === 'active' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Recorded Inflows */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">Total Inflows</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600 stroke-[2]" />
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight tabular-nums font-mono">
              {hideBalance ? '••••••••' : formatNaira(moneyIn.totalBalance)}
            </p>
            <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" />
              <span>{transactions.filter(t => t.status === 'completed').length} completed transfers</span>
            </div>
          </div>

          {/* Card 2: This Month's Inflows */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">This Month</span>
              <ArrowUpRight className="h-4 w-4 text-primary-600 stroke-[2]" />
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight tabular-nums font-mono">
              {hideBalance ? '••••••••' : formatNaira(moneyIn.receivedThisMonth)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              Current calendar month
            </div>
          </div>

          {/* Card 3: Pending Inflow Review */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs hover:border-gray-300 transition-all">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">Pending Review</span>
              <Clock className="h-4 w-4 text-amber-500 stroke-[2]" />
            </div>
            <p className="text-xl font-bold text-amber-600 tracking-tight tabular-nums font-mono">
              {hideBalance ? '••••••••' : formatNaira(moneyIn.pendingVerification)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {transactions.filter(t => t.status === 'pending').length} transfer(s) awaiting check
            </div>
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
      )}

      {/* ── Main Content Grid (2 Columns) ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Inflows Feed OR Setup */}
        <div className="lg:col-span-2 space-y-6">
          {/* Setup / Identity Verification Card (when DVA not active) */}
          {dva?.status !== 'active' && (
            <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <p className="text-xs text-gray-500">Loading virtual account status…</p>
                </div>
              ) : error ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{error}</p>
                      <button onClick={() => { setError(''); fetchDVA(); }} className="mt-2 text-xs font-semibold text-red-700 hover:underline">Try again</button>
                    </div>
                  </div>
                </div>
              ) : showPhoneForm ? (
                <form onSubmit={handleSavePhone} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Phone className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Add phone number</h3>
                      <p className="text-xs text-gray-500">Required before Paystack can verify your identity</p>
                    </div>
                  </div>
                  <PhoneInput
                    label="Phone number"
                    required
                    value={phone}
                    onChange={(fullE164) => { setPhone(fullE164); setPhoneError(''); }}
                    error={phoneError}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={savingPhone}>Save &amp; continue</Button>
                    <Button variant="ghost" onClick={() => setShowPhoneForm(false)}>Cancel</Button>
                  </div>
                </form>
              ) : awaitingValidation ? (
                <div className="text-center py-10">
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-60" />
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                      <ShieldCheck className="h-7 w-7 text-primary-600" />
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Verifying Identity with Bank</h3>
                  <p className="text-xs text-gray-500 mb-1 max-w-sm mx-auto">
                    Your BVN is being verified with Paystack &amp; NIBSS. This usually takes 1-2 minutes.
                  </p>
                  <p className="text-[11px] text-gray-400 mb-5">We are auto-checking every 10 seconds — you may safely leave this page.</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={fetchDVA} isLoading={loading} size="sm"><RefreshCw className="h-3.5 w-3.5" /> Refresh Status</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setAwaitingValidation(false); setShowBvnForm(true); }}>Re-enter details</Button>
                  </div>
                </div>
              ) : showBvnForm ? (
                <form onSubmit={handleValidateBvn} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 leading-tight">Verify Identity (BVN)</h3>
                      <p className="text-xs text-gray-500">Required once to activate your dedicated virtual account</p>
                    </div>
                  </div>

                  {bvnError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                      <p className="text-xs text-red-700">{bvnError}</p>
                    </div>
                  )}

                  <Input
                    label="BVN (11 or 12 digits)"
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
                    placeholder="Optional for faster verification"
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank</label>
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
                    <Button type="submit" isLoading={validating}>Verify Identity</Button>
                    <Button variant="ghost" onClick={() => { setShowBvnForm(false); setBvnError(''); }}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
                    <Landmark className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Activate Dedicated Virtual Account</h3>
                  <p className="text-xs text-gray-500 mb-5 max-w-sm mx-auto">
                    Get an instant NUBAN account number that auto-records incoming bank transfers as sales.
                  </p>
                  <Button onClick={handleSetup} isLoading={settingUp}>
                    <Landmark className="h-4 w-4" /> Activate Virtual Account
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Inflow Transfers Feed ─────────────────────────── */}
          {dva?.status === 'active' && (
            <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
              {/* Feed Header */}
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Transfer History</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Direct deposits to your virtual account
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTxnFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
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
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      txnFilter === 'verified'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Settled ({transactions.filter(t => t.status === 'completed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnFilter('pending')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      txnFilter === 'pending'
                        ? 'bg-white text-amber-700 shadow-xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pending ({transactions.filter(t => t.status === 'pending').length})
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              {transactions.length > 0 && (
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
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* List Rows */}
              <div className="divide-y divide-gray-100">
                {loadingTransactions ? (
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
                )}
              </div>
            </div>
          )}
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
              {settlementConnected && !showSettlementForm && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Linked
                </span>
              )}
            </div>

            {settlementConnected && !showSettlementForm ? (
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
                    <span className="text-purple-900 font-medium">Available to Withdraw</span>
                    <span className="font-mono font-bold text-purple-950 text-sm">
                      {formatNaira(settlementPreview?.availableForWithdrawal ?? 0)}
                    </span>
                  </div>
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
                    <p className="text-[10px] text-gray-500">Retain tax in escrow on inflow</p>
                  </div>
                  <button
                    type="button"
                    disabled={updatingAutoSplit}
                    onClick={() =>
                      biz?.id &&
                      toggleAutoSplit(biz.id, {
                        enabled: !settlementPreview?.autoSplit.enabled,
                      })
                    }
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowSettlementForm(true); setResolvedName(''); }}
                  className="w-full text-xs text-gray-500 hover:text-gray-900"
                >
                  Change Settlement Bank
                </Button>
              </div>
            ) : !settlementConnected && !showSettlementForm ? (
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

          {/* Business & Identity Verification Status */}
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
      </>
      )}

      {/* ── Financial Ledger Tab Content ──────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-6 animate-fade-in">
          {/* Scope Selector Card */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ledger View Scope</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Switch between dedicated digital bank movements and total sales revenue
              </p>
            </div>

            <div className="inline-flex rounded-lg bg-gray-100 p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => biz?.id && setLedgerScope(biz.id, 'dva_bank')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  ledgerScope === 'dva_bank'
                    ? 'bg-white text-gray-900 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Landmark className="h-3.5 w-3.5 text-purple-700" />
                <span>Virtual Bank Account (DVA)</span>
              </button>
              <button
                type="button"
                onClick={() => biz?.id && setLedgerScope(biz.id, 'all_income')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  ledgerScope === 'all_income'
                    ? 'bg-white text-gray-900 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Receipt className="h-3.5 w-3.5 text-indigo-700" />
                <span>All Sales &amp; Revenue</span>
              </button>
            </div>
          </div>

          {/* 4-Card Summary Strip */}
          {ledgerScope === 'dva_bank' ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-200/70 bg-gradient-to-b from-gray-50/50 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Opening Balance</p>
                <p className="text-lg font-bold text-gray-800 font-mono mt-1">{formatNaira(ledgerSummary.openingBalance)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Balance brought forward</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Money Received (+)</p>
                <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
                  {ledgerSummary.totalCredits > 0 ? `+${formatNaira(ledgerSummary.totalCredits)}` : formatNaira(0)}
                </p>
                <p className="text-[10px] text-emerald-600/70 mt-0.5">Bank transfers received</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tax Remitted (-)</p>
                <p className={`text-lg font-bold font-mono mt-1 ${ledgerSummary.totalDebits > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {ledgerSummary.totalDebits > 0 ? `-${formatNaira(ledgerSummary.totalDebits)}` : formatNaira(0)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">FIRS tax debits</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xs text-white">
                <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Digital Bank Balance</p>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{formatNaira(ledgerSummary.closingBalance)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Current Wema DVA balance</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Total Recorded Sales</p>
                <p className="text-lg font-bold text-purple-900 font-mono mt-1">{formatNaira(ledgerSummary.totalCredits)}</p>
                <p className="text-[10px] text-purple-600/70 mt-0.5">Gross revenue across all channels</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Digital Transfers (DVA)</p>
                <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
                  {ledgerItems.filter((it) => it.sourceType === 'dva_transfer').reduce((s, it) => s + it.amount, 0) > 0
                    ? `+${formatNaira(ledgerItems.filter((it) => it.sourceType === 'dva_transfer').reduce((s, it) => s + it.amount, 0))}`
                    : formatNaira(0)}
                </p>
                <p className="text-[10px] text-emerald-600/70 mt-0.5">Auto-captured bank transfers</p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Cash &amp; POS Sales</p>
                <p className="text-lg font-bold text-blue-600 font-mono mt-1">
                  {ledgerItems.filter((it) => it.sourceType === 'manual_sale' || it.sourceType === 'pos').reduce((s, it) => s + it.amount, 0) > 0
                    ? `+${formatNaira(ledgerItems.filter((it) => it.sourceType === 'manual_sale' || it.sourceType === 'pos').reduce((s, it) => s + it.amount, 0))}`
                    : formatNaira(0)}
                </p>
                <p className="text-[10px] text-blue-600/70 mt-0.5">Physical till &amp; POS collections</p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Invoice Settlements</p>
                <p className="text-lg font-bold text-indigo-600 font-mono mt-1">
                  {ledgerItems.filter((it) => it.sourceType === 'invoice_payment').reduce((s, it) => s + it.amount, 0) > 0
                    ? `+${formatNaira(ledgerItems.filter((it) => it.sourceType === 'invoice_payment').reduce((s, it) => s + it.amount, 0))}`
                    : formatNaira(0)}
                </p>
                <p className="text-[10px] text-indigo-600/70 mt-0.5">Paid customer invoices</p>
              </div>
            </div>
          )}

          {/* Ledger Table Container */}
          <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gray-50/50">
              {/* Type Filter */}
              {ledgerScope === 'dva_bank' ? (
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => biz?.id && setLedgerType(biz.id, 'all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      ledgerType === 'all' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All Movements ({ledgerPagination.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => biz?.id && setLedgerType(biz.id, 'credit')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      ledgerType === 'credit' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Money Received (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => biz?.id && setLedgerType(biz.id, 'debit')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      ledgerType === 'debit' ? 'bg-white text-red-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tax Remitted (-)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setSalesChannelFilter('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      salesChannelFilter === 'all' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All Channels ({ledgerPagination.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesChannelFilter('dva')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      salesChannelFilter === 'dva' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Bank Transfers (DVA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesChannelFilter('cash_pos')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      salesChannelFilter === 'cash_pos' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Cash &amp; POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesChannelFilter('invoices')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      salesChannelFilter === 'invoices' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Invoices
                  </button>
                </div>
              )}

              {/* Search Box */}
              <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => biz?.id && setLedgerSearch(biz.id, e.target.value)}
                  placeholder="Search narration, reference, counterparty…"
                  className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => biz?.id && setLedgerSearch(biz.id, '')}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Rows Feed */}
            <div className="divide-y divide-gray-100">
              {ledgerLoading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <p className="text-xs text-gray-500 font-medium">Loading financial ledger…</p>
                </div>
              ) : ledgerItems.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                    <BookOpen className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">No ledger entries found</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Transactions and settlements for this business will be recorded here automatically.
                  </p>
                </div>
              ) : (
                (ledgerScope === 'all_income' && salesChannelFilter !== 'all'
                  ? ledgerItems.filter((it) => {
                      if (salesChannelFilter === 'dva') return it.sourceType === 'dva_transfer';
                      if (salesChannelFilter === 'cash_pos') return it.sourceType === 'manual_sale' || it.sourceType === 'pos';
                      if (salesChannelFilter === 'invoices') return it.sourceType === 'invoice_payment';
                      return true;
                    })
                  : ledgerItems
                ).map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      setSelectedTxn({
                        id: item.id,
                        type:
                          item.sourceType === 'tax_payment'
                            ? 'tax_payment'
                            : item.sourceType === 'invoice_payment'
                            ? 'invoice_payment'
                            : 'dva_inflow',
                        amount: item.amount,
                        status: item.status,
                        date: item.date,
                        referenceId: item.reference,
                        description: item.description,
                        customerHint: item.counterparty,
                        customerName: item.counterparty,
                        paymentMethod: item.sourceType,
                        businessId: biz?.id || '',
                        virtualAccountNumber: dva?.accountNumber,
                        virtualAccountBank: dva?.bankName,
                      })
                    }
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                        item.entryType === 'credit'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-100'
                          : 'bg-red-50 border-red-100 text-red-600 group-hover:bg-red-100'
                      } transition-colors`}
                    >
                      {item.entryType === 'credit' ? (
                        <ArrowDownLeft className="h-4 w-4 stroke-[2]" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 stroke-[2]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                          {item.description}
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">
                          {item.classification}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                        <span>{formatDate(item.date)}</span>
                        <span>·</span>
                        <span className="text-gray-700 font-medium truncate max-w-[140px]">{item.counterparty}</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]">{item.reference}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold tabular-nums font-mono ${
                          item.entryType === 'credit' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {item.entryType === 'credit' ? '+' : '-'}
                        {formatNaira(item.amount)}
                      </p>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                        Bal: <span className="font-semibold text-gray-700">{formatNaira(item.runningBalance)}</span>
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {ledgerPagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <span className="text-xs text-gray-500">
                  Page {ledgerPagination.page} of {ledgerPagination.totalPages} ({ledgerPagination.total} entries)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!ledgerPagination.hasPrev}
                    onClick={() => biz?.id && setLedgerPage(biz.id, ledgerPagination.page - 1)}
                    className="text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!ledgerPagination.hasNext}
                    onClick={() => biz?.id && setLedgerPage(biz.id, ledgerPagination.page + 1)}
                    className="text-xs cursor-pointer"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
      <StatementExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        businessId={biz?.id || ''}
        businessName={biz?.businessName || ''}
      />

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
          }}
        />
      )}
    </div>
  );
}
