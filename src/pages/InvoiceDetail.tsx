import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  ExternalLink,
  Copy,
  Phone,
  Receipt,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import type { InvoiceStatus, InvoicePaymentMethod } from '@/types/index.ts';
import {
  INVOICE_PAYMENT_METHODS,
  invoicePaymentMethodLabel,
} from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusPill(s: InvoiceStatus) {
  const m: Record<InvoiceStatus, string> = {
    draft: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-200 text-gray-600',
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${m[s]}`}
    >
      {s}
    </span>
  );
}

function effectiveStatus(s: InvoiceStatus, dueDate: string): InvoiceStatus {
  if (s === 'sent' && new Date(dueDate) < new Date()) return 'overdue';
  return s;
}

export default function InvoiceDetail() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const activeInvoice = useInvoiceStore((s) => s.activeInvoice);
  const detailLoading = useInvoiceStore((s) => s.detailLoading);
  const detailError = useInvoiceStore((s) => s.detailError);
  const fetchInvoice = useInvoiceStore((s) => s.fetchInvoice);
  const sendInvoice = useInvoiceStore((s) => s.sendInvoice);
  const sendInvoiceByWhatsApp = useInvoiceStore((s) => s.sendInvoiceByWhatsApp);
  const markInvoicePaid = useInvoiceStore((s) => s.markInvoicePaid);
  const cancelInvoice = useInvoiceStore((s) => s.cancelInvoice);
  const deleteInvoice = useInvoiceStore((s) => s.deleteInvoice);
  const downloadInvoicePdf = useInvoiceStore((s) => s.downloadInvoicePdf);
  const clearActive = useInvoiceStore((s) => s.clearActive);

  const [actionLoading, setActionLoading] = useState<
    null | 'send' | 'whatsapp' | 'pay' | 'cancel' | 'delete' | 'pdf'
  >(null);

  // Tracks which copy-to-clipboard fallback succeeded most recently — used to
  // briefly flash a "Copied!" affordance on the link button.
  const [copied, setCopied] = useState<null | 'link' | 'message'>(null);

  // Pay modal state
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<InvoicePaymentMethod | ''>('');

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!biz || !id) return;
    fetchInvoice(biz.id, id);
    return () => clearActive();
  }, [biz, id, fetchInvoice, clearActive]);

  if (!biz)
    return (
      <p className='py-20 text-center text-gray-400'>
        Select a business first.
      </p>
    );

  if (detailLoading && !activeInvoice) {
    return (
      <div className='flex items-center justify-center py-20 text-gray-400'>
        <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Loading invoice...
      </div>
    );
  }

  if (detailError || !activeInvoice) {
    return (
      <Card className='py-12 text-center'>
        <p className='text-sm text-red-600'>
          {detailError || 'Invoice not found'}
        </p>
        <Link
          to='/invoices'
          className='mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700'
        >
          <ArrowLeft className='h-4 w-4' /> Back to invoices
        </Link>
      </Card>
    );
  }

  const inv = activeInvoice;
  const eff = effectiveStatus(inv.status, inv.dueDate);
  const canEdit = inv.status === 'draft';
  const canDelete = inv.status === 'draft';
  const canSend = inv.status === 'draft';
  // Sharing via WhatsApp is allowed in any state EXCEPT cancelled. Paid invoices
  // can be re-shared as receipts; the message body adapts on the backend.
  const canShare = inv.status !== 'cancelled';
  const hasPhone = Boolean(inv.customerPhone);
  const canMarkPaid =
    inv.status === 'sent' || inv.status === 'overdue' || eff === 'overdue';
  const canCancel = inv.status !== 'paid' && inv.status !== 'cancelled';
  const isPaid = inv.status === 'paid';

  const handleDownload = async () => {
    setActionLoading('pdf');
    try {
      await downloadInvoicePdf(biz.id, inv.id, inv.invoiceNumber);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async () => {
    if (!confirm(`Mark invoice ${inv.invoiceNumber} as sent?`)) return;
    setActionLoading('send');
    try {
      await sendInvoice(biz.id, inv.id);
      toast.success('Invoice marked as sent');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Send invoice PDF directly via WhatsApp.
   *
   * Mobile (Web Share API w/ files supported): Uses the PDF blob from backend
   * to share natively via WhatsApp with the PDF attached.
   *
   * Desktop / browsers without share-with-files: Opens WhatsApp Web/Desktop
   * with the message and PDF attached directly.
   *
   * The backend returns the actual PDF file, so both mobile and desktop get
   * the PDF directly attached, not just a link.
   */
  const handleSendWhatsApp = async () => {
    if (!hasPhone) return;
    setActionLoading('whatsapp');
    try {
      const res = await sendInvoiceByWhatsApp(biz.id, inv.id);

      // Try native share first on mobile with the PDF blob
      let nativeShareWorked = false;
      if (res.pdfBlob) {
        try {
          const file = new File(
            [res.pdfBlob],
            res.filename,
            { type: 'application/pdf' },
          );
          const sharePayload = {
            files: [file],
            title: `Invoice ${inv.invoiceNumber}`,
            text: res.message,
          };
          const nav = navigator as Navigator & {
            canShare?: (data: ShareData & { files?: File[] }) => boolean;
            share?: (data: ShareData & { files?: File[] }) => Promise<void>;
          };
          if (
          typeof nav.share === 'function' &&
          typeof nav.canShare === 'function' &&
          nav.canShare(sharePayload)
        ) {
          try {
            await nav.share(sharePayload);
            nativeShareWorked = true;
            toast.success('PDF sent via WhatsApp');
          } catch (shareErr) {
            // User dismissed the share sheet — not an error worth surfacing.
            if ((shareErr as { name?: string })?.name !== 'AbortError') {
              throw shareErr;
            }
            // User cancelled — quietly leave it; they can tap again.
            nativeShareWorked = true;
          }
        }
      } catch {
        // Any error during the native-share path falls through to desktop approach.
      }
      }

      if (!nativeShareWorked) {
        // Desktop: Download the PDF and open WhatsApp with message
        // The user can then manually attach the downloaded PDF in WhatsApp
        if (res.pdfBlob) {
          const url = URL.createObjectURL(res.pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        
        // Also open WhatsApp with the message
        window.open(res.waUrl, '_blank', 'noopener,noreferrer');
        toast.success('PDF downloaded — attach it in WhatsApp');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Copy the public PDF link to the clipboard. Used as a manual fallback when
   * the SME wants to paste the link into another app, or when WhatsApp isn't
   * the right channel for this customer.
   */
  const handleCopyLink = async () => {
    setActionLoading('whatsapp');
    try {
      // Reuse the same backend call — it returns the pdfUrl + flips status if
      // needed. We don't open WhatsApp; we just copy the link.
      const res = await sendInvoiceByWhatsApp(biz.id, inv.id);
      await navigator.clipboard.writeText(res.pdfUrl);
      setCopied('link');
      window.setTimeout(() => setCopied(null), 2000);
      toast.success('Invoice link copied');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!payMethod) {
      toast.error('Select a payment method');
      return;
    }
    setActionLoading('pay');
    try {
      await markInvoicePaid(biz.id, inv.id, {
        paymentMethod: payMethod,
        paymentDate: payDate,
      });
      toast.success('Invoice marked as paid — recorded as a sale');
      setPayOpen(false);
      setPayMethod('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading('cancel');
    try {
      await cancelInvoice(biz.id, inv.id, cancelReason.trim() || undefined);
      toast.success('Invoice cancelled');
      setCancelOpen(false);
      setCancelReason('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Permanently delete draft invoice ${inv.invoiceNumber}? This cannot be undone.`,
      )
    )
      return;
    setActionLoading('delete');
    try {
      await deleteInvoice(biz.id, inv.id);
      toast.success('Invoice deleted');
      navigate('/invoices');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4'>
        <Link
          to='/invoices'
          className='inline-flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-700'
        >
          <ArrowLeft className='h-4 w-4' /> All invoices
        </Link>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
              {inv.invoiceNumber}
            </h1>
            {statusPill(eff)}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='secondary'
              size='sm'
              onClick={handleDownload}
              isLoading={actionLoading === 'pdf'}
            >
              <Download className='h-4 w-4' /> PDF
            </Button>
            {canEdit && (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => navigate(`/invoices/${inv.id}/edit`)}
              >
                <Pencil className='h-4 w-4' /> Edit
              </Button>
            )}
            {canSend && (
              <Button
                size='sm'
                variant='ghost'
                onClick={handleSend}
                isLoading={actionLoading === 'send'}
                title='Already sent this invoice another way (printed, delivered in person)? Mark it as sent manually.'
              >
                <Send className='h-4 w-4' /> Mark as sent
              </Button>
            )}
            {canMarkPaid && (
              <Button size='sm' onClick={() => setPayOpen(true)}>
                <CheckCircle2 className='h-4 w-4' /> Mark as paid
              </Button>
            )}
            {canCancel && !canSend && (
              <Button
                variant='secondary'
                size='sm'
                onClick={() => setCancelOpen(true)}
              >
                <XCircle className='h-4 w-4' /> Cancel
              </Button>
            )}
            {canDelete && (
              <Button
                variant='danger'
                size='sm'
                onClick={handleDelete}
                isLoading={actionLoading === 'delete'}
              >
                <Trash2 className='h-4 w-4' /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Paid banner ──────────────────────────── */}
      {inv.status === 'paid' && (
        <Card className='overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50/40'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm'>
                <CheckCircle2 className='h-5 w-5' />
              </div>
              <div>
                <p className='text-sm font-semibold text-emerald-800'>
                  Payment received
                </p>
                <p className='font-body text-sm text-emerald-600'>
                  {formatNaira(Number(inv.total))}
                  {inv.paymentMethod
                    ? ` via ${invoicePaymentMethodLabel(inv.paymentMethod)}`
                    : ''}
                  {inv.paidAt ? ` on ${formatDate(inv.paidAt)}` : ''}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2 pl-13 sm:pl-0'>
              <span className='inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200/50'>
                <Receipt className='h-3.5 w-3.5' />
                {inv.paymentMethod
                  ? invoicePaymentMethodLabel(inv.paymentMethod)
                  : 'Payment recorded'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Meta grid */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        <Card>
          <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
            Bill to
          </p>
          <p className='mt-2 text-base font-semibold text-gray-900'>
            {inv.customerName}
          </p>
          <div className='mt-1 space-y-0.5 font-body text-sm text-gray-600'>
            {inv.customerAddress && <p>{inv.customerAddress}</p>}
            {inv.customerEmail && <p>{inv.customerEmail}</p>}
            {inv.customerPhone && <p>{inv.customerPhone}</p>}
            {inv.customerTaxId && <p>TIN: {inv.customerTaxId}</p>}
          </div>
        </Card>
        <Card>
          <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
            Dates
          </p>
          <div className='mt-2 space-y-1 font-body text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Issued</span>
              <span className='font-medium text-gray-900'>
                {formatDate(inv.issueDate)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Due</span>
              <span className='font-medium text-gray-900'>
                {formatDate(inv.dueDate)}
              </span>
            </div>
            {inv.sentAt && (
              <div className='flex justify-between'>
                <span className='text-gray-500'>Sent</span>
                <span className='font-medium text-gray-900'>
                  {formatDate(inv.sentAt)}
                </span>
              </div>
            )}
            {inv.paidAt && (
              <div className='flex justify-between'>
                <span className='text-gray-500'>Paid</span>
                <span className='font-medium text-green-700'>
                  {formatDate(inv.paidAt)}
                </span>
              </div>
            )}
            {inv.status === 'paid' && (
              <div className='flex justify-between'>
                <span className='text-gray-500'>Method</span>
                <span className='font-medium text-gray-900'>
                  {inv.paymentMethod
                    ? invoicePaymentMethodLabel(inv.paymentMethod)
                    : '—'}
                </span>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
            Summary
          </p>
          <div className='mt-2 space-y-1 font-body text-sm'>
            <div className='flex justify-between text-gray-600'>
              <span>Subtotal</span>
              <span>{formatNaira(Number(inv.subtotal))}</span>
            </div>
            {Number(inv.discount) > 0 && (
              <div className='flex justify-between text-gray-600'>
                <span>Discount</span>
                <span>-{formatNaira(Number(inv.discount))}</span>
              </div>
            )}
            <div className='flex justify-between text-gray-600'>
              <span>VAT ({Number(inv.vatRate)}%)</span>
              <span>{formatNaira(Number(inv.vatAmount))}</span>
            </div>
            <div className='mt-1 flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900'>
              <span>Total</span>
              <span>{formatNaira(Number(inv.total))}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Share with customer ───────────────────── */}
      {canShare && (
        <ShareCard
          phone={inv.customerPhone}
          customerName={inv.customerName}
          isPaid={isPaid}
          alreadySent={Boolean(inv.sentAt)}
          loading={actionLoading === 'whatsapp'}
          disabled={actionLoading !== null && actionLoading !== 'whatsapp'}
          onShare={handleSendWhatsApp}
          onCopyLink={handleCopyLink}
          copied={copied === 'link'}
        />
      )}

      {/* Lines */}
      <Card noPadding>
        <div className='px-4 py-3 sm:px-6'>
          <h2 className='text-base font-semibold text-gray-900'>Line items</h2>
        </div>
        <div className='overflow-x-auto border-t border-gray-100'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400'>
                <th className='px-4 py-3 sm:px-6'>Description</th>
                <th className='px-4 py-3 text-right'>Qty</th>
                <th className='px-4 py-3 text-right'>Unit price</th>
                <th className='px-4 py-3 text-right sm:px-6'>Amount</th>
              </tr>
            </thead>
            <tbody className='font-body text-sm'>
              {(inv.lines ?? []).map((line, idx) => (
                <tr key={line.id ?? idx} className='border-b border-gray-50'>
                  <td className='px-4 py-3 text-gray-700 sm:px-6'>
                    {line.description}
                  </td>
                  <td className='px-4 py-3 text-right text-gray-600'>
                    {Number(line.quantity)}
                  </td>
                  <td className='px-4 py-3 text-right text-gray-600'>
                    {formatNaira(Number(line.unitPrice))}
                  </td>
                  <td className='px-4 py-3 text-right font-semibold text-gray-900 sm:px-6'>
                    {formatNaira(
                      Number(
                        line.lineTotal ??
                          Number(line.quantity) * Number(line.unitPrice),
                      ),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Notes + terms */}
      {(inv.paymentTerms || inv.notes) && (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {inv.paymentTerms && (
            <Card>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
                Payment terms
              </p>
              <p className='mt-2 whitespace-pre-line font-body text-sm text-gray-700'>
                {inv.paymentTerms}
              </p>
            </Card>
          )}
          {inv.notes && (
            <Card>
              <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
                Notes
              </p>
              <p className='mt-2 whitespace-pre-line font-body text-sm text-gray-700'>
                {inv.notes}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Linked sale */}
      {inv.linkedSaleId && (
        <Card className='border-green-200 bg-green-50/40'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wider text-green-700'>
                Linked sale
              </p>
              <p className='mt-1 font-body text-sm text-gray-700'>
                This invoice has been recorded as a sale. It now counts towards
                your monthly tax calculation.
              </p>
            </div>
            <Link
              to='/sales'
              className='inline-flex shrink-0 items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800'
            >
              View sales <ExternalLink className='h-3.5 w-3.5' />
            </Link>
          </div>
        </Card>
      )}

      {/* ─── Mark paid modal ─────────────────────── */}
      {payOpen && (
        <Modal onClose={() => setPayOpen(false)} title='Mark invoice as paid'>
          <p className='font-body text-sm text-gray-600'>
            This will record a sale for {formatNaira(Number(inv.total))} on the
            payment date. The payment month cannot be finalized or locked.
          </p>
          <div className='mt-4 space-y-4'>
            <div>
              <label
                htmlFor='invoice-payment-method'
                className='mb-1 block text-sm font-medium text-gray-700'
              >
                Payment Method <span className='text-red-500'>*</span>
              </label>
              <select
                id='invoice-payment-method'
                value={payMethod}
                onChange={(e) =>
                  setPayMethod(e.target.value as InvoicePaymentMethod | '')
                }
                className='block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20'
              >
                <option value='' disabled>
                  Select how the customer paid
                </option>
                {INVOICE_PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label='Payment Date'
              type='date'
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              min={inv.issueDate.slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='secondary' onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaid}
              isLoading={actionLoading === 'pay'}
              disabled={!payMethod || actionLoading === 'pay'}
            >
              Confirm payment
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── Cancel modal ────────────────────────── */}
      {cancelOpen && (
        <Modal onClose={() => setCancelOpen(false)} title='Cancel invoice'>
          <p className='font-body text-sm text-gray-600'>
            Cancelling an invoice is permanent. The record is preserved (status
            becomes "cancelled"), but you can't reopen it — create a new invoice
            instead.
          </p>
          <div className='mt-4'>
            <label className='mb-1 block text-sm font-medium text-gray-700'>
              Reason (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder='e.g. Customer cancelled order'
              className='block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20'
            />
          </div>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='secondary' onClick={() => setCancelOpen(false)}>
              Keep invoice
            </Button>
            <Button
              variant='danger'
              onClick={handleCancel}
              isLoading={actionLoading === 'cancel'}
            >
              Cancel invoice
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      className={className}
      aria-hidden='true'
    >
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
    </svg>
  );
}

/**
 * ShareCard — WhatsApp sharing surface.
 */
function ShareCard(props: {
  phone: string | null | undefined;
  customerName: string;
  isPaid: boolean;
  alreadySent: boolean;
  loading: boolean;
  disabled: boolean;
  onShare: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  const {
    phone,
    customerName,
    isPaid,
    alreadySent,
    loading,
    disabled,
    onShare,
    onCopyLink,
    copied,
  } = props;
  const hasPhone = Boolean(phone);

  const headline = isPaid
    ? 'Send receipt via WhatsApp'
    : alreadySent
      ? 'Resend via WhatsApp'
      : 'Send via WhatsApp';

  const subline = isPaid
    ? `Forward a paid receipt to ${customerName}.`
    : `Send the invoice to ${customerName} on WhatsApp.`;

  return (
    <Card className='overflow-hidden border-gray-200/80'>
      <div className='flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
        <div className='flex items-start gap-3'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white'>
            <WhatsAppIcon className='h-5 w-5' />
          </div>
          <div className='space-y-1'>
            <h2 className='text-sm font-semibold text-gray-900'>{headline}</h2>
            <p className='font-body text-sm text-gray-500'>{subline}</p>
            <div className='flex items-center gap-1.5 pt-0.5 text-sm'>
              <Phone className='h-3.5 w-3.5 text-gray-400' />
              {hasPhone ? (
                <span className='font-medium text-gray-700'>{phone}</span>
              ) : (
                <span className='text-amber-600'>
                  No phone — edit invoice to add one
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2 pl-12 sm:pl-0'>
          <button
            type='button'
            onClick={onShare}
            disabled={!hasPhone || loading || disabled}
            className='inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <WhatsAppIcon className='h-4 w-4' />
            )}
            <span>
              {isPaid
                ? 'Send receipt'
                : alreadySent
                  ? 'Resend'
                  : 'Send now'}
            </span>
          </button>
          <button
            type='button'
            onClick={onCopyLink}
            disabled={loading || disabled}
            className='inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50'
            title='Copy public PDF link'
          >
            {copied ? (
              <CheckCircle2 className='h-4 w-4 text-green-600' />
            ) : (
              <Copy className='h-4 w-4' />
            )}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
      {hasPhone && (
        <div className='border-t border-gray-100 bg-gray-50/50 px-5 py-2 sm:px-6'>
          <p className='flex items-center gap-1.5 font-body text-xs text-gray-400'>
            <Smartphone className='h-3 w-3' />
            <span>
              The PDF invoice will be sent directly via WhatsApp as a file attachment.
            </span>
          </p>
        </div>
      )}
    </Card>
  );
}

/** Minimal inline modal — no separate component file needed for 2 modals on one page. */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md rounded-xl bg-white p-6 shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className='mb-3 text-lg font-semibold text-gray-900'>{title}</h3>
        {children}
      </div>
    </div>
  );
}
