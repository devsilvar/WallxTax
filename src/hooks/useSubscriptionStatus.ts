/**
 * useSubscriptionStatus Hook — WallXERP
 *
 * Provides real-time subscription lifecycle state for the authenticated user,
 * including trial progress, 2-day read-only grace period, and feature access.
 *
 * @author WallX Engineering Team
 */

import { useMemo, useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export type SubscriptionTier = 'free' | 'starter' | 'business' | 'scale';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  planName: string;
  isPaid: boolean;
  isTrial: boolean;
  hasAccess: boolean;
  isReadOnlyGrace: boolean;
  isExpired: boolean;
  canWrite: boolean;
  expiresAt: Date | null;
  daysRemaining: number;
  graceHoursRemaining: number;
  formattedCountdown: string;
}

const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free Trial',
  starter: 'Starter',
  business: 'Business',
  scale: 'Scale-Up',
};

/**
 * Legacy tier spellings that must resolve to a catalog key. `scale_up` was
 * written by an earlier admin override path; treating it as unknown would
 * render the subscriber as a free trial.
 */
const TIER_ALIASES: Record<string, SubscriptionTier> = {
  scale_up: 'scale',
  scaleup: 'scale',
  free_trial: 'free',
  trial: 'free',
};

function canonicalTier(raw: string | null | undefined): SubscriptionTier {
  const normalized = (raw || 'free').toLowerCase().trim();
  return TIER_ALIASES[normalized] ?? (normalized as SubscriptionTier);
}

