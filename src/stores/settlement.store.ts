import { create } from 'zustand';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as any).response;
    if (res?.data?.error?.message) return res.data.error.message;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export interface SettlementAccountInfo {
  isConnected: boolean;
  bankName: string | null;
  bankCode: string | null;
  accountNumber: string | null;
  accountName: string | null;
  connectedAt: string | null;
}

export interface AutoSplitInfo {
  enabled: boolean;
  taxSplitPercentage: number;
  subaccountCode: string | null;
}

export interface SecurityInfo {
  hasPin: boolean;
  isPinLocked: boolean;
  remainingAttempts: number;
}

export interface PayoutPreviewData {
  businessId: string;
  businessName: string;
  totalInflows: number;
  totalWithdrawn: number;
  taxReserve: number;
  availableForWithdrawal: number;
  settlementAccount: SettlementAccountInfo;
  autoSplit: AutoSplitInfo;
  security: SecurityInfo;
}

export interface SettlementPayoutItem {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  destinationBankName: string;
  destinationAccountNum: string;
  destinationAccountName: string;
  transferReference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  initiatedAt: string;
  completedAt: string | null;
  narration: string | null;
  failureReason: string | null;
}

interface SettlementStore {
  preview: PayoutPreviewData | null;
  history: SettlementPayoutItem[];
  loadingPreview: boolean;
  loadingHistory: boolean;
  withdrawing: boolean;
  connectingBank: boolean;
  updatingAutoSplit: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  fetchPreview: (businessId: string) => Promise<void>;
  fetchHistory: (businessId: string, page?: number) => Promise<void>;
  withdrawBalance: (
    businessId: string,
    input: { amount: number; pin: string; narration?: string }
  ) => Promise<SettlementPayoutItem | null>;
  toggleAutoSplit: (
    businessId: string,
    input: { enabled: boolean; taxSplitPercentage?: number }
  ) => Promise<boolean>;
  connectBank: (
    businessId: string,
    input: { bankCode: string; bankName: string; accountNumber: string; commissionPct?: number }
  ) => Promise<boolean>;
  resolveAccount: (input: {
    bankCode: string;
    accountNumber: string;
  }) => Promise<{ accountName: string; accountNumber: string; bankCode: string } | null>;
}

export const useSettlementStore = create<SettlementStore>((set, get) => ({
  preview: null,
  history: [],
  loadingPreview: false,
  loadingHistory: false,
  withdrawing: false,
  connectingBank: false,
  updatingAutoSplit: false,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },

  fetchPreview: async (businessId: string) => {
    set({ loadingPreview: true });
    try {
      const res = await api.get(`/businesses/${businessId}/settlement/preview`);
      set({ preview: res.data.data });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch settlement details'));
    } finally {
      set({ loadingPreview: false });
    }
  },

  fetchHistory: async (businessId: string, page = 1) => {
    set({ loadingHistory: true });
    try {
      const res = await api.get(`/businesses/${businessId}/settlement/history`, {
        params: { page, limit: 10 },
      });
      set({
        history: res.data.data,
        pagination: res.data.pagination || { page, limit: 10, total: res.data.data.length, totalPages: 1 },
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch payout history'));
    } finally {
      set({ loadingHistory: false });
    }
  },

  withdrawBalance: async (businessId, input) => {
    set({ withdrawing: true });
    const toastId = toast.loading('Submitting withdrawal request…');
    try {
      const res = await api.post(`/businesses/${businessId}/settlement/withdraw`, input);
      
      // Handle pending status (awaiting admin approval)
      if (res.data.data.status === 'pending') {
        toast.success('Withdrawal request submitted. Awaiting admin approval.', { id: toastId });
      } else {
        toast.success('Withdrawal initiated successfully', { id: toastId });
      }
      
      // Refresh preview and history
      get().fetchPreview(businessId);
      get().fetchHistory(businessId, 1);
      return res.data.data;
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      const errorMessage = err?.response?.data?.error?.message;
      
      // Handle specific error codes
      if (errorCode === 'DUPLICATE_WITHDRAWAL_REQUEST') {
        toast.error('You already have a withdrawal request for this amount awaiting approval. Check its status or wait for it to be processed.', { id: toastId });
      } else if (errorCode === 'WITHDRAWAL_IN_PROGRESS') {
        toast.error('A withdrawal request is already being processed. Please wait a few seconds and try again.', { id: toastId });
      } else if (errorCode === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds available for withdrawal', { id: toastId });
      } else {
        toast.error(errorMessage || getErrorMessage(err, 'Withdrawal failed'), { id: toastId });
      }
      
      // Refresh preview to update PIN attempts count
      get().fetchPreview(businessId);
      return null;
    } finally {
      set({ withdrawing: false });
    }
  },

  toggleAutoSplit: async (businessId, input) => {
    set({ updatingAutoSplit: true });
    const toastId = toast.loading('Updating auto-split settings…');
    try {
      const res = await api.patch(`/businesses/${businessId}/settlement/auto-split`, input);
      toast.success(res.data.message || 'Auto-split settings updated', { id: toastId });
      get().fetchPreview(businessId);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update auto-split settings'), { id: toastId });
      return false;
    } finally {
      set({ updatingAutoSplit: false });
    }
  },

  connectBank: async (businessId, input) => {
    set({ connectingBank: true });
    const toastId = toast.loading('Connecting settlement bank account…');
    try {
      const res = await api.post(`/businesses/${businessId}/settlement/connect`, input);
      toast.success(res.data.message || 'Settlement bank connected successfully', { id: toastId });
      get().fetchPreview(businessId);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to connect settlement bank'), { id: toastId });
      return false;
    } finally {
      set({ connectingBank: false });
    }
  },

  resolveAccount: async (input) => {
    try {
      const res = await api.post('/businesses/any/settlement/resolve', input);
      return res.data.data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Account name resolution failed'));
      return null;
    }
  },
}));
