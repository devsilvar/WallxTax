import React, { useState } from 'react';
import {
  X,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { formatNaira } from '@/lib/format';
import { useSettlementStore, type SettlementPayoutItem } from '@/stores/settlement.store';
import PinModal from '@/components/PinModal.tsx';
import toast from 'react-hot-toast';

interface PayoutWithdrawalModalProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PayoutWithdrawalModal({
  businessId,
  isOpen,
  onClose,
  onSuccess,
}: PayoutWithdrawalModalProps) {
  const { preview, withdrawBalance, withdrawing } = useSettlementStore();
  const [amountStr, setAmountStr] = useState('');
  const [narration, setNarration] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [completedPayout, setCompletedPayout] = useState<SettlementPayoutItem | null>(null);

  if (!isOpen || !preview) return null;

  const available = preview.availableForWithdrawal || 0;
  const numAmount = parseFloat(amountStr) || 0;
  const isAmountValid = numAmount >= 100 && numAmount <= available;

  const handleMaxClick = () => {
    setAmountStr(String(Math.floor(available)));
  };

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      if (numAmount < 100) {
        toast.error('Minimum withdrawal amount is ₦100.00');
      } else if (numAmount > available) {
        toast.error('Amount exceeds available withdrawable balance');
      }
      return;
    }

    if (!preview.security.hasPin) {
      toast.error('Please configure your 4-digit Transaction PIN in Settings first');
      return;
    }

    if (preview.security.isPinLocked) {
      toast.error('Transaction PIN is currently locked due to previous failed attempts');
      return;
    }

    // Show confirmation step instead of going directly to PIN
    setShowConfirmation(true);
  };

  const handleConfirmProceed = () => {
    setShowConfirmation(false);
    setShowPinModal(true);
  };

  const handlePinSubmit = async (pin: string) => {
    setShowPinModal(false);
    const result = await withdrawBalance(businessId, {
      amount: numAmount,
      pin,
      narration: narration.trim() || undefined,
    });

    if (result) {
      setCompletedPayout(result);
      if (onSuccess) onSuccess();
    }
  };

  const handleCloseAll = () => {
    setCompletedPayout(null);
    setAmountStr('');
    setNarration('');
    setShowConfirmation(false);
    onClose();
  };

  const isPending = completedPayout?.status === 'pending';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Instant Balance Withdrawal</h3>
                <p className="text-xs text-gray-500">
                  Transfer funds to your verified commercial bank
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseAll}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {completedPayout ? (
              /* Success View */
              <div className="flex flex-col items-center text-center py-4 space-y-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} animate-bounce-subtle`}>
                  {isPending ? <Clock className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {isPending ? 'Withdrawal Request Submitted!' : 'Withdrawal Initiated!'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {isPending 
                      ? 'Your funds are reserved and awaiting admin approval. You\'ll be notified once approved.'
                      : 'Your payout has been queued and is transferring directly to your commercial bank.'}
                  </p>
                </div>

                <div className="w-full rounded-xl bg-gray-50 p-4 border border-gray-200/70 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-gray-900 font-mono text-sm">
                      {formatNaira(completedPayout.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destination Bank</span>
                    <span className="font-medium text-gray-800">
                      {completedPayout.destinationBankName} ({completedPayout.destinationAccountNum})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-gray-800">
                      {completedPayout.destinationAccountName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-mono text-gray-600 font-semibold">
                      {completedPayout.transferReference}
                    </span>
                  </div>
                  {isPending && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Clock className="h-3 w-3" /> Awaiting Approval
                      </span>
                    </div>
                  )}
                </div>

                {isPending && (
                  <div className="w-full rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-amber-900">Approval typically takes 1-2 business hours</p>
                      <p className="text-amber-700 mt-0.5">
                        Check the settlement history to track your request status. Your balance reflects the reserved amount.
                      </p>
                    </div>
                  </div>
                )}

                <Button variant="primary" className="w-full mt-2" onClick={handleCloseAll}>
                  Done
                </Button>
              </div>
            ) : (
              /* Form View */
              <form onSubmit={handleInitiate} className="space-y-5">
                {/* Available Balance Breakdown Box */}
                <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-900">
                      Available to Withdraw
                    </span>
                    <span className="text-xl font-bold text-purple-950 font-mono tabular-nums">
                      {formatNaira(available)}
                    </span>
                  </div>

                  <div className="border-t border-purple-200/60 pt-2.5 grid grid-cols-2 gap-2 text-[11px] text-purple-800/80">
                    <div>
                      <span className="text-purple-900/60">Total Inflows:</span>{' '}
                      <span className="font-semibold">{formatNaira(preview.totalInflows)}</span>
                    </div>
                    <div>
                      <span className="text-purple-900/60">Tax Escrow Reserve:</span>{' '}
                      <span className="font-semibold text-amber-700 font-mono">
                        {formatNaira(preview.taxReserve)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Destination Bank Summary */}
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">
                          {preview.settlementAccount.bankName || 'Settlement Bank'}
                        </span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {preview.settlementAccount.accountNumber} ·{' '}
                        {preview.settlementAccount.accountName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security & Balance Status Alerts */}
                {!preview.security.hasPin && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-amber-900">4-Digit Transaction PIN Required</p>
                      <p className="text-amber-700 mt-0.5">
                        You have not set up your transaction PIN yet. Please configure your PIN in{' '}
                        <a href="/settings" className="font-bold underline text-amber-900">
                          Settings &gt; Security
                        </a>{' '}
                        to authorize withdrawals.
                      </p>
                    </div>
                  </div>
                )}

                {preview.security.isPinLocked && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-red-900">Transaction PIN Temporarily Locked</p>
                      <p className="text-red-700 mt-0.5">
                        Your PIN is locked for 15 minutes due to 3 consecutive incorrect attempts.
                      </p>
                    </div>
                  </div>
                )}

                {available < 100 && (
                  <div className="rounded-xl bg-purple-50/90 border border-purple-200 p-3.5 flex items-start gap-2.5">
                    <Lock className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold text-purple-950">No Withdrawable Balance</p>
                      <p className="text-purple-800 mt-0.5">
                        {preview.totalInflows === 0
                          ? 'Your virtual account has not received any digital bank transfers yet.'
                          : `Your digital inflows of ${formatNaira(preview.totalInflows)} are currently reserved in escrow (${formatNaira(preview.taxReserve)}) for statutory 7.5% tax remittance.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">
                      Withdrawal Amount (₦)
                    </label>
                    <button
                      type="button"
                      onClick={handleMaxClick}
                      disabled={available < 100}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Withdraw Max
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-sm">
                      ₦
                    </span>
                    <Input
                      type="number"
                      min={100}
                      max={available}
                      step={100}
                      placeholder={available >= 100 ? 'e.g. 50,000' : '0.00'}
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="pl-8 font-mono text-base font-bold"
                      disabled={available < 100}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Minimum withdrawal: ₦100.00</p>
                </div>

                {/* Optional Narration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Narration / Note <span className="text-gray-400">(Optional)</span>
                  </label>
                  <Input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Working capital transfer"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Protected Notice */}
                <div className="rounded-lg bg-gray-50 p-3 border border-gray-200/70 flex items-start gap-2 text-[11px] text-gray-500">
                  <Lock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    Secured by your 4-digit Transaction PIN. Tax obligations remain securely retained in the tax escrow pool for automatic month-end FIRS filing.
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="secondary" type="button" onClick={handleCloseAll}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={withdrawing}
                    disabled={!isAmountValid || available < 100 || !preview.security.hasPin || preview.security.isPinLocked}
                    className="bg-purple-900 hover:bg-purple-950 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 4-Digit PIN Keypad Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSubmit}
        title="Confirm Withdrawal"
        subtitle={`Enter your 4-digit PIN to authorize withdrawal of ${formatNaira(numAmount)} to ${preview.settlementAccount.bankName}`}
      />

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-amber-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirm Withdrawal Request</h3>
                  <p className="text-xs text-gray-500">Review details before proceeding</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/70 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Amount</span>
                  <span className="text-lg font-bold text-gray-900 font-mono">
                    {formatNaira(numAmount)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2.5">
                  <div className="text-xs text-gray-600">
                    <p className="font-medium">Destination</p>
                    <p className="mt-1">{preview.settlementAccount.bankName}</p>
                    <p className="font-mono">
                      {preview.settlementAccount.accountNumber} · {preview.settlementAccount.accountName}
                    </p>
                  </div>
                </div>
                {narration && (
                  <div className="border-t border-gray-200 pt-2.5">
                    <p className="text-xs font-medium text-gray-500">Narration</p>
                    <p className="text-xs text-gray-700 mt-0.5">{narration}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-900">Approval Required</p>
                  <p className="text-amber-700 mt-0.5">
                    Funds will be reserved immediately and released to your bank once an admin approves your request. 
                    This typically takes 1-2 business hours during business days.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleConfirmProceed}
                  className="bg-purple-900 hover:bg-purple-950 text-white"
                >
                  Continue to PIN <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
