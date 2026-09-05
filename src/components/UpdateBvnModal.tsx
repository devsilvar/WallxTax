import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, ShieldCheck, X, PhoneCall } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';

interface UpdateBvnModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepUpToken: string;
  currentBvnLast4?: string | null;
  onSuccess?: () => void;
}

export default function UpdateBvnModal({
  isOpen,
  onClose,
  stepUpToken,
  currentBvnLast4,
  onSuccess,
}: UpdateBvnModalProps) {
  const [bvn, setBvn] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (isOpen) {
      setBvn('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBvnChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 11);
    setBvn(cleaned);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{11}$/.test(bvn)) {
      setError('Please enter a valid 11-digit Nigerian BVN');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        meta?: { dvaReauthRequired?: boolean; bvnLast4?: string };
      }>('/auth/update-bvn', {
        bvn,
        stepUpToken,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'BVN linked successfully');
        await fetchMe();
        if (res.data.meta?.dvaReauthRequired) {
          toast('Your virtual account was verified against your previous BVN. Please re-verify identity if required.', {
            icon: 'ℹ️',
            duration: 6000,
          });
        }
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message || 'Failed to update BVN';

      if (errCode === 'BVN_ALREADY_LINKED') {
        setError('This BVN is already linked to another PayMyTax account.');
      } else if (errCode === 'INVALID_STEP_UP_TOKEN') {
        setError('PIN authentication expired. Please close this modal and enter your PIN again.');
      } else {
        setError(errMsg);
      }
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 sm:p-7 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-primary-600 mb-3 shadow-xs">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">
            {currentBvnLast4 ? 'Update Bank Verification Number' : 'Link Bank Verification Number'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
            Per CBN &amp; FIRS compliance, enter your 11-digit personal BVN.
          </p>
        </div>

        {/* Currently linked indicator */}
        {currentBvnLast4 && (
          <div className="mt-4 p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Currently linked:</span>
            <span className="font-mono font-bold text-gray-800">{currentBvnLast4}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              11-Digit BVN <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 22222222221"
              value={bvn}
              onChange={(e) => handleBvnChange(e.target.value)}
              maxLength={11}
              disabled={submitting}
              className="font-mono text-base tracking-wider"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* USSD Check Tip */}
          <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100/80 flex items-start gap-2.5 text-xs text-purple-900">
            <PhoneCall className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-purple-950">Don't remember your BVN?</span>
              <p className="text-purple-700 text-[11px] mt-0.5">
                Dial <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-purple-200">*565*0#</span> from your registered phone number.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            isLoading={submitting}
            disabled={bvn.length !== 11 || submitting}
            className="w-full py-2.5 text-sm font-semibold rounded-xl shadow-xs"
          >
            Save BVN
          </Button>

          {/* Security & Regulatory Footer */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Encrypted &amp; Protected under NDPR Standards</span>
          </div>
        </form>
      </div>
    </div>
  );
}
