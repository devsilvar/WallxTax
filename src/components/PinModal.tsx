import React, { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { usePinStore } from '@/stores/pin.store';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (stepUpToken: string) => void;
  title?: string;
  subtitle?: string;
}

export default function PinModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Authorize Financial Transaction',
  subtitle = 'Enter your 4-digit Transaction PIN to confirm this action.',
}: PinModalProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const verifyPin = usePinStore((s) => s.verifyPin);
  const isLocked = usePinStore((s) => s.isLocked);
  const remainingAttempts = usePinStore((s) => s.remainingAttempts);
  const fetchStatus = usePinStore((s) => s.fetchStatus);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      fetchStatus();
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    const numeric = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = numeric;
    setDigits(newDigits);

    if (numeric && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // If 4 digits entered, auto-verify
    if (numeric && index === 3 && newDigits.every((d) => d.length === 1)) {
      submitPin(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      submitPin(pasted);
    }
  };

  const submitPin = async (pinValue?: string) => {
    const pin = pinValue || digits.join('');
    if (pin.length !== 4) return;

    setVerifying(true);
    try {
      const res = await verifyPin(pin);
      if (res.valid && res.stepUpToken) {
        onSuccess(res.stepUpToken);
        onClose();
      } else {
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-bold">{title}</h2>
            </div>
            <p className="text-[11px] text-gray-300 mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-center">
          {isLocked ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
              <AlertTriangle className="h-6 w-6 text-red-600 mx-auto" />
              <h3 className="text-xs font-bold text-red-900">PIN Temporarily Locked</h3>
              <p className="text-[11px] text-red-700">
                Too many failed attempts. For your security, this action is locked for 15 minutes.
              </p>
            </div>
          ) : (
            <>
              {/* Digit Keypad Boxes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Enter 4-Digit PIN
                </label>
                <div className="flex justify-center items-center gap-3">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={inputRefs[i]}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      disabled={verifying || isLocked}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-hidden transition-all text-gray-900 shadow-xs"
                    />
                  ))}
                </div>
              </div>

              {/* Show/Hide PIN toggle */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="flex items-center gap-1.5 hover:text-gray-900 cursor-pointer"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> <span>Hide PIN</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> <span>Show PIN</span>
                    </>
                  )}
                </button>

                {remainingAttempts < 3 && remainingAttempts > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {remainingAttempts} attempt(s) left
                  </span>
                )}
              </div>

              {/* Trust Badge */}
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <p className="text-[11px] text-slate-600">
                  Protected with CBN-grade step-up verification.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          {!isLocked && (
            <Button
              size="sm"
              onClick={() => submitPin()}
              isLoading={verifying}
              disabled={digits.some((d) => !d)}
              className="text-xs"
            >
              Verify PIN
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
