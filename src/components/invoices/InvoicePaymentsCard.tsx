import { useState } from 'react';
import { Ban, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Modal from '@/components/ui/Modal.tsx';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import { invoicePaymentMethodLabel } from '@/types/index.ts';
import type { Invoice, InvoicePayment } from '@/types/index.ts';
import { getErrorMessage } from '@/lib/axios.ts';
import { formatInvoiceMoney } from '@/lib/currency';

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type Props = {
  businessId: string;
  invoice: Invoice;
  onChanged: (invoice: Invoice) => void;
};

/**
 * The payment ledger for one invoice.
 *
 * Rows are never deleted — voiding stamps `voidedAt` and reverses the linked
 * sale, so the history of what was received and then taken back stays visible.
 */
export default function InvoicePaymentsCard({ businessId, invoice, onChanged }: Props) {
  const voidPayment = useInvoiceStore((s) => s.voidPayment);

  const [target, setTarget] = useState<InvoicePayment | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const payments = invoice.payments ?? [];
  if (payments.length === 0) return null;

  const openVoid = (payment: InvoicePayment) => {
    setTarget(payment);
    setReason('');
    setError(null);
  };

  const closeVoid = () => {
    if (submitting) return;
    setTarget(null);
    setReason('');
    setError(null);
  };

  const handleVoid = async () => {
    if (!target || submitting) return;
    if (reason.trim().length < 3) {
      setError('Give a reason — it is kept on the payment record.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await voidPayment(businessId, invoice.id, target.id, {
        reason: reason.trim(),
      });
      toast.success('Payment voided');
      setTarget(null);
      setReason('');
      onChanged(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card noPadding className='overflow-hidden'>
      <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5'>
        <div className='flex items-center gap-2'>
          <Receipt className='h-4 w-4 text-gray-400' />
          <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
            Payments
          </p>
        </div>
        <p className='text-xs text-gray-500'>
          <span className='font-semibold tabular-nums text-gray-900'>
            {formatInvoiceMoney(invoice, invoice.amountPaid)}
          </span>{' '}
          of {formatInvoiceMoney(invoice, invoice.total)}
        </p>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full text-left text-xs'>
          <thead>
            <tr className='border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400'>
              <th className='px-4 py-2 font-semibold sm:px-5'>Date</th>
              <th className='px-4 py-2 font-semibold'>Method</th>
              <th className='px-4 py-2 font-semibold'>Reference</th>
              <th className='px-4 py-2 text-right font-semibold'>Amount</th>
              <th className='px-4 py-2 sm:px-5' />
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const voided = Boolean(payment.voidedAt);
              return (
                <tr
                  key={payment.id}
                  className={`border-b border-gray-50 last:border-0 ${voided ? 'opacity-60' : ''}`}
                >
                  <td className='whitespace-nowrap px-4 py-2.5 text-gray-700 sm:px-5'>
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className='px-4 py-2.5 text-gray-700'>
                    {invoicePaymentMethodLabel(payment.method) ?? '—'}
                  </td>
                  <td className='max-w-[12rem] truncate px-4 py-2.5 text-gray-500'>
                    {payment.reference || '—'}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${
                      voided ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {formatInvoiceMoney(invoice, payment.amount)}
                  </td>
                  <td className='px-4 py-2.5 text-right sm:px-5'>
                    {voided ? (
                      <span
                        className='text-[11px] font-medium text-gray-400'
                        title={payment.voidReason ?? 'Voided'}
                      >
                        Voided
                      </span>
                    ) : (
                      <button
                        type='button'
                        onClick={() => openVoid(payment)}
                        className='inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 transition-colors hover:text-rose-600'
                        title='Void this payment'
                      >
                        <Ban className='h-3 w-3' /> Void
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(target)}
        onClose={closeVoid}
        title='Void this payment'
        subtitle={
          target
            ? `${formatInvoiceMoney(invoice, target.amount)} received ${formatDate(target.paymentDate)}`
            : undefined
        }
        icon={<Ban className='h-4 w-4' />}
        size='sm'
        dismissible={!submitting}
        footer={
          <div className='flex justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={closeVoid} disabled={submitting}>
              Keep payment
            </Button>
            <Button
              variant='danger'
              size='sm'
              onClick={handleVoid}
              isLoading={submitting}
              disabled={submitting}
            >
              Void payment
            </Button>
          </div>
        }
      >
        <p className='font-body text-xs text-gray-600'>
          The payment stays on the record, marked void, and the sale it created is reversed. The
          invoice goes back to partially paid — or to sent, if this was the only payment.
        </p>
        <div className='mt-4'>
          <label
            htmlFor='void-reason'
            className='mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700'
          >
            Reason <span className='text-red-500'>*</span>
          </label>
          <textarea
            id='void-reason'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder='e.g. Cheque bounced'
            className='block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20'
          />
        </div>
        {error && (
          <p className='mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200'>
            {error}
          </p>
        )}
      </Modal>
    </Card>
  );
}
