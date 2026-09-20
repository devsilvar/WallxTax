import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Landmark,
  MessageCircle,
  Ban,
  Shield,
  Phone,
  Mail,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Building2,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useCreditStore } from '@/stores/credit.store.ts';
import type { CreditStatus } from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';

import RecordCreditPaymentModal from '@/components/debtors/RecordCreditPaymentModal.tsx';
import LinkDvaCreditModal from '@/components/debtors/LinkDvaCreditModal.tsx';
import WriteOffModal from '@/components/debtors/WriteOffModal.tsx';

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAvatarStyle(name: string) {
  const palette = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return palette[hash % palette.length];
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'C'
  );
}

function getDueStatus(dueDateStr: string, status: CreditStatus) {
  if (status === 'paid') {
    return {
      label: 'Settled & Closed',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
    };
  }
  if (status === 'written_off') {
    return {
      label: 'Written Off',
      color: 'text-gray-600 bg-gray-100 border-gray-200',
      icon: Ban,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: `${overdueDays} days overdue`,
      color: 'text-rose-700 bg-rose-50 border-rose-200 font-bold',
      icon: AlertTriangle,
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      color: 'text-amber-700 bg-amber-50 border-amber-200 font-bold',
      icon: Clock,
    };
  }
  return {
    label: `Due in ${diffDays} days`,
    color: 'text-gray-700 bg-gray-50 border-gray-200 font-medium',
    icon: Clock,
  };
}

