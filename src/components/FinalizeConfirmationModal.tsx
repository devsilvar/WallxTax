import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatNaira } from '@/lib/format';
import type { TaxReport } from '@/types';

interface FinalizeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TaxReport | null;
  onConfirm: () => Promise<void> | void;
}

export default function FinalizeConfirmationModal({
  isOpen,
  onClose,
  report,
  onConfirm,
}: FinalizeConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !report) return null;

  const monthName = new Date(report.taxMonth).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={isLoading ? undefined : onClose} />

      {/* Dialog Container */}
      <div
        className="relative z-10 w-full max-w-md flex flex-col rounded-none bg-white shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-none bg-amber-500 text-white">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">Finalize Tax Report</h2>
              <p className="text-xs text-gray-500">{monthName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-none border border-transparent p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            You're about to finalize the tax report for <strong>{monthName}</strong>. Please confirm the numbers below are correct.
          </p>

          <div className="rounded-none border border-gray-200 overflow-hidden text-xs bg-white">
            <div className="divide-y divide-gray-100 px-4 py-1.5">
              <div className="flex justify-between py-2 text-gray-600">
                <span>Total Sales</span>
                <span className="font-medium text-gray-900">{formatNaira(report.totalSales)}</span>
              </div>
              <div className="flex justify-between py-2 text-gray-600">
                <span>Total Expenses</span>
                <span className="font-medium text-gray-900">{formatNaira(report.totalExpenses)}</span>
              </div>
              <div className="flex justify-between py-2 text-gray-700 font-medium">
                <span>Gross Profit</span>
                <span className="text-gray-900">{formatNaira(report.grossProfit)}</span>
              </div>
            </div>
            <div className="bg-amber-50 px-4 py-3 border-t border-amber-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Tax Payable</span>
              <span className="text-base font-bold text-amber-900 font-mono">{formatNaira(report.taxPayable)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-none border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-950">
            <Lock className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Finalizing locks sales and expenses for {monthName} from further edits. You can still
              <strong> Un-finalize</strong> later if you need to make a correction — but once this report is paid,
              it's locked permanently and can no longer be un-finalized.
            </p>
          </div>
        </div>

        {/* Pinned Action Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-none text-xs"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Yes, Finalize {monthName}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
