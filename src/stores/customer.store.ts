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
  CustomerDetail,
  CustomerKpis,
  TimelineItem,
  UpdateCustomerPayload,
  CustomerHistoryQuery,
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

  // Customer 360 Detail & History
  activeCustomer: Customer | null;
  activeCard: CustomerCard | null;
  activeKpis: CustomerKpis | null;
  detailLoading: boolean;
  detailError: string | null;

  history: TimelineItem[];
  historyPagination: Pagination | null;
  historyLoading: boolean;
  historyError: string | null;

  // Actions
  fetchCustomer: (businessId: string, customerId: string) => Promise<CustomerDetail>;
  fetchHistory: (businessId: string, customerId: string, query?: CustomerHistoryQuery) => Promise<void>;
  updateCustomer: (businessId: string, customerId: string, payload: UpdateCustomerPayload) => Promise<Customer>;
  deleteCustomer: (businessId: string, customerId: string) => Promise<void>;
  archiveCustomer: (businessId: string, customerId: string) => Promise<void>;
  unarchiveCustomer: (businessId: string, customerId: string) => Promise<void>;
  clearActiveCustomer: () => void;
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
    customerId: string
  ) => Promise<CustomerCardDetail>;
  lookupVoucher: (
    businessId: string,
    pin: string,
    last4: string
  ) => Promise<{
    customer: {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
    };
    card: {
      id: string;
      balance: number;
      isActive: boolean;
    };
  }>;
  resendVoucherPin: (
    businessId: string,
    customerId: string
  ) => Promise<{ message: string }>;
  changeVoucherPin: (
    businessId: string,
    customerId: string,
    payload: { oldPin: string; newPin: string; last4Phone: string }
  ) => Promise<{ message: string }>;
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
  clear: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
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

  activeCustomer: null,
  activeCard: null,
  activeKpis: null,
  detailLoading: false,
  detailError: null,

  history: [],
  historyPagination: null,
  historyLoading: false,
  historyError: null,

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

  fetchCustomerCard: async (businessId, customerId) => {
    set({ cardLoading: true, cardError: null });
    try {
      const res = await api.get(
        `/businesses/${businessId}/customers/${customerId}/card`
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

  lookupVoucher: async (businessId, pin, last4) => {
    const res = await api.post(
      `/businesses/${businessId}/customers/voucher-lookup`,
      { pin, last4 }
    );
    return res.data.data as {
      customer: {
        id: string;
        name: string;
        phone?: string | null;
        email?: string | null;
      };
      card: {
        id: string;
        balance: number;
        isActive: boolean;
      };
    };
  },

  resendVoucherPin: async (businessId, customerId) => {
    const res = await api.post(
      `/businesses/${businessId}/customers/${customerId}/card/pin/resend`
    );
    return res.data;
  },

  changeVoucherPin: async (businessId, customerId, payload) => {
    const res = await api.post(
      `/businesses/${businessId}/customers/${customerId}/card/pin/change`,
      payload
    );
    return res.data;
  },

  topUpCard: async (businessId, customerId, payload) => {
    const res = await api.post(
      `/businesses/${businessId}/customers/${customerId}/card/top-up`,
      payload
    );
    return res.data.data;
  },

  creditChange: async (businessId, customerId, payload) => {
    const res = await api.post(
      `/businesses/${businessId}/customers/${customerId}/card/change`,
      payload
    );
    return res.data.data;
  },

  adjustCard: async (businessId, customerId, payload) => {
    const res = await api.post(
      `/businesses/${businessId}/customers/${customerId}/card/adjustment`,
      payload
    );
    return res.data.data;
  },

  clearActiveCard: () => set({ activeCustomerCard: null, cardError: null }),

  fetchCustomer: async (businessId: string, customerId: string) => {
    set({ detailLoading: true, detailError: null });
    try {
      const res = await api.get(`/businesses/${businessId}/customers/${customerId}`);
      const data = res.data.data as CustomerDetail;
      set({
        activeCustomer: data.customer,
        activeCard: data.card,
        activeKpis: data.kpis,
        detailLoading: false,
      });
      return data;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to load customer details');
      set({ detailLoading: false, detailError: msg });
      throw err;
    }
  },

  fetchHistory: async (businessId: string, customerId: string, query?: CustomerHistoryQuery) => {
    set({ historyLoading: true, historyError: null });
    try {
      const res = await api.get(`/businesses/${businessId}/customers/${customerId}/history`, {
        params: query,
      });
      set({
        history: res.data.data as TimelineItem[],
        historyPagination: res.data.pagination as Pagination,
        historyLoading: false,
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to load customer history');
      set({ historyLoading: false, historyError: msg });
      throw err;
    }
  },

  updateCustomer: async (businessId: string, customerId: string, payload: UpdateCustomerPayload) => {
    const res = await api.patch(`/businesses/${businessId}/customers/${customerId}`, payload);
    const updated = res.data.data as Customer;
    set((state) => ({
      activeCustomer:
        state.activeCustomer?.id === customerId
          ? { ...state.activeCustomer, ...updated }
          : state.activeCustomer,
      customers: state.customers.map((c) => (c.id === customerId ? { ...c, ...updated } : c)),
    }));
    return updated;
  },

  archiveCustomer: async (businessId: string, customerId: string) => {
    const previousCustomer = get().activeCustomer;
    const previousCustomers = get().customers;

    // Optimistic update
    set((state) => ({
      activeCustomer:
        state.activeCustomer?.id === customerId
          ? { ...state.activeCustomer, isActive: false }
          : state.activeCustomer,
      customers: state.customers.map((c) => (c.id === customerId ? { ...c, isActive: false } : c)),
    }));

    try {
      await api.patch(`/businesses/${businessId}/customers/${customerId}`, { isActive: false });
    } catch (err: unknown) {
      // Revert on error
      set({
        activeCustomer: previousCustomer,
        customers: previousCustomers,
      });
      throw err;
    }
  },

  unarchiveCustomer: async (businessId: string, customerId: string) => {
    const previousCustomer = get().activeCustomer;
    const previousCustomers = get().customers;

    // Optimistic update
    set((state) => ({
      activeCustomer:
        state.activeCustomer?.id === customerId
          ? { ...state.activeCustomer, isActive: true }
          : state.activeCustomer,
      customers: state.customers.map((c) => (c.id === customerId ? { ...c, isActive: true } : c)),
    }));

    try {
      await api.patch(`/businesses/${businessId}/customers/${customerId}`, { isActive: true });
    } catch (err: unknown) {
      // Revert on error
      set({
        activeCustomer: previousCustomer,
        customers: previousCustomers,
      });
      throw err;
    }
  },

  deleteCustomer: async (businessId: string, customerId: string) => {
    await api.delete(`/businesses/${businessId}/customers/${customerId}`);
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== customerId),
      activeCustomer: state.activeCustomer?.id === customerId ? null : state.activeCustomer,
      activeCard: state.activeCustomer?.id === customerId ? null : state.activeCard,
      activeKpis: state.activeCustomer?.id === customerId ? null : state.activeKpis,
    }));
  },

  clearActiveCustomer: () =>
    set({
      activeCustomer: null,
      activeCard: null,
      activeKpis: null,
      detailLoading: false,
      detailError: null,
      history: [],
      historyPagination: null,
      historyLoading: false,
      historyError: null,
    }),

  clear: () =>
    set({
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
      activeCustomer: null,
      activeCard: null,
      activeKpis: null,
      detailLoading: false,
      detailError: null,
      history: [],
      historyPagination: null,
      historyLoading: false,
      historyError: null,
    }),
}));
