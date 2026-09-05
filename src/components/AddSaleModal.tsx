/**
 * AddSaleModal — create or edit a sale in a modal (bottom sheet on phones).
 *
 * Form logic moved verbatim from the former inline form in `pages/Sales.tsx`
 * (create POST / edit PUT + conditional classification verify). The modal owns
 * its own state, so typing never re-renders the parent list.
 *
 * Footer contract: the submit button lives in the Modal footer (outside the
 * <form> element) and targets the form via `form="add-sale-form"`.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Receipt } from 'lucide-react';
import Modal from '@/components/ui/Modal.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useDashboardEvents } from '@/stores/dashboard.store.ts';
import { paymentTypeLabel } from '@/lib/paymentTypes.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { SalesTransaction } from '@/types/index.ts';

const SOURCES = [
  'bank_transfer',
  'paycode',
  'pos',
  'online_store',
  'cash',
  'invoice',
] as const;

// 'manual' is retired from the UI (migration 20260904120000_retire_manual_source
// mapped old rows to 'cash') but the backend still accepts it — sourceOptions
// below keeps any retired value selectable when editing a legacy row.

type TransactionClassification = {
  id: string;
  name: string;
  category: string;
  description: string | null;
};

type AddSaleModalProps = {
  isOpen: boolean;
  businessId: string;
  /** When set, the modal is in EDIT mode and pre-fills from this sale */
  editSale: SalesTransaction | null;
  onClose: () => void;
  /** Called after a successful create/update so the parent refetches.
   *  outcome lets the parent decide page-reset (create) vs stay-on-page (edit). */
  onSaved: (outcome: 'created' | 'updated') => void;
};

/** Extracts the API error message without `any` (rules.txt). */
function getApiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error;
  return apiErr?.message || fallback;
}

export default function AddSaleModal({
  isOpen,
  businessId,
  editSale,
  onClose,
  onSaved,
}: AddSaleModalProps) {
  const invalidateDashboard = useDashboardEvents((s) => s.invalidateDashboard);

  // Form state (moved from Sales.tsx)
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<string>('cash');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [classification, setClassification] = useState('');
  const [originalClassification, setOriginalClassification] = useState('');
  const [saving, setSaving] = useState(false);

  const [classifications, setClassifications] = useState<TransactionClassification[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

  const isEdit = editSale !== null;

  // Editing a legacy 'manual' (or any retired) row: keep that value selectable
  // so a save doesn't silently rewrite history — the backend still accepts it.
  const sourceOptions: string[] =
    isEdit && editSale && !(SOURCES as readonly string[]).includes(editSale.source)
      ? [...SOURCES, editSale.source]
      : [...SOURCES];

  // Reset-on-open + edit pre-fill (same pattern as SalesImportModal)
  useEffect(() => {
    if (!isOpen) return;
    if (editSale) {
      setAmount(String(Number(editSale.amount)));
      setSource(editSale.source);
      setDescription(editSale.description || '');
      setCustomerName(editSale.customerName || '');
      setTransactionDate(new Date(editSale.transactionDate).toISOString().slice(0, 10));
      const currentClass = editSale.finalClassification || '';
      setClassification(currentClass);
      setOriginalClassification(currentClass);
    } else {
      setAmount('');
      setSource('cash');
      setDescription('');
      setCustomerName('');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setClassification('');
      setOriginalClassification('');
    }
  }, [isOpen, editSale]);

  // Classifications load when the modal opens (was: on page mount)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingClassifications(true);
    api
      .get('/transaction-classifications')
      .then((r) => {
        if (!cancelled && r.data.data && Array.isArray(r.data.data)) {
          setClassifications(r.data.data);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load classifications');
      })
      .finally(() => {
        if (!cancelled) setLoadingClassifications(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const basePath = `/businesses/${businessId}/sales`;
    const body = {
      amount: Number(amount),
      source,
      description: description || undefined,
      customerName: customerName || undefined,
      transactionDate,
    };
    try {
      if (editSale) {
        await api.put(`${basePath}/${editSale.id}`, body);

        // Only verify if classification changed
        if (classification && classification !== originalClassification) {
          await api.post(`${basePath}/${editSale.id}/verify`, { classification });
        }

        toast.success('Sale updated');
        invalidateDashboard('sale_updated');
        onSaved('updated');
      } else {
        await api.post(basePath, body);
        toast.success('Sale created');
        invalidateDashboard('sale_created');
        onSaved('created');
      }
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dismissible={!saving}
      title={isEdit ? 'Edit Sale' : 'New Sale'}
      subtitle='Money received from selling'
      icon={<Receipt className='h-5 w-5 text-primary-600' />}
      size='md'
      footer={
        <>
          <Button type='button' variant='secondary' onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='add-sale-form' isLoading={saving}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id='add-sale-form'
        onSubmit={handleSubmit}
        className='grid grid-cols-1 gap-4 sm:grid-cols-2'
      >
        <Input
          label='Amount (₦)'
          type='number'
          inputMode='decimal'
          step='0.01'
          min='1'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <div className='space-y-1'>
          <label htmlFor='sale-source' className='block text-sm font-medium text-gray-700'>Payment Type</label>
          <select
            id='sale-source'
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
          >
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {paymentTypeLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <Input
          label='Description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label='Customer Name'
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <Input
          label='Transaction Date'
          type='date'
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
        />
        <div className='space-y-1'>
          <label htmlFor='sale-classification' className='block text-sm font-medium text-gray-700'>
            Classification (Optional)
          </label>
          <select
            id='sale-classification'
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
            disabled={loadingClassifications}
          >
            <option value=''>Not classified</option>
            {classifications.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
