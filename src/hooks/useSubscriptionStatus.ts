/**
 * useSubscriptionStatus Hook — WallXERP
 *
 * Provides real-time subscription lifecycle state for the authenticated user,
 * including trial progress, 2-day read-only grace period, and feature access.
 *
 * @author WallX Engineering Team
 */

import { useMemo } from 'react';
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

const TRIAL_DAYS = 10;
const GRACE_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export function useSubscriptionStatus(): SubscriptionStatus {
  const user = useAuthStore((s) => s.user);

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

    const rawTier = (user.subscriptionTier || 'free').toLowerCase();
    const tier: SubscriptionTier = (['free', 'starter', 'business', 'scale'].includes(rawTier)
      ? rawTier
      : 'free') as SubscriptionTier;

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