function statusBadge(s: CreditStatus) {
  const map: Record<CreditStatus, { label: string; dot: string; cls: string }> = {
    unpaid: {
      label: 'Unpaid Obligation',
      dot: 'bg-amber-500',
      cls: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    partially_paid: {
      label: 'Partially Recovered',
      dot: 'bg-blue-500',
      cls: 'bg-blue-50 text-blue-800 border-blue-200/80',
    },
    overdue: {
      label: 'Overdue Past Grace Period',
      dot: 'bg-rose-500 animate-pulse',
      cls: 'bg-rose-50 text-rose-800 border-rose-200/80 font-bold',
    },
    paid: {
      label: 'Fully Settled',
      dot: 'bg-emerald-500',
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold',
    },
    written_off: {
      label: 'Written Off',
      dot: 'bg-gray-400',
      cls: 'bg-gray-100 text-gray-700 border-gray-200/80',
    },
  };
  const item = map[s] || { label: s, dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-700 border-gray-200/80' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${item.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

export default function DebtorDetail() {
  const { id } = useParams<{ id: string }>();
  const biz = useBusinessStore((s) => s.activeBusiness);
  const activeCredit = useCreditStore((s) => s.activeCredit);
  const detailLoading = useCreditStore((s) => s.detailLoading);
  const detailError = useCreditStore((s) => s.detailError);
  const fetchCredit = useCreditStore((s) => s.fetchCredit);
  const clearActive = useCreditStore((s) => s.clearActive);
  const sendWhatsApp = useCreditStore((s) => s.sendWhatsApp);

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [dvaModalOpen, setDvaModalOpen] = useState(false);
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  useEffect(() => {
    if (biz && id) {
      fetchCredit(biz.id, id);
    }
    return () => {
      clearActive();
    };
  }, [biz, id, fetchCredit, clearActive]);

  const reloadData = () => {
    if (biz && id) {
      fetchCredit(biz.id, id);
    }
  };

  const handleWhatsApp = async () => {
    if (!biz || !activeCredit) return;
    if (!activeCredit.customerPhone) {
      toast.error(`No phone number recorded for ${activeCredit.customerName}`);
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const meta = await sendWhatsApp(biz.id, activeCredit.id);
      if (meta?.waUrl) {
        window.open(meta.waUrl, '_blank', 'noopener,noreferrer');
        toast.success(`WhatsApp reminder generated for ${activeCredit.customerName}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!biz) {
    return <div className="py-20 text-center text-gray-400">Select a business first.</div>;
  }

  if (detailLoading && !activeCredit) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-gray-400 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <p className="text-sm font-medium text-gray-600">Loading debtor profile & credit ledger...</p>
      </div>
    );
  }

  if (detailError || !activeCredit) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 text-center bg-white border border-gray-200/80 rounded-2xl shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto mb-3">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Debtor Record Not Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {detailError || 'This debtor record could not be found or may have been deleted.'}
          </p>
          <Link
            to="/debtors"
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all rounded-xl shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Debtors Book
          </Link>
        </Card>
      </div>
    );
  }

  const c = activeCredit;
  const avatarStyle = getAvatarStyle(c.customerName);
  const initials = getInitials(c.customerName);
  const dueInfo = getDueStatus(c.dueDate, c.status);
  const DueIcon = dueInfo.icon;
  const paidPct = c.totalAmount > 0 ? Math.min(100, Math.round((c.amountPaid / c.totalAmount) * 100)) : 0;
  const isSettled = c.status === 'paid';
  const isWrittenOff = c.status === 'written_off';
  const canPerformActions = !isSettled && !isWrittenOff;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Breadcrumb & Back Link ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/debtors"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Debtors Book
        </Link>
        <span className="text-[11px] font-mono text-gray-400 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-md">
          REF: {c.id.slice(0, 8)}
        </span>
      </div>

      {/* ── Hero Profile Header ───────────────────────────────── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-gray-300 transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Debtor Identity */}
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center text-lg font-bold border shrink-0 shadow-xs rounded-2xl ${avatarStyle.bg} ${avatarStyle.text} ${avatarStyle.border}`}
            >
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{c.customerName}</h1>
                {statusBadge(c.status)}
              </div>
              <p className="text-sm font-medium text-gray-600 mt-1">
                {c.description || 'Customer credit obligation'}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-gray-500">
                {c.customerPhone && (
                  <a
                    href={`tel:${c.customerPhone}`}
                    className="inline-flex items-center gap-1.5 text-gray-700 hover:text-primary-600 font-mono bg-gray-50 hover:bg-gray-100 border border-gray-200/80 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-gray-400" /> {c.customerPhone}
                  </a>
                )}
                {c.customerEmail && (
                  <a
                    href={`mailto:${c.customerEmail}`}
                    className="inline-flex items-center gap-1.5 text-gray-700 hover:text-primary-600 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-gray-400" /> {c.customerEmail}
                  </a>
                )}
                <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-50 border border-gray-200/80 px-2.5 py-1 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" /> Granted {formatDate(c.issueDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          {canPerformActions && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              {/* Record Payment */}
              <Button
                onClick={() => setPaymentModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl shadow-xs text-xs font-semibold px-3.5 py-2.5"
              >
                <CreditCard className="h-3.5 w-3.5" /> Record Payment
              </Button>

              {/* Match DVA Transfer */}
              <button
                onClick={() => setDvaModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 transition-all rounded-xl shadow-2xs"
                title="Match incoming bank transfer from Dedicated Virtual Account"
              >
                <Landmark className="h-3.5 w-3.5" /> Match DVA
              </button>

              {/* WhatsApp Reminder */}
              {c.customerPhone && (
                <button
                  onClick={handleWhatsApp}
                  disabled={isSendingWhatsApp}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 transition-all rounded-xl shadow-2xs disabled:opacity-50"
                  title={`Send WhatsApp reminder to ${c.customerPhone}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              {/* Write Off */}
              <button
                onClick={() => setWriteOffModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200/80 hover:border-rose-200 transition-all rounded-xl"
                title="Write off uncollectible debt"
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Financial Recovery KPI Strip ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Remaining Balance */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs rounded-xl hover:border-gray-300 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Remaining Balance Due</span>
            <div
              className={`h-8 w-8 rounded-xl border flex items-center justify-center shadow-2xs ${
                c.balance === 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  : c.status === 'overdue'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                  : 'bg-amber-50 text-amber-700 border-amber-200/60'
              }`}
            >
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 tabular-nums ${
              c.balance === 0 ? 'text-emerald-700' : c.status === 'overdue' ? 'text-rose-600' : 'text-gray-900'
            }`}
          >
            {formatNaira(c.balance)}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Current liability</span>
            <span className="font-semibold text-gray-700">
              {c.balance === 0 ? 'Fully settled' : `${100 - paidPct}% uncollected`}
            </span>
          </div>
        </Card>

        {/* Original Debt Amount */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs rounded-xl hover:border-gray-300 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Original Amount Granted</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shadow-2xs">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{formatNaira(c.totalAmount)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Agreement date</span>
            <span className="font-semibold text-gray-700">{formatDate(c.issueDate)}</span>
          </div>
        </Card>

        {/* Total Recovered */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs rounded-xl hover:border-gray-300 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Recovered</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-2xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{formatNaira(c.amountPaid)}</p>
            <span className="text-xs font-bold text-emerald-700">({paidPct}%)</span>
          </div>
          <div className="mt-2.5">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  c.status === 'paid' ? 'bg-emerald-500' : 'bg-primary-600'
                }`}
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Schedule & Due Date */}
        <Card className="p-4 bg-white border border-gray-200/80 shadow-xs rounded-xl hover:border-gray-300 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Repayment Schedule</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shadow-2xs">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold border rounded-full ${dueInfo.color}`}>
              <DueIcon className="h-3 w-3" /> {dueInfo.label}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-400">Due deadline</span>
            <span className="font-semibold text-gray-700">{formatDate(c.dueDate)}</span>
          </div>
        </Card>
      </div>

      {/* ── Two-Column Detail Body ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Repayment History & Audit Ledger ──── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Repayment History Ledger */}
          <Card className="bg-white border border-gray-200/80 shadow-xs rounded-xl overflow-hidden hover:border-gray-300 transition-all duration-200">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Repayment History & Tax Audit Trail
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {c.payments?.length || 0} {c.payments?.length === 1 ? 'transaction' : 'transactions'}
              </span>
            </div>

            {!c.payments || c.payments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-10 w-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-2 text-gray-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-800">No Repayments Recorded Yet</h4>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  When the debtor pays in cash or via bank transfer, record the payment here. The system will automatically
                  recognize taxable sales in accordance with FIRS cash-basis rules.
                </p>
                {canPerformActions && (
                  <Button
                    onClick={() => setPaymentModalOpen(true)}
                    size="sm"
                    className="mt-3 text-xs rounded-xl"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Record First Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {c.payments.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 tabular-nums">
                            {formatNaira(p.amount)}
                          </span>
                          <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase bg-gray-100 text-gray-700 border border-gray-200/70 rounded-full">
                            {p.paymentType.replace('_', ' ')}
                          </span>
                          {p.linkedSaleId && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                              ✓ FIRS Tax Recognized
                            </span>
                          )}
                        </div>
                        {p.notes && <p className="text-xs text-gray-600 mt-1">{p.notes}</p>}
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Logged: {formatDateTime(p.createdAt || p.paymentDate)}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right sm:self-center shrink-0">
                      <div className="text-xs font-semibold text-gray-800">
                        Paid on {formatDate(p.paymentDate)}
                      </div>
                      {p.linkedSaleId && (
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                          Sale Ref: {p.linkedSaleId.slice(0, 8)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Product & Agreement Specification Card */}
          <Card className="bg-white border border-gray-200/80 p-5 shadow-xs rounded-xl space-y-4 hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="h-7 w-7 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Product & Agreement Specification
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                  Goods / Services Sold on Credit
                </span>
                <p className="text-sm text-gray-900 font-medium mt-1.5 leading-relaxed bg-gray-50/80 p-3.5 border border-gray-100 rounded-xl">
                  {c.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3.5 border border-gray-100 rounded-xl space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase text-gray-400">Issue Date</span>
                  <p className="text-xs font-bold text-gray-800">{formatDate(c.issueDate)}</p>
                </div>
                <div className="bg-white p-3.5 border border-gray-100 rounded-xl space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase text-gray-400">Due Deadline</span>
                  <p className="text-xs font-bold text-gray-800">{formatDate(c.dueDate)}</p>
                </div>
                <div className="bg-white p-3.5 border border-gray-100 rounded-xl space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold uppercase text-gray-400">Reminder Schedule</span>
                  <p className="text-xs font-bold text-gray-800">
                    {c.reminderDate ? formatDate(c.reminderDate) : 'Auto-scheduled'}
                  </p>
                </div>
              </div>

              {c.notes && (
                <div className="pt-2">
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                    Internal Ledger Notes
                  </span>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3.5 border border-gray-100 rounded-xl mt-1.5 whitespace-pre-line italic">
                    {c.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right Column: Debtor Profile, Guarantor & FIRS Tax ──── */}
        <div className="space-y-6">
          {/* Debtor Profile Card */}
          <Card className="bg-white border border-gray-200/80 p-5 shadow-xs rounded-xl space-y-4 hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="h-7 w-7 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Debtor Contact Details
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-gray-400">Full Legal / Business Name</span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{c.customerName}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-gray-400">Phone Number</span>
                {c.customerPhone ? (
                  <div className="flex items-center justify-between mt-1.5 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="font-mono font-medium text-gray-900 text-xs">{c.customerPhone}</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${c.customerPhone}`}
                        className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200/80 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors"
                        title="Call debtor"
                      >
                        Call
                      </a>
                      <button
                        onClick={handleWhatsApp}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg shadow-2xs transition-colors"
                        title="Send WhatsApp"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic mt-0.5">No phone number recorded</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-gray-400">Email Address</span>
                {c.customerEmail ? (
                  <p className="font-medium text-gray-800 mt-0.5">
                    <a href={`mailto:${c.customerEmail}`} className="hover:text-primary-600 underline">
                      {c.customerEmail}
                    </a>
                  </p>
                ) : (
                  <p className="text-gray-400 italic mt-0.5">No email address recorded</p>
                )}
              </div>
            </div>
          </Card>

          {/* Guarantor Profile Card */}
          <Card className="bg-white border border-gray-200/80 p-5 shadow-xs rounded-xl space-y-4 hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Guarantor / Surety
              </h3>
            </div>

            {c.guarantorName ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-gray-400">Guarantor Name</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-sm font-bold text-gray-900">{c.guarantorName}</span>
                  </div>
                </div>

                {c.guarantorPhone && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-gray-400">Guarantor Contact</span>
                    <div className="flex items-center justify-between mt-1.5 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <span className="font-mono font-medium text-indigo-950 text-xs">{c.guarantorPhone}</span>
                      <a
                        href={`tel:${c.guarantorPhone}`}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200/80 rounded-lg shadow-2xs hover:bg-indigo-50 transition-colors"
                      >
                        Call
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-gray-400">
                <Shield className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                <p>No external guarantor logged for this credit obligation.</p>
              </div>
            )}
          </Card>

          {/* FIRS Cash-Basis Guarantee Card */}
          <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-5 border border-slate-800 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                FIRS Cash-Basis Guarantee
              </h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Under Sections 25 & 40 of the FIRS Act, customer debts recorded here do not trigger VAT or Companies Income
              Tax liabilities upon issuance.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              Taxable sales are strictly booked only when cash or DVA bank transfers are realized and confirmed.
            </div>
          </Card>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <RecordCreditPaymentModal
        businessId={biz.id}
        credit={activeCredit}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={reloadData}
      />

      <LinkDvaCreditModal
        businessId={biz.id}
        credit={activeCredit}
        isOpen={dvaModalOpen}
        onClose={() => setDvaModalOpen(false)}
        onSuccess={reloadData}
      />

      <WriteOffModal
        businessId={biz.id}
        credit={activeCredit}
        isOpen={writeOffModalOpen}
        onClose={() => setWriteOffModalOpen(false)}
        onSuccess={reloadData}
      />
    </div>
  );
}
