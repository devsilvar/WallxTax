import { useCallback, useEffect, useState, useRef } from 'react';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { Bank, DvaTransactionRow, DvaTransactionsResponse } from '@/types';
import type { DvaTransactionItem } from '@/components/account';

export interface DVAData {
  status: 'active' | 'pending' | 'none' | 'failed';
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  message?: string;
  failedAt?: string;
}

export function useAccountData(
  bizId?: string,
  initialAcct?: string,
  initialBank?: string,
  fetchBusinesses?: (force?: boolean) => Promise<any>,
  fetchMe?: () => Promise<any>,
  fetchSettlementPreview?: (id: string) => Promise<any>,
  fetchPayoutHistory?: (id: string, page?: number, status?: string, q?: string) => Promise<any>,
  payoutStatusFilter?: string,
  payoutSearch?: string
) {
  const [dva, setDva] = useState<DVAData | null>(() => {
    return initialAcct
      ? { status: 'active', accountNumber: initialAcct, bankName: initialBank || 'Wema Bank' }
      : null;
  });
  const [loading, setLoading] = useState(() => !initialAcct);
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState('');
  const [awaitingValidation, setAwaitingValidation] = useState(false);

  const [transactions, setTransactions] = useState<DvaTransactionItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [moneyIn, setMoneyIn] = useState({ totalBalance: 0, receivedThisMonth: 0 });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFirstMountRef = useRef(true);
  const lastLoadedBizIdRef = useRef<string | null>(null);

  const fetchDVA = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${bizId}/dva/virtual-account`);
      const dvaData = res.data.data;
      setDva(dvaData);
      if (dvaData.status === 'active' && awaitingValidation) {
        setAwaitingValidation(false);
        toast.success('🎉 Dedicated virtual account activated! Ready to receive transfers.');
        if (fetchBusinesses) fetchBusinesses();
        if (fetchMe) fetchMe();
      } else if (dvaData.status === 'failed') {
        setAwaitingValidation(false);
        toast.error('Identity verification failed — see details below.');
      } else if (dvaData.status === 'pending') {
        setAwaitingValidation(true);
      }
    } catch (err) {
      console.error('Failed to load DVA:', err);
    } finally {
      setLoading(false);
    }
  }, [bizId, awaitingValidation, fetchBusinesses, fetchMe]);

  const fetchTransactions = useCallback(async () => {
    if (!bizId) return;
    setLoadingTransactions(true);
    try {
      const res = await api.get<DvaTransactionsResponse>(`/businesses/${bizId}/dva/transactions`, {
        params: { page: 1, limit: 50 },
      });
      const dvaData: DvaTransactionRow[] = res.data.data || [];
      const dvaTxns: DvaTransactionItem[] = dvaData.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: 'inbound' as const,
        status:
          t.needsVerification
            ? 'pending'
            : t.status === 'confirmed' || t.status === 'completed'
            ? 'completed'
            : 'pending',
        description: t.customerHint || t.customerName || 'Inbound Transfer',
        date: t.transactionDate,
        referenceId: t.referenceId ?? undefined,
        needsVerification: t.needsVerification,
        customerHint: t.customerHint ?? undefined,
      }));
      setTransactions(dvaTxns);
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const totalBalance = dvaTxns
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      const receivedThisMonth = dvaTxns
        .filter((t) => t.status === 'completed')
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      setMoneyIn({ totalBalance, receivedThisMonth });
    } catch (err) {
      console.error('DVA transaction fetch error:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [bizId]);

  const refreshAccountData = useCallback(
    async (isManual = false) => {
      if (!bizId) return;
      setIsRefreshing(true);
      try {
        const tasks: Promise<any>[] = [fetchDVA(), fetchTransactions()];
        if (fetchSettlementPreview) tasks.push(fetchSettlementPreview(bizId));
        if (fetchPayoutHistory) {
          tasks.push(
            fetchPayoutHistory(
              bizId,
              1,
              payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
              payoutSearch
            )
          );
        }
        if (isManual && fetchBusinesses) tasks.push(fetchBusinesses(true));
        await Promise.allSettled(tasks);
        if (isManual) toast.success('Account and balance refreshed');
      } finally {
        setIsRefreshing(false);
      }
    },
    [bizId, fetchBusinesses, fetchDVA, fetchTransactions, fetchSettlementPreview, fetchPayoutHistory, payoutStatusFilter, payoutSearch]
  );

  useEffect(() => {
    if (!bizId) return;
    if (initialAcct) {
      setDva({ status: 'active', accountNumber: initialAcct, bankName: initialBank || 'Wema Bank' });
    }
    if (lastLoadedBizIdRef.current !== bizId) {
      lastLoadedBizIdRef.current = bizId;
      refreshAccountData(false);
    }
  }, [bizId, initialAcct, initialBank, refreshAccountData]);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (bizId && fetchPayoutHistory) {
      fetchPayoutHistory(
        bizId,
        1,
        payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined,
        payoutSearch
      );
    }
  }, [payoutStatusFilter, payoutSearch, fetchPayoutHistory, bizId]);

  useEffect(() => {
    if (!banks) {
      setBanksLoading(true);
      api
        .get('/banks')
        .then((res) => setBanks(res.data.data as Bank[]))
        .catch(() => setBanksError('Failed to load banks'))
        .finally(() => setBanksLoading(false));
    }
  }, [banks]);

  return {
    dva,
    setDva,
    loading,
    banks,
    banksLoading,
    banksError,
    awaitingValidation,
    setAwaitingValidation,
    transactions,
    loadingTransactions,
    moneyIn,
    isRefreshing,
    fetchDVA,
    fetchTransactions,
    refreshAccountData,
  };
}
