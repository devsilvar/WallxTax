import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil } from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useCreditStore } from '@/stores/credit.store.ts';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/axios.ts';
import type { CustomerCredit } from '@/types/index.ts';

interface EditCreditModalProps {
  businessId: string;
  credit: CustomerCredit;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function EditCreditModal({
  businessId,
  credit,
  isOpen,
  onClose,
  onUpdated,
}: EditCreditModalProps) {
  const updateCredit = useCreditStore((s) => s.updateCredit);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill from credit on open
  useEffect(() => {
    if (!isOpen) return;
    setCustomerName(credit.customerName || '');
    setCustomerPhone(credit.customerPhone || '');
    setCustomerEmail(credit.customerEmail || '');
    setDescription(credit.description || '');
    setDueDate(credit.dueDate ? new Date(credit.dueDate).toISOString().slice(0, 10) : '');
    setReminderDate(credit.reminderDate ? new Date(credit.reminderDate).toISOString().slice(0, 10) : '');
    setGuarantorName(credit.guarantorName || '');
    setGuarantorPhone(credit.guarantorPhone || '');
    setNotes(credit.notes || '');
  }, [isOpen, credit]);

  // ESC key + scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, loading, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    setLoading(true);
    try {
      await updateCredit(businessId, credit.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || '',
        customerEmail: customerEmail.trim() || '',
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        reminderDate: reminderDate || undefined,
        guarantorName: guarantorName.trim() || '',
        guarantorPhone: guarantorPhone.trim() || '',
        notes: notes.trim() || '',
      });
      toast.success('Debtor record updated');
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white border border-gray-200 shadow-xl w-full max-w-xl mx-4 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600 flex items-center justify-center shadow-xs">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Edit Debtor Record</h2>
              <p className="text-[11px] text-gray-500">Update debtor, guarantor, and schedule details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="space-y-5">
            {/* Debtor Information */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Debtor Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Customer Name"
                  placeholder="e.g. Alhaji Musa"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="e.g. 08012345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="e.g. customer@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Credit Details */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Credit Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    label="Description"
                    placeholder="Goods / services sold on credit"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                  />
                </div>
                <Input
                  label="Payment Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                />
                <Input
                  label="Reminder Date"
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                />
              </div>
            </div>

            {/* Guarantor Information */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Guarantor / Surety Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Guarantor Name"
                  placeholder="e.g. Alhaji Ibrahim"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                />
                <Input
                  label="Guarantor Phone"
                  placeholder="e.g. 08098765432"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="rounded-none border-gray-300 focus:border-gray-900 focus:ring-0 text-xs"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Internal Notes
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this credit obligation..."
                rows={3}
                className="block w-full rounded-none border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:ring-0 outline-none transition-all resize-none"
                maxLength={2000}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="rounded-none border-gray-300 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            className="rounded-none text-xs"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
