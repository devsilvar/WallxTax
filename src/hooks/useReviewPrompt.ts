import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store.ts';

const THREE_MINUTES_MS = 180 * 1000;
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const KEY_FIRST_SEEN = 'wallx_dashboard_first_seen_at';
const KEY_SUBMITTED = 'wallx_review_submitted';
const KEY_SNOOZED_UNTIL = 'wallx_review_snoozed_until';

export function useReviewPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const checkEligibility = useCallback(() => {
    if (!isAuthenticated) return false;

    // Check if development/testing override is requested (?test_review=true or localStorage flag)
    const isTestOverride =
      typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('test_review') === 'true' ||
        localStorage.getItem('wallx_test_review') === 'true');

    if (isTestOverride) {
      return true;
    }

    // 1. Never show if already submitted
    if (localStorage.getItem(KEY_SUBMITTED) === 'true') {
      return false;
    }

    // 2. Check snooze timestamp
    const snoozedUntil = localStorage.getItem(KEY_SNOOZED_UNTIL);
    if (snoozedUntil) {
      const parsedSnooze = parseInt(snoozedUntil, 10);
      if (!Number.isNaN(parsedSnooze) && parsedSnooze > Date.now()) {
        return false;
      }
    }

    // 3. Track or read first seen timestamp
    let firstSeen = localStorage.getItem(KEY_FIRST_SEEN);
    const now = Date.now();
    if (!firstSeen) {
      localStorage.setItem(KEY_FIRST_SEEN, now.toString());
      return false;
    }

    const firstSeenMs = parseInt(firstSeen, 10);
    if (Number.isNaN(firstSeenMs) || now - firstSeenMs < THREE_MINUTES_MS) {
      return false;
    }

    // 4. Anti-fatigue check: User is actively typing into an input/textarea/select
    const activeEl = document.activeElement;
    if (
      activeEl &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)
    ) {
      return false;
    }

    // 5. Anti-fatigue check: Another modal is already open
    const hasOpenModal = Boolean(
      document.querySelector('[role="dialog"]') ||
        document.querySelector('.modal-open') ||
        document.querySelector('.chakra-modal__overlay'),
    );
    if (hasOpenModal) {
      return false;
    }

    return true;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Evaluate on mount and tick every 10 seconds
    const evaluate = () => {
      if (checkEligibility()) {
        setIsOpen(true);
      }
    };

    evaluate();
    const interval = setInterval(evaluate, 10_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkEligibility]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    // Snooze for 7 days
    try {
      localStorage.setItem(
        KEY_SNOOZED_UNTIL,
        (Date.now() + SNOOZE_DURATION_MS).toString(),
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSubmitted = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(KEY_SUBMITTED, 'true');
      localStorage.removeItem('wallx_test_review');
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    isOpen,
    dismiss: handleDismiss,
    markSubmitted: handleSubmitted,
  };
}
