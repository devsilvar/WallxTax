import { useState } from 'react';
import {
  ShieldCheck,
  X,
  CreditCard,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import PinModal from '@/components/PinModal';
import { formatNaira } from '@/lib/format';
import { usePinStore } from '@/stores/pin.store';
import { useDashboardEvents } from '@/stores/dashboard.store';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { Business, TaxReport } from '@/types';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TaxReport | null;
  business: Business | null;
  onSuccess?: () => void;
}

export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  report,
  business,
  onSuccess,
}: PaymentConfirmationModalProps) {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasPin = usePinStore((s) => s.hasPin);
  const invalidateDashboard = useDashboardEvents((s) => s.invalidateDashboard);

  if (!isOpen || !report || !business) return null;

  const monthName = new Date(report.taxMonth).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });

  const handleAuthorizeClick = () => {
    if (hasPin) {
      setIsPinModalOpen(true);
    } else {
      // Proceed directly if no PIN configured yet
      executePayment();
    }
  };

  const executePayment = async () => {
    setIsLoading(true);
    try {
      const res = await api.post(`/businesses/${business.id}/tax/pay`, {
        taxReportId: report.id,
      });

      const { authorizationUrl } = res.data.data;
      if (authorizationUrl) {
        toast.success('Redirecting to Paystack secured checkout...');
        invalidateDashboard('tax_paid');
        if (onSuccess) onSuccess();
        onClose();
        // Redirect to Paystack
        window.location.href = authorizationUrl;
      } else {
        toast.error('Could not obtain payment checkout URL');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to initiate payment. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSuccess = (_token: string) => {
    setIsPinModalOpen(false);
    executePayment();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div
          className="relative w-full max-w-lg overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-primary-800 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
                  <ShieldCheck className="h-6 w-6 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Tax Remittance Assessment</h2>
                  <p className="text-xs text-emerald-100">Official FIRS SME Compliance Bill</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Taxpayer Meta */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="font-semibold text-gray-900">{business.businessName}</span>
                {business.taxId && (
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700 font-mono">
                    TIN: {business.taxId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-medium text-gray-700">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>{monthName}</span>
              </div>
            </div>

            {/* Assessment Breakdown Table */}
            <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
              <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 font-semibold text-gray-700 flex justify-between text-xs tracking-wider uppercase">
                <span>Assessment Line</span>
                <span>Amount (NGN)</span>
              </div>
              <div className="divide-y divide-gray-100 px-4 py-2">
                <div className="flex justify-between py-2 text-gray-600">
                  <span>Total Sales Revenue</span>
                  <span className="font-medium text-gray-900">{formatNaira(report.totalSales)}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-600">
                  <span>Allowable Deductible Expenses</span>
                  <span className="font-medium text-red-600">- {formatNaira(report.totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-700 font-medium">
                  <span>Net Assessable Gross Profit</span>
                  <span className="text-gray-900">{formatNaira(report.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-600">
                  <span>Applied SME Statutory Tax Rate</span>
                  <span className="font-mono font-medium text-emerald-700">7.50%</span>
                </div>
              </div>

              {/* Total Due Pill */}
              <div className="bg-emerald-50 px-4 py-3.5 border-t border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Total Tax Remittance Due
                  </span>
                  <span className="text-[11px] text-emerald-600">Directly remitted to FIRS</span>
                </div>
                <span className="text-xl font-black text-emerald-700">
                  {formatNaira(report.taxPayable)}
                </span>
              </div>
            </div>

            {/* Payment Channel Guarantee */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
              <CreditCard className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-950">Paystack Secured Payment Gateway</p>
                <p className="text-blue-800/80 mt-0.5">
                  Supports Nigerian Debit Cards (Mastercard, Visa, Verve), Direct Bank Transfer, and USSD. Official FIRS payment receipts are generated automatically.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5"
                onClick={handleAuthorizeClick}
                isLoading={isLoading}
              >
                {hasPin ? <Lock className="h-4 w-4 mr-1.5" /> : null}
                Authorize &amp; Pay {formatNaira(report.taxPayable)}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Digit PIN Verification Step-Up */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        title="Authorize Tax Remittance"
        subtitle={`Enter your 4-digit PIN to authorize payment of ${formatNaira(report.taxPayable)} for ${monthName}.`}
      />
    </>
  );
}
