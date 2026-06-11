import { useEffect, useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, AlertCircle, Receipt, X, Gift, DollarSign, RotateCcw, Briefcase } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useBusinessStore } from '@/stores/business.store';
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

const CATEGORY_ICONS: Record<string, any> = {
  revenue: Receipt,
  capital: Briefcase,
  loan: DollarSign,
  transfer: RotateCcw,
  refund: RotateCcw,
  grant: Gift,
  gift: Gift,
  investment: Briefcase,
  tax_refund: RotateCcw,
  insurance: AlertCircle,
  asset_sale: Receipt,
  other: AlertCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  revenue: 'bg-green-50 text-green-700 border-green-200',
  capital: 'bg-purple-50 text-purple-700 border-purple-200',
  loan: 'bg-blue-50 text-blue-700 border-blue-200',
  transfer: 'bg-gray-50 text-gray-700 border-gray-200',
  refund: 'bg-orange-50 text-orange-700 border-orange-200',
  grant: 'bg-teal-50 text-teal-700 border-teal-200',
  gift: 'bg-pink-50 text-pink-700 border-pink-200',
  investment: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  tax_refund: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  insurance: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  asset_sale: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

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
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [reclassifyModal, setReclassifyModal] = useState<{ transaction: SalesTransaction } | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [otherReason, setOtherReason] = useState('');
  const [classifications, setClassifications] = useState<TransactionClassification[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

  useEffect(() => {
    console.log('🔄 UnverifiedTransactions mounted');
    console.log('   Business:', biz?.id, biz?.businessName);
    console.log('   Page:', page);
    if (biz) {
      fetchUnverified();
      fetchClassifications();
    } else {
      console.log('⚠️  No active business - waiting...');
    }
  }, [biz, page]);

  async function fetchClassifications() {
    setLoadingClassifications(true);
    try {
      const res = await api.get('/transaction-classifications');
      console.log('📋 Classifications API Response:', res.data);
      console.log('   Success:', res.data.success);
      console.log('   Data type:', typeof res.data.data);
      console.log('   Is array:', Array.isArray(res.data.data));
      console.log('   Length:', res.data.data?.length);
      
      if (res.data.data && Array.isArray(res.data.data)) {
        setClassifications(res.data.data);
        console.log(`✅ Loaded ${res.data.data.length} classifications:`);
        res.data.data.forEach((c: any, i: number) => {
          console.log(`   ${i + 1}. ${c.name} (${c.category})`);
        });
      } else {
        console.error('❌ Invalid response format:', res.data);
        toast.error('Invalid classifications data');
      }
    } catch (err: any) {
      console.error('❌ Failed to load classifications:', err);
      console.error('   Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to load transaction types');
    } finally {
      setLoadingClassifications(false);
    }
  }

  async function fetchUnverified() {
    if (!biz) {
      console.log('❌ No business selected');
      return;
    }
    console.log('🔍 Fetching unverified transactions for business:', biz.id, biz.businessName);
    setLoading(true);
    try {
      const res = await api.get(`/businesses/${biz.id}/sales/unverified`, {
        params: { page, limit: 15 },
      });
      console.log('✅ Unverified transactions response:', res.data);
      console.log('   Total:', res.data.pagination?.total || 0);
      console.log('   Transactions:', res.data.data?.length || 0);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: any) {
      console.error('❌ Failed to fetch unverified:', err);
      console.error('   Response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to load unverified transactions');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(classificationName: string) {
    if (!biz || !reclassifyModal) return;
    
    if (!classificationName) {
      toast.error('Please select a classification');
      return;
    }

    const finalClassification = classificationName === 'other' ? otherReason : classificationName;
    if (!finalClassification) {
      toast.error('Please enter a classification reason');
      return;
    }

    setActioningId(reclassifyModal.transaction.id);
    try {
      // For sales revenue and service revenue, call verify endpoint
      if (classificationName === 'sales_revenue' || classificationName === 'service_revenue') {
        await api.post(`/businesses/${biz.id}/sales/${reclassifyModal.transaction.id}/verify`, { 
          classification: finalClassification 
        });
        toast.success('Transaction verified as sale');
      } else {
        // For all other classifications, call reclassify endpoint
        await api.post(`/businesses/${biz.id}/sales/${reclassifyModal.transaction.id}/reclassify`, { 
          classification: finalClassification 
        });
        toast.success('Transaction reclassified successfully');
      }
      closeModal();
      fetchUnverified();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process transaction');
    } finally {
      setActioningId(null);
    }
  }

  function openReclassifyModal(transaction: SalesTransaction) {
    console.log('🔓 Opening verify modal');
    console.log('   Transaction:', transaction.id, formatNaira(Number(transaction.amount)));
    console.log('   Classifications available:', classifications.length);
    setReclassifyModal({ transaction });
    setSelectedClassification('');
    setOtherReason('');
  }

  function closeModal() {
    setReclassifyModal(null);
    setSelectedClassification('');
    setOtherReason('');
  }

  if (!biz) return <NoBusinessPrompt />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unverified Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and classify incoming payments from your virtual account
          </p>
        </div>
      </div>

      <Card>
        {loading && !transactions.length ? (
          <TableSkeleton rows={5} columns={5} />
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
            <p className="mt-1 text-sm text-gray-500">
              All transactions verified. New payments will appear here for review.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Hint</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatNaira(Number(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.customerName || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {tx.customerHint || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => openReclassifyModal(tx)}
                          disabled={actioningId === tx.id}
                          className="flex items-center gap-1.5"
                        >
                          <Receipt className="h-4 w-4" />
                          Verify Transaction
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <div className="text-sm text-gray-600">
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
          </>
        )}
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Why verify transactions?</p>
            <p className="text-blue-700">
              Not all money received is taxable sales. Gifts, loans, expense refunds, and capital
              injections should not count toward your tax liability. Review each transaction to
              ensure accurate tax reporting.
            </p>
          </div>
        </div>
      </Card>

      {/* Reclassify Modal */}
      {reclassifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Verify Transaction</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatNaira(Number(reclassifyModal.transaction.amount))} • Classify to verify
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">
                Select what this payment is for:
              </p>

              {loadingClassifications ? (
                <div className="text-center py-8 text-gray-500">Loading classifications...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    {classifications.map((classification) => {
                      const Icon = CATEGORY_ICONS[classification.category] || AlertCircle;
                      const colorClass = CATEGORY_COLORS[classification.category] || CATEGORY_COLORS.other;
                      
                      return (
                        <button
                          key={classification.id}
                          onClick={() => setSelectedClassification(classification.name)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            selectedClassification === classification.name
                              ? `${colorClass} border-current`
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              selectedClassification === classification.name ? '' : 'text-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs mb-0.5">{classification.name}</div>
                              {classification.description && (
                                <div className={`text-[10px] leading-tight ${
                                  selectedClassification === classification.name ? 'opacity-90' : 'text-gray-500'
                                }`}>
                                  {classification.description}
                                </div>
                              )}
                            </div>
                            {selectedClassification === classification.name && (
                              <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Other option */}
                  <button
                    onClick={() => setSelectedClassification('other')}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedClassification === 'other'
                        ? 'bg-gray-50 text-gray-700 border-gray-400'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        selectedClassification === 'other' ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-xs mb-0.5">Other / Unclassified</div>
                        <div className={`text-[10px] ${
                          selectedClassification === 'other' ? 'text-gray-600' : 'text-gray-500'
                        }`}>
                          Specify a custom classification
                        </div>
                      </div>
                      {selectedClassification === 'other' && (
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-gray-600" />
                      )}
                    </div>
                  </button>

                  {/* Other text input */}
                  {selectedClassification === 'other' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="Enter classification reason..."
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={actioningId === reclassifyModal.transaction.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleVerify(selectedClassification)}
                disabled={
                  !selectedClassification ||
                  (selectedClassification === 'other' && !otherReason.trim()) ||
                  actioningId === reclassifyModal.transaction.id
                }
              >
                Confirm Transaction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
