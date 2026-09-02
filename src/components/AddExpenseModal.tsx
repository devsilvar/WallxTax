/**
 * AddExpenseModal — create or edit an expense in a modal (bottom sheet on
 * phones). Form logic moved verbatim from the former inline form in
 * `pages/Expenses.tsx`.
 *
 * Footer contract: the submit button lives in the Modal footer (outside the
 * <form> element) and targets the form via `form="add-expense-form"`.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { PieChart } from 'lucide-react';
import Modal from '@/components/ui/Modal.tsx';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useDashboardEvents } from '@/stores/dashboard.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Expense } from '@/types/index.ts';

const CATEGORIES = [
  'rent',
  'inventory',
  'salary',
  'utility',
  'fuel',
  'logistics',
  'marketing',
  'gift',
  'subscription',
  'other',
] as const;

type AddExpenseModalProps = {
  isOpen: boolean;
  businessId: string;
  /** When set, the modal is in EDIT mode and pre-fills from this expense */
  editExpense: Expense | null;
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

export default function AddExpenseModal({
  isOpen,
  businessId,
  editExpense,
  onClose,
  onSaved,
}: AddExpenseModalProps) {
  const invalidateDashboard = useDashboardEvents((s) => s.invalidateDashboard);

  // Form state (moved from Expenses.tsx)
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('rent');
  const [categoryDetail, setCategoryDetail] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [isDeductible, setIsDeductible] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = editExpense !== null;

  // Reset-on-open + edit pre-fill (same pattern as SalesImportModal)
  useEffect(() => {
    if (!isOpen) return;
    if (editExpense) {
      setAmount(String(Number(editExpense.amount)));
      setCategory(editExpense.category);
      setCategoryDetail(editExpense.categoryDetail || '');
      setDescription(editExpense.description || '');
      setExpenseDate(new Date(editExpense.expenseDate).toISOString().slice(0, 10));
      setIsDeductible(editExpense.isDeductible ?? true);
    } else {
      setAmount('');
      setCategory('rent');
      setCategoryDetail('');
      setDescription('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setIsDeductible(true);
    }
  }, [isOpen, editExpense]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const basePath = `/businesses/${businessId}/expenses`;
    const body = {
      amount: Number(amount),
      category,
      // Only carry the detail for 'other'; switching away clears the stale value.
      categoryDetail: category === 'other' ? categoryDetail.trim() : null,
      description,
      expenseDate,
      isDeductible,
    };
    try {
      if (editExpense) {
        await api.put(`${basePath}/${editExpense.id}`, body);
        toast.success('Expense updated');
        invalidateDashboard('expense_updated');
        onSaved('updated');
      } else {
        await api.post(basePath, body);
        toast.success('Expense created');
        invalidateDashboard('expense_created');
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
      title={isEdit ? 'Edit Expense' : 'New Expense'}
      subtitle='Money your business spends'
      icon={<PieChart className='h-5 w-5 text-warning-500' />}
      size='md'
      footer={
        <>
          <Button type='button' variant='secondary' onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type='submit' form='add-expense-form' isLoading={saving}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id='add-expense-form'
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
          <label htmlFor='expense-category' className='block text-sm font-medium text-gray-700'>Category</label>
          <select
            id='expense-category'
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className='block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          {category === 'gift' && (
            <p className='text-xs text-amber-600'>
              Gifts are usually not tax-deductible — consider unchecking &quot;Tax deductible&quot; below if this is a personal or goodwill gift.
            </p>
          )}
        </div>
        {category === 'other' && (
          <div className='sm:col-span-2'>
            <Input
              label='What is this expense? (required for "Other")'
              placeholder='e.g. Bank charges, office repairs, cleaning supplies'
              value={categoryDetail}
              onChange={(e) => setCategoryDetail(e.target.value)}
              maxLength={200}
              required
            />
            <p className='mt-0.5 text-xs text-gray-500'>
              Help us understand what &quot;Other&quot; means so your records stay accurate for tax filing.
            </p>
          </div>
        )}
        <Input
          label='Description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <Input
          label='Expense Date'
          type='date'
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
        <div className='flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2'>
          <input
            id='isDeductible'
            type='checkbox'
            checked={isDeductible}
            onChange={(e) => setIsDeductible(e.target.checked)}
            className='mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500'
          />
          <div className='flex-1'>
            <label
              htmlFor='isDeductible'
              className='block cursor-pointer text-sm font-medium text-gray-900'
            >
              Tax deductible
            </label>
            <p className='mt-0.5 text-xs text-gray-500'>
              Uncheck if this is a personal expense or not allowable for tax purposes
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
