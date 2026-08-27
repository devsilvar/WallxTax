import { create } from 'zustand';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export interface PinStatus {
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil?: string;
  remainingAttempts: number;
  pinSetAt?: string;
}

export interface UserSession {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

interface PinState {
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil?: string;
  remainingAttempts: number;
  pinSetAt?: string;
  loading: boolean;
  stepUpToken: string | null;
  sessions: UserSession[];
  loadingSessions: boolean;

  fetchStatus: () => Promise<void>;
  setupPin: (pin: string, password: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<{ valid: boolean; stepUpToken?: string }>;
  changePin: (newPin: string, currentPin?: string, password?: string) => Promise<boolean>;
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<boolean>;
  revokeOtherSessions: () => Promise<boolean>;
  clearStepUpToken: () => void;
}

export const usePinStore = create<PinState>((set, get) => ({
  hasPin: false,
  isLocked: false,
  lockedUntil: undefined,
  remainingAttempts: 3,
  pinSetAt: undefined,
  loading: false,
  stepUpToken: null,
  sessions: [],
  loadingSessions: false,

  fetchStatus: async () => {
    try {
      set({ loading: true });
      const res = await api.get<{ success: boolean; data: PinStatus }>('/auth/pin/status');
      if (res.data.success && res.data.data) {
        set({
          hasPin: res.data.data.hasPin,
          isLocked: res.data.data.isLocked,
          lockedUntil: res.data.data.lockedUntil,
          remainingAttempts: res.data.data.remainingAttempts,
          pinSetAt: res.data.data.pinSetAt,
        });
      }
    } catch {
      // Non-blocking
    } finally {
      set({ loading: false });
    }
  },

  setupPin: async (pin: string, password: string) => {
    try {
      set({ loading: true });
      const res = await api.post('/auth/pin/setup', { pin, password });
      toast.success(res.data.message || 'Transaction PIN configured successfully');
      set({ hasPin: true, remainingAttempts: 3, isLocked: false, lockedUntil: undefined });
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to setup PIN');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  verifyPin: async (pin: string) => {
    try {
      const res = await api.post<{ success: boolean; data: { valid: boolean; stepUpToken: string } }>(
        '/auth/pin/verify',
        { pin }
      );
      if (res.data.success && res.data.data?.valid) {
        set({
          stepUpToken: res.data.data.stepUpToken,
          remainingAttempts: 3,
          isLocked: false,
          lockedUntil: undefined,
        });
        return { valid: true, stepUpToken: res.data.data.stepUpToken };
      }
      return { valid: false };
    } catch (err: any) {
      const status = err.response?.status;
      const errorData = err.response?.data?.error;

      if (status === 423) {
        set({ isLocked: true, lockedUntil: errorData?.details?.lockedUntil, remainingAttempts: 0 });
        toast.error(errorData?.message || 'Transaction PIN is locked due to multiple failed attempts');
      } else {
        const remaining = errorData?.details?.remainingAttempts ?? get().remainingAttempts - 1;
        set({ remainingAttempts: Math.max(0, remaining) });
        toast.error(errorData?.message || 'Incorrect transaction PIN');
      }
      return { valid: false };
    }
  },

  changePin: async (newPin: string, currentPin?: string, password?: string) => {
    try {
      set({ loading: true });
      const res = await api.put('/auth/pin/change', { newPin, currentPin, password });
      toast.success(res.data.message || 'Transaction PIN changed successfully');
      set({ remainingAttempts: 3, isLocked: false, lockedUntil: undefined });
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to change PIN');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  fetchSessions: async () => {
    try {
      set({ loadingSessions: true });
      const refreshToken = localStorage.getItem('refreshToken') || '';
      const res = await api.get<{ success: boolean; data: UserSession[] }>('/auth/sessions', {
        headers: refreshToken ? { 'x-refresh-token': refreshToken } : {},
      });
      if (res.data.success && res.data.data) {
        set({ sessions: res.data.data });
      }
    } catch {
      // Non-blocking
    } finally {
      set({ loadingSessions: false });
    }
  },

  revokeSession: async (sessionId: string) => {
    try {
      const res = await api.delete(`/auth/sessions/${sessionId}`);
      toast.success(res.data.message || 'Session revoked successfully');
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
      }));
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to revoke session');
      return false;
    }
  },

  revokeOtherSessions: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || '';
      const res = await api.post(
        '/auth/sessions/revoke-others',
        {},
        { headers: refreshToken ? { 'x-refresh-token': refreshToken } : {} }
      );
      toast.success(res.data.message || 'Other sessions logged out');
      set((state) => ({
        sessions: state.sessions.filter((s) => s.isCurrent),
      }));
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to revoke sessions');
      return false;
    }
  },

  clearStepUpToken: () => set({ stepUpToken: null }),
}));
