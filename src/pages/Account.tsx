import { useEffect, useState, lazy, Suspense } from 'react';
import {
  Landmark, Copy, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  Building2, Share2, Wallet, TrendingUp, ArrowDownLeft, QrCode, Download,
  CreditCard, Clock, CheckCheck, Phone
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import BankSelect from '@/components/BankSelect.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Bank } from '@/types';
import { mapPaystackError } from '@/lib/paystack-errors';

// Lazy-load the QR renderer so qrcode.react stays out of the main bundle —
// it only mounts when the "Scan to Pay" modal opens. The library exposes
// QRCodeSVG as a named export; remap to default for React.lazy.
const QRCode = lazy(() =>
  import('qrcode.react').then((m) => ({ default: m.QRCodeSVG }))
);

interface DVAData {
  status: 'active' | 'pending' | 'none';
  accountNumber?: string;
  bankName?: string;
  message?: string;
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

  useEffect(() => {
    if (biz?.id) {
      fetchDVA();
      fetchTransactions();
    }
  }, [biz?.id]);

  useEffect(() => {
    if ((showBvnForm || showSettlementForm) && !banks) {
      setBanksLoading(true);
      api.get('/banks')
        .then((res) => setBanks(res.data.data as Bank[]))
        .catch((err) => setBanksError(err.response?.data?.error?.message || 'Failed to load banks'))
        .finally(() => setBanksLoading(false));
    }
  }, [showBvnForm, showSettlementForm, banks]);

  const fetchDVA = async () => {
    if (!biz) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${biz.id}/dva/virtual-account`);
      setDva(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!biz) return;
    setLoadingTransactions(true);
    try {
      const [salesRes, paymentsRes] = await Promise.all([
        api.get(`/businesses/${biz.id}/sales`, { params: { page: 1, limit: 50 } }),
        api.get(`/businesses/${biz.id}/tax/payments`, { params: { page: 1, limit: 50 } })
      ]);

      const salesData = salesRes.data.data || [];
      const paymentsData = paymentsRes.data.data || [];

      const salesTxns: Transaction[] = salesData.map((s: any) => ({
        id: s.id,
        amount: Number(s.amount),
        type: 'inbound' as const,
        status: s.status === 'confirmed' ? 'completed' : 'pending',
        description: s.customerName || s.description || 'Bank transfer',
        date: s.transactionDate,
        referenceId: s.referenceId
      }));

      const paymentTxns: Transaction[] = paymentsData.map((p: any) => ({
        id: p.id,
        amount: Number(p.amountPaid),
        type: 'tax_payment' as const,
        status: p.paymentStatus,
        description: 'Tax payment',
        date: p.paymentDate || p.createdAt,
        referenceId: p.transactionReference
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
    } catch (err: any) {
      console.error('Transaction fetch error:', err.response?.data || err);
      toast.error('Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSetup = async () => {
    if (!biz) return;
    setSettingUp(true);
    setError('');
    try {
      const res = await api.post(`/businesses/${biz.id}/dva/setup-virtual-account`);
      setDva(res.data.data);
      if (res.data.data.status === 'active') {
        setAwaitingValidation(false);
        toast.success('Virtual account created!');
        fetchBusinesses();
      }
    } catch (err: any) {
      const code = err.response?.data?.error?.code;
      if (code === 'USER_PHONE_REQUIRED') {
        setShowPhoneForm(true);
        toast('Add your phone number to continue.', { icon: 'ℹ️' });
        return;
      }
      const paystackCode = err.response?.data?.error?.details?.paystackCode;
      if (paystackCode === 'validation_required') {
        if (awaitingValidation) {
          // BVN already submitted — Paystack is still verifying. Don't re-pop
          // the form (that reads as a rejection). Keep the waiting state so the
          // user can retry once verification lands (seconds to a couple minutes).
          toast('Still verifying your BVN with your bank. This can take a minute — try again shortly.', { icon: '⏳' });
        } else {
          setShowBvnForm(true);
          toast('Identity verification required.', { icon: 'ℹ️' });
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
    } catch (err: any) {
      setPhoneError(err.response?.data?.error?.message || 'Failed to save phone');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleValidateBvn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(bvn)) {
      setBvnError('BVN must be 11 digits');
      return;
    }
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setBvnError('Select bank and enter valid account number');
      return;
    }
    setValidating(true);
    try {
      await api.post(`/businesses/${biz!.id}/dva/validate-customer`, { bvn, bankCode, accountNumber });
      toast.success('BVN submitted for verification');
      setShowBvnForm(false);
      // Paystack verifies asynchronously — mark that we're now waiting so a
      // validation_required on the retry shows a "still verifying" state
      // instead of re-popping the form.
      setAwaitingValidation(true);
      setTimeout(() => handleSetup(), 3000);
    } catch (err: any) {
      setBvnError(err.response?.data?.error?.message || 'Validation failed');
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
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Requery failed', { id: toastId });
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
      } catch {}
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
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Download failed', { id: toastId });
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
    } catch (err: any) {
      setSettlementError(err.response?.data?.error?.message || 'Failed to verify account');
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
    } catch (err: any) {
      setSettlementError(err.response?.data?.error?.message || 'Connection failed');
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
          <p className="mt-1 text-sm text-gray-500">Payments, transfers & settlements for {biz.businessName}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { fetchDVA(); fetchTransactions(); }} isLoading={loading || loadingTransactions}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account + Wallet + Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1 — Connect payout bank (bank-first). Shown until a DVA is
              active; once active, settlement is managed from the card in the
              right column. Connecting first means the DVA is born attached so
              money settles straight to the SME's bank. */}
          {dva?.status !== 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">1</span>
                <h3 className="text-sm font-bold text-gray-900">Connect your payout bank</h3>
                {settlementConnected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>
              <p className="text-xs text-gray-500 mb-4 ml-8">Where your money settles. Connect this first so your virtual account pays straight into your bank.</p>

              {settlementConnected && !showSettlementForm ? (
                <div className="ml-8 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{biz.settlementAccountName}</p>
                    <p className="text-xs text-gray-500">{biz.settlementBankName} •••• {biz.settlementAccountNumber!.slice(-4)}</p>
                  </div>
                  <button onClick={() => { setShowSettlementForm(true); setResolvedName(''); }} className="text-xs font-medium text-primary-600 hover:text-primary-700">Change</button>
                </div>
              ) : showSettlementForm ? (
                <div className="ml-8">{renderSettlementForm()}</div>
              ) : (
                <div className="ml-8">
                  <Button size="sm" onClick={() => setShowSettlementForm(true)}>
                    <Building2 className="h-4 w-4" /> Connect Bank
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Virtual Account Card */}
          {dva?.status === 'active' ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-primary-900 p-6 text-white shadow-xl">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-white/50">Dedicated Account</p>
                      <p className="text-sm font-semibold">{dva.bankName || 'Wema Bank'}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">Account Number</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-3xl font-bold tracking-[0.15em]">{dva.accountNumber}</span>
                    <button onClick={() => handleCopy(dva.accountNumber!)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/40">Account Name</p>
                    <p className="mt-1 text-sm font-semibold">{biz.businessName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowQR(true)} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition">
                      <QrCode className="h-4 w-4" /> QR Code
                    </button>
                    <button onClick={handleRequeryDVA} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 transition">
                      <RefreshCw className="h-4 w-4" /> Requery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
              ) : error ? (
                <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700">{error}</p>
                      <button onClick={() => { setError(''); fetchDVA(); }} className="mt-2 text-sm text-red-600 hover:text-red-800">Try again</button>
                    </div>
                  </div>
                </div>
              ) : showPhoneForm ? (
                <form onSubmit={handleSavePhone} className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Add phone number</h3>
                  <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={phoneError} />
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={savingPhone}>Save</Button>
                    <Button variant="ghost" onClick={() => setShowPhoneForm(false)}>Cancel</Button>
                  </div>
                </form>
              ) : awaitingValidation ? (
                <div className="text-center py-8">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Verifying your identity</h3>
                  <p className="text-sm text-gray-500 mb-1 max-w-sm mx-auto">
                    Your BVN was submitted and Paystack is confirming it with your bank. This usually takes under a minute.
                  </p>
                  <p className="text-xs text-gray-400 mb-4">You can leave this page — the account appears here once verified.</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={handleSetup} isLoading={settingUp}><RefreshCw className="h-4 w-4" /> Check again</Button>
                    <Button variant="ghost" onClick={() => { setAwaitingValidation(false); setShowBvnForm(true); }}>Re-enter details</Button>
                  </div>
                </div>
              ) : showBvnForm ? (
                <form onSubmit={handleValidateBvn} className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Identity Verification</h3>
                  <Input label="BVN (11 digits)" type="text" maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                    <BankSelect banks={banks} loading={banksLoading} error={banksError} value={bankCode} onChange={setBankCode} />
                  </div>
                  <Input label="Account number" type="text" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} error={bvnError} />
                  <div className="flex gap-2">
                    <Button type="submit" isLoading={validating}>Verify</Button>
                    <Button variant="ghost" onClick={() => setShowBvnForm(false)}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">2</span>
                    <h3 className="font-semibold text-gray-900">Set up your virtual account</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Get a dedicated bank account that auto-records every transfer as a sale</p>
                  {!settlementConnected && (
                    <div className="mx-auto mb-5 max-w-sm flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-left">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      <p className="text-xs text-amber-700">Connect your payout bank above first so money settles to you. You can still set up now and connect later.</p>
                    </div>
                  )}
                  <Button onClick={handleSetup} isLoading={settingUp}><Landmark className="h-4 w-4" /> Set Up</Button>
                </div>
              )}
            </div>
          )}

          {/* Money In — honest metrics (no spendable balance under Option A) */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-primary-50/30 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary-600" />
                  <h2 className="text-base font-bold text-gray-900">Money In</h2>
                </div>
                <span className="text-[11px] text-gray-400">This month</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Received</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNaira(moneyIn.receivedThisMonth)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pending verification</p>
                  <p className="text-2xl font-bold text-amber-600">{formatNaira(moneyIn.pendingVerification)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Building2 className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                {biz.settlementAccountNumber ? (
                  <p className="text-xs text-gray-600">
                    Payments settle to <span className="font-medium text-gray-900">{biz.settlementAccountName}</span> — {biz.settlementBankName} (••••{biz.settlementAccountNumber.slice(-4)})
                  </p>
                ) : (
                  <p className="text-xs text-gray-600">
                    Money is held by Paystack until you connect a payout bank below. <span className="font-medium text-amber-700">Connect one to get paid.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transaction History */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Transaction History</h2>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</button>
              </div>
              <div className="divide-y divide-gray-100">
                {loadingTransactions ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center px-6">
                    <TrendingUp className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-900">No transactions yet</p>
                    <p className="text-xs text-gray-500 mt-1">Transfers to your account will appear here</p>
                  </div>
                ) : (
                  transactions.slice(0, 10).map((txn) => (
                    <div key={txn.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${txn.type === 'inbound' ? 'bg-emerald-50' : 'bg-primary-50'}`}>
                        {txn.type === 'inbound' ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" /> : <CreditCard className="h-5 w-5 text-primary-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{txn.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(txn.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${txn.type === 'inbound' ? 'text-emerald-600' : 'text-gray-900'}`}>
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

        {/* Right Column: Quick Actions + Payment Flow */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => setShowQR(true)} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition text-left">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                    <QrCode className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Generate QR Code</p>
                    <p className="text-xs text-gray-500">Share for easy payments</p>
                  </div>
                </button>
                <button onClick={handleDownloadStatement} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition text-left">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Download className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Download Statement</p>
                    <p className="text-xs text-gray-500">Export current month PDF</p>
                  </div>
                </button>
                <button onClick={handleShare} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition text-left">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Share2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Share Details</p>
                    <p className="text-xs text-gray-500">Send account info</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Payment Flow Diagram */}
          {dva?.status === 'active' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">How Payments Work</h3>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: 'Customer transfers to your account', color: 'bg-blue-50 text-blue-600' },
                  { icon: CheckCircle2, label: 'Auto-recorded as confirmed sale', color: 'bg-emerald-50 text-emerald-600' },
                  { icon: Building2, label: 'Settles to your bank', color: 'bg-purple-50 text-purple-600' },
                  { icon: TrendingUp, label: 'Counted in tax reports', color: 'bg-primary-50 text-primary-600' }
                ].map(({ icon: Icon, label, color }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-xs text-gray-600">{label}</p>
                      {i < 3 && <div className="mt-2 ml-4 h-4 w-px bg-gray-200" />}
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
                <Building2 className="h-5 w-5 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-900">Settlement Account</h3>
              </div>

              {settlementConnected && !showSettlementForm ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Bank</p>
                    <p className="text-sm font-medium text-gray-900">{biz.settlementBankName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Account</p>
                    <p className="text-sm font-medium text-gray-900">{biz.settlementAccountName}</p>
                    <p className="text-xs text-gray-500 font-mono">•••• {biz.settlementAccountNumber!.slice(-4)}</p>
                  </div>
                  <button onClick={() => { setShowSettlementForm(true); setResolvedName(''); }} className="text-xs font-medium text-primary-600 hover:text-primary-700">Change bank</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Scan to Pay</h3>
            <div className="bg-gray-100 rounded-xl p-6 mb-4">
              <div className="bg-white p-4 rounded-lg flex flex-col items-center">
                <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin text-gray-300 my-12" />}>
                  <QRCode
                    value={`Pay ${biz.businessName}\nBank: ${dva.bankName || 'Wema Bank'}\nAccount: ${dva.accountNumber}\nName: ${biz.businessName}`}
                    size={180}
                    level="M"
                    marginSize={2}
                  />
                </Suspense>
                <p className="text-center font-mono text-xl font-bold text-gray-900 mt-4">{dva.accountNumber}</p>
                <p className="text-center text-sm text-gray-600 mt-1">{dva.bankName || 'Wema Bank'} · {biz.businessName}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => handleCopy(`${dva.bankName || 'Wema Bank'} - ${dva.accountNumber}`)}>
              <Copy className="h-4 w-4" /> Copy Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
