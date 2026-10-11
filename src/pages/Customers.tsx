import { useEffect, useState } from 'react';
import {
  Users,
  CreditCard,
  Plus,
  Search,
  ArrowUpRight,
  History,
  SlidersHorizontal,
  Wallet,
  Coins,
  RefreshCw,
  UserCheck,
  Loader2,
  Lock,
  KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import Modal from '@/components/ui/Modal.tsx';
import PhoneInput from '@/components/ui/PhoneInput.tsx';
import EmptyState from '@/components/ui/EmptyState.tsx';
import { TableSkeleton } from '@/components/ui/Skeleton.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useCustomerStore } from '@/stores/customer.store.ts';
import { useSubscriptionWriteGate } from '@/hooks/useSubscriptionWriteGate';
import { maskPhoneSuffix } from '@/lib/format';
import type { Customer } from '@/types/index.ts';

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

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'CU'
  );
}

export default function Customers() {
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const myRole = activeBusiness?.myRole;
  const isManagerOrOwner = myRole === 'owner' || myRole === 'manager';
  const { blockIfNeeded } = useSubscriptionWriteGate();

  const {
    customers,
    pagination,
    loading: customersLoading,
    stats,
    statsLoading,
    activities,
    activityPagination,
    activityLoading,
    searchCustomers,
    fetchStats,
    fetchActivity,
    quickCreateCustomer,
    topUpCard,
    adjustCard,
    fetchCustomerCard,
    activeCustomerCard,
    cardLoading,
    resendVoucherPin,
    changeVoucherPin,
  } = useCustomerStore();

  const [activeTab, setActiveTab] = useState<'customers' | 'logs'>('customers');

  // Filter & Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);

  const [logSearch, setLogSearch] = useState('');
  const [logType, setLogType] = useState<string>('');
  const [logPage, setLogPage] = useState(1);

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Top Up Modal state
  const [selectedCustomerForTopUp, setSelectedCustomerForTopUp] = useState<Customer | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [topUpNotes, setTopUpNotes] = useState<string>('');
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  // Adjust Modal state
  const [selectedCustomerForAdjust, setSelectedCustomerForAdjust] = useState<Customer | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Change PIN Modal state
  const [selectedCustomerForPinChange, setSelectedCustomerForPinChange] = useState<Customer | null>(null);
  const [pinOldPin, setPinOldPin] = useState<string>('');
  const [pinNewPin, setPinNewPin] = useState<string>('');
  const [pinLast4, setPinLast4] = useState<string>('');
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  // History/Ledger Modal state
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Initial fetch
  useEffect(() => {
    if (!activeBusiness?.id) return;
    fetchStats(activeBusiness.id);
  }, [activeBusiness?.id, fetchStats]);

  useEffect(() => {
    if (!activeBusiness?.id) return;
    searchCustomers(activeBusiness.id, customerSearch, customerPage, 15);
  }, [activeBusiness?.id, customerSearch, customerPage, searchCustomers]);

  useEffect(() => {
    if (!activeBusiness?.id || activeTab !== 'logs') return;
    fetchActivity(activeBusiness.id, {
      search: logSearch || undefined,
      type: logType || undefined,
      page: logPage,
      limit: 20,
    });
  }, [activeBusiness?.id, activeTab, logSearch, logType, logPage, fetchActivity]);

  const handleRefresh = () => {
    if (!activeBusiness?.id) return;
    fetchStats(activeBusiness.id);
    if (activeTab === 'customers') {
      searchCustomers(activeBusiness.id, customerSearch, customerPage, 15);
    } else {
      fetchActivity(activeBusiness.id, {
        search: logSearch || undefined,
        type: logType || undefined,
        page: logPage,
        limit: 20,
      });
    }
    toast.success('CRM refreshed');
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockIfNeeded()) return;
    if (!activeBusiness?.id || !newName.trim() || !newPhone.trim()) {
      toast.error('Customer name and phone number are required');
      return;
    }

    setIsSavingCustomer(true);
    try {
      const created = await quickCreateCustomer(activeBusiness.id, {
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      toast.success(`Customer ${created.name} added with Virtual Card!`);
      setIsAddCustomerOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      fetchStats(activeBusiness.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to create customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockIfNeeded()) return;
    if (!activeBusiness?.id || !selectedCustomerForTopUp) return;
    const num = Number(topUpAmount);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid top-up amount');
      return;
    }

    setIsSubmittingTopUp(true);
    try {
      await topUpCard(activeBusiness.id, selectedCustomerForTopUp.id, {
        amount: num,
        notes: topUpNotes.trim() || 'Prepaid voucher deposit',
      });
      toast.success(`₦${num.toLocaleString()} credited to ${selectedCustomerForTopUp.name}'s voucher!`);
      setSelectedCustomerForTopUp(null);
      setTopUpAmount('');
      setTopUpNotes('');
      searchCustomers(activeBusiness.id, customerSearch, customerPage, 15);
      fetchStats(activeBusiness.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to top up card');
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockIfNeeded()) return;
    if (!activeBusiness?.id || !selectedCustomerForAdjust) return;
    const num = Number(adjustAmount);
    if (isNaN(num) || num === 0) {
      toast.error('Adjustment amount cannot be zero');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Adjustment reason is required');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await adjustCard(activeBusiness.id, selectedCustomerForAdjust.id, {
        amount: num,
        reason: adjustReason.trim(),
      });
      toast.success(`Balance adjusted for ${selectedCustomerForAdjust.name}`);
      setSelectedCustomerForAdjust(null);
      setAdjustAmount('');
      setAdjustReason('');
      searchCustomers(activeBusiness.id, customerSearch, customerPage, 15);
      fetchStats(activeBusiness.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to adjust balance');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleResendPin = async (customer: Customer) => {
    if (blockIfNeeded()) return;
    if (!activeBusiness?.id) return;
    try {
      const res = await resendVoucherPin(activeBusiness.id, customer.id);
      toast.success(res.message || 'New PIN sent to customer email');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to resend PIN');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockIfNeeded()) return;
    if (!activeBusiness?.id || !selectedCustomerForPinChange) return;

    if (!/^\d{6}$/.test(pinOldPin.trim())) {
      toast.error('Old PIN must be exactly 6 digits');
      return;
    }
    if (!/^\d{6}$/.test(pinNewPin.trim())) {
      toast.error('New PIN must be exactly 6 digits');
      return;
    }
    if (!/^\d{4}$/.test(pinLast4.trim())) {
      toast.error('Last 4 digits of phone must be exactly 4 digits');
      return;
    }

    setIsSubmittingPinChange(true);
    try {
      const res = await changeVoucherPin(activeBusiness.id, selectedCustomerForPinChange.id, {
        oldPin: pinOldPin.trim(),
        newPin: pinNewPin.trim(),
        last4Phone: pinLast4.trim(),
      });
      toast.success(res.message || 'Voucher PIN changed successfully');
      setSelectedCustomerForPinChange(null);
      setPinOldPin('');
      setPinNewPin('');
      setPinLast4('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to change PIN');
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  const openHistoryModal = (c: Customer) => {
    if (!activeBusiness?.id) return;
    setSelectedCustomerForHistory(c);
    setIsHistoryOpen(true);
    fetchCustomerCard(activeBusiness.id, c.id).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Customer CRM & Virtual Store Cards
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage prepaid customer vouchers, digital change cards, and audit transaction logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            subscriptionExempt={true}
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (blockIfNeeded()) return;
              setIsAddCustomerOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Quick-Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 border-emerald-200">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Circulating Vouchers</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-emerald-900">
            {statsLoading ? '...' : formatNaira(stats?.circulatingBalance || 0)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Store liability balance</p>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-blue-50/70 to-blue-100/30 border-blue-200">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-blue-900">
            {statsLoading ? '...' : (stats?.totalCustomers || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">Registered accounts</p>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-teal-50/70 to-teal-100/30 border-teal-200">
          <div className="flex items-center justify-between text-teal-700 text-xs font-semibold">
            <span>Active Store Cards</span>
            <CreditCard className="w-4 h-4 text-teal-600" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-teal-900">
            {statsLoading ? '...' : (stats?.totalCards || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-teal-600 mt-0.5">Issued virtual cards</p>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 border-indigo-200">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold">
            <span>Change Credited</span>
            <Coins className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-indigo-900">
            {statsLoading ? '...' : formatNaira(stats?.monthChangeCredited || 0)}
          </p>
          <p className="text-[10px] text-indigo-600 mt-0.5">This month</p>
        </Card>

        <Card className="p-3.5 bg-gradient-to-br from-amber-50/70 to-amber-100/30 border-amber-200">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Vouchers Redeemed</span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-amber-900">
            {statsLoading ? '...' : formatNaira(stats?.monthRedeemed || 0)}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Sales paid this month</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-2.5 px-1 border-b-2 font-medium text-xs flex items-center gap-2 transition-colors ${
              activeTab === 'customers'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Customers & Virtual Cards
            {pagination && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-600">
                {pagination.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-1 border-b-2 font-medium text-xs flex items-center gap-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            Activity & Audit Logs ("Who Did What")
            {activityPagination && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-600">
                {activityPagination.total}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Customers & Cards */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name, phone, or voucher code..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {pagination && (
              <span className="text-xs text-gray-400">
                Showing {customers.length} of {pagination.total} customers
              </span>
            )}
          </div>

          {/* Customer Table */}
          {customersLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              message="No customers found. Click '+ Quick-Add Customer' to register your first customer."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Virtual Card Code
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Voucher Balance
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Date Registered
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {customers.map((c) => {
                    const balance = c.card ? Number(c.card.balance) : 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{c.name}</div>
                              {c.email && <div className="text-[11px] text-gray-400">{c.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {c.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{c.phone}</span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono font-semibold border border-blue-100">
                                ●●{maskPhoneSuffix(c.phone)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {c.card ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                              <CreditCard className="w-3 h-3 text-gray-500" />
                              {c.card.cardCode}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block font-bold text-xs px-2 py-0.5 rounded-full ${
                              balance > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {formatNaira(balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {c.createdAt ? formatDate(c.createdAt) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                if (blockIfNeeded()) return;
                                setSelectedCustomerForTopUp(c);
                                setTopUpAmount('');
                                setTopUpNotes('');
                              }}
                              className="text-xs py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                            >
                              + Top Up Voucher
                            </Button>
                            {isManagerOrOwner && c.card && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleResendPin(c)}
                                  className="text-xs py-1 px-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                  title="Resend voucher PIN to customer email"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    if (blockIfNeeded()) return;
                                    setSelectedCustomerForPinChange(c);
                                    setPinOldPin('');
                                    setPinNewPin('');
                                    setPinLast4('');
                                  }}
                                  className="text-xs py-1 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  title="Change voucher PIN"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    if (blockIfNeeded()) return;
                                    setSelectedCustomerForAdjust(c);
                                    setAdjustAmount('');
                                    setAdjustReason('');
                                  }}
                                  className="text-xs py-1 px-2 text-gray-600 hover:text-gray-800"
                                  title="Adjust balance (Owner/Manager)"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              subscriptionExempt={true}
                              onClick={() => openHistoryModal(c)}
                              className="text-xs py-1 px-2 text-gray-600 hover:text-gray-800"
                              title="View voucher statement"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Activity & Audit Logs ("Who Did What") */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Log Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer, staff or receipt..."
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={logType}
                onChange={(e) => {
                  setLogType(e.target.value);
                  setLogPage(1);
                }}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">All Transaction Types</option>
                <option value="change_credit">Change Deposit</option>
                <option value="sale_debit">Voucher Payment (Sale)</option>
                <option value="top_up">Prepaid Top-Up</option>
                <option value="adjustment">Manual Adjustment</option>
              </select>
            </div>
            {activityPagination && (
              <span className="text-xs text-gray-400">
                {activityPagination.total} audit entries
              </span>
            )}
          </div>

          {/* Activity Logs Table */}
          {activityLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={History}
              message="No voucher transactions recorded yet. Activity will appear here when cash change is deposited or vouchers are redeemed."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Customer / Card
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Action Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Balance Delta
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Performed By (Staff / Owner)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">
                      Notes / Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {activities.map((act) => {
                    const badgeMap: Record<string, { label: string; cls: string }> = {
                      change_credit: {
                        label: 'Change Deposit',
                        cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      },
                      sale_debit: {
                        label: 'Voucher Redeemed',
                        cls: 'bg-teal-100 text-teal-800 border-teal-200',
                      },
                      top_up: {
                        label: 'Top-Up Deposit',
                        cls: 'bg-blue-100 text-blue-800 border-blue-200',
                      },
                      adjustment: {
                        label: 'Adjustment',
                        cls: 'bg-purple-100 text-purple-800 border-purple-200',
                      },
                    };
                    const badge = badgeMap[act.type] || {
                      label: act.type,
                      cls: 'bg-gray-100 text-gray-700 border-gray-200',
                    };

                    const isCredit = act.type === 'change_credit' || act.type === 'top_up' || (act.type === 'adjustment' && act.balanceAfter > act.balanceBefore);

                    return (
                      <tr key={act.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                          {formatDateTime(act.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{act.customerName}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{act.cardCode}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold">
                          <span className={isCredit ? 'text-emerald-700' : 'text-rose-700'}>
                            {isCredit ? '+' : '-'} {formatNaira(act.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-gray-500">
                          {formatNaira(act.balanceBefore)} →{' '}
                          <span className="font-semibold text-gray-900">{formatNaira(act.balanceAfter)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                            {act.performerName}
                          </div>
                          {act.performerEmail && (
                            <div className="text-[10px] text-gray-400">{act.performerEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                          {act.receiptNumber && (
                            <span className="font-mono text-[11px] font-bold text-gray-800 mr-1.5">
                              #{act.receiptNumber}
                            </span>
                          )}
                          <span>{act.notes || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick-Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Quick-Add Customer"
        subtitle="Register customer and generate their virtual store card"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3.5 py-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Customer Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alhaji Babangida"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={newPhone}
              onChange={setNewPhone}
              placeholder="08012345678"
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">Used for virtual store voucher security and change alerts.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="e.g. babangida@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Regular shop customer, preferred items..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddCustomerOpen(false)}
              disabled={isSavingCustomer}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingCustomer || !newName.trim() || !newPhone.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs"
            >
              {isSavingCustomer ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Create & Issue Card'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Top-Up Voucher Modal */}
      {selectedCustomerForTopUp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomerForTopUp(null)}
          title={`Top Up Voucher — ${selectedCustomerForTopUp.name}`}
          subtitle={`Current Balance: ₦${(selectedCustomerForTopUp.card ? Number(selectedCustomerForTopUp.card.balance) : 0).toLocaleString()}`}
        >
          <form onSubmit={handleTopUpSubmit} className="space-y-3.5 py-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount to Deposit (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="50"
                step="any"
                placeholder="e.g. 2000"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                required
                autoFocus
              />
              <div className="flex gap-1.5 mt-2">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopUpAmount(String(preset))}
                    className="text-[11px] py-1 px-2.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                  >
                    +₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Deposit Note / Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cash received at register, change advance"
                value={topUpNotes}
                onChange={(e) => setTopUpNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
              Top-up deposits are customer liabilities. They increase the customer's available voucher balance and only count as earned taxable revenue when redeemed on a sale.
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCustomerForTopUp(null)}
                disabled={isSubmittingTopUp}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingTopUp || !Number(topUpAmount)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {isSubmittingTopUp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Crediting...
                  </>
                ) : (
                  'Credit Voucher Balance'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Balance Modal (Owner / Manager only) */}
      {selectedCustomerForAdjust && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomerForAdjust(null)}
          title={`Adjust Balance — ${selectedCustomerForAdjust.name}`}
          subtitle="Owner & Manager balance override"
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-3.5 py-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Adjustment Amount (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="Positive to add, negative to subtract (e.g. 500 or -500)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                required
                autoFocus
              />
              <p className="text-[10px] text-gray-400 mt-1">Use a negative sign (-) to deduct balance.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Correcting cashier entry error on receipt #1042"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCustomerForAdjust(null)}
                disabled={isSubmittingAdjust}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingAdjust || !Number(adjustAmount) || !adjustReason.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
              >
                {isSubmittingAdjust ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  'Apply Adjustment'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Voucher PIN Modal (Owner / Manager only) */}
      {selectedCustomerForPinChange && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomerForPinChange(null)}
          title={`Change Voucher PIN — ${selectedCustomerForPinChange.name}`}
          subtitle="Update customer's 6-digit voucher PIN"
        >
          <form onSubmit={handleChangePinSubmit} className="space-y-3.5 py-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Old 6-Digit PIN <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••••"
                value={pinOldPin}
                onChange={(e) => setPinOldPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-center text-lg font-mono tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New 6-Digit PIN <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••••"
                value={pinNewPin}
                onChange={(e) => setPinNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-center text-lg font-mono tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Last 4 Digits of Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="●●●●"
                value={pinLast4}
                onChange={(e) => setPinLast4(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-center text-lg font-mono tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Verification: {selectedCustomerForPinChange.phone || 'Phone on file'}
              </p>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCustomerForPinChange(null)}
                disabled={isSubmittingPinChange}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSubmittingPinChange ||
                  pinOldPin.length !== 6 ||
                  pinNewPin.length !== 6 ||
                  pinLast4.length !== 4
                }
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
              >
                {isSubmittingPinChange ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Changing...
                  </>
                ) : (
                  'Change PIN'
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Single Customer History / Statement Modal */}
      {selectedCustomerForHistory && (
        <Modal
          isOpen={isHistoryOpen}
          onClose={() => {
            setIsHistoryOpen(false);
            setSelectedCustomerForHistory(null);
          }}
          title={`Voucher Statement — ${selectedCustomerForHistory.name}`}
          subtitle={`Virtual Card: ${selectedCustomerForHistory.card?.cardCode || 'VC-000000'} • Phone: ${selectedCustomerForHistory.phone || '—'}`}
        >
          <div className="space-y-4 py-1">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500">Available Voucher Balance</span>
                <div className="text-xl font-bold text-gray-900">
                  {formatNaira(activeCustomerCard?.card.balance ?? (selectedCustomerForHistory.card ? Number(selectedCustomerForHistory.card.balance) : 0))}
                </div>
              </div>
              <div className="text-right font-mono text-xs text-gray-500">
                Card Code: <span className="font-bold text-gray-800">{selectedCustomerForHistory.card?.cardCode}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Card Transaction History
              </h3>
              {cardLoading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading ledger...</div>
              ) : !activeCustomerCard?.card.ledgers || activeCustomerCard.card.ledgers.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No card activity recorded yet for this customer.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {activeCustomerCard.card.ledgers.map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 bg-white border border-gray-100 rounded hover:bg-gray-50 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 capitalize flex items-center gap-1.5">
                          <span>{l.type.replace('_', ' ')}</span>
                          {l.receiptNumber && (
                            <span className="text-[10px] text-gray-400 font-mono">#{l.receiptNumber}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{formatDateTime(l.createdAt)}</div>
                        {l.notes && <div className="text-[11px] text-gray-600 mt-0.5">{l.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${l.type === 'sale_debit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {l.type === 'sale_debit' ? '-' : '+'} {formatNaira(Number(l.amount))}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          Bal: {formatNaira(Number(l.balanceAfter))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedCustomerForHistory(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
