import { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export type TransactionDetailType = 'dva_inflow' | 'tax_payment' | 'invoice_payment';

export interface TransactionDetailData {
  id: string;
  type: TransactionDetailType;
  amount: number | string;
  status: string;
  date: string;
  referenceId?: string | null;
  description?: string;
  customerName?: string | null;
  customerHint?: string | null;
  paymentMethod?: string | null;
  // DVA specific
  needsVerification?: boolean;
  verifiedAt?: string | null;
  // Tax payment specific
  taxReportId?: string;
  taxMonthLabel?: string;
  remittanceStatus?: 'collected' | 'remitting' | 'remitted' | string;
  firsRemittanceRef?: string | null;
  firsReceiptUrl?: string | null;
  // Business context
  businessId: string;
  virtualAccountNumber?: string;
  virtualAccountBank?: string;
}

interface TransactionDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionDetailData | null;
  onVerifySuccess?: () => void;
}

function formatNaira(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount || 0);
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TransactionDetailPanel({
  isOpen,
  onClose,
  transaction,
  onVerifySuccess,
}: TransactionDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  if (!isOpen || !transaction) return null;

  const isDva = transaction.type === 'dva_inflow';
  const isTax = transaction.type === 'tax_payment';

  const copyReference = () => {
    const ref = transaction.referenceId || transaction.id;
    navigator.clipboard.writeText(ref);
    setCopied(true);
    toast.success('Reference copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = async () => {
    try {
      setDownloading(true);
      const endpoint = isTax
        ? `/businesses/${transaction.businessId}/receipts/tax-payments/${transaction.id}`
        : `/businesses/${transaction.businessId}/receipts/dva-transfers/${transaction.id}`;

      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Receipt-${transaction.referenceId || transaction.id}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  const handleVerifyAsSales = async () => {
    try {
      setVerifying(true);
      await api.post(`/businesses/${transaction.businessId}/sales/${transaction.id}/verify`);
      toast.success('Confirmed as taxable sales revenue');
      onVerifySuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to verify transaction');
    } finally {
      setVerifying(false);
    }
  };

  const handleReclassify = async () => {
    try {
      setReclassifying(true);
      await api.post(`/businesses/${transaction.businessId}/sales/${transaction.id}/reclassify`, {
        category: 'transfer',
        isTaxable: false,
        reason: 'Internal transfer / Non-revenue funds',
      });
      toast.success('Reclassified as non-taxable funds');
      onVerifySuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reclassify transaction');
    } finally {
      setReclassifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl flex flex-col z-10 animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isTax
                  ? 'bg-red-50 text-red-600 border border-red-100'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}
            >
              {isTax ? (
                <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {isTax ? 'Tax Payment Details' : 'Bank Transfer Details'}
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                {transaction.referenceId || transaction.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Amount Card */}
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-5 text-center shadow-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 ${
                transaction.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : transaction.status === 'failed'
                  ? 'bg-red-50 text-red-700 border border-red-200/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
              }`}
            >
              {transaction.status === 'completed' ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {transaction.status}
            </span>

            <div
              className={`text-3xl font-extrabold tracking-tight font-mono ${
                isTax ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {isTax ? '-' : '+'}
              {formatNaira(transaction.amount)}
            </div>

            <p className="text-xs text-gray-500 mt-1">
              {transaction.description || (isTax ? 'FIRS SME Tax Remittance' : 'Inbound Virtual Account Transfer')}
            </p>
          </div>

          {/* Review Banner for unverified sales */}
          {transaction.needsVerification && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-900">Tax Revenue Review Required</h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    This transfer was captured automatically. Confirm if this is taxable sales income or non-taxable funds (loan/capital).
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleVerifyAsSales}
                      disabled={verifying}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Confirm as Sales
                    </button>
                    <button
                      onClick={handleReclassify}
                      disabled={reclassifying}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {reclassifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HelpCircle className="h-3.5 w-3.5" />}
                      Reclassify Non-Taxable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FIRS Stage Remittance Banner (for Tax Payments) */}
          {isTax && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900">FIRS Compliance Status</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                      {transaction.remittanceStatus || 'Collected'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    {transaction.remittanceStatus === 'remitted'
                      ? `Remitted in official FIRS batch. Ref: ${transaction.firsRemittanceRef || 'VERIFIED'}`
                      : 'Funds collected and locked in custody pool. Scheduled for batch remittance to FIRS.'}
                  </p>
                  {transaction.firsReceiptUrl && (
                    <a
                      href={transaction.firsReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View Government FIRS Receipt <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Key Value Details List */}
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden text-xs">
            <div className="px-4 py-3 bg-gray-50/50 font-bold text-gray-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-gray-500" />
              Transaction Breakdown
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-gray-500">Transaction Reference</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-gray-800 font-semibold text-[11px]">
                  {transaction.referenceId || transaction.id}
                </span>
                <button
                  onClick={copyReference}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                  title="Copy Reference"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-gray-500">Transaction Date & Time</span>
              <span className="text-gray-800 font-medium">{formatDate(transaction.date)}</span>
            </div>

            {isDva && (
              <>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Sender / Customer Hint</span>
                  <span className="text-gray-800 font-semibold">
                    {transaction.customerName || transaction.customerHint || 'Direct Bank Customer'}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Destination Account</span>
                  <span className="text-gray-800 font-medium">
                    {transaction.virtualAccountBank || 'Wema Bank'} ••••{' '}
                    {(transaction.virtualAccountNumber || '0000').slice(-4)}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Capture Channel</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <Building2 className="h-3 w-3" /> Dedicated Virtual NUBAN
                  </span>
                </div>
              </>
            )}

            {isTax && (
              <>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Tax Obligation Month</span>
                  <span className="text-gray-800 font-bold">{transaction.taxMonthLabel || 'Current Period'}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Payment Gateway Method</span>
                  <span className="text-gray-800 font-medium uppercase">
                    {transaction.paymentMethod || 'Card / Transfer'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center gap-3">
          <button
            onClick={handleDownloadReceipt}
            disabled={downloading || transaction.status !== 'completed'}
            className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating Receipt…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Download Official Receipt (PDF)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
