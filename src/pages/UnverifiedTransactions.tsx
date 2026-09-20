import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, X, Gift, TrendingUp, Clock, ArrowRight, ShoppingBag, HelpCircle, Wallet, CircleDollarSign, Building2, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useBusinessStore } from '@/stores/business.store';
import { useDashboardEvents } from '@/stores/dashboard.store';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { SalesTransaction, Pagination } from '@/types';
import NoBusinessPrompt from '@/components/NoBusinessPrompt';

interface TransactionClassification {
  id: string;
  name: string;
  category: string;
  taxTreatment: 'taxable' | 'non_taxable' | 'review_required';
  isRevenue: boolean;
  description: string | null;
}

type WizardStep = 'primary' | 'revenue' | 'non_revenue' | 'all';
type PrimaryChoice = 'business_sale' | 'not_sale' | 'not_sure';

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function UnverifiedTransactions() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const businesses = useBusinessStore((s) => s.businesses);
  const invalidateDashboard = useDashboardEvents((s) => s.invalidateDashboard);
  
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  
  // Wizard modal state
  const [verifyModal, setVerifyModal] = useState<{ transaction: SalesTransaction } | null>(null);
  const [targetBusinessId, setTargetBusinessId] = useState<string>('');
  const [wizardStep, setWizardStep] = useState<WizardStep>('primary');
  const [, setPrimaryChoice] = useState<PrimaryChoice | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  
  const [classifications, setClassifications] = useState<TransactionClassification[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

  useEffect(() => {
    if (biz) {
      fetchUnverified();
      fetchClassifications();
    }
  }, [biz, page]);

  useEffect(() => {
    if (!verifyModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [verifyModal]);

  async function fetchClassifications() {
    setLoadingClassifications(true);
    try {
      const res = await api.get('/transaction-classifications');
      if (res.data.data && Array.isArray(res.data.data)) {
        setClassifications(res.data.data);
      } else {
        toast.error('Invalid classifications data');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load transaction types');
    } finally {
      setLoadingClassifications(false);
    }
  }

  async function fetchUnverified() {
    if (!biz) return;
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${biz.id}/sales/unverified`, {
        params: { page, limit: 15 },
      });
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load unverified transactions');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!biz || !verifyModal || !selectedClassification) {
      toast.error('Please select a classification');
      return;
    }

    setActioningId(verifyModal.transaction.id);
    try {
      // Determine revenue from the API-loaded classification (never hardcoded
      // slugs). Legacy slug fallback kept for robustness if classifications
      // haven't loaded yet — the backend also resolves those aliases.
      const selected = classifications.find((c) => c.name === selectedClassification);
      const isRevenue = selected
        ? selected.isRevenue
        : ['sales_revenue', 'service_revenue'].includes(selectedClassification);
      
      const isReassigning = targetBusinessId && targetBusinessId !== biz.id;
      const targetBizName = businesses.find((b) => b.id === targetBusinessId)?.businessName || 'target business';

      const payload = {
        classification: selectedClassification,
        customerName: customerName || undefined,
        description: description || undefined,
        targetBusinessId: isReassigning ? targetBusinessId : undefined,
      };

      if (isRevenue) {
        await api.post(`/businesses/${biz.id}/sales/${verifyModal.transaction.id}/verify`, payload);
        toast.success(
          isReassigning
            ? `Transaction verified and assigned to ${targetBizName}`
            : 'Transaction verified as business income'
        );
      } else {
        await api.post(`/businesses/${biz.id}/sales/${verifyModal.transaction.id}/reclassify`, payload);
        toast.success(
          isReassigning
            ? `Transaction reclassified and assigned to ${targetBizName}`
            : 'Transaction reclassified successfully'
        );
      }
      closeModal();
      invalidateDashboard('transaction_verified');
      fetchUnverified();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process transaction');
    } finally {
      setActioningId(null);
    }
  }

  function openVerifyModal(transaction: SalesTransaction) {
    setVerifyModal({ transaction });
    setTargetBusinessId(biz?.id || '');
    setWizardStep('primary');
    setPrimaryChoice(null);
    setSelectedClassification('');
    setCustomerName(transaction.customerName || '');
    setDescription('');
  }

  function closeModal() {
    setVerifyModal(null);
    setTargetBusinessId('');
    setWizardStep('primary');
    setPrimaryChoice(null);
    setSelectedClassification('');
    setCustomerName('');
    setDescription('');
  }

  function handlePrimaryChoice(choice: PrimaryChoice) {
    setPrimaryChoice(choice);
    if (choice === 'business_sale') {
      setWizardStep('revenue');
      // Default to the first revenue classification from the API — radio
      // values are real DB names ("Product Sale"), never hardcoded slugs.
      const firstRevenue = classifications.find((c) => c.isRevenue);
      setSelectedClassification(firstRevenue?.name ?? '');
    } else if (choice === 'not_sale') {
      setWizardStep('non_revenue');
    } else {
      setWizardStep('all');
    }
  }

  function goBackToPrimary() {
    setWizardStep('primary');
    setPrimaryChoice(null);
    setSelectedClassification('');
  }

  if (!biz) return <NoBusinessPrompt />;

  // Calculate stats
  const total = pagination?.total || 0;
  const oldestTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          Unverified Transactions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and classify incoming payments to ensure accurate tax reporting
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{total}</p>
          <p className="mt-1 text-[11px] text-gray-400 font-body">
            {total === 0 ? 'All caught up!' : 'Awaiting classification'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:border-gray-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Oldest Pending</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-base font-semibold text-gray-900">
            {oldestTx ? formatDate(oldestTx.transactionDate) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-gray-400 font-body">
            {oldestTx ? 'First in queue' : 'No pending transactions'}
          </p>
        </div>

        <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-4 shadow-xs hover:border-primary-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary-700">Action Needed</span>
            <CheckCircle2 className="h-4 w-4 text-primary-600" />
          </div>
          <p className="mt-2 text-base font-semibold text-primary-900">
            {total > 0 ? 'Review Now' : 'All Clear'}
          </p>
          <p className="mt-1 text-[11px] text-primary-600/70 font-body">
            {total > 0 ? 'Verify to update tax calculations' : 'No action required'}
          </p>
        </div>
      </div>

      {/* Info Alert */}
      {total > 0 && (
        <div className="rounded-xl border border-blue-200/50 bg-gradient-to-r from-blue-50 via-cyan-50/30 to-blue-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-0.5">Why verify transactions?</p>
              <p className="text-blue-700 text-xs leading-relaxed">
                Not all money received is taxable income. Gifts, loans, refunds, and capital injections shouldn't count toward your tax liability. Classify each payment correctly to ensure accurate tax reporting.
              </p>
            </div>
          </div>
          <Link
            to="/debtors"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-semibold shrink-0 transition-colors self-start sm:self-auto"
          >
            <BookOpen className="h-3.5 w-3.5" /> Reconcile Debtor
          </Link>
        </div>
      )}

      {/* Transactions List */}
      {loading && transactions.length === 0 ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">All Caught Up!</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              All transactions have been verified. New payments from your virtual account will appear here for review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs hover:shadow-sm hover:border-gray-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center flex-shrink-0">
                      <Wallet className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 tabular-nums">
                        {formatNaira(Number(tx.amount))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(tx.transactionDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 ml-13">
                    {tx.customerName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 text-xs">From:</span>
                        <span className="font-medium text-gray-900">{tx.customerName}</span>
                      </div>
                    )}
                    {tx.customerHint && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500 text-xs flex-shrink-0">Note:</span>
                        <span className="text-gray-600 text-xs leading-relaxed">{tx.customerHint}</span>
                      </div>
                    )}
                    {!tx.customerName && !tx.customerHint && (
                      <p className="text-xs text-gray-400 italic">No additional details</p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => openVerifyModal(tx)}
                  disabled={actioningId === tx.id}
                  className="flex items-center gap-1.5 flex-shrink-0 group-hover:scale-[1.02] transition-transform"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Verify
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-xs">
          <div className="text-sm text-gray-600 font-body">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrev || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNext || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Two-Step Wizard Modal */}
      {verifyModal && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 cursor-default" onClick={closeModal} />

          {/* Dialog Container */}
          <div className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col rounded-none bg-white shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-none bg-gray-900 text-white">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-gray-900">Verify Transaction</h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {formatNaira(Number(verifyModal.transaction.amount))} • {formatDate(verifyModal.transaction.transactionDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-none border border-transparent p-1.5 text-gray-400 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                disabled={actioningId === verifyModal.transaction.id}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {/* Business Assignment Selector (if user has multiple businesses) */}
              {businesses.length > 1 && (
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-none">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 mb-1.5 uppercase tracking-wider">
                    <Building2 className="h-3.5 w-3.5 text-gray-700" />
                    <span>Business Paid Into</span>
                  </div>
                  <select
                    value={targetBusinessId}
                    onChange={(e) => setTargetBusinessId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-none text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-0"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.businessName} {b.id === biz.id ? '(Current Active Business)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    {targetBusinessId === biz.id
                      ? 'This revenue will be credited to this business’s sales and tax reports.'
                      : `This revenue will be moved and credited to ${businesses.find((b) => b.id === targetBusinessId)?.businessName || 'the selected business'}.`}
                  </p>
                </div>
              )}

              {/* Step 1: Primary Choice */}
              {wizardStep === 'primary' && (
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      What is this payment for?
                    </h4>
                    <p className="text-xs text-gray-500">
                      Choose the option that best describes this transaction
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePrimaryChoice('business_sale')}
                    className="w-full text-left p-4 rounded-none border border-gray-300 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-none bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm mb-0.5 flex items-center gap-1.5">
                          Business Sale or Service
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        </h5>
                        <p className="text-xs text-gray-600 mb-1.5">
                          Customer paid for goods or services you provided
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                          ✓ Taxable Income
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 transition-colors shrink-0 mt-1" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrimaryChoice('not_sale')}
                    className="w-full text-left p-4 rounded-none border border-gray-300 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-none bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <Gift className="h-5 w-5 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm mb-0.5 flex items-center gap-1.5">
                          Gift, Loan, or Refund
                          <X className="h-3.5 w-3.5 text-amber-700" />
                        </h5>
                        <p className="text-xs text-gray-600 mb-1.5">
                          Money received but not earned through business operations
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                          ✗ NOT Taxable
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 transition-colors shrink-0 mt-1" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrimaryChoice('not_sure')}
                    className="w-full text-left p-4 rounded-none border border-gray-300 hover:border-gray-900 bg-white hover:bg-gray-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-none bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <HelpCircle className="h-5 w-5 text-gray-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm mb-0.5">
                          Not Sure / Other
                        </h5>
                        <p className="text-xs text-gray-600">
                          Show me all classification options with examples
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 transition-colors shrink-0 mt-1" />
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2: Business Sale Sub-categories */}
              {wizardStep === 'revenue' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={goBackToPrimary}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-none p-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-emerald-950 mb-0.5">Business Income (Taxable)</p>
                        <p className="text-emerald-800 text-[11px]">This transaction will count toward your tax calculation</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">What type of business income?</h4>
                  
                  <div className="space-y-2">
                    {loadingClassifications ? (
                      <div className="text-center py-6 text-gray-500 text-xs">Loading transaction types...</div>
                    ) : (
                      classifications
                        .filter((c) => c.isRevenue)
                        .map((classification) => (
                          <label
                            key={classification.id}
                            className={`flex items-start gap-3 p-3.5 rounded-none border cursor-pointer transition-all ${
                              selectedClassification === classification.name
                                ? 'border-gray-950 bg-gray-50 ring-1 ring-gray-950'
                                : 'border-gray-200 hover:border-gray-400 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="revenue-type"
                              value={classification.name}
                              checked={selectedClassification === classification.name}
                              onChange={(e) => setSelectedClassification(e.target.value)}
                              className="mt-0.5 h-4 w-4 text-gray-900 focus:ring-0"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-xs">{classification.name}</div>
                              {classification.description && (
                                <div className="text-[11px] text-gray-500 mt-0.5">{classification.description}</div>
                              )}
                            </div>
                          </label>
                        ))
                    )}
                  </div>

                  <div className="mt-4 space-y-3 pt-3 border-t border-gray-200">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Customer Name <span className="text-gray-400 lowercase font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g., Chukwuma Okafor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:border-gray-900 focus:ring-0 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Description <span className="text-gray-400 lowercase font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Payment for goods supplied"
                        className="w-full px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:border-gray-900 focus:ring-0 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Non-Sale Sub-categories */}
              {wizardStep === 'non_revenue' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={goBackToPrimary}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="bg-amber-50 border border-amber-200 rounded-none p-3">
                    <div className="flex items-start gap-2.5">
                      <X className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-amber-950 mb-0.5">Non-Taxable Receipt</p>
                        <p className="text-amber-800 text-[11px]">This won't count toward your tax calculation</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">What type of receipt?</h4>

                  <div className="space-y-2">
                    {classifications
                      .filter((c) => c.taxTreatment === 'non_taxable')
                      .map((classification) => (
                        <label
                          key={classification.id}
                          className={`flex items-start gap-3 p-3.5 rounded-none border cursor-pointer transition-all ${
                            selectedClassification === classification.name
                              ? 'border-gray-950 bg-gray-50 ring-1 ring-gray-950'
                              : 'border-gray-200 hover:border-gray-400 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="non-revenue-type"
                            value={classification.name}
                            checked={selectedClassification === classification.name}
                            onChange={(e) => setSelectedClassification(e.target.value)}
                            className="mt-0.5 h-4 w-4 text-gray-900 focus:ring-0"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-xs">{classification.name}</div>
                            {classification.description && (
                              <div className="text-[11px] text-gray-500 mt-0.5">{classification.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Step 2: All Classifications */}
              {wizardStep === 'all' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={goBackToPrimary}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Select classification</h4>

                  {loadingClassifications ? (
                    <div className="text-center py-8 text-gray-500 text-xs">Loading classifications...</div>
                  ) : (
                    <div className="space-y-3">
                      {/* Group Taxable */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <h5 className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Taxable Income</h5>
                        </div>
                        <div className="space-y-1.5">
                          {classifications
                            .filter((c) => c.taxTreatment === 'taxable')
                            .map((c) => (
                              <label
                                key={c.id}
                                className={`flex items-start gap-3 p-3 rounded-none border cursor-pointer transition-all ${
                                  selectedClassification === c.name
                                    ? 'border-gray-950 bg-gray-50 ring-1 ring-gray-950'
                                    : 'border-gray-200 hover:border-gray-400 bg-white text-xs'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="classification"
                                  value={c.name}
                                  checked={selectedClassification === c.name}
                                  onChange={(e) => setSelectedClassification(e.target.value)}
                                  className="mt-0.5 h-4 w-4 text-gray-900 focus:ring-0"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-xs">{c.name}</div>
                                  {c.description && (
                                    <div className="text-[11px] text-gray-500 mt-0.5">{c.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>

                      {/* Group Non-Taxable */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <X className="h-3.5 w-3.5 text-amber-700" />
                          <h5 className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Non-Taxable</h5>
                        </div>
                        <div className="space-y-1.5">
                          {classifications
                            .filter((c) => c.taxTreatment === 'non_taxable')
                            .map((c) => (
                              <label
                                key={c.id}
                                className={`flex items-start gap-3 p-3 rounded-none border cursor-pointer transition-all ${
                                  selectedClassification === c.name
                                    ? 'border-gray-950 bg-gray-50 ring-1 ring-gray-950'
                                    : 'border-gray-200 hover:border-gray-400 bg-white text-xs'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="classification"
                                  value={c.name}
                                  checked={selectedClassification === c.name}
                                  onChange={(e) => setSelectedClassification(e.target.value)}
                                  className="mt-0.5 h-4 w-4 text-gray-900 focus:ring-0"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-xs">{c.name}</div>
                                  {c.description && (
                                    <div className="text-[11px] text-gray-500 mt-0.5">{c.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 bg-gray-50/80 px-5 py-3 shrink-0">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={actioningId === verifyModal.transaction.id}
                className="rounded-none text-xs"
              >
                Cancel
              </Button>
              {wizardStep !== 'primary' && (
                <Button
                  onClick={handleVerify}
                  disabled={
                    !selectedClassification ||
                    actioningId === verifyModal.transaction.id
                  }
                  isLoading={actioningId === verifyModal.transaction.id}
                  className="rounded-none text-xs min-w-[120px]"
                >
                  Confirm
                </Button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
