import { create } from 'zustand';
import api, { getErrorMessage } from '@/lib/axios.ts';
import type {
  MarketplaceProduct,
  CreateProductPayload,
  UpdateProductPayload,
} from '@/types/index.ts';

interface MarketplaceState {
  products: MarketplaceProduct[];
  loading: boolean;
  error: string | null;

  activeProduct: MarketplaceProduct | null;
  detailLoading: boolean;
  detailError: string | null;
  submitting: boolean;

  // Actions
  fetchProducts: (businessId: string) => Promise<void>;
  fetchProduct: (businessId: string, id: string) => Promise<MarketplaceProduct | null>;
  createProduct: (businessId: string, payload: CreateProductPayload) => Promise<MarketplaceProduct>;
  updateProduct: (businessId: string, id: string, payload: UpdateProductPayload) => Promise<MarketplaceProduct>;
  submitForApproval: (businessId: string, id: string) => Promise<MarketplaceProduct>;
  archiveProduct: (businessId: string, id: string) => Promise<MarketplaceProduct>;
  uploadImage: (businessId: string, file: File) => Promise<{ url: string; publicId: string }>;
  deleteImage: (businessId: string, publicId: string) => Promise<void>;
  setActiveProduct: (product: MarketplaceProduct | null) => void;
  clearActive: () => void;
  clear: () => void;
}

function basePath(businessId: string) {
  return `/businesses/${businessId}/marketplace`;
}

function patchInList(products: MarketplaceProduct[], updated: MarketplaceProduct): MarketplaceProduct[] {
  const idx = products.findIndex((p) => p.id === updated.id);
  if (idx === -1) return [updated, ...products];
  const next = products.slice();
  next[idx] = { ...next[idx], ...updated };
  return next;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  products: [],
  loading: false,
  error: null,

  activeProduct: null,
  detailLoading: false,
  detailError: null,
  submitting: false,

  fetchProducts: async (businessId: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get(basePath(businessId));
      set({ products: data.data || [] });
    } catch (err: any) {
      set({ error: getErrorMessage(err, 'Failed to load products') });
    } finally {
      set({ loading: false });
    }
  },

  fetchProduct: async (businessId: string, id: string) => {
    set({ detailLoading: true, detailError: null });
    try {
      const { data } = await api.get(`${basePath(businessId)}/${id}`);
      set({ activeProduct: data.data });
      return data.data;
    } catch (err: any) {
      set({ detailError: getErrorMessage(err, 'Failed to load product detail') });
      return null;
    } finally {
      set({ detailLoading: false });
    }
  },

  createProduct: async (businessId: string, payload: CreateProductPayload) => {
    set({ submitting: true, error: null });
    try {
      const { data } = await api.post(basePath(businessId), payload);
      const created = data.data;
      set((state) => ({
        products: [created, ...state.products],
      }));
      return created;
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to create product');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ submitting: false });
    }
  },

  updateProduct: async (businessId: string, id: string, payload: UpdateProductPayload) => {
    set({ submitting: true, error: null });
    try {
      const { data } = await api.patch(`${basePath(businessId)}/${id}`, payload);
      const updated = data.data;
      set((state) => ({
        products: patchInList(state.products, updated),
        activeProduct: state.activeProduct?.id === id ? updated : state.activeProduct,
      }));
      return updated;
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to update product');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ submitting: false });
    }
  },

  submitForApproval: async (businessId: string, id: string) => {
    set({ submitting: true, error: null });
    try {
      const { data } = await api.post(`${basePath(businessId)}/${id}/submit`);
      const updated = data.data;
      set((state) => ({
        products: patchInList(state.products, updated),
        activeProduct: state.activeProduct?.id === id ? updated : state.activeProduct,
      }));
      return updated;
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to submit product for approval');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ submitting: false });
    }
  },

  archiveProduct: async (businessId: string, id: string) => {
    set({ submitting: true, error: null });
    try {
      const { data } = await api.post(`${basePath(businessId)}/${id}/archive`);
      const updated = data.data;
      set((state) => ({
        products: patchInList(state.products, updated),
        activeProduct: state.activeProduct?.id === id ? updated : state.activeProduct,
      }));
      return updated;
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to archive product');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ submitting: false });
    }
  },

  uploadImage: async (businessId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post(`${basePath(businessId)}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data.data;
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to upload image');
      throw new Error(message);
    }
  },

  deleteImage: async (businessId: string, publicId: string) => {
    try {
      await api.delete(`${basePath(businessId)}/images`, {
        data: { publicId },
      });
    } catch {
      // Best-effort cleanup
    }
  },

  setActiveProduct: (product) => set({ activeProduct: product }),
  clearActive: () => set({ activeProduct: null, detailError: null }),
  clear: () =>
    set({
      products: [],
      loading: false,
      error: null,
      activeProduct: null,
      detailLoading: false,
      detailError: null,
      submitting: false,
    }),
}));
