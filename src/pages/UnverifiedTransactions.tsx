import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, X, Gift, TrendingUp, Clock, ArrowRight, Sparkles, ShoppingBag, HelpCircle, Wallet, CircleDollarSign } from 'lucide-react';
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
  const invalidateDashboard = useDashboardEvents((s) => s.invalidateDashboard);
  
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  
  // Wizard modal state
  const [verifyModal, setVerifyModal] = useState<{ transaction: SalesTransaction } | null>(null);
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
      
      if (isRevenue) {
        await api.post(`/businesses/${biz.id}/sales/${verifyModal.transaction.id}/verify`, { 
          classification: selectedClassification,
          customerName: customerName || undefined,
          description: description || undefined,
        });
        toast.success('Transaction verified as business income');
      } else {
        await api.post(`/businesses/${biz.id}/sales/${verifyModal.transaction.id}/reclassify`, { 
          classification: selectedClassification 
        });
        toast.success('Transaction reclassified successfully');
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
    setWizardStep('primary');
    setPrimaryChoice(null);
    setSelectedClassification('');
    setCustomerName(transaction.customerName || '');
    setDescription('');
  }

  function closeModal() {
    setVerifyModal(null);
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
            <Sparkles className="h-4 w-4 text-primary-600" />
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
        <div className="rounded-xl border border-blue-200/50 bg-gradient-to-r from-blue-50 via-cyan-50/30 to-blue-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-0.5">Why verify transactions?</p>
            <p className="text-blue-700 text-xs leading-relaxed">
              Not all money received is taxable income. Gifts, loans, refunds, and capital injections shouldn't count toward your tax liability. Classify each payment correctly to ensure accurate tax reporting.
            </p>
          </div>
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
      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CircleDollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Verify Transaction</h3>
                    <p className="text-sm text-gray-500 tabular-nums">
                      {formatNaira(Number(verifyModal.transaction.amount))} • {formatDate(verifyModal.transaction.transactionDate)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1.5 hover:bg-gray-100"
                  disabled={actioningId === verifyModal.transaction.id}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 overflow-y-auto flex-1">
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
                    onClick={() => handlePrimaryChoice('business_sale')}
                    className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white hover:from-green-100 hover:to-green-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm mb-0.5 flex items-center gap-1.5">
                          Business Sale or Service
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        </h5>
                        <p className="text-xs text-gray-600 mb-1.5">
                          Customer paid for goods or services you provided
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 font-medium">
                          ✓ Taxable Income
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  </button>

                  <button
                    onClick={() => handlePrimaryChoice('not_sale')}
                    className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 bg-gradient-to-br from-orange-50 to-white hover:from-orange-100 hover:to-orange-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Gift className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm mb-0.5 flex items-center gap-1.5">
                          Gift, Loan, or Refund
                          <X className="h-3.5 w-3.5 text-orange-600" />
                        </h5>
                        <p className="text-xs text-gray-600 mb-1.5">
                          Money received but not earned through business operations
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700 font-medium">
                          ✗ NOT Taxable
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  </button>

                  <button
                    onClick={() => handlePrimaryChoice('not_sure')}
                    className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <HelpCircle className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm mb-0.5">
                          Not Sure / Other
                        </h5>
                        <p className="text-xs text-gray-600">
                          Show me all classification options with examples
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2: Business Sale Sub-categories */}
              {wizardStep === 'revenue' && (
                <div className="space-y-4">
                  <button
                    onClick={goBackToPrimary}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-900 mb-0.5">Business Income (Taxable)</p>
                        <p className="text-green-700 text-xs">This transaction will count toward your tax calculation</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold text-gray-900 mb-3">What type of business income?</h4>
                  
                  <div className="space-y-2">
                    {loadingClassifications ? (
                      <div className="text-center py-6 text-gray-500 text-sm">Loading transaction types...</div>
                    ) : (
                      classifications
                        .filter((c) => c.isRevenue)
                        .map((classification) => (
                          <label
                            key={classification.id}
                            className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-green-400 cursor-pointer transition-all bg-white"
                          >
                            <input
                              type="radio"
                              name="revenue-type"
                              value={classification.name}
                              checked={selectedClassification === classification.name}
                              onChange={(e) => setSelectedClassification(e.target.value)}
                              className="mt-0.5 h-4 w-4 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">{classification.name}</div>
                              {classification.description && (
                                <div className="text-xs text-gray-600 mt-0.5">{classification.description}</div>
                              )}
                            </div>
                          </label>
                        ))
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Customer Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g., Chukwuma Okafor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Payment for invoice #1234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Non-Sale Sub-categories */}
              {wizardStep === 'non_revenue' && (
                <div className="space-y-4">
                  <button
                    onClick={goBackToPrimary}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-orange-900 mb-0.5">Non-Taxable Receipt</p>
                        <p className="text-orange-700 text-xs">This won't count toward your tax calculation</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold text-gray-900 mb-3">What type of receipt?</h4>

                  <div className="space-y-2">
                    {classifications
                      .filter((c) => c.taxTreatment === 'non_taxable')
                      .map((classification) => (
                        <label
                          key={classification.id}
                          className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 cursor-pointer transition-all bg-white"
                        >
                          <input
                            type="radio"
                            name="non-revenue-type"
                            value={classification.name}
                            checked={selectedClassification === classification.name}
                            onChange={(e) => setSelectedClassification(e.target.value)}
                            className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{classification.name}</div>
                            {classification.description && (
                              <div className="text-xs text-gray-600 mt-0.5">{classification.description}</div>
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
                    onClick={goBackToPrimary}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>

                  <h4 className="font-semibold text-gray-900 mb-3">Select classification</h4>

                  {loadingClassifications ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Loading classifications...</div>
                  ) : (
                    <div className="space-y-3">
                      {/* Group Taxable */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <h5 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Taxable Income</h5>
                        </div>
                        <div className="space-y-1.5">
                          {classifications
                            .filter((c) => c.taxTreatment === 'taxable')
                            .map((c) => (
                              <label
                                key={c.id}
                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-400 cursor-pointer transition-all bg-white text-sm"
                              >
                                <input
                                  type="radio"
                                  name="classification"
                                  value={c.name}
                                  checked={selectedClassification === c.name}
                                  onChange={(e) => setSelectedClassification(e.target.value)}
                                  className="mt-0.5 h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{c.name}</div>
                                  {c.description && (
                                    <div className="text-xs text-gray-600 mt-0.5">{c.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>

                      {/* Group Non-Taxable */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <X className="h-4 w-4 text-orange-600" />
                          <h5 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Non-Taxable</h5>
                        </div>
                        <div className="space-y-1.5">
                          {classifications
                            .filter((c) => c.taxTreatment === 'non_taxable')
                            .map((c) => (
                              <label
                                key={c.id}
                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-orange-400 cursor-pointer transition-all bg-white text-sm"
                              >
                                <input
                                  type="radio"
                                  name="classification"
                                  value={c.name}
                                  checked={selectedClassification === c.name}
                                  onChange={(e) => setSelectedClassification(e.target.value)}
                                  className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{c.name}</div>
                                  {c.description && (
                                    <div className="text-xs text-gray-600 mt-0.5">{c.description}</div>
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

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={actioningId === verifyModal.transaction.id}
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
                  className="min-w-[120px]"
                >
                  Confirm
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
