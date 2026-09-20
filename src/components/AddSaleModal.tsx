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
import { TrendingUp, Package, Banknote } from 'lucide-react';
import Modal from '@/components/ui/Modal.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useDashboardEvents } from '@/stores/dashboard.store.ts';
import { paymentTypeLabel } from '@/lib/paymentTypes.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { SalesTransaction, SaleLineItem } from '@/types/index.ts';
import SaleItemsEditor from './SaleItemsEditor.tsx';

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

  // Mode: 'items' (Products / Goods) or 'single' (Service / Flat Amount)
  const [mode, setMode] = useState<'single' | 'items'>('items');
  const [items, setItems] = useState<SaleLineItem[]>([
    { name: '', quantity: 1, unitPrice: 0 },
  ]);

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

      if (editSale.items && editSale.items.length > 0) {
        setMode('items');
        setItems(
          editSale.items.map((it) => ({
            name: it.name,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            lineTotal: Number(it.lineTotal ?? it.quantity * it.unitPrice),
            sortOrder: it.sortOrder,
          }))
        );
      } else {
        setMode('single');
        setItems([{ name: '', quantity: 1, unitPrice: 0 }]);
      }
    } else {
      setMode('items');
      setItems([{ name: '', quantity: 1, unitPrice: 0 }]);
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

    const body: Record<string, any> = {
      source,
      description: description || undefined,
      customerName: customerName || undefined,
      transactionDate,
    };

    if (mode === 'items') {
      const validItems = items.filter((i) => i.name.trim().length > 0);
      if (validItems.length === 0) {
        toast.error('Please enter at least one item with a name');
        setSaving(false);
        return;
      }
      body.items = validItems.map((i) => ({
        name: i.name.trim(),
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0),
      }));
    } else {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error('Amount must be greater than 0');
        setSaving(false);
        return;
      }
      body.amount = numAmount;
      if (editSale?.items && editSale.items.length > 0) {
        body.items = []; // Clears items on the server
      }
    }

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
      icon={<TrendingUp className='h-5 w-5 text-primary-600' />}
      size={mode === 'items' ? 'lg' : 'md'}
      footer={
        <>
          <Button variant='secondary' onClick={onClose} disabled={saving} className='rounded-none border-gray-300'>
            Cancel
          </Button>
          <Button type='submit' form='add-sale-form' isLoading={saving} className='rounded-none'>
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
        {/* Transaction Type Mode Toggle */}
        <div className='sm:col-span-2 space-y-1.5'>
          <label className='block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'>
            Transaction Type
          </label>
          <div className='grid grid-cols-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-none border border-gray-200 dark:border-slate-700 gap-1'>
            <button
              type='button'
              onClick={() => setMode('items')}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-none transition-all ${
                mode === 'items'
                  ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm border border-gray-200 dark:border-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Package className='w-4 h-4' />
              <span>Products / Goods</span>
            </button>
            <button
              type='button'
              onClick={() => setMode('single')}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-none transition-all ${
                mode === 'single'
                  ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm border border-gray-200 dark:border-slate-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Banknote className='w-4 h-4' />
              <span>Service / Flat Amount</span>
            </button>
          </div>
          <p className='text-[11px] text-slate-500 dark:text-slate-400 px-0.5'>
            {mode === 'items'
              ? 'For physical goods sold by quantity and unit price (1 product or many).'
              : 'For services, repairs, consulting, or lump-sum daily totals without item quantities.'}
          </p>
        </div>

        {mode === 'single' ? (
          <Input
            label='Amount (₦)'
            type='number'
            inputMode='decimal'
            step='0.01'
            min='0.01'
            placeholder='0.00'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className='rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs'
            required
          />
        ) : (
          <div className='sm:col-span-2'>
            <SaleItemsEditor
              items={items}
              onChange={setItems}
              disabled={saving}
            />
          </div>
        )}
        <div className='space-y-1'>
          <label htmlFor='sale-source' className='block text-xs font-semibold text-gray-700'>Payment Type</label>
          <select
            id='sale-source'
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className='block w-full rounded-none border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:ring-0 outline-none transition-all'
          >
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {paymentTypeLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <Input
          label={mode === 'items' ? 'Order Note (Optional)' : 'Service Description'}
          placeholder={
            mode === 'items'
              ? 'e.g. Delivered to shop, Balance due on Friday'
              : 'e.g. Haircut & styling, Generator repair, POS daily sales'
          }
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs'
        />
        <Input
          label='Customer Name'
          placeholder='e.g. Alhaji Musa'
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className='rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs'
        />
        <Input
          label='Transaction Date'
          type='date'
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          className='rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs'
          required
        />
        <div className='space-y-1'>
          <label htmlFor='sale-classification' className='block text-xs font-semibold text-gray-700'>
            Classification (Optional)
          </label>
          <select
            id='sale-classification'
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className='block w-full rounded-none border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:ring-0 outline-none transition-all'
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