import { TRIAL_DAYS, GRACE_DAYS, TRIAL_STORAGE_KEY } from '@/config/subscription';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export function useSubscriptionStatus(): SubscriptionStatus {
  const user = useAuthStore((s) => s.user);
  const [, setTick] = useState(0);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (user) void useAuthStore.getState().fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const maybeFetch = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastFetchRef.current < 30_000) return;
      lastFetchRef.current = now;
      void useAuthStore.getState().fetchMe();
    };
    window.addEventListener('focus', maybeFetch);
    document.addEventListener('visibilitychange', maybeFetch);
    return () => {
      window.removeEventListener('focus', maybeFetch);
      document.removeEventListener('visibilitychange', maybeFetch);
    };
  }, [user]);

  // Keep the legacy localStorage trial clock in sync with the server.
  // useTrialTimer (and any re-used tab) derives its countdown from
  // wallx_trial_started_at. When the admin flips the user to a paid plan we
  // must clear that clock, and when the admin resets the user back to the
  // 10-day free trial we must seed it from the fresh trialEndsAt so the
  // counter starts at exactly 10 days rather than resuming from an old
  // stale value.
  useEffect(() => {
    if (!user) return;
    const tier = canonicalTier(user.subscriptionTier);
    try {
      if (tier === 'free' && user.trialEndsAt) {
        const trialEndMs = new Date(user.trialEndsAt).getTime();
        if (!Number.isNaN(trialEndMs)) {
          const startMs = trialEndMs - TRIAL_DAYS * MS_PER_DAY;
          localStorage.setItem(TRIAL_STORAGE_KEY, String(startMs));
        }
      } else if (tier !== 'free') {
        localStorage.removeItem(TRIAL_STORAGE_KEY);
      }
    } catch {
      // private browsing / quota — non-fatal
    }
  }, [user?.subscriptionTier, user?.trialEndsAt]);

  return useMemo(() => {
    if (!user) {
      return {
        tier: 'free',
        planName: 'Free Trial',
        isPaid: false,
        isTrial: true,
        hasAccess: true,
        isReadOnlyGrace: false,
        isExpired: false,
        canWrite: true,
        expiresAt: null,
        daysRemaining: 10,
        graceHoursRemaining: 0,
        formattedCountdown: '10 Days Left',
      };
    }

    const tier = canonicalTier(user.subscriptionTier);

    const isPaid = tier !== 'free';
    const planName = TIER_DISPLAY_NAMES[tier] || 'Free Trial';
    const now = new Date();
    const graceMs = GRACE_DAYS * MS_PER_DAY;

    // 1. Paid Tiers
    if (isPaid) {
      if (!user.subscriptionExpiresAt) {
        // Grandfathered / indefinite paid plan
        return {
          tier,
          planName,
          isPaid: true,
          isTrial: false,
          hasAccess: true,
          isReadOnlyGrace: false,
          isExpired: false,
          canWrite: true,
          expiresAt: null,
          daysRemaining: 999,
          graceHoursRemaining: 0,
          formattedCountdown: 'Active',
        };
      }

      const expiresAt = new Date(user.subscriptionExpiresAt);
      const remainingMs = expiresAt.getTime() - now.getTime();

      if (remainingMs > 0) {
        const days = Math.ceil(remainingMs / MS_PER_DAY);
        return {
          tier,
          planName,
          isPaid: true,
          isTrial: false,
          hasAccess: true,
          isReadOnlyGrace: false,
          isExpired: false,
          canWrite: true,
          expiresAt,
          daysRemaining: days,
          graceHoursRemaining: 0,
          formattedCountdown: days === 1 ? '1 day left' : `${days} days left`,
        };
      }

      // Past paid expiry — check grace window
      const graceRemainingMs = expiresAt.getTime() + graceMs - now.getTime();
      if (graceRemainingMs > 0) {
        const hours = Math.ceil(graceRemainingMs / MS_PER_HOUR);
        return {
          tier,
          planName,
          isPaid: true,
          isTrial: false,
          hasAccess: true,
          isReadOnlyGrace: true,
          isExpired: true,
          canWrite: false,
          expiresAt,
          daysRemaining: 0,
          graceHoursRemaining: hours,
          formattedCountdown: `Grace period (${hours}h left)`,
        };
      }

      // Fully expired paid plan
      return {
        tier,
        planName,
        isPaid: true,
        isTrial: false,
        hasAccess: false,
        isReadOnlyGrace: false,
        isExpired: true,
        canWrite: false,
        expiresAt,
        daysRemaining: 0,
        graceHoursRemaining: 0,
        formattedCountdown: 'Expired',
      };
    }

    // 2. Free Trial Tier
    let trialEndsAt: Date;
    if (user.trialEndsAt) {
      trialEndsAt = new Date(user.trialEndsAt);
    } else {
      const created = new Date(user.createdAt || now);
      trialEndsAt = new Date(created.getTime() + TRIAL_DAYS * MS_PER_DAY);
    }

    const trialRemainingMs = trialEndsAt.getTime() - now.getTime();

    if (trialRemainingMs > 0) {
      const days = Math.ceil(trialRemainingMs / MS_PER_DAY);
      return {
        tier: 'free',
        planName: 'Free Trial',
        isPaid: false,
        isTrial: true,
        hasAccess: true,
        isReadOnlyGrace: false,
        isExpired: false,
        canWrite: true,
        expiresAt: trialEndsAt,
        daysRemaining: days,
        graceHoursRemaining: 0,
        formattedCountdown: days === 1 ? '1 day left' : `${days} days left`,
      };
    }

    // Past trial — check 2-day read-only grace period
    const graceRemainingMs = trialEndsAt.getTime() + graceMs - now.getTime();
    if (graceRemainingMs > 0) {
      const hours = Math.ceil(graceRemainingMs / MS_PER_HOUR);
      return {
        tier: 'free',
        planName: 'Free Trial',
        isPaid: false,
        isTrial: true,
        hasAccess: true,
        isReadOnlyGrace: true,
        isExpired: true,
        canWrite: false,
        expiresAt: trialEndsAt,
        daysRemaining: 0,
        graceHoursRemaining: hours,
        formattedCountdown: `Grace period (${hours}h left)`,
      };
    }

    // Completely expired
    return {
      tier: 'free',
      planName: 'Free Trial',
      isPaid: false,
      isTrial: true,
      hasAccess: false,
      isReadOnlyGrace: false,
      isExpired: true,
      canWrite: false,
      expiresAt: trialEndsAt,
      daysRemaining: 0,
      graceHoursRemaining: 0,
      formattedCountdown: 'Expired',
    };
  }, [user]);
}
