import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FolderSync,
  HelpCircle,
  Loader2,
  Search,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import api, { getErrorMessage } from '@/lib/axios';
import toast from 'react-hot-toast';
import PageHeader from './shared/PageHeader';
import PaginationBar from './shared/Pagination';
import { Panel, PanelEmpty } from './shared/Panel';
import StatusPill from './shared/StatusPill';
import { formatNaira, formatStamp } from './shared/format';
import { useAdminStatsStore } from '@/stores/admin.stats.store.ts';
import type { AdminUnverifiedInflowRow, SiblingBusinessOption } from '@/types/index.ts';

const CANONICAL_CLASSIFICATIONS = [
  'Product Sale',
  'Service Revenue',
  'Transfer Between Accounts',
  'Loan Received',
  'Gift Received',
  'Grant Received',
  'Capital Injection',
  'Credit / Debt Settlement',
  'Other',
];

export default function AdminUnverifiedInflows() {
  const [inflows, setInflows] = useState<AdminUnverifiedInflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const unverifiedCount = useAdminStatsStore((s) => s.stats?.unverifiedInflows?.count ?? 0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Reallocate Modal State
  const [reallocateTarget, setReallocateTarget] = useState<AdminUnverifiedInflowRow | null>(null);
  const [selectedTargetBusinessId, setSelectedTargetBusinessId] = useState('');
  const [isReallocating, setIsReallocating] = useState(false);

  // Verify Modal State
  const [verifyTarget, setVerifyTarget] = useState<AdminUnverifiedInflowRow | null>(null);
  const [selectedClassification, setSelectedClassification] = useState('Product Sale');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [verifyTargetBusinessId, setVerifyTargetBusinessId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchInflows = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) {
        params.set('search', search);
      }

      const res = await api.get(`/admin/sales/unverified?${params.toString()}`);
      if (res.data?.success) {
        setInflows(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load unverified inflows queue'));
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchInflows();
  }, [fetchInflows]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Open Reallocate Modal
  const openReallocateModal = (row: AdminUnverifiedInflowRow) => {
    setReallocateTarget(row);
    setSelectedTargetBusinessId(row.siblingBusinesses[0]?.id ?? '');
  };

  const closeReallocateModal = () => {
    setReallocateTarget(null);
    setSelectedTargetBusinessId('');
  };

  const handleConfirmReallocate = async () => {
    if (!reallocateTarget || !selectedTargetBusinessId) return;

    try {
      setIsReallocating(true);
      const res = await api.patch(`/admin/sales/${reallocateTarget.id}/reassign`, {
        targetBusinessId: selectedTargetBusinessId,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Inflow successfully reallocated');
        closeReallocateModal();
        await fetchInflows();
        useAdminStatsStore.getState().fetchStats({ force: true });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reallocate transaction'));
    } finally {
      setIsReallocating(false);
    }
  };

  // Open Verify Modal
  const openVerifyModal = (row: AdminUnverifiedInflowRow) => {
    setVerifyTarget(row);
    setSelectedClassification('Product Sale');
    setCustomerNameInput(row.customerName || row.customerHint || '');
    setDescriptionInput(row.description || '');
    setVerifyTargetBusinessId('');
  };

  const closeVerifyModal = () => {
    setVerifyTarget(null);
    setSelectedClassification('Product Sale');
    setCustomerNameInput('');
    setDescriptionInput('');
    setVerifyTargetBusinessId('');
  };

  const handleConfirmVerify = async () => {
    if (!verifyTarget || !selectedClassification) return;

    try {
      setIsVerifying(true);
      const res = await api.post(`/admin/sales/unverified/${verifyTarget.id}/verify`, {
        classificationName: selectedClassification,
        customerName: customerNameInput.trim() || undefined,
        description: descriptionInput.trim() || undefined,
        targetBusinessId:
          verifyTarget.accrualLinked || !verifyTargetBusinessId
            ? undefined
            : verifyTargetBusinessId,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Transaction successfully classified and verified');
        closeVerifyModal();
        await fetchInflows();
        useAdminStatsStore.getState().fetchStats({ force: true });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to verify transaction'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Unverified Inflows'
        hint='Central triage queue for auto-captured incoming transfers awaiting classification or business reallocation.'
      />

      {/* KPI Overview Banner */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <div className='rounded-lg border border-amber-500/20 bg-amber-500/5 p-4'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-amber-400 uppercase tracking-wider'>
              Unverified Inflows
            </span>
            <Clock className='h-4 w-4 text-amber-400' />
          </div>
          <div className='mt-2 flex items-baseline gap-2'>
            <span className='text-2xl font-bold tracking-tight text-ink tabular-nums'>
              {unverifiedCount}
            </span>
            <span className='text-xs text-ink-muted'>pending classification</span>
          </div>
          <p className='mt-1 text-[11px] text-ink-subtle'>
            Structurally quarantined from treasury P&L until verified.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative max-w-sm flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle' />
          <input
            type='text'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search reference, customer, or business...'
            className='h-9 w-full rounded border border-hairline bg-panel pl-9 pr-3 text-xs text-ink placeholder:text-ink-subtle focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          />
        </div>

        {search && (
          <div className='flex items-center gap-2 text-xs text-ink-muted'>
            <span>Filtering by: &ldquo;{search}&rdquo;</span>
            <button
              onClick={() => setSearchInput('')}
              className='text-primary-400 hover:text-primary-300 underline'
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Queue Table */}
      <Panel>
        {loading && !hasLoadedOnce ? (
          <div className='p-6'>
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : inflows.length === 0 ? (
          <PanelEmpty
            icon={HelpCircle}
            title={search ? 'No matching inflows found' : 'All inflows verified'}
            hint={
              search
                ? `No unverified transactions match "${search}". Try adjusting your search query.`
                : 'There are currently no transactions awaiting classification across the platform.'
            }
          />
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead>
                <tr className='border-b border-hairline bg-panel-subtle/50 text-[11px] font-medium text-ink-subtle'>
                  <th className='py-3 pl-4 pr-3'>Date</th>
                  <th className='px-3 py-3'>Reference</th>
                  <th className='px-3 py-3'>Assigned Business</th>
                  <th className='px-3 py-3'>Counterparty</th>
                  <th className='px-3 py-3 text-right'>Amount</th>
                  <th className='px-3 py-3 text-center'>State</th>
                  <th className='py-3 pl-3 pr-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-hairline'>
                {inflows.map((row) => (
                  <tr key={row.id} className='hover:bg-panel-subtle/30 transition-colors'>
                    {/* Date */}
                    <td className='py-3.5 pl-4 pr-3 whitespace-nowrap text-ink-muted'>
                      {formatStamp(row.transactionDate)}
                    </td>

                    {/* Reference */}
                    <td className='px-3 py-3.5 whitespace-nowrap'>
                      <div className='flex items-center gap-1.5'>
                        <span className='font-mono text-[11px] text-ink'>
                          {row.referenceId || row.id.slice(0, 12)}
                        </span>
                        <button
                          onClick={() => handleCopy(row.id, row.referenceId || row.id)}
                          className='text-ink-subtle hover:text-ink transition-colors p-0.5'
                          title='Copy reference'
                        >
                          {copiedId === row.id ? (
                            <Check className='h-3 w-3 text-emerald-400' />
                          ) : (
                            <Copy className='h-3 w-3' />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Assigned Business - Dedicated Visually Distinct Block */}
                    <td className='px-3 py-3.5'>
                      <div className='rounded border border-primary-500/20 bg-primary-500/5 px-2.5 py-1.5 inline-block max-w-[240px]'>
                        <div className='flex items-center gap-1.5'>
                          <Building2 className='h-3 w-3 shrink-0 text-primary-400' />
                          <span className='truncate font-semibold text-ink'>
                            {row.business.businessName}
                          </span>
                        </div>
                        <div className='mt-0.5 flex items-center gap-2 text-[10px] text-ink-subtle'>
                          <span className='font-mono'>{row.business.merchantId}</span>
                          <span>•</span>
                          <span className='truncate'>{row.business.user.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Counterparty / Customer */}
                    <td className='px-3 py-3.5 text-ink'>
                      <div className='max-w-[160px] truncate'>
                        {row.customerName || row.customerHint || (
                          <span className='text-ink-subtle italic'>Not specified</span>
                        )}
                      </div>
                      {row.description && (
                        <div className='max-w-[160px] truncate text-[10px] text-ink-subtle'>
                          {row.description}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className='px-3 py-3.5 text-right font-mono font-medium text-ink tabular-nums'>
                      {formatNaira(row.amount)}
                    </td>

                    {/* Status */}
                    <td className='px-3 py-3.5 text-center'>
                      <StatusPill tone='warning'>Needs Verification</StatusPill>
                    </td>

                    {/* Action buttons */}
                    <td className='py-3.5 pl-3 pr-4 text-right whitespace-nowrap'>
                      <div className='flex items-center justify-end gap-2'>
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() => openReallocateModal(row)}
                          title={
                            row.accrualLinked
                              ? 'Revenue was recognised at invoice/credit issuance — this inflow cannot be moved. Cancel and re-issue the invoice instead.'
                              : row.siblingBusinesses.length === 0
                                ? 'Merchant has no other businesses'
                                : 'Reallocate to another business owned by this merchant'
                          }
                          disabled={row.accrualLinked || row.siblingBusinesses.length === 0}
                          className='gap-1 text-[11px]'
                        >
                          <FolderSync className='h-3 w-3' />
                          Reallocate
                        </Button>

                        <Button
                          size='sm'
                          variant='primary'
                          onClick={() => openVerifyModal(row)}
                          className='gap-1 text-[11px]'
                        >
                          <CheckCircle2 className='h-3 w-3' />
                          Classify & Verify
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {inflows.length > 0 && (
          <PaginationBar
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            noun='inflows'
          />
        )}
      </Panel>

      {/* ─── Modal 1: Reallocate Business Modal ──────────────────────── */}
      <Modal
        isOpen={!!reallocateTarget}
        onClose={closeReallocateModal}
        title='Reallocate Inflow to Another Business'
      >
        {reallocateTarget && (
          <div className='space-y-4 text-xs'>
            <div className='rounded border border-hairline bg-panel-subtle p-3 space-y-1.5'>
              <div className='text-[11px] text-ink-subtle uppercase tracking-wider font-medium'>
                Current Assignment
              </div>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-ink text-sm'>
                  {reallocateTarget.business.businessName}
                </span>
                <span className='font-mono text-ink-muted'>
                  {formatNaira(reallocateTarget.amount)}
                </span>
              </div>
              <div className='text-ink-subtle'>
                Merchant: {reallocateTarget.business.user.email} (ID:{' '}
                {reallocateTarget.business.merchantId})
              </div>
            </div>

            <div>
              <label className='block font-medium text-ink mb-1.5'>
                Select Destination Business (Merchant Siblings)
              </label>
              <select
                value={selectedTargetBusinessId}
                onChange={(e) => setSelectedTargetBusinessId(e.target.value)}
                className='w-full rounded border border-hairline bg-panel px-3 py-2 text-xs text-ink focus:border-primary-500 focus:outline-none'
              >
                {reallocateTarget.siblingBusinesses.map((b: SiblingBusinessOption) => (
                  <option key={b.id} value={b.id}>
                    {b.businessName} ({b.merchantId})
                  </option>
                ))}
              </select>
            </div>

            {/* Statutory / Accounting Notice */}
            <div className='flex gap-2.5 rounded border border-amber-500/20 bg-amber-500/5 p-3 text-amber-300'>
              <AlertCircle className='h-4 w-4 shrink-0 text-amber-400 mt-0.5' />
              <p className='text-[11px] leading-relaxed text-ink-muted'>
                <strong className='text-ink font-semibold'>Note:</strong> Reallocating changes
                which business this inflow counts toward, including in periods already reported.
                Both sales and wallet ledgers will be synced atomically.
              </p>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={closeReallocateModal}
                disabled={isReallocating}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                size='sm'
                onClick={handleConfirmReallocate}
                disabled={isReallocating || !selectedTargetBusinessId}
              >
                {isReallocating ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    Reallocating...
                  </>
                ) : (
                  'Confirm Reallocation'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Modal 2: Classify & Verify Modal ────────────────────────── */}
      <Modal
        isOpen={!!verifyTarget}
        onClose={closeVerifyModal}
        title='Classify & Verify Transaction'
      >
        {verifyTarget && (
          <div className='space-y-4 text-xs'>
            <div className='rounded border border-hairline bg-panel-subtle p-3 space-y-1'>
              <div className='flex justify-between items-center'>
                <span className='font-semibold text-ink'>{verifyTarget.business.businessName}</span>
                <span className='font-mono font-medium text-ink'>
                  {formatNaira(verifyTarget.amount)}
                </span>
              </div>
              <div className='text-[11px] text-ink-subtle'>
                Ref: {verifyTarget.referenceId || verifyTarget.id}
              </div>
            </div>

            {/* Classification Category */}
            <div>
              <label className='block font-medium text-ink mb-1.5'>
                Transaction Classification *
              </label>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className='w-full rounded border border-hairline bg-panel px-3 py-2 text-xs text-ink focus:border-primary-500 focus:outline-none'
              >
                {CANONICAL_CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Customer Name */}
            <div>
              <label className='block font-medium text-ink mb-1.5'>
                Customer / Sender Name (Optional)
              </label>
              <input
                type='text'
                value={customerNameInput}
                onChange={(e) => setCustomerNameInput(e.target.value)}
                placeholder='e.g. Alhaji Danladi'
                className='w-full rounded border border-hairline bg-panel px-3 py-2 text-xs text-ink placeholder:text-ink-subtle focus:border-primary-500 focus:outline-none'
              />
            </div>

            {/* Optional Description */}
            <div>
              <label className='block font-medium text-ink mb-1.5'>
                Description / Memo (Optional)
              </label>
              <input
                type='text'
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder='e.g. Counter wholesale purchase'
                className='w-full rounded border border-hairline bg-panel px-3 py-2 text-xs text-ink placeholder:text-ink-subtle focus:border-primary-500 focus:outline-none'
              />
            </div>

            {/* Optional Destination Reassignment during Verification */}
            {verifyTarget.siblingBusinesses.length > 0 && (
              <div>
                <label className='block font-medium text-ink mb-1.5'>
                  Reallocate Business during verification (Optional)
                </label>
                {verifyTarget.accrualLinked ? (
                  <p className='rounded border border-hairline bg-surface-subtle px-3 py-2 text-xs text-ink-subtle'>
                    Revenue was recognised when the invoice or credit was issued, so this inflow
                    cannot be reallocated. Cancel and re-issue the invoice against the correct
                    business instead.
                  </p>
                ) : (
                  <select
                    value={verifyTargetBusinessId}
                    onChange={(e) => setVerifyTargetBusinessId(e.target.value)}
                    className='w-full rounded border border-hairline bg-panel px-3 py-2 text-xs text-ink focus:border-primary-500 focus:outline-none'
                  >
                    <option value=''>
                      Keep assigned to {verifyTarget.business.businessName}
                    </option>
                    {verifyTarget.siblingBusinesses.map((b: SiblingBusinessOption) => (
                      <option key={b.id} value={b.id}>
                        Move to {b.businessName} ({b.merchantId})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={closeVerifyModal}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                size='sm'
                onClick={handleConfirmVerify}
                disabled={isVerifying || !selectedClassification}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    Verifying...
                  </>
                ) : (
                  'Confirm & Verify'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
