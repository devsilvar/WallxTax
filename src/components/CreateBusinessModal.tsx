import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={required ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enter your business details</h2>
            <p className="mt-1 text-sm text-gray-500">
              {required
                ? 'Set up your first business to get started with PayMyTax.'
                : 'Add another business to your account.'}
            </p>
          </div>
          {!required && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Business Name *"
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            placeholder="e.g. Acme Trading Ltd"
            required
          />

          <Input
            label="Owner Name *"
            value={form.ownerName}
            onChange={(e) => update('ownerName', e.target.value)}
            placeholder="e.g. Chidi Okonkwo"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Business Type *</label>
            <select
              value={form.businessType}
              onChange={(e) => update('businessType', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            />
          )}

          <Input
            label="Address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Optional"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" isLoading={isLoading} className="w-full">
              Create Business
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
