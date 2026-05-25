import { create } from 'zustand';
import api from '@/lib/axios.ts';
import { STALE, isFresh } from '@/lib/cache.ts';
import type { Business } from '@/types/index.ts';

interface BusinessState {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoading: boolean;
  lastFetchedAt: number | null;

  /**
   * Fetch businesses. By default uses the cache: if data was loaded within
   * STALE.long, returns immediately without a network call. Pass `force: true`
   * after a mutation that invalidates the list (e.g. create / delete).
   *
   * In-flight requests are deduplicated — concurrent callers share one
   * round-trip.
   */
  fetchBusinesses: (force?: boolean) => Promise<void>;
  setActiveBusiness: (business: Business) => void;
  createBusiness: (data: Partial<Business>) => Promise<Business>;
  /**
   * Reset to initial state. Called from auth.store.logout() to prevent the
   * previous user's businesses from bleeding into the next session.
   */
  clear: () => void;
}

let inflight: Promise<void> | null = null;

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  activeBusiness: null,
  isLoading: true,
  lastFetchedAt: null,

  fetchBusinesses: async (force = false) => {
    const state = get();

    // Cache hit — return cached data without a network call.
    if (!force && isFresh(state.lastFetchedAt, STALE.long) && state.businesses.length > 0) {
      // Make sure isLoading is false in case a stale `true` lingered.
      if (state.isLoading) set({ isLoading: false });
      return;
    }

    // Coalesce concurrent callers (e.g. AppLayout + Sidebar both trigger on mount).
    if (inflight) return inflight;

    set({ isLoading: state.businesses.length === 0 });

    inflight = (async () => {
      try {
        const { data } = await api.get('/businesses');
        const businesses: Business[] = data.data;

        const stored = localStorage.getItem('activeBusinessId');
        const active =
          businesses.find((b) => b.id === stored) || businesses[0] || null;
        if (active) localStorage.setItem('activeBusinessId', active.id);

        set({
          businesses,
          activeBusiness: active,
          lastFetchedAt: Date.now(),
        });
      } finally {
        set({ isLoading: false });
        inflight = null;
      }
    })();

    return inflight;
  },

  setActiveBusiness: (business) => {
    localStorage.setItem('activeBusinessId', business.id);
    set({ activeBusiness: business });
  },

  createBusiness: async (payload) => {
    const { data } = await api.post('/businesses', payload);
    const business = data.data;
    set((state) => ({
      businesses: [...state.businesses, business],
      activeBusiness: state.activeBusiness || business,
      lastFetchedAt: Date.now(), // we just got fresh data
    }));
    return business;
  },

  clear: () => {
    // `inflight` is module-scoped (not in the store) — reset it here so a
    // request still in flight at logout time can't unblock new requests
    // for the next user.
    inflight = null;
    set({
      businesses: [],
      activeBusiness: null,
      isLoading: false,
      lastFetchedAt: null,
    });
  },
}));
