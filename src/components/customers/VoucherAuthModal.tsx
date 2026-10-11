import { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, Loader2, ArrowRight, Lock, Eye, EyeOff, Info, CreditCard, User } from 'lucide-react';
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

  const [voucherPin, setVoucherPin] = useState('');
  const [voucherLast4, setVoucherLast4] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinHint, setShowPinHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (initialCustomer) setCustomer(initialCustomer);
  }, [initialCustomer]);

  useEffect(() => {
    if (!isOpen) {
      setVoucherPin('');
      setVoucherLast4('');
      setShowPin(false);
      setShowPinHint(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!customer || !isOpen) {
      setBalance(null);
      setCardCode(null);
      return;
    }
    if (isManagerOrOwner) {
      setIsLoadingCard(true);
      fetchCustomerCard(businessId, customer.id)
        .then((detail) => {
          setBalance(detail.card.balance);
          setCardCode(detail.card.cardCode);
        })
        .catch((err) => {
          // Sales staff get 403 here — handled by role guard, not an error
          const msg = err?.response?.status === 403 ? null : (err?.response?.data?.error?.message || 'Failed to fetch card details');
          if (msg) toast.error(msg);
          setBalance(null);
          setCardCode(null);
        })
        .finally(() => setIsLoadingCard(false));
    } else {
      setBalance(null);
      setCardCode(null);
    }
  }, [customer, isManagerOrOwner, businessId, isOpen, fetchCustomerCard]);

  const handleAuthorize = () => {
    if (!customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!/^\d{6}$/.test(voucherPin.trim())) {
      toast.error('Voucher PIN must be exactly 6 digits');
      return;
    }
    if (!/^\d{4}$/.test(voucherLast4.trim())) {
      toast.error('Last 4 digits must be exactly 4 digits');
      return;
    }
    if (isManagerOrOwner && balance !== null && balance < requiredAmount) {
      toast.error(`Voucher balance (₦${balance.toLocaleString()}) is less than sale (₦${requiredAmount.toLocaleString()})`);
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

  const isInsufficient = isManagerOrOwner && balance !== null && balance < requiredAmount;
  const canSubmit = !!customer && /^\d{6}$/.test(voucherPin.trim()) && /^\d{4}$/.test(voucherLast4.trim()) && !isInsufficient && (!isManagerOrOwner || balance !== null || isLoadingCard === false);
  const managerMissingBalance = isManagerOrOwner && !isLoadingCard && balance === null && !!customer;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay with Store Voucher"
      subtitle="2 quick steps — pick the customer, then enter their PIN to authorize"
      size="md"
    >
      <div className="space-y-4 py-1">
        {/* Stepper — total beginner: shows where they are */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${customer ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-600 text-white border-emerald-600'}`}>
            <span className="w-5 h-5 rounded-full bg-white text-emerald-700 flex items-center justify-center text-xs font-extrabold">1</span>
            Select customer
          </div>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${customer ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold ${customer ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-500'}`}>2</span>
            Authorize
          </div>
        </div>

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
          label="Step 1 — Choose customer"
          placeholder="Search by name or phone…  •  tap to see all customers"
          required
        />

        {/* Sale amount — always visible, even for sales rep */}
        <div className="flex items-center justify-between p-3 bg-gray-900 text-white rounded-xl">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Sale to pay</div>
            <div className="text-lg font-extrabold tabular-nums">₦{requiredAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-400">You are</div>
            <div className="text-xs font-bold px-2 py-1 rounded-full bg-white/15 border border-white/20 inline-flex items-center gap-1">
              <User className="w-3 h-3" />
              {isManagerOrOwner ? 'Manager / Owner' : 'Sales Representative'}
            </div>
          </div>
        </div>

        {customer && (
          <div className="space-y-3">
            {/* Customer context card */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{customer.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.phone || 'No phone'} {cardCode ? `• Card ${cardCode}` : ''}</div>
              </div>
              {isManagerOrOwner && !isLoadingCard && balance !== null && (
                <div className={`text-right px-2.5 py-1 rounded-full text-xs font-extrabold border ${isInsufficient ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {/* Manager / Owner balance panel */}
            {isManagerOrOwner ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-800 dark:text-purple-200">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><strong>Manager view:</strong> you see the balance, but PIN + phone check is still required for every redemption.</span>
                </div>

                {isLoadingCard ? (
                  <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading voucher balance…
                  </div>
                ) : balance !== null ? (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${isInsufficient ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'}`}>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Available balance</div>
                      <div className={`text-lg font-extrabold tabular-nums ${isInsufficient ? 'text-red-700' : 'text-emerald-700'}`}>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
                      {cardCode && <div className="text-[11px] font-mono text-gray-500">Card {cardCode}</div>}
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${isInsufficient ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                      {isInsufficient ? 'Insufficient' : 'Sufficient'}
                    </div>
                  </div>
                ) : managerMissingBalance ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                    Could not load balance. Check the customer has a voucher card, or try again.
                  </div>
                ) : null}

                {isInsufficient && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div><strong>Insufficient balance:</strong> customer has ₦{balance?.toLocaleString()} but this sale needs ₦{requiredAmount.toLocaleString()}. Top up the voucher or reduce the sale.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Sales Representative — balance hidden.</strong> For security, only managers see balances. Enter the PIN + last 4 digits and we’ll verify securely when you create the sale. If the balance is too low, you’ll get a clear error then — no money is taken until verified.
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Voucher balance
                  </span>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    Verified on submit
                  </span>
                </div>
              </div>
            )}

            {/* Step 2 — PIN + Last 4 */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <Lock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  Step 2 — Enter PIN & last 4 digits
                </div>
                <button type="button" onClick={() => setShowHelp(!showHelp)} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                  {showHelp ? 'Hide help' : 'Where is the PIN?'}
                </button>
              </div>

              {showHelp && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  The 6-digit PIN was sent to the customer by SMS/email when their voucher was created or topped up. Ask the customer to read it out. The last 4 digits are from the phone on file — it proves the right person is here.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  6-Digit Voucher PIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={showPin ? '123456' : '••••••'}
                    value={voucherPin}
                    onChange={(e) => setVoucherPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-3 pr-10 text-center text-lg font-mono tracking-[0.4em] bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    autoComplete="off"
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className={`text-[11px] ${voucherPin.length === 6 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
                    {voucherPin.length}/6 digits
                  </span>
                  <span className="text-[11px] text-gray-400">Numbers only</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Last 4 digits of customer’s phone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 5678"
                    value={voucherLast4}
                    onChange={(e) => setVoucherLast4(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-3 pr-20 text-center text-lg font-mono tracking-[0.4em] bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    autoComplete="off"
                  />
                  {customer?.phone && (
                    <button
                      type="button"
                      onClick={() => setShowPinHint(!showPinHint)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full hover:bg-emerald-100"
                    >
                      {showPinHint ? 'Hide' : 'Hint'}
                    </button>
                  )}
                </div>
                {showPinHint && customer?.phone && (
                  <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                    Hint — last 4 on file: <strong className="font-mono text-sm">{maskPhoneSuffix(customer.phone) || '—'}</strong> <span className="text-emerald-600 dark:text-emerald-300">(use to verify, still type the 4 digits)</span>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Ask the customer to confirm the last 4 of {customer.phone || 'the phone on file'}.
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
                <span><strong>Why both?</strong> PIN proves the customer has the voucher; last 4 proves it’s the right phone. Both must match in the system before any money moves.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} size="sm" className="rounded-full">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleAuthorize}
          disabled={!canSubmit}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 flex items-center gap-2 disabled:opacity-50"
        >
          <Lock className="w-3.5 h-3.5" />
          Authorize Voucher Payment
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Modal>
  );
}
