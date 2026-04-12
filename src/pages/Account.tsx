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
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';

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

  const [dva, setDva] = useState<DVAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [showBvnForm, setShowBvnForm] = useState(false);
  const [bvn, setBvn] = useState('');
  const [bvnError, setBvnError] = useState('');
  const isMountedRef = useRef(true);

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
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to set up virtual account';
      const code = err.response?.data?.error?.code;
      const details = err.response?.data?.error?.details;

      if (code === 'PAYSTACK_ERROR' && (
        msg.toLowerCase().includes('validate') ||
        msg.toLowerCase().includes('identification') ||
        msg.toLowerCase().includes('not operational') ||
        details?.paystackCode === 'disabled_merchant'
      )) {
        if (details?.paystackCode === 'disabled_merchant') {
          setError('Your Paystack account needs activation. Please check your Paystack dashboard or contact support@paystack.com.');
        } else {
          setShowBvnForm(true);
          setError('');
          toast('Identity verification is required before creating a virtual account.', { icon: 'i' });
        }
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setSettingUp(false);
    }
  };

  const handleValidateBvn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz) return;

    setBvnError('');
    if (!/^\d{11}$/.test(bvn)) {
      setBvnError('BVN must be exactly 11 digits');
      return;
    }

    setValidating(true);
    try {
      await api.post(`/businesses/${biz.id}/dva/validate-customer`, { bvn });
      toast.success('BVN submitted for verification.');
      setShowBvnForm(false);
      setBvn('');

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

          {/* BVN Form */}
          {showBvnForm && !loading && (
            <div className="rounded-md bg-blue-50 border border-blue-100 p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h3 className="text-[13px] font-semibold text-blue-800">Identity Verification Required</h3>
              </div>
              <p className="text-[13px] text-gray-600 mb-4">
                Paystack requires BVN validation before creating a virtual account. Your BVN is securely sent to Paystack and not stored on our servers.
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
                  error={bvnError}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" isLoading={validating}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Verify BVN
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => { setShowBvnForm(false); setBvn(''); setBvnError(''); }}>
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
                <p className="text-[12px] text-gray-500">
                  Any transfer to this account is automatically captured as a confirmed sale for <strong>{biz.businessName}</strong>. Share this with customers for direct payments.
                </p>
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
          {!loading && dva?.status === 'none' && !error && !showBvnForm && (
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
