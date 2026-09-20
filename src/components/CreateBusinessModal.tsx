import { useState, useEffect, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2 } from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import toast from 'react-hot-toast';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If true, user cannot dismiss (first-time flow) */
  required?: boolean;
}

const businessTypes = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship (Individual)' },
  { value: 'llc', label: 'Registered Business (LLC)' },
];

export default function CreateBusinessModal({ isOpen, onClose, required }: CreateBusinessModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
  const createBusiness = useBusinessStore((s) => s.createBusiness);
  const setActiveBusiness = useBusinessStore((s) => s.setActiveBusiness);

  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    businessType: 'sole_proprietorship',
    taxId: '',
    address: '',
    city: '',
    state: '',
  });

  if (!isOpen) return null;

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.ownerName.trim()) {
      toast.error('Business name and owner name are required');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        businessType: form.businessType,
      };
      if (form.taxId.trim()) payload.taxId = form.taxId.trim();
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.state.trim()) payload.state = form.state.trim();

      const business = await createBusiness(payload);
      setActiveBusiness(business);
      toast.success('Business created successfully!');
      setForm({ businessName: '', ownerName: '', businessType: 'sole_proprietorship', taxId: '', address: '', city: '', state: '' });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create business');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={required ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg max-h-[88vh] flex flex-col rounded-none bg-white shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-150">
        {/* Pinned Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-none bg-gray-900 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">
                {required ? 'Set Up Your First Business' : 'Register New Business'}
              </h2>
              <p className="text-xs text-gray-500">
                {required
                  ? 'Enter your business details to get started with PayMyTax.'
                  : 'Add an additional business entity to your account.'}
              </p>
            </div>
          </div>
          {!required && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-none border border-transparent p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form id="create-business-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Input
            label="Business Name *"
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            placeholder="e.g. Acme Trading Ltd"
            className="rounded-none"
            required
          />

          <Input
            label="Owner Name *"
            value={form.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
            placeholder="e.g. Chidi Okonkwo"
            className="rounded-none"
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Business Type *</label>
            <select
              value={form.businessType}
              onChange={(e) => update('businessType', e.target.value)}
              className="block w-full rounded-none border border-gray-300 px-3 py-2 text-xs shadow-sm transition-colors focus:outline-none focus:border-gray-900 focus:ring-0"
            >
              {businessTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {form.businessType === 'llc' && (
            <Input
              label="Tax ID (TIN)"
              value={form.taxId}
              onChange={(e) => update('taxId', e.target.value)}
              placeholder="Enter your TIN"
              className="rounded-none"
            />
          )}

          <Input
            label="Address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Optional business address"
            className="rounded-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Optional"
              className="rounded-none"
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="Optional"
              className="rounded-none"
            />
          </div>
        </form>

        {/* Pinned Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 shrink-0">
          {!required && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            form="create-business-form"
            isLoading={isLoading}
            className="rounded-none text-xs"
          >
            Create Business
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
