import { create } from 'zustand';
import api from '@/lib/axios.ts';
import type { Business } from '@/types/index.ts';

interface BusinessState {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoading: boolean;

  fetchBusinesses: () => Promise<void>;
  setActiveBusiness: (business: Business) => void;
  createBusiness: (data: Partial<Business>) => Promise<Business>;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  businesses: [],
  activeBusiness: null,
  isLoading: true,

  fetchBusinesses: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/businesses');
      const businesses = data.data;
      set({ businesses });

      // Auto-select first business if none active
      const stored = localStorage.getItem('activeBusinessId');
      const active = businesses.find((b: Business) => b.id === stored) || businesses[0] || null;
      if (active) {
        localStorage.setItem('activeBusinessId', active.id);
      }
      set({ activeBusiness: active });
    } finally {
      set({ isLoading: false });
    }
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
    }));
    return business;
  },
}));
