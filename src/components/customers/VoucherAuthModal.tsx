import { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import Modal from '@/components/ui/Modal.tsx';
import Button from '@/components/ui/Button.tsx';
import CustomerAutocomplete from './CustomerAutocomplete.tsx';
import { useCustomerStore } from '@/stores/customer.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
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
    stepUpToken?: string;
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

  const { fetchCustomerCard, requestOtp, verifyOtp } = useCustomerStore();

  const [customer, setCustomer] = useState<Customer | null>(initialCustomer);
  const [balance, setBalance] = useState<number | null>(null);
  const [cardCode, setCardCode] = useState<string | null>(null);

  // OTP flow state for staff
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [silentTestCode, setSilentTestCode] = useState<string | null>(null);

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

  const handleSendOtp = async () => {
    if (!customer) return;
    setIsRequestingOtp(true);
    try {
      const res = await requestOtp(businessId, customer.id);
      setOtpSent(true);
      if (res.maskedPhone) setMaskedPhone(res.maskedPhone);
      if (res.testCode) {
        setSilentTestCode(res.testCode);
        setOtpCode(res.testCode);
        toast.success(res.message || 'SMS test mode: Code 123456 auto-loaded!');
      } else {
        toast.success(res.message || 'Verification code sent to customer');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to send OTP code');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !otpCode.trim()) return;
    setIsVerifyingOtp(true);
    try {
      const res = await verifyOtp(businessId, customer.id, otpCode.trim());
      setStepUpToken(res.token);
      setBalance(res.balance);
      setCardCode(res.cardCode);
      toast.success('Customer verified successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Invalid verification code');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleAuthorize = () => {
    if (!customer || balance === null) return;
    if (balance < requiredAmount) {
      toast.error(`Voucher balance (₦${balance.toLocaleString()}) is less than required (₦${requiredAmount.toLocaleString()})`);
      return;
    }

    onAuthorized({
      customerId: customer.id,
      customerName: customer.name,
      stepUpToken: stepUpToken || undefined,
      availableBalance: balance,
    });
    onClose();
  };

  const isInsufficient = balance !== null && balance < requiredAmount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay with Store Voucher"
      subtitle="Verify customer identity and redeem store voucher balance"
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
              setOtpSent(false);
              setOtpCode('');
              setStepUpToken(null);
            }}
            label="1. Select Customer"
            required
          />
        </div>

        {customer && (
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            {/* Manager / Owner Bypass View */}
            {isManagerOrOwner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Manager / Owner session active: One-time phone verification bypassed.</span>
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
            ) : (
              /* Staff Verification Flow with KudiSMS OTP */
              <div className="space-y-3">
                {!stepUpToken ? (
                  <>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      To redeem store credit, a one-time verification code will be sent to the customer's phone ({maskedPhone || customer.phone || 'on file'}).
                    </div>

                    {!otpSent ? (
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isRequestingOtp}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 flex items-center justify-center gap-2"
                      >
                        {isRequestingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Sending code via SMS...
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5" />
                            Send 6-Digit Code to Customer
                          </>
                        )}
                      </Button>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Enter 6-Digit Verification Code
                          </label>
                          {silentTestCode && (
                            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 rounded flex items-center justify-between">
                              <span>Silent Test Mode: Code <strong>{silentTestCode}</strong></span>
                              <button
                                type="button"
                                onClick={() => setOtpCode(silentTestCode)}
                                className="font-bold underline text-amber-900 dark:text-amber-100 hover:opacity-80"
                              >
                                Auto-Fill
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="e.g. 123456"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-2 text-center text-sm font-mono tracking-widest bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
                              autoFocus
                            />
                            <Button
                              type="submit"
                              disabled={otpCode.length < 4 || isVerifyingOtp}
                              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4"
                            >
                              {isVerifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-gray-500">
                          <span>Didn't receive code?</span>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isRequestingOtp}
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                          >
                            Resend Code
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : (
                  /* Verified Success State */
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Customer authenticated via SMS OTP!</span>
                    </div>

                    {balance !== null && (
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                          <div className="text-[11px] text-gray-500 uppercase font-semibold">
                            Verified Voucher Balance
                          </div>
                          <div className="text-xl font-bold text-gray-900 dark:text-white">
                            ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-gray-500">Sale Amount</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            ₦{requiredAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
          disabled={!customer || balance === null || isInsufficient || (!isManagerOrOwner && !stepUpToken)}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
        >
          <span>Authorize Voucher Payment</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Modal>
  );
}
