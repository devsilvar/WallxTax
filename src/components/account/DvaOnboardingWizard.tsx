import React, { useState } from 'react';
import {
  Landmark,
  Zap,
  FileCheck,
  ShieldCheck,
  Loader2,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import PhoneInput from '@/components/ui/PhoneInput.tsx';
import BankSelect from '@/components/BankSelect.tsx';
import type { Bank } from '@/types';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import { mapPaystackError, type BackendErrorLike } from '@/lib/paystack-errors';

export interface DvaOnboardingWizardProps {
  businessId: string;
  businessName: string;
  loading?: boolean;
  dvaStatus?: string;
  dvaMessage?: string;
  banks: Bank[] | null;
  banksLoading?: boolean;
  banksError?: string;
  onSuccess: (dvaData: any) => Promise<void> | void;
  onNeedsValidation: () => void;
  onRefreshMe: () => Promise<void> | void;
}

export const DvaOnboardingWizard: React.FC<DvaOnboardingWizardProps> = ({
  businessId,
  businessName,
  loading = false,
  dvaStatus,
  dvaMessage,
  banks,
  banksLoading = false,
  banksError = '',
  onSuccess,
  onNeedsValidation,
  onRefreshMe,
}) => {
  const [bvn, setBvn] = useState('');
  const [bvnError, setBvnError] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [validating, setValidating] = useState(false);

  // Phone number state
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\+?[1-9]\d{1,14}$/.test(phone.trim())) {
      setPhoneError('Enter a valid phone number');
      return;
    }
    setSavingPhone(true);
    try {
      await api.patch('/auth/me', { phone: phone.trim() });
      await onRefreshMe();
      toast.success('Phone number saved');
      setShowPhoneForm(false);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to save phone';
      setPhoneError(msg);
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
      try {
        const setupRes = await api.post(`/businesses/${businessId}/dva/setup-virtual-account`, {
          bvn,
          bankCode,
          accountNumber,
        });
        if (setupRes.data.data.status === 'active') {
          toast.success('🎉 Dedicated virtual account activated!');
          await onSuccess(setupRes.data.data);
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

        if (code === 'BVN_ALREADY_LINKED') {
          setBvnError('This BVN is already linked to another PayMyTax account.');
          return;
        }

        const isExpectedValidation =
          paystackCode === 'validation_required' ||
          /not been identified|customer.*not.*identified/i.test(
            sErr.response?.data?.error?.message || ''
          );

        if (!isExpectedValidation) {
          const mapped = mapPaystackError(sErr);
          if (mapped.intent === 'inline') setBvnError(`${mapped.title}. ${mapped.body}`);
          else toast.error(mapped.body);
          return;
        }
      }

      await api.post(`/businesses/${businessId}/dva/validate-customer`, {
        bvn,
        bankCode,
        accountNumber,
      });

      toast.success('Verification submitted! Checking with NIBSS.');
      onNeedsValidation();
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

  return (
    <div
      data-testid="dva-onboarding-wizard"
      className="mx-auto max-w-3xl space-y-6 animate-fade-in py-4"
    >
      {/* Hero Explainer Header */}
      <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 p-6 sm:p-8 shadow-xs text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-900 text-white shadow-md">
            <Landmark className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              Activate Your Dedicated Business Account
            </h1>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Get an instant Nigerian NUBAN account number for{' '}
              <span className="font-semibold text-gray-900">{businessName}</span>. Customer
              transfers will be auto-captured and recorded for seamless FIRS tax compliance.
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
              onChange={(fullE164) => {
                setPhone(fullE164);
                setPhoneError('');
              }}
              error={phoneError}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" isLoading={savingPhone}>
                Save &amp; Continue
              </Button>
              <Button variant="ghost" onClick={() => setShowPhoneForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitOnboarding} className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Verify Your Identity</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Per CBN regulations, enter your 11-digit BVN and a bank account in your name to activate your dedicated virtual account.
              </p>
            </div>

            {(bvnError || dvaStatus === 'failed') && (
              <div className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">Verification Alert</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {bvnError || dvaMessage || 'Please check your details and try again.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Input
                label="Bank Verification Number (BVN)"
                type="text"
                maxLength={12}
                value={bvn}
                onChange={(e) => {
                  setBvn(e.target.value.replace(/\D/g, ''));
                  setBvnError('');
                }}
                placeholder="Enter 11-digit BVN"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Dial *565*0# on your registered SIM to check your BVN
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Your Bank</label>
              <BankSelect
                banks={banks}
                loading={banksLoading}
                error={banksError}
                value={bankCode}
                onChange={(code) => {
                  setBankCode(code);
                  setBvnError('');
                }}
              />
            </div>

            <div>
              <Input
                label="Bank Account Number (10 digits)"
                type="text"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ''));
                  setBvnError('');
                }}
                placeholder="0123456789"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">
                The account name on this bank must match your BVN name
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200/60 p-3 text-[11px] text-gray-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Your details are securely encrypted and verified directly via NIBSS.</span>
            </div>

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
};

export default DvaOnboardingWizard;
