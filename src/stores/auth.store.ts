import { create } from 'zustand';
import api from '@/lib/axios.ts';
import {
  startSession,
  touchActivity,
  clearSessionMeta,
  isSessionExpired,
  ensureSessionMetaSeeded,
} from '@/lib/session.ts';
import { useReminderStore } from '@/stores/reminder.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import { useTeamStore } from '@/stores/team.store.ts';
import { useCreditStore } from '@/stores/credit.store.ts';
import { useCustomerStore } from '@/stores/customer.store.ts';
import { useLedgerStore } from '@/stores/ledger.store.ts';
import { useSettlementStore } from '@/stores/settlement.store.ts';
import { useMessageStore } from '@/stores/message.store.ts';
import type { User } from '@/types/index.ts';

function hasTokenAtBoot(): boolean {
  try {
    return !!localStorage.getItem('accessToken');
  } catch {
    return false;
  }
}

const _hasTokenAtBoot = hasTokenAtBoot();

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapping: boolean;
  hasCheckedAuth: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    phone: string,
    password: string,
    requestedPlan?: string
  ) => Promise<{ email: string; verificationLink?: string }>;
  setAuthSession: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void | Promise<void>;
  fetchMe: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

// Per-call AbortController. Prior versions cached the in-flight Promise at
// module scope (`fetchMeInflight`); if that Promise was ever aborted — by a
// tab-throttled browser, hot reload, or React effect cleanup — the cache
// held a never-resolving Promise and `isBootstrapping` stayed `true`
// forever. That hung ProtectedRoute's <GlobalLoadingSkeleton/> until manual
// refresh. AbortController per call plus "only settle the flags if we are
// still the active controller" is the same pattern Dashboard.tsx uses
// (bundleAbortRef) — promoted to store layer because fetchMe is called from
// non-component contexts (axios interceptor, login flow).
let fetchMeCtrl: AbortController | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: _hasTokenAtBoot,
  isLoading: false,
  isBootstrapping: _hasTokenAtBoot,
  hasCheckedAuth: !_hasTokenAtBoot,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    try {
      api.defaults.headers.common.Authorization = `Bearer ${data.data.accessToken}`;
    } catch {}
    startSession();
    set({ isAuthenticated: true, isBootstrapping: false, hasCheckedAuth: true });
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
    try {
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } catch {}
    startSession();
    set({ user, isAuthenticated: true, isBootstrapping: false, hasCheckedAuth: true });
  },


  // Logout must wipe every cache that holds the previous user's data.
  // Zustand stores are module singletons — clearing localStorage alone
  // doesn't touch them, so each domain store exposes a clear() that
  // resets it to its initial state. Without this, the next user logging
  // in on the same tab sees the previous user's businesses/invoices/
  // reminders flash in the sidebar before the refetch completes.
  logout: async () => {
    fetchMeCtrl?.abort();
    fetchMeCtrl = null;

    // ─── Clear Axios Default Auth Header (prevent zombie token) ──
    // api.defaults.headers holds the last refreshed token in-memory.
    // Clearing localStorage alone leaves it there, so the next
    // request still sends `Authorization: Bearer <old>` and can
    // trigger a refresh that resurrects the session.
    try {
      delete (api.defaults.headers.common as Record<string, unknown>).Authorization;
      delete (api.defaults.headers as Record<string, unknown>).Authorization;
    } catch {
      // no-op — defensive for test env where api may be mocked
    }

    // ─── Clear Authentication Tokens ───────────────────────────────
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearSessionMeta();

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
    useMessageStore.getState().clear();
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
    // Must happen BEFORE any await so callers that do not await logout()
    // (e.g. legacy tests, fire-and-forget guards) still see the reset
    // synchronously. Anything after the first await runs in a microtask.
    // hasCheckedAuth=true so guards can render the login redirect
    // instead of hanging on the bootstrap skeleton.
    set({ user: null, isAuthenticated: false, isBootstrapping: false, hasCheckedAuth: true });

    // Close SSE to prevent zombie events with old JWT after logout.
    // Fire-and-forget — must not delay the synchronous reset above.
    import('@/lib/sse-client').then(m => m.getSSEClient().disconnect()).catch(() => {});
  },

  fetchMe: async () => {
    const tokenAtStart = localStorage.getItem('accessToken');
    if (!tokenAtStart) {
      set({ isBootstrapping: false, hasCheckedAuth: true });
      return;
    }
    // Abort any prior in-flight fetchMe so its termination cannot strand
    // us. The new call's `finally` below is the single settler of the
    // bootstrap flags — only the *currently-active* controller flips them.
    fetchMeCtrl?.abort();
    const ctrl = new AbortController();
    fetchMeCtrl = ctrl;
    try {
      const { data } = await api.get('/auth/me', { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken !== tokenAtStart || !currentToken) return;
      if (!get().isAuthenticated && !currentToken) return;
      touchActivity();
      set({ user: data.data, isAuthenticated: true });
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      if (localStorage.getItem('accessToken') === tokenAtStart) {
        await get().logout();
      }
    } finally {
      // Only settle bootstrap flags if WE are still the active call.
      // A newer fetchMe will settle its own flags when it finishes; if we
      // were aborted, do not flip isBootstrapping — the new call owns it.
      if (fetchMeCtrl === ctrl) {
        set({ isBootstrapping: false, hasCheckedAuth: true });
        fetchMeCtrl = null;
      }
    }
  },

  bootstrap: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isBootstrapping: false, hasCheckedAuth: true });
      return;
    }
    if (get().hasCheckedAuth && !get().isBootstrapping) return;
    ensureSessionMetaSeeded();
    if (isSessionExpired()) {
      await get().logout();
      return;
    }
    await get().fetchMe();
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
