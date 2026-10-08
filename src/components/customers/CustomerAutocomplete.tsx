import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X, CreditCard, ChevronDown, Loader2 } from 'lucide-react';
import { useCustomerStore } from '@/stores/customer.store.ts';
import PhoneInput from '@/components/ui/PhoneInput.tsx';
import Button from '@/components/ui/Button.tsx';
import toast from 'react-hot-toast';
import type { Customer } from '@/types/index.ts';

interface CustomerAutocompleteProps {
  businessId: string;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showCardBalance?: boolean;
}

export default function CustomerAutocomplete({
  businessId,
  selectedCustomer,
  onSelectCustomer,
  label = 'Customer (Phone or Name)',
  placeholder = 'Search by name or phone...',
  required = false,
  showCardBalance = true,
}: CustomerAutocompleteProps) {
  const { customers, loading, searchCustomers, quickCreateCustomer } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Quick-add form fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+234');
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (businessId && isOpen && !showQuickAdd) {
      searchCustomers(businessId, searchTerm);
    }
  }, [businessId, searchTerm, isOpen, showQuickAdd, searchCustomers]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowQuickAdd(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchTerm('');
    setIsOpen(false);
    setShowQuickAdd(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
    setSearchTerm('');
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!newPhone || newPhone.replace(/\D/g, '').length < 10) {
      toast.error('A valid phone number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await quickCreateCustomer(businessId, {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
      });
      toast.success(`Customer ${created.name} added!`);
      handleSelect(created);
      setNewName('');
      setNewPhone('+234');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected Customer View / Search Trigger */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {selectedCustomer.name}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>{selectedCustomer.phone || 'No phone'}</span>
                {showCardBalance && selectedCustomer.card && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded text-[10px]">
                    <CreditCard className="w-2.5 h-2.5" />
                    ₦{Number(selectedCustomer.card.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
            title="Change customer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            onClick={() => setIsOpen(true)}
            className="flex items-center w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              className="w-full bg-transparent border-none p-0 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
          </div>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && !selectedCustomer && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-72 flex flex-col">
          {!showQuickAdd ? (
            <>
              {/* Results List */}
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <div className="flex items-center justify-center p-4 text-xs text-gray-400 gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching customers...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    {searchTerm ? `No customer found matching "${searchTerm}"` : 'No customers found'}
                  </div>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className="w-full text-left p-2.5 hover:bg-emerald-50/60 dark:hover:bg-gray-800 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {c.phone || 'No phone'}
                        </div>
                      </div>
                      {c.card && (
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                            ₦{Number(c.card.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Quick Add Footer Button */}
              <div className="p-2 border-t border-gray-100 dark:divide-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAdd(true);
                    if (searchTerm) {
                      if (/^\+?\d+$/.test(searchTerm.replace(/\s/g, ''))) {
                        setNewPhone(searchTerm);
                      } else {
                        setNewName(searchTerm);
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Quick-Add Customer
                </button>
              </div>
            </>
          ) : (
            /* Inline Quick-Add Form */
            <form onSubmit={handleQuickAddSubmit} className="p-3 space-y-2.5 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  New Customer
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adebayo Ogunlesi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <PhoneInput
                  label="Phone Number *"
                  value={newPhone}
                  onChange={(full) => setNewPhone(full)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-1 flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save & Select Customer'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
