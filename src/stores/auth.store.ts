import { create } from 'zustand';
import api from '@/lib/axios.ts';
import { useReminderStore } from '@/stores/reminder.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useInvoiceStore } from '@/stores/invoice.store.ts';
import type { User } from '@/types/index.ts';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, phone: string, password: string) => Promise<void>;
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

  register: async (email, phone, password) => {
    await api.post('/auth/register', { email, phone, password });
  },

  // Logout must wipe every cache that holds the previous user's data.
  // Zustand stores are module singletons — clearing localStorage alone
  // doesn't touch them, so each domain store exposes a clear() that
  // resets it to its initial state. Without this, the next user logging
  // in on the same tab sees the previous user's businesses/invoices/
  // reminders flash in the sidebar before the refetch completes.
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeBusinessId');
    useReminderStore.getState().clear();
    useBusinessStore.getState().clear();
    useInvoiceStore.getState().clear();
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
