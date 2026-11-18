import { useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import { INVOICE_PAYMENT_METHODS } from '@/types/index.ts';
import type { Invoice, InvoicePaymentMethod } from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';
import { formatInvoiceMoney } from '@/lib/currency';

const FORM_ID = 'record-payment-form';

/**
 * One key per payment intent.
 *
 * Held for the lifetime of the open modal and reused by every retry of the
 * same submit — that is what makes a double-click (or a lost response) book
 * one payment instead of two.
 */
function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type OverpaymentDetails = {
  balance?: string;
  entered?: string;
  excess?: string;
};

type Props = {
  businessId: string;
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: Invoice) => void;
};

export default function RecordPaymentModal({
  businessId,
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const recordPayment = useInvoiceStore((s) => s.recordPayment);
  const resolveOverpayment = useInvoiceStore((s) => s.resolveOverpayment);

  const balance = Number(invoice.balance);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<InvoicePaymentMethod | ''>('');
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [overpayment, setOverpayment] = useState<OverpaymentDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const idempotencyKey = useRef('');

  // A fresh intent each time the modal opens, so an abandoned attempt cannot
  // swallow the next one.
  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = newIdempotencyKey();
    setAmount(balance > 0 ? balance.toFixed(2) : '');
    setMethod('');
    setDate(todayIso());
    setReference('');
    setNotes('');
    setError(null);
    setOverpayment(null);
    setSubmitting(false);
    // `balance` deliberately excluded: reopening is the trigger, not a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const entered = Number(amount);
  const validAmount = Number.isFinite(entered) && entered > 0;
  const overpaying = validAmount && entered > balance + 0.005;
  const remainingAfter = validAmount && !overpaying ? balance - entered : null;

  const payload = () => ({
    amount: Math.round(entered * 100) / 100,
    paymentMethod: method as InvoicePaymentMethod,
    paymentDate: date,
    reference: reference.trim() || undefined,
    notes: notes.trim() || undefined,
    idempotencyKey: idempotencyKey.current,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!method) {
      setError('Choose how the customer paid.');
      return;
    }
    if (!validAmount) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setOverpayment(null);
    try {
      const updated = await recordPayment(businessId, invoice.id, payload());
      toast.success(
        updated.balance > 0
          ? `Payment recorded — ${formatInvoiceMoney(updated, updated.balance)} still due`
          : 'Payment recorded — invoice fully settled',
      );
      onSuccess(updated);
    } catch (err) {
      const detail = (
        err as { response?: { data?: { error?: { code?: string; details?: OverpaymentDetails } } } }
      )?.response?.data?.error;
      if (detail?.code === 'OVERPAYMENT') {
        // The server is the authority on the balance: it may have moved since
        // this modal opened. Offer the voucher instead of guessing.
        setOverpayment(detail.details ?? { balance: balance.toFixed(2) });
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreditToVoucher = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { invoice: updated, voucher } = await resolveOverpayment(businessId, invoice.id, {
        ...payload(),
        resolution: 'voucher',
      });
      toast.success(
        `${formatInvoiceMoney(updated, voucher.amount)} credited to the customer voucher`,
      );
      onSuccess(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const excess = overpayment?.excess ? Number(overpayment.excess) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title={overpayment ? 'Credit the excess to a voucher?' : 'Record a payment'}
      subtitle={`${invoice.invoiceNumber} — ${invoice.customerName}`}
      icon={<Wallet className='h-4 w-4' />}
      size='sm'
      dismissible={!submitting}
      footer={
        <div className='flex justify-end gap-2'>
          <Button
            variant='secondary'
            size='sm'
            onClick={onClose}
            disabled={submitting}
            type='button'
          >
            Cancel
          </Button>
          {overpayment ? (
            <Button
              size='sm'
              type='button'
              onClick={handleCreditToVoucher}
              isLoading={submitting}
              disabled={submitting}
            >
              Credit to voucher
            </Button>
          ) : (
            <Button
              size='sm'
              type='submit'
              form={FORM_ID}
              isLoading={submitting}
              disabled={submitting || !validAmount}
            >
              {overpaying ? 'Record and credit excess' : 'Record payment'}
            </Button>
          )}
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className='space-y-4' noValidate>
        <dl className='grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200'>
          {[
            { label: 'Total', value: formatInvoiceMoney(invoice, invoice.total) },
            { label: 'Paid', value: formatInvoiceMoney(invoice, invoice.amountPaid) },
            { label: 'Balance', value: formatInvoiceMoney(invoice, balance), strong: true },
          ].map((cell) => (
            <div key={cell.label} className='bg-white px-3 py-2'>
              <dt className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                {cell.label}
              </dt>
              <dd
                className={`mt-0.5 truncate text-xs font-semibold tabular-nums ${
                  cell.strong ? 'text-gray-900' : 'text-gray-600'
                }`}
              >
                {cell.value}
              </dd>
            </div>
          ))}
        </dl>

        <div>
          <div className='mb-1 flex items-baseline justify-between'>
            <label
              htmlFor='payment-amount'
              className='text-xs font-semibold uppercase tracking-wider text-gray-700'
            >
              Amount received <span className='text-red-500'>*</span>
            </label>
            <button
              type='button'
              onClick={() => setAmount(balance.toFixed(2))}
              className='text-[11px] font-medium text-primary-600 transition-colors hover:text-primary-700'
            >
              Full balance
            </button>
          </div>
          <Input
            id='payment-amount'
            type='number'
            inputMode='decimal'
            step='0.01'
            min='0'
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setOverpayment(null);
            }}
            placeholder='0.00'
            autoComplete='off'
            disabled={Boolean(overpayment)}
          />
          {remainingAfter !== null && remainingAfter > 0 && (
            <p className='mt-1 text-[11px] text-gray-500'>
              This leaves {formatInvoiceMoney(invoice, remainingAfter)} outstanding — the invoice
              stays partially paid.
            </p>
          )}
          {overpaying && !overpayment && (
            <p className='mt-1 text-[11px] text-amber-600'>
              That is {formatInvoiceMoney(invoice, entered - balance)} more than the balance. The
              excess can be credited to the customer&apos;s voucher.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor='payment-method'
            className='mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700'
          >
            Payment method <span className='text-red-500'>*</span>
          </label>
          <select
            id='payment-method'
            value={method}
            onChange={(e) => setMethod(e.target.value as InvoicePaymentMethod | '')}
            disabled={Boolean(overpayment)}
            className='block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60'
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
          label='Payment date'
          type='date'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={invoice.issueDate.slice(0, 10)}
          max={todayIso()}
          disabled={Boolean(overpayment)}
        />

        <Input
          label='Reference (optional)'
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder='Teller slip, transfer ref…'
          maxLength={120}
          autoComplete='off'
          disabled={Boolean(overpayment)}
        />

        <div>
          <label
            htmlFor='payment-notes'
            className='mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700'
          >
            Notes (optional)
          </label>
          <textarea
            id='payment-notes'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            disabled={Boolean(overpayment)}
            placeholder='Anything worth remembering about this payment'
            className='block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60'
          />
        </div>

        {overpayment && (
          <div className='rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200'>
            <p className='font-semibold'>This payment is more than the invoice needs.</p>
            <p className='mt-1'>
              {formatInvoiceMoney(invoice, overpayment.balance ?? balance)} settles the invoice.
              {excess !== null && (
                <>
                  {' '}
                  The remaining{' '}
                  <span className='font-semibold'>{formatInvoiceMoney(invoice, excess)}</span> is
                  credited to {invoice.customerName}&apos;s voucher — it is not revenue and no sale
                  is recorded for it.
                </>
              )}
            </p>
          </div>
        )}

        {error && (
          <div className='rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200'>
            {error}
          </div>
        )}

        <p className='font-body text-[11px] text-gray-400'>
          The payment posts a sale dated {date || 'today'}. A finalized or locked month is never
          rewritten — the payment is dated into the current open month instead.
        </p>
      </form>
    </Modal>
  );
}
