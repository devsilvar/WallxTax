import { useState, useEffect, useCallback } from 'react';
import { TRIAL_DAYS, TRIAL_STORAGE_KEY } from '@/config/subscription';

const TRIAL_DURATION_DAYS = TRIAL_DAYS;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
const STORAGE_KEY = TRIAL_STORAGE_KEY;

export interface TrialTimerState {
  hasStarted: boolean;
  isExpired: boolean;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  formattedTime: string;
  percentRemaining: number;
  startTrial: () => void;
  startedAt: number | null;
  expiresAt: number | null;
}

export function useTrialTimer(accountCreatedAt?: string | null): TrialTimerState {
  // Determine start timestamp — server truth only.
  // When accountCreatedAt is explicitly null the caller is logged-out and
  // the countdown must stay hidden (no localStorage fallback per product spec).
  const getInitialStartTimestamp = useCallback((): number | null => {
    if (accountCreatedAt) {
      const parsed = new Date(accountCreatedAt).getTime();
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Intentionally no localStorage fallback — pricing countdown is
    // derived from the authenticated user's server tier/createdAt only.
    // Passing null means "logged out — show no timer".
    if (accountCreatedAt === null) return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    return null;
  }, [accountCreatedAt]);

  const [startedAt, setStartedAt] = useState<number | null>(getInitialStartTimestamp);
  const [, setTick] = useState(0);

  // Sync when accountCreatedAt changes
  useEffect(() => {
    const ts = getInitialStartTimestamp();
    if (ts) {
      setStartedAt(ts);
    }
  }, [getInitialStartTimestamp]);

  // Keep live time ticking every second for real-time countdown
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000); // Update every second for live countdown
    return () => clearInterval(interval);
  }, [startedAt]);

  const startTrial = useCallback(() => {
    const now = Date.now();
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, now.toString());
      }
    } catch {
      // Ignore
    }
    setStartedAt(now);
  }, []);

  if (!startedAt) {
    return {
      hasStarted: false,
      isExpired: false,
      daysLeft: 30,
      hoursLeft: 0,
      minutesLeft: 0,
      secondsLeft: 0,
      formattedTime: '30 Days',
      percentRemaining: 100,
      startTrial,
      startedAt: null,
      expiresAt: null,
    };
  }

  const expiresAt = startedAt + TRIAL_DURATION_MS;
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const isExpired = remainingMs <= 0;

  const daysLeft = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const secondsLeft = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const percentRemaining = Math.max(
    0,
    Math.min(100, Math.round((remainingMs / TRIAL_DURATION_MS) * 100)),
  );

  const formattedTime = isExpired
    ? 'Expired'
    : daysLeft > 0
      ? `${daysLeft}d ${hoursLeft}h left`
      : `${hoursLeft}h ${minutesLeft}m left`;

  return {
    hasStarted: true,
    isExpired,
    daysLeft,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    formattedTime,
    percentRemaining,
    startTrial,
    startedAt,
    expiresAt,
  };
}
