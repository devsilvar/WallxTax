import { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, Loader2, ArrowRight, Lock } from 'lucide-react';
import Modal from '@/components/ui/Modal.tsx';
import Button from '@/components/ui/Button.tsx';
import CustomerAutocomplete from './CustomerAutocomplete.tsx';
import { useCustomerStore } from '@/stores/customer.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { maskPhoneSuffix } from '@/lib/format';
import toast from 'react-hot-toast';
import type { Customer } from '@/types/index.ts';

interface VoucherAuthModalProps {
  isOpen: boolean;
  businessId: string;
  requiredAmount: number;
  initialCustomer?: Customer | null;
  onClose: () => void;
  onAuthorized: (data: {
    customerId: string;
    customerName: string;
    voucherPin: string;
    voucherLast4: string;
    availableBalance: number;
  }) => void;
}

export default function VoucherAuthModal({
  isOpen,
  businessId,
  requiredAmount,
  initialCustomer = null,
  onClose,
  onAuthorized,
}: VoucherAuthModalProps) {
  const myRole = useBusinessStore((s) => s.activeBusiness?.myRole);
  const isManagerOrOwner = myRole === 'owner' || myRole === 'manager';

  const { fetchCustomerCard } = useCustomerStore();

  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [balance, setBalance] = useState<number | null>(null);
  const [cardCode, setCardCode] = useState<string | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  // PIN authentication state
  const [voucherPin, setVoucherPin] = useState('');
  const [voucherLast4, setVoucherLast4] = useState('');
  const [showPinHint, setShowPinHint] = useState(false);

  useEffect(() => {
    if (initialCustomer) {
      setCustomer(initialCustomer);
    }
  }, [initialCustomer]);

  // Load balance for manager/owner automatically upon selecting customer
  useEffect(() => {
    if (customer && isManagerOrOwner && isOpen) {
      setIsLoadingCard(true);
      fetchCustomerCard(businessId, customer.id)
        .then((detail) => {
          setBalance(detail.card.balance);
          setCardCode(detail.card.cardCode);
        })
        .catch((err) => {
          toast.error(err?.response?.data?.error?.message || 'Failed to fetch card details');
        })
        .finally(() => {
          setIsLoadingCard(false);
        });
    }
  }, [customer, isManagerOrOwner, businessId, isOpen, fetchCustomerCard]);

  const handleAuthorize = () => {
    if (!customer) return;
    if (isManagerOrOwner && balance === null) return;

    // Validate PIN format
    if (!/^\d{6}$/.test(voucherPin.trim())) {
      toast.error('Voucher PIN must be exactly 6 digits');
      return;
    }

    // Validate last-4 format
    if (!/^\d{4}$/.test(voucherLast4.trim())) {
      toast.error('Last 4 digits of phone must be exactly 4 digits');
      return;
    }

    // Check balance sufficiency when visible (manager/owner) — sales_staff
    // cannot fetch balance (403) so the server is the source of truth for them.
    if (balance !== null && balance < requiredAmount) {
      toast.error(`Voucher balance (₦${balance.toLocaleString()}) is less than required (₦${requiredAmount.toLocaleString()})`);
      return;
    }

    onAuthorized({
      customerId: customer.id,
      customerName: customer.name,
      voucherPin: voucherPin.trim(),
      voucherLast4: voucherLast4.trim(),
      availableBalance: balance ?? requiredAmount,
    });
    onClose();
  };

  const isInsufficient = balance !== null && balance < requiredAmount;
  const customerLast4 = customer?.phone ? maskPhoneSuffix(customer.phone) : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay with Store Voucher"
      subtitle="Verify customer identity with PIN and phone verification"
    >
      <div className="space-y-4 py-1">
        {/* Customer Selection */}
        <div>
          <CustomerAutocomplete
            businessId={businessId}
            selectedCustomer={customer}
            onSelectCustomer={(c) => {
              setCustomer(c);
              setBalance(null);
              setCardCode(null);
              setVoucherPin('');
              setVoucherLast4('');
            }}
            label="1. Select Customer"
            required
          />
        </div>

        {customer && (
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            {/* Manager / Owner View with Balance */}
            {isManagerOrOwner && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/60">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Manager / Owner session: Balance visible, but PIN+Phone verification still required.</span>
                </div>

                {isLoadingCard ? (
                  <div className="flex items-center justify-center p-4 text-xs text-gray-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching voucher balance...
                  </div>
                ) : balance !== null ? (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold">
                        Available Voucher Balance
                      </div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                      {cardCode && (
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          Card Code: [{cardCode}]
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-gray-500">Sale Amount</div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        ₦{requiredAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* PIN Authentication Form (Required for Everyone) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <Lock className="w-3.5 h-3.5" />
                <span>2. Enter Customer's Voucher PIN & Last-4 Phone</span>
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  6-Digit Voucher PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={voucherPin}
                  onChange={(e) => setVoucherPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 text-center text-lg font-mono tracking-[0.5em] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoComplete="off"
                />
                <div className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  The 6-digit PIN from the customer's voucher email/SMS
                </div>
              </div>

              {/* Last-4 Phone Input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Last 4 Digits of Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="●●●●"
                    value={voucherLast4}
                    onChange={(e) => setVoucherLast4(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 text-center text-lg font-mono tracking-[0.5em] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoComplete="off"
                  />
                  {customerLast4 && (
                    <button
                      type="button"
                      onClick={() => setShowPinHint(!showPinHint)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold"
                    >
                      {showPinHint ? 'Hide' : 'Hint'}
                    </button>
                  )}
                </div>
                {showPinHint && customerLast4 && (
                  <div className="mt-1.5 p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded text-[10px] text-purple-800 dark:text-purple-200">
                    Expected last 4 digits: <strong className="font-mono">{customerLast4}</strong>
                  </div>
                )}
                <div className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  Security verification: last 4 digits of {customer.phone || 'phone on file'}
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] text-blue-700 dark:text-blue-300">
                <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <strong>PIN Authentication:</strong> The customer must provide their 6-digit voucher PIN and verify the last 4 digits of their registered phone number for security.
                </div>
              </div>
            </div>

            {/* Insufficient Balance Alert */}
            {isInsufficient && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Insufficient Balance:</strong> The customer has ₦{balance?.toLocaleString()} available, but the sale requires ₦{requiredAmount.toLocaleString()}.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleAuthorize}
          disabled={
            !customer ||
            (isManagerOrOwner && balance === null) ||
            isInsufficient ||
            voucherPin.length !== 6 ||
            voucherLast4.length !== 4
          }
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
        >
          <span>Authorize Voucher Payment</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Modal>
  );
}
