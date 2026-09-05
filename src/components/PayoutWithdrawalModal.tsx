import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { formatNaira } from '@/lib/format';
import { estimateWithdrawal } from '@/lib/fees';
import { useSettlementStore, type SettlementPayoutItem } from '@/stores/settlement.store';
import { usePinStore } from '@/stores/pin.store';
import toast from 'react-hot-toast';

interface PayoutWithdrawalModalProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ModalStage = 'input' | 'confirm' | 'success';

export default function PayoutWithdrawalModal({
  businessId,
  isOpen,
  onClose,
  onSuccess,
}: PayoutWithdrawalModalProps) {
  const { preview, withdrawBalance, withdrawing } = useSettlementStore();
  const { verifyPin, isLocked, remainingAttempts, fetchStatus } = usePinStore();

  const [stage, setStage] = useState<ModalStage>('input');
  const [amountStr, setAmountStr] = useState('');
  const [narration, setNarration] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // In-modal PIN authorization state
  const [digits, setDigits] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [completedPayout, setCompletedPayout] = useState<SettlementPayoutItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStage('input');
      setAmountStr('');
      setNarration('');
      setShowBreakdown(false);
      setDigits(['', '', '', '']);
      setShowPin(false);
      setCompletedPayout(null);
      fetchStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (stage === 'confirm') {
      setDigits(['', '', '', '']);
      setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 100);
    }
  }, [stage]);

  if (!isOpen || !preview) return null;

  const available = preview.availableForWithdrawal || 0;
  const numAmount = parseFloat(amountStr) || 0;
  const feeEstimate = preview.fees ? estimateWithdrawal(preview.fees, numAmount) : null;
  const isAmountValid =
    numAmount >= 100 &&
    numAmount <= available &&
    (!feeEstimate || feeEstimate.debitAmount <= available);

  const handleQuickPercent = (pct: number) => {
    const raw = (available * pct) / 100;
    const rounded = Math.floor(raw);
    if (rounded >= 100) {
      setAmountStr(String(rounded));
    } else if (available >= 100) {
      setAmountStr('100');
    }
  };

  const handleMaxClick = () => {
    const max = Math.floor(available);
    if (preview.fees?.withdrawal.bearer === 'platform' && max >= 100) {
      let amt = max;
      for (let i = 0; i < 8 && amt >= 100; i += 1) {
        const est = estimateWithdrawal(preview.fees, amt);
        if (est && est.debitAmount <= available) break;
        amt -= 50;
      }
      setAmountStr(String(Math.max(0, amt)));
    } else {
      setAmountStr(String(max));
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      if (numAmount < 100) {
        toast.error('Minimum withdrawal amount is ₦100.00');
      } else if (numAmount > available) {
        toast.error('Amount exceeds available withdrawable balance');
      } else {
        toast.error('Amount plus fee exceeds your available balance');
      }
      return;
    }

    if (!preview.security.hasPin) {
      toast.error('Please configure your 4-digit Transaction PIN in Settings first');
      return;
    }

    if (preview.security.isPinLocked || isLocked) {
      toast.error('Transaction PIN is currently locked due to previous failed attempts');
      return;
    }

    setStage('confirm');
  };

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    // Auto submit on 4th digit
    if (digit && index === 3) {
      const fullPin = newDigits.join('');
      if (fullPin.length === 4) {
        executeWithdrawalWithPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      pinInputRefs[3].current?.focus();
      executeWithdrawalWithPin(pasted);
    }
  };

  const executeWithdrawalWithPin = async (pinValue?: string) => {
    const pin = pinValue || digits.join('');
    if (pin.length !== 4) {
      toast.error('Please enter your complete 4-digit PIN');
      return;
    }

    setVerifyingPin(true);
    try {
      const verifyRes = await verifyPin(pin);
      if (!verifyRes.valid || !verifyRes.stepUpToken) {
        setDigits(['', '', '', '']);
        pinInputRefs[0].current?.focus();
        return;
      }

      const result = await withdrawBalance(businessId, {
        amount: numAmount,
        stepUpToken: verifyRes.stepUpToken,
        narration: narration.trim() || undefined,
      });

      if (result) {
        setCompletedPayout(result);
        setStage('success');
        if (onSuccess) onSuccess();
      }
    } catch {
      setDigits(['', '', '', '']);
      pinInputRefs[0].current?.focus();
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleCloseAll = () => {
    setCompletedPayout(null);
    setAmountStr('');
    setNarration('');
    setStage('input');
    onClose();
  };

  const isPending = completedPayout?.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            {stage === 'confirm' ? (
              <button
                type="button"
                onClick={() => setStage('input')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Back to amount"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">
                {stage === 'confirm'
                  ? 'Authorize Withdrawal'
                  : stage === 'success'
                  ? 'Withdrawal Status'
                  : 'Withdraw Funds'}
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                {preview.settlementAccount.bankName} ••••
                {preview.settlementAccount.accountNumber?.slice(-4)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAll}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* STAGE 1: AMOUNT INPUT */}
          {stage === 'input' && (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Withdrawable Balance Card */}
              <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50/40 border border-purple-100/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-900">
                    Wallet Balance
                  </span>
                  <span className="text-lg font-bold text-purple-950 font-mono tabular-nums">
                    {formatNaira(available)}
                  </span>
                </div>

                {/* Collapsible Balance Details Toggle */}
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="flex items-center gap-1 text-[11px] font-medium text-purple-700 hover:text-purple-900 transition-colors cursor-pointer select-none"
                >
                  <span>{showBreakdown ? 'Hide balance breakdown' : 'View balance breakdown'}</span>
                  {showBreakdown ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {showBreakdown && (
                  <div className="border-t border-purple-200/60 pt-2 space-y-1.5 text-[11px] text-purple-900/80 animate-fade-in">
                    <div className="flex justify-between">
                      <span className="text-purple-900/60">Total Inflows:</span>
                      <span className="font-semibold font-mono">{formatNaira(preview.totalInflows)}</span>
                    </div>
                    {preview.totalSplitSettled > 0 && (
                      <div className="flex justify-between" title="Cleared by Paystack to your commercial bank on daily schedule">
                        <span className="text-purple-900/60">Auto-routed to bank (T+1):</span>
                        <span className="font-semibold font-mono">{formatNaira(preview.totalSplitSettled)}</span>
                      </div>
                    )}
                    {(preview.estimatedProcessingFees ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-purple-900/60">Paystack fee on inflow (1%):</span>
                        <span className="font-semibold font-mono">−{formatNaira(preview.estimatedProcessingFees ?? 0)}</span>
                      </div>
                    )}
                    {preview.totalWithdrawn > 0 && (
                      <div className="flex justify-between">
                        <span className="text-purple-900/60">Withdrawn / in progress:</span>
                        <span className="font-semibold font-mono">{formatNaira(preview.totalWithdrawn)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Alerts */}
              {!preview.security.hasPin && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Transaction PIN Required</p>
                    <p className="text-amber-700 text-[11px]">
                      Configure your 4-digit PIN in Settings &gt; Security before withdrawing.
                    </p>
                  </div>
                </div>
              )}

              {(preview.security.isPinLocked || isLocked) && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">PIN Temporarily Locked</p>
                    <p className="text-red-700 text-[11px]">Locked for 15 minutes due to failed attempts.</p>
                  </div>
                </div>
              )}

              {/* Amount Input Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="modal-withdrawal-amount" className="text-xs font-semibold text-gray-700">
                    Withdrawal Amount
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Min: ₦100.00
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold text-sm pointer-events-none">
                    ₦
                  </span>
                  <Input
                    id="modal-withdrawal-amount"
                    name="withdrawal-amount"
                    type="number"
                    min={100}
                    max={available}
                    step={100}
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="pl-8 font-mono text-base font-bold text-gray-900"
                    disabled={available < 100}
                    required
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {/* Quick Amount Chips */}
                {available >= 100 && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {[
                      { label: '25%', pct: 25 },
                      { label: '50%', pct: 50 },
                      { label: '75%', pct: 75 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleQuickPercent(chip.pct)}
                        className="flex-1 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer select-none"
                      >
                        {chip.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleMaxClick}
                      className="flex-1 py-1 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors cursor-pointer select-none"
                    >
                      Max
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-gray-500">
                  Minimum withdrawal: ₦100.00 · Transfer fee: ₦10 (≤₦5,000) or ₦25–₦50 for higher amounts.
                </p>

                {/* Real-time Dynamic Fee Calculation Card */}
                {numAmount >= 100 && feeEstimate && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200/80 p-3 space-y-1.5 text-xs animate-fade-in">
                    <div className="flex justify-between text-gray-500">
                      <span>Withdrawal amount:</span>
                      <span className="font-mono font-medium text-gray-700">
                        {formatNaira(numAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Transfer fee (Paystack):</span>
                      <span className="font-mono font-medium text-gray-700">
                        −{formatNaira(feeEstimate.fee)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/60">
                      <span className="font-medium text-gray-800">You will receive in bank:</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatNaira(feeEstimate.netAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Narration */}
              <div className="space-y-1">
                <label htmlFor="modal-withdrawal-narration" className="text-xs font-medium text-gray-700">
                  Narration / Note <span className="text-gray-400">(Optional)</span>
                </label>
                <Input
                  id="modal-withdrawal-narration"
                  name="withdrawal-narration"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Supplier payment"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="text-xs text-gray-900"
                  autoComplete="off"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={handleCloseAll}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={
                    !isAmountValid ||
                    available < 100 ||
                    !preview.security.hasPin ||
                    preview.security.isPinLocked ||
                    isLocked
                  }
                  className="bg-purple-900 hover:bg-purple-950 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Review <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* STAGE 2: IN-MODAL REVIEW & 4-DIGIT PIN */}
          {stage === 'confirm' && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Receipt Box */}
              <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Withdrawal Amount</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    {formatNaira(numAmount)}
                  </span>
                </div>
                {feeEstimate && (
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Paystack transfer fee</span>
                    <span className="font-mono font-medium text-gray-700">
                      −{formatNaira(feeEstimate.fee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Net to your bank</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    {formatNaira(feeEstimate ? feeEstimate.netAmount : numAmount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destination Bank</span>
                    <span className="font-medium text-gray-900">
                      {preview.settlementAccount.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account</span>
                    <span className="font-mono font-medium text-gray-800">
                      {preview.settlementAccount.accountNumber} ({preview.settlementAccount.accountName})
                    </span>
                  </div>
                  {narration && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Narration</span>
                      <span className="text-gray-700 truncate max-w-[180px]">{narration}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Approval Notice */}
              <div className="rounded-xl bg-amber-50/80 border border-amber-200/70 p-2.5 flex items-start gap-2 text-[11px] text-amber-900">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Admin approval required (~1-2 business hours). Funds are reserved immediately upon submission.
                </span>
              </div>

              {/* 4-Digit PIN Entry */}
              <div className="space-y-2 pt-1 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-800">
                  <Lock className="h-3.5 w-3.5 text-purple-700" />
                  <span>Enter 4-Digit Transaction PIN</span>
                </div>

                <div className="flex justify-center items-center gap-2.5">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinInputRefs[i]}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      disabled={verifyingPin || withdrawing}
                      className={`w-11 h-12 text-center text-xl font-bold font-mono rounded-xl border-2 transition-all outline-none text-gray-900 ${
                        digit
                          ? 'border-purple-600 bg-purple-50/30'
                          : 'border-gray-200 bg-gray-50/70 hover:border-gray-300'
                      } focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-600/10`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 px-4 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                  >
                    {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
                  </button>

                  {remainingAttempts < 5 && (
                    <span className="text-amber-700 font-medium">
                      {remainingAttempts} attempts remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setStage('input')}
                  disabled={verifyingPin || withdrawing}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => executeWithdrawalWithPin()}
                  isLoading={verifyingPin || withdrawing}
                  disabled={digits.some((d) => !d) || verifyingPin || withdrawing}
                  className="bg-purple-900 hover:bg-purple-950 text-white cursor-pointer"
                >
                  Authorize &amp; Submit
                </Button>
              </div>
            </div>
          )}

          {/* STAGE 3: SUCCESS STATE */}
          {stage === 'success' && completedPayout && (
            <div className="flex flex-col items-center text-center py-2 space-y-3.5 animate-fade-in">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  isPending ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {isPending ? <Clock className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
              </div>

              <div>
                <h4 className="text-base font-bold text-gray-900">
                  {isPending ? 'Withdrawal Request Submitted!' : 'Withdrawal Completed!'}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 max-w-[280px]">
                  {isPending
                    ? 'Your funds are reserved and awaiting admin approval. You will receive an alert once transferred.'
                    : 'Your funds have been transferred directly to your commercial bank.'}
                </p>
              </div>

              <div className="w-full rounded-xl bg-gray-50 p-3.5 border border-gray-200/80 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-mono font-bold text-gray-900">
                    {formatNaira(completedPayout.amount)}
                  </span>
                </div>
                {completedPayout.fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paystack fee</span>
                    <span className="font-mono font-medium text-gray-700">
                      −{formatNaira(completedPayout.fee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Net Receivable</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatNaira(completedPayout.netAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-medium text-gray-800">
                    {completedPayout.destinationBankName} (••••
                    {completedPayout.destinationAccountNum?.slice(-4)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono text-gray-600 font-semibold">
                    {completedPayout.transferReference}
                  </span>
                </div>
                {isPending && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200/70">
                    <span className="text-gray-500">Status</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      <Clock className="h-3 w-3" /> Awaiting Approval
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full bg-purple-900 hover:bg-purple-950 text-white cursor-pointer mt-1"
                onClick={handleCloseAll}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
