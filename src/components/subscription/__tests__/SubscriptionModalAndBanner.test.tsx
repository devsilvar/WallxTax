import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionGraceBanner from '../SubscriptionGraceBanner';
import SubscriptionExpiredModal from '../SubscriptionExpiredModal';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types/index';

describe('Phase 4: Subscription UI Components (Banner & Modal)', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  describe('SubscriptionGraceBanner', () => {
    it('renders read-only grace warning during 2-day grace period', () => {
      // Day 11 (within 2-day grace period)
      const createdAt = new Date(Date.now() - 11 * ONE_DAY_MS).toISOString();
      const mockUser = {
        id: 'u-grace',
        email: 'grace@test.com',
        createdAt,
        subscriptionTier: 'free',
      } as unknown as User;

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      render(
        <MemoryRouter>
          <SubscriptionGraceBanner />
        </MemoryRouter>
      );

      expect(screen.getByText(/Read-Only Grace Period:/i)).toBeInTheDocument();
      expect(screen.getByText(/Upgrade Now/i)).toBeInTheDocument();
    });

    it('does not render when trial is active (e.g. Day 5)', () => {
      const createdAt = new Date(Date.now() - 5 * ONE_DAY_MS).toISOString();
      const mockUser = {
        id: 'u-active',
        email: 'active@test.com',
        createdAt,
        subscriptionTier: 'free',
      } as unknown as User;

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      render(
        <MemoryRouter>
          <SubscriptionGraceBanner />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Read-Only Grace Period:/i)).toBeNull();
    });

    it('allows dismissing banner for current session', () => {
      const createdAt = new Date(Date.now() - 11 * ONE_DAY_MS).toISOString();
      const mockUser = {
        id: 'u-grace',
        email: 'grace@test.com',
        createdAt,
        subscriptionTier: 'free',
      } as unknown as User;

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      render(
        <MemoryRouter>
          <SubscriptionGraceBanner />
        </MemoryRouter>
      );

      const dismissBtn = screen.getByRole('button', { name: /Dismiss banner/i });
      fireEvent.click(dismissBtn);

      expect(screen.queryByText(/Read-Only Grace Period:/i)).toBeNull();
    });
  });

  describe('SubscriptionExpiredModal', () => {
    it('renders expired modal when past trial and grace period (Day 15)', () => {
      const createdAt = new Date(Date.now() - 15 * ONE_DAY_MS).toISOString();
      const mockUser = {
        id: 'u-expired',
        email: 'expired@test.com',
        createdAt,
        subscriptionTier: 'free',
      } as unknown as User;

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <SubscriptionExpiredModal />
        </MemoryRouter>
      );

      expect(screen.getByText(/Your 10-Day Free Trial Has Concluded/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Plans/i })).toBeInTheDocument();
    });

    it('does not render modal when user is currently on /subscription page', () => {
      const createdAt = new Date(Date.now() - 15 * ONE_DAY_MS).toISOString();
      const mockUser = {
        id: 'u-expired',
        email: 'expired@test.com',
        createdAt,
        subscriptionTier: 'free',
      } as unknown as User;

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      render(
        <MemoryRouter initialEntries={['/subscription']}>
          <SubscriptionExpiredModal />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Your 10-Day Free Trial Has Concluded/i)).toBeNull();
    });

    it('does not render modal when trial is active', () => {
      const createdAt = new Date(Date.now() - 3 * ONE_DAY_MS).toISOString();
      const mockUser = {
        id: 'u-active',
        email: 'active@test.com',
        createdAt,
        subscriptionTier: 'free',
      } as unknown as User;

      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <SubscriptionExpiredModal />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Your 10-Day Free Trial Has Concluded/i)).toBeNull();
    });
  });
});
