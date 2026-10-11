import { create } from 'zustand';
import api from '@/lib/axios.ts';
import { useReminderStore } from '@/stores/reminder.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import { useTeamStore } from '@/stores/team.store.ts';
import { useCreditStore } from '@/stores/credit.store.ts';
import { useCustomerStore } from '@/stores/customer.store.ts';
import { useLedgerStore } from '@/stores/ledger.store.ts';
import { useSettlementStore } from '@/stores/settlement.store.ts';
import type { User } from '@/types/index.ts';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    phone: string,
    password: string,
    requestedPlan?: string
  ) => Promise<{ email: string; verificationLink?: string }>;
  setAuthSession: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    set({ isAuthenticated: true });
  },

  register: async (email, phone, password, requestedPlan) => {
    const { data } = await api.post('/auth/register', {
      email,
      phone,
      password,
      ...(requestedPlan ? { requestedPlan } : {}),
    });
    return {
      email: data.data?.user?.email || email,
      verificationLink: data.data?.verificationLink,
    };
  },

  setAuthSession: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
  },


  // Logout must wipe every cache that holds the previous user's data.
  // Zustand stores are module singletons — clearing localStorage alone
  // doesn't touch them, so each domain store exposes a clear() that
  // resets it to its initial state. Without this, the next user logging
  // in on the same tab sees the previous user's businesses/invoices/
  // reminders flash in the sidebar before the refetch completes.
  logout: () => {
    // ─── Clear Authentication Tokens ───────────────────────────────
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // ─── Clear Business & User Context ────────────────────────────
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('signupPlan');
    
    // ─── Clear Trial & Subscription Data ──────────────────────────
    localStorage.removeItem('wallx_trial_started_at');
    localStorage.removeItem('hasSeenTrialWelcome');
    
    // ─── Clear AI Chat History (Per-Business) ────────────────────
    // AI chats are stored with business-specific keys like:
    // - ai_chats_v2_{businessId}
    // - ai_active_chat_{businessId}
    // - ai_chat_{businessId} (legacy)
    // We'll iterate through all localStorage keys to remove them
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('ai_chats_v2_') ||
        key.startsWith('ai_active_chat_') ||
        key.startsWith('ai_chat_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // ─── Clear Review Prompt State ────────────────────────────────
    localStorage.removeItem('wallx_review_prompt_dismissed');
    localStorage.removeItem('wallx_review_prompt_snoozed_until');
    localStorage.removeItem('wallx_review_submitted');
    localStorage.removeItem('wallx_test_review');
    
    // ─── Clear SessionStorage Items ───────────────────────────────
    sessionStorage.removeItem('pendingVerificationEmail');
    sessionStorage.removeItem('businessCreatedAt');
    sessionStorage.removeItem('businessCreatedName');
    sessionStorage.removeItem('justCreatedFirstBiz');
    
    // ─── Clear Zustand Store State ────────────────────────────────
    useReminderStore.getState().clear();
    useBusinessStore.getState().clear();
    useInvoiceStore.getState().clear();
    useTeamStore.getState().clear();
    useCreditStore.getState().clear();
    useCustomerStore.getState().clear();
    useLedgerStore.getState().clear();
    useSettlementStore.getState().clear();
    
    // Note: The following stores don't need clearing:
    // - dashboard.store (event counter only - stateless)
    // - pin.store (stateless UI state only - no user data)
    // - admin.stats.store (admin only, separate context)
    // - language.store (user preference - intentionally persists)
    
    // ─── Reset Auth State ──────────────────────────────────────────
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true });
    } catch {
      // Session is gone — run the full logout path so domain caches are
      // cleared too, not just the auth flags.
      get().logout();
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
