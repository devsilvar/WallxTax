import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import NoBusinessPrompt from '@/components/NoBusinessPrompt.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useSettlementStore } from '@/stores/settlement.store.ts';
import toast from 'react-hot-toast';
import type { TransactionDetailData } from '@/components/TransactionDetailPanel';
import { useAccountData } from '@/hooks/useAccountData.ts';
import {
  WalletBalanceCard,
  SettlementBankCard,
  DvaVerificationScreen,
  DvaOnboardingWizard,
  AccountMetricStrip,
  ComplianceTierCard,
  AccountSkeleton,
  AccountModals,
  AccountHeader,
  AccountFeedSection,
} from '@/components/account';

export default function Account() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const businessStoreLoading = useBusinessStore((s) => s.isLoading);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAutoSplitPinModal, setShowAutoSplitPinModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<TransactionDetailData | null>(null);

  const settlementPreview = useSettlementStore((s) => s.preview);
  const loadingPreview = useSettlementStore((s) => s.loadingPreview);
  const fetchSettlementPreview = useSettlementStore((s) => s.fetchPreview);
  const toggleAutoSplit = useSettlementStore((s) => s.toggleAutoSplit);
  const updatingAutoSplit = useSettlementStore((s) => s.updatingAutoSplit);
  const payoutHistory = useSettlementStore((s) => s.history);
  const fetchPayoutHistory = useSettlementStore((s) => s.fetchHistory);
  const loadingPayoutHistory = useSettlementStore((s) => s.loadingHistory);
  const payoutPagination = useSettlementStore((s) => s.pagination);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeFeedTab, setActiveFeedTab] = useState<'inflows' | 'withdrawals'>(
    urlTab === 'withdrawals' ? 'withdrawals' : 'inflows'
  );
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [payoutSearch, setPayoutSearch] = useState('');

  const {
    dva, setDva, loading, banks, banksLoading, banksError,
    awaitingValidation, setAwaitingValidation, transactions,
    loadingTransactions, moneyIn, isRefreshing, fetchDVA,
    fetchTransactions, refreshAccountData,
  } = useAccountData(
    biz?.id, biz?.virtualAccountNumber || user?.virtualAccountNumber || undefined,
    biz?.virtualAccountBank || user?.virtualAccountBank || undefined,
    fetchBusinesses, fetchMe, fetchSettlementPreview,
    fetchPayoutHistory, payoutStatusFilter, payoutSearch
  );

  const isBalanceLoading = (!settlementPreview && loadingPreview) || (!settlementPreview && isRefreshing);
  const isTxnsLoading = (loadingTransactions && transactions.length === 0) || (isRefreshing && transactions.length === 0);
  const isPayoutsLoading = (loadingPayoutHistory && payoutHistory.length === 0) || (isRefreshing && payoutHistory.length === 0);
  const isSettlementLinked = Boolean(biz?.settlementAccountNumber || settlementPreview?.settlementAccount?.isConnected || user?.settlementAccountNumber);
  const resolvedBankName = settlementPreview?.settlementAccount?.bankName || biz?.settlementBankName || user?.settlementBankName || 'Not Connected';
  const resolvedAccountNum = settlementPreview?.settlementAccount?.accountNumber || biz?.settlementAccountNumber || user?.settlementAccountNumber;
  const resolvedAccountName = settlementPreview?.settlementAccount?.accountName || biz?.settlementAccountName || user?.settlementAccountName;
  const displayAccountName = dva?.accountName || biz?.ownerName || biz?.businessName || '';

  useEffect(() => {
    if (urlTab === 'withdrawals') setActiveFeedTab('withdrawals');
    else if (urlTab === 'inflows') setActiveFeedTab('inflows');
  }, [urlTab]);

  const handleTabChange = (tab: 'inflows' | 'withdrawals') => {
    setActiveFeedTab(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    }, { replace: true });
  };

  const handleShare = async () => {
    if (!dva?.accountNumber) return;
    const text = `Pay ${biz?.businessName}\nBank: ${dva.bankName || 'Wema Bank'}\nAccount Number: ${dva.accountNumber}\nAccount Name: ${displayAccountName}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Pay ${biz?.businessName}`, text }); return; } catch {}
    }
    navigator.clipboard?.writeText(text);
    toast.success('Account details copied to clipboard');
  };

  if (businessStoreLoading) return <AccountSkeleton />;
  if (!biz) {
    return (
      <div className="mx-auto max-w-4xl py-12">
        <NoBusinessPrompt title="No business selected" message="Select or create a business to access your dedicated bank account, wallet balance, and payout settings." />
      </div>
    );
  }

  const isActive = dva?.status === 'active';
  const isVerifying = !isActive && (awaitingValidation || dva?.status === 'pending');

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-16">
      <AccountHeader
        businessName={biz.businessName}
        isActive={isActive}
        isRefreshing={isRefreshing || loading || loadingTransactions || loadingPayoutHistory}
        onRefresh={() => refreshAccountData(true)}
      />

      {loading && !dva ? (
        <AccountSkeleton />
      ) : isActive ? (
        <div className="space-y-6">
          <WalletBalanceCard
            availableBalance={settlementPreview?.availableForWithdrawal ?? 0}
            totalInflows={settlementPreview?.totalInflows ?? moneyIn.totalBalance}
            isLoading={isBalanceLoading}
            isRefreshing={isRefreshing}
            onRefresh={() => refreshAccountData(true)}
            onWithdraw={() => setShowPayoutModal(true)}
            onExportStatement={() => setShowExportModal(true)}
            onShareDetails={handleShare}
            settlementConnected={isSettlementLinked}
            dvaAccountNumber={dva?.accountNumber}
            dvaBankName={dva?.bankName}
            accountName={displayAccountName}
            onShowQR={() => setShowQR(true)}
          />

          <AccountMetricStrip
            totalInflows={settlementPreview?.totalInflows ?? moneyIn.totalBalance}
            completedTransfersCount={transactions.filter((t) => t.status === 'completed').length}
            totalWithdrawn={settlementPreview?.totalWithdrawn ?? 0}
            pendingWithdrawn={settlementPreview?.pendingWithdrawn ?? 0}
            receivedThisMonth={moneyIn.receivedThisMonth}
            payoutBankName={resolvedBankName}
            payoutAccountNumber={resolvedAccountNum || undefined}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AccountFeedSection
              activeTab={activeFeedTab}
              onTabChange={handleTabChange}
              hasPendingPayout={payoutHistory.some((p) => p.status === 'pending' || p.status === 'processing')}
              transactions={transactions}
              isTxnsLoading={isTxnsLoading}
              onSelectTransaction={(txn) => setSelectedTxn({
                id: txn.id,
                type: 'dva_inflow',
                amount: txn.amount,
                status: txn.status,
                date: txn.date,
                referenceId: txn.referenceId,
                description: txn.description,
                customerHint: txn.customerHint,
                needsVerification: txn.needsVerification,
                businessId: biz.id,
                virtualAccountNumber: dva?.accountNumber,
                virtualAccountBank: dva?.bankName,
              })}
              payouts={payoutHistory}
              isPayoutsLoading={isPayoutsLoading}
              payoutPagination={payoutPagination}
              payoutStatusFilter={payoutStatusFilter}
              payoutSearch={payoutSearch}
              onStatusFilterChange={setPayoutStatusFilter}
              onSearchChange={setPayoutSearch}
              onPageChange={(page) => fetchPayoutHistory(biz.id, page, payoutStatusFilter !== 'all' ? payoutStatusFilter : undefined, payoutSearch)}
              onRequestWithdrawal={() => setShowPayoutModal(true)}
            />

            <div className="space-y-6">
              <SettlementBankCard
                isLinked={isSettlementLinked}
                bankName={resolvedBankName}
                accountNumber={resolvedAccountNum || undefined}
                accountName={resolvedAccountName || biz.ownerName}
                availableBalance={settlementPreview?.availableForWithdrawal ?? 0}
                pendingWithdrawn={settlementPreview?.pooledPendingWithdrawn ?? settlementPreview?.pendingWithdrawn ?? 0}
                autoSplitEnabled={Boolean(settlementPreview?.autoSplit.enabled)}
                updatingAutoSplit={updatingAutoSplit}
                isBalanceLoading={isBalanceLoading}
                onWithdraw={() => setShowPayoutModal(true)}
                onToggleAutoSplit={() => setShowAutoSplitPinModal(true)}
                banks={banks}
                banksLoading={banksLoading}
                banksError={banksError}
                onSettlementLinkedSuccess={async () => {
                  await fetchBusinesses(true);
                  if (biz?.id) await fetchSettlementPreview(biz.id);
                }}
              />

              <ComplianceTierCard businessName={biz.businessName} bvnVerifiedAt={user?.bvnVerifiedAt} />
            </div>
          </div>
        </div>
      ) : isVerifying ? (
        <DvaVerificationScreen loading={loading} onRefresh={fetchDVA} onEditDetails={() => setAwaitingValidation(false)} />
      ) : (
        <DvaOnboardingWizard
          businessId={biz.id}
          businessName={biz.businessName}
          loading={loading}
          dvaStatus={dva?.status}
          dvaMessage={dva?.message}
          banks={banks}
          banksLoading={banksLoading}
          banksError={banksError}
          onSuccess={async (newDva) => {
            setDva(newDva);
            setAwaitingValidation(false);
            await fetchMe();
            await fetchBusinesses();
          }}
          onNeedsValidation={() => {
            setAwaitingValidation(true);
            fetchMe();
            fetchDVA();
          }}
          onRefreshMe={fetchMe}
        />
      )}

      <AccountModals
        businessId={biz?.id}
        businessName={biz?.businessName}
        qrModal={{
          isOpen: showQR,
          onClose: () => setShowQR(false),
          bankName: dva?.bankName || 'Wema Bank',
          accountNumber: dva?.accountNumber || '',
          accountName: displayAccountName,
        }}
        detailPanel={{
          transaction: selectedTxn,
          onClose: () => setSelectedTxn(null),
          onVerifySuccess: () => {
            if (biz?.id) {
              refreshAccountData(true);
              fetchTransactions();
            }
          },
        }}
        payoutModal={{
          isOpen: showPayoutModal,
          onClose: () => setShowPayoutModal(false),
          onSuccess: () => {
            fetchDVA();
            fetchTransactions();
            fetchSettlementPreview(biz.id);
            fetchPayoutHistory(biz.id);
            handleTabChange('withdrawals');
          },
        }}
        pinModal={{
          isOpen: showAutoSplitPinModal,
          onClose: () => setShowAutoSplitPinModal(false),
          enabled: Boolean(settlementPreview?.autoSplit.enabled),
          onSuccess: async (stepUpToken: string) => {
            setShowAutoSplitPinModal(false);
            if (biz?.id) {
              await toggleAutoSplit(biz.id, {
                enabled: !settlementPreview?.autoSplit.enabled,
                stepUpToken,
              });
            }
          },
        }}
        exportModal={{
          isOpen: showExportModal,
          onClose: () => setShowExportModal(false),
        }}
      />
    </div>
  );
}
