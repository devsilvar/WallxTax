import { create } from 'zustand';
import api, { getErrorMessage } from '@/lib/axios.ts';
import type {
  Customer,
  CustomerCard,
  CustomerCardLedger,
  Pagination,
  QuickCreateCustomerPayload,
  TopUpCustomerCardPayload,
  CreditCustomerChangePayload,
  AdjustCustomerCardPayload,
  CustomerStats,
  CustomerCardActivity,
} from '@/types/index.ts';

interface CustomerCardDetail {
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  card: CustomerCard & { ledgers: CustomerCardLedger[] };
}

interface CustomerState {
  customers: Customer[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;

  stats: CustomerStats | null;
  statsLoading: boolean;

  activities: CustomerCardActivity[];
  activityPagination: Pagination | null;
  activityLoading: boolean;

  activeCustomerCard: CustomerCardDetail | null;
  cardLoading: boolean;
  cardError: string | null;

  // Actions
  searchCustomers: (
    businessId: string,
    search?: string,
    page?: number,
    limit?: number
  ) => Promise<Customer[]>;
  fetchStats: (businessId: string) => Promise<CustomerStats | null>;
  fetchActivity: (
    businessId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: string;
      search?: string;
      customerId?: string;
    }
  ) => Promise<void>;
  quickCreateCustomer: (
    businessId: string,
    payload: QuickCreateCustomerPayload
  ) => Promise<Customer>;
  fetchCustomerCard: (
    businessId: string,
    customerId: string,
    stepUpToken?: string
  ) => Promise<CustomerCardDetail>;
  requestOtp: (
    businessId: string,
    customerId: string
  ) => Promise<{
    bypassed?: boolean;
    maskedPhone?: string;
    message?: string;
    silentSimulation?: boolean;
    testCode?: string;
  }>;
  verifyOtp: (
    businessId: string,
    customerId: string,
    code: string
  ) => Promise<{ token: string; cardCode: string; balance: number }>;
  topUpCard: (
    businessId: string,
    customerId: string,
    payload: TopUpCustomerCardPayload
  ) => Promise<{ card: CustomerCard; ledger: CustomerCardLedger }>;
  creditChange: (
    businessId: string,
    customerId: string,
    payload: CreditCustomerChangePayload
  ) => Promise<{ card: CustomerCard; ledger: CustomerCardLedger }>;
  adjustCard: (
    businessId: string,
    customerId: string,
    payload: AdjustCustomerCardPayload
  ) => Promise<{ card: CustomerCard; ledger: CustomerCardLedger }>;
  clearActiveCard: () => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  pagination: null,
  loading: false,
  error: null,

  stats: null,
  statsLoading: false,

  activities: [],
  activityPagination: null,
  activityLoading: false,

  activeCustomerCard: null,
  cardLoading: false,
  cardError: null,

  searchCustomers: async (businessId, search, page = 1, limit = 20) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/businesses/${businessId}/customers`, {
        params: { search: search || undefined, page, limit },
      });
      const data = res.data.data as Customer[];
      set({
        customers: data,
        pagination: res.data.pagination,
        loading: false,
      });
      return data;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to fetch customers');
      set({ error: msg, loading: false });
      return [];
    }
  },

  fetchStats: async (businessId) => {
    set({ statsLoading: true });
    try {
      const res = await api.get(`/businesses/${businessId}/customers/stats`);
      const data = res.data.data as CustomerStats;
      set({ stats: data, statsLoading: false });
      return data;
    } catch {
      set({ statsLoading: false });
      return null;
    }
  },

  fetchActivity: async (businessId, params) => {
    set({ activityLoading: true });
    try {
      const res = await api.get(`/businesses/${businessId}/customers/activity`, {
        params,
      });
      set({
        activities: res.data.data as CustomerCardActivity[],
        activityPagination: res.data.pagination,
        activityLoading: false,
      });
    } catch {
      set({ activityLoading: false });
    }
  },

  quickCreateCustomer: async (businessId, payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(`/businesses/${businessId}/customers`, payload);
      const created = res.data.data as Customer;
      set((state) => ({
        customers: [created, ...state.customers.filter((c) => c.id !== created.id)],
        loading: false,
      }));
      return created;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to create customer');
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchCustomerCard: async (businessId, customerId, stepUpToken) => {
    set({ cardLoading: true, cardError: null });
    try {
      const headers = stepUpToken ? { 'x-voucher-auth': stepUpToken } : {};
      const res = await api.get(
        `/businesses/${businessId}/customers/${customerId}/card`,
        { headers }
      );
      const detail = res.data.data as CustomerCardDetail;
      set({ activeCustomerCard: detail, cardLoading: false });
      return detail;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to fetch card details');
      set({ cardError: msg, cardLoading: false });
      throw err;
    }
  },

  requestOtp: async (businessId, customerId) => {
    try {
      const res = await api.post(
        `/businesses/${businessId}/customers/${customerId}/card/otp/request`
      );
      return res.data;
    } catch (err: unknown) {
      throw err;
    }
  },

  verifyOtp: async (businessId, customerId, code) => {
    try {
      const res = await api.post(
        `/businesses/${businessId}/customers/${customerId}/card/otp/verify`,
        { code }
      );
      return res.data.data;
    } catch (err: unknown) {
      throw err;
    }
  },

  topUpCard: async (businessId, customerId, payload) => {
    try {
      const res = await api.post(
        `/businesses/${businessId}/customers/${customerId}/card/top-up`,
        payload
      );
      return res.data.data;
    } catch (err: unknown) {
      throw err;
    }
  },

  creditChange: async (businessId, customerId, payload) => {
    try {
      const res = await api.post(
        `/businesses/${businessId}/customers/${customerId}/card/change`,
        payload
      );
      return res.data.data;
    } catch (err: unknown) {
      throw err;
    }
  },

  adjustCard: async (businessId, customerId, payload) => {
    try {
      const res = await api.post(
        `/businesses/${businessId}/customers/${customerId}/card/adjustment`,
        payload
      );
      return res.data.data;
    } catch (err: unknown) {
      throw err;
    }
  },

  clearActiveCard: () => set({ activeCustomerCard: null, cardError: null }),
}));
