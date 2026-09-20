import { create } from 'zustand';
import api from '@/lib/axios.ts';
import { useDashboardEvents } from '@/stores/dashboard.store.ts';
import type {
  CustomerCredit,
  CreditSummary,
  CreditPayment,
  CreditListQuery,
  Pagination,
  CreateCreditPayload,
  UpdateCreditPayload,
  RecordCreditPaymentPayload,
  WriteOffCreditPayload,
  SendCreditWhatsAppResult,
} from '@/types/index.ts';

interface CreditState {
  // List & Summary
  credits: CustomerCredit[];
  summary: CreditSummary | null;
  pagination: Pagination | null;
  listLoading: boolean;
  listError: string | null;

  // Active / Selected Credit
  activeCredit: CustomerCredit | null;
  detailLoading: boolean;
  detailError: string | null;

  // Actions
  fetchCredits: (businessId: string, query: CreditListQuery) => Promise<void>;
  fetchSummary: (businessId: string) => Promise<CreditSummary | null>;
  fetchCredit: (businessId: string, id: string) => Promise<CustomerCredit | null>;
  createCredit: (businessId: string, payload: CreateCreditPayload) => Promise<CustomerCredit>;
  updateCredit: (businessId: string, id: string, payload: UpdateCreditPayload) => Promise<CustomerCredit>;
  recordPayment: (
    businessId: string,
    id: string,
    payload: RecordCreditPaymentPayload
  ) => Promise<{ payment: CreditPayment; credit: CustomerCredit; sale: any }>;
  reconcileDva: (
    businessId: string,
    creditId: string,
    saleId: string
  ) => Promise<{ payment: CreditPayment; credit: CustomerCredit; sale: any }>;
  writeOffCredit: (businessId: string, id: string, payload: WriteOffCreditPayload) => Promise<CustomerCredit>;
  sendWhatsApp: (businessId: string, id: string) => Promise<SendCreditWhatsAppResult>;
  clearActive: () => void;
  clear: () => void;
}

function basePath(businessId: string) {
  return `/businesses/${businessId}/credits`;
}

function patchInList(credits: CustomerCredit[], updated: CustomerCredit): CustomerCredit[] {
  const idx = credits.findIndex((c) => c.id === updated.id);
  if (idx === -1) return credits;
  const next = credits.slice();
  next[idx] = { ...next[idx], ...updated };
  return next;
}

export const useCreditStore = create<CreditState>((set, get) => ({
  credits: [],
  summary: null,
  pagination: null,
  listLoading: false,
  listError: null,

  activeCredit: null,
  detailLoading: false,
  detailError: null,

  fetchCredits: async (businessId, query) => {
    set({ listLoading: true, listError: null });
    try {
      const params: Record<string, any> = {
        page: query.page ?? 1,
        limit: query.limit ?? 15,
      };
      if (query.status) params.status = query.status;
      if (query.search) params.search = query.search;

      const res = await api.get(basePath(businessId), { params });
      const rawData = res.data?.data;
      const data = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);
      const summary = res.data?.summary ?? rawData?.summary ?? null;
      const pagination = res.data?.pagination ?? rawData?.pagination ?? null;

      set({
        credits: data,
        summary: summary || get().summary,
        pagination,
        listLoading: false,
      });
    } catch (err: any) {
      set({
        listLoading: false,
        listError: err.response?.data?.message || err.message || 'Failed to fetch credits',
      });
    }
  },

  fetchSummary: async (businessId) => {
    try {
      const res = await api.get(`${basePath(businessId)}/summary`);
      const summary = res.data?.data ?? null;
      if (summary) {
        set({ summary });
      }
      return summary;
    } catch (err) {
      return null;
    }
  },

  fetchCredit: async (businessId, id) => {
    set({ detailLoading: true, detailError: null });
    try {
      const res = await api.get(`${basePath(businessId)}/${id}`);
      const credit = res.data?.data;
      set({ activeCredit: credit, detailLoading: false });
      return credit;
    } catch (err: any) {
      set({
        detailLoading: false,
        detailError: err.response?.data?.message || err.message || 'Failed to fetch credit details',
      });
      return null;
    }
  },

  createCredit: async (businessId, payload) => {
    const res = await api.post(basePath(businessId), payload);
    const created = res.data?.data;
    set((state) => ({
      credits: [created, ...state.credits],
    }));
    get().fetchSummary(businessId);
    return created;
  },

  updateCredit: async (businessId, id, payload) => {
    const res = await api.patch(`${basePath(businessId)}/${id}`, payload);
    const updated = res.data?.data;
    set((state) => ({
      credits: patchInList(state.credits, updated),
      activeCredit: state.activeCredit?.id === id ? updated : state.activeCredit,
    }));
    return updated;
  },

  recordPayment: async (businessId, id, payload) => {
    const res = await api.post(`${basePath(businessId)}/${id}/payments`, payload);
    const result = res.data?.data;
    const credit = result?.credit || result;
    if (credit && credit.id) {
      set((state) => ({
        credits: patchInList(state.credits, credit),
        activeCredit: state.activeCredit?.id === id ? credit : state.activeCredit,
      }));
    }
    // Refresh summary & invalidate dashboard since a confirmed taxable sale was created
    get().fetchSummary(businessId);
    useDashboardEvents.getState().invalidateDashboard('credit_settled');
    return result;
  },

  reconcileDva: async (businessId, creditId, saleId) => {
    const res = await api.post(`${basePath(businessId)}/${creditId}/reconcile-dva/${saleId}`);
    const result = res.data?.data;
    const credit = result?.credit || result;
    if (credit && credit.id) {
      set((state) => ({
        credits: patchInList(state.credits, credit),
        activeCredit: state.activeCredit?.id === creditId ? credit : state.activeCredit,
      }));
    }
    // Refresh summary & invalidate dashboard
    get().fetchSummary(businessId);
    useDashboardEvents.getState().invalidateDashboard('debt_reconciled');
    return result;
  },

  writeOffCredit: async (businessId, id, payload) => {
    const res = await api.post(`${basePath(businessId)}/${id}/write-off`, payload);
    const updated = res.data?.data;
    set((state) => ({
      credits: patchInList(state.credits, updated),
      activeCredit: state.activeCredit?.id === id ? updated : state.activeCredit,
    }));
    get().fetchSummary(businessId);
    return updated;
  },

  sendWhatsApp: async (businessId, id) => {
    const res = await api.post(`${basePath(businessId)}/${id}/send-whatsapp`);
    return res.data?.data || res.data?.meta;
  },

  clearActive: () => set({ activeCredit: null, detailError: null }),

  clear: () =>
    set({
      credits: [],
      summary: null,
      pagination: null,
      listLoading: false,
      listError: null,
      activeCredit: null,
      detailLoading: false,
      detailError: null,
    }),
}));
