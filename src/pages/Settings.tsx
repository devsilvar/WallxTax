import { useEffect, useState, type FormEvent } from 'react';
import {
  User,
  Building2,
  Lock,
  Save,
  Mail,
  Shield,
  CheckCircle2,
  Calendar,
  Percent,
  MapPin,
  FileText,
  ChevronDown,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';

const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'LLC',
  'Corporation',
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const biz = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);

  // Active tab
  const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'security'>('profile');

  // Business form
  const [bizName, setBizName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [bizType, setBizType] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [profitMargin, setProfitMargin] = useState(20);
  const [taxReminderDay, setTaxReminderDay] = useState(25);
  const [savingBiz, setSavingBiz] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (biz) {
      setBizName(biz.businessName);
      setOwnerName(biz.ownerName);
      setBizType(biz.businessType);
      setTaxId(biz.taxId || '');
      setAddress(biz.address || '');
      setCity(biz.city || '');
      setState(biz.state || '');
      setProfitMargin(biz.defaultProfitMargin ?? 20);
      setTaxReminderDay(biz.taxReminderDay ?? 25);
    }
  }, [biz]);

  const handleBusinessUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!biz) return;
    setSavingBiz(true);
    try {
      await api.put(`/businesses/${biz.id}`, {
        businessName: bizName,
        ownerName,
        businessType: bizType,
        taxId: taxId || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        defaultProfitMargin: profitMargin,
        taxReminderDay,
      });
      toast.success('Business settings updated');
      fetchBusinesses();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Update failed');
    } finally {
      setSavingBiz(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchMe();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Password change failed');
    } finally {
      setSavingPw(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'business' as const, label: 'Business', icon: Building2 },
    { id: 'security' as const, label: 'Security', icon: Lock },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[13px] text-gray-400">Manage your account, business details, and security.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100/80 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-all duration-150 ${
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {/* User Info Card */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="px-5 pt-5 pb-4">
              <h2 className="text-[14px] font-semibold text-gray-900">Account Information</h2>
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-lg font-bold shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">{user?.email?.split('@')[0]}</p>
                  <p className="text-[13px] text-gray-400">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoItem icon={Mail} label="Email" value={user?.email || '—'} />
                <InfoItem icon={Shield} label="Role" value={user?.role || '—'} capitalize />
                <InfoItem
                  icon={CheckCircle2}
                  label="Status"
                  value={user?.isActive ? 'Active' : 'Inactive'}
                  badge={user?.isActive ? 'emerald' : 'red'}
                />
              </div>

              {user?.isVerified && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-[12px] text-emerald-700 font-medium">Email verified</p>
                </div>
              )}
            </div>
          </div>

          {/* Business Summary (read-only) */}
          {biz && (
            <div className="rounded-md border border-gray-200 bg-white shadow-sm">
              <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-gray-900">Active Business</h2>
                <button
                  onClick={() => setActiveTab('business')}
                  className="text-[12px] font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Edit details
                </button>
              </div>
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InfoItem icon={Building2} label="Business Name" value={biz.businessName} />
                  <InfoItem icon={User} label="Owner" value={biz.ownerName} />
                  <InfoItem icon={FileText} label="Type" value={biz.businessType || '—'} />
                  {biz.taxId && <InfoItem icon={FileText} label="Tax ID / TIN" value={biz.taxId} />}
                  {biz.city && <InfoItem icon={MapPin} label="City" value={biz.city} />}
                  {biz.state && <InfoItem icon={MapPin} label="State" value={biz.state} />}
                </div>
                {biz.virtualAccountNumber && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                    <span className="text-[12px] text-blue-700">
                      Virtual Account: <strong className="tabular-nums">{biz.virtualAccountNumber}</strong>
                      {biz.virtualAccountBank && ` · ${biz.virtualAccountBank}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Business Tab */}
      {activeTab === 'business' && biz && (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-[14px] font-semibold text-gray-900">Business Details</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Update your business information and tax configuration.</p>
          </div>
          <div className="px-5 pb-5">
            <form onSubmit={handleBusinessUpdate} className="space-y-5">
              {/* Basic Info */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Information</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Business Name" value={bizName} onChange={(e) => setBizName(e.target.value)} required />
                  <Input label="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                    <div className="relative">
                      <select
                        value={bizType}
                        onChange={(e) => setBizType(e.target.value)}
                        required
                        className="block w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                      >
                        <option value="">Select type</option>
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <Input
                    label="Tax ID / TIN"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Optional"
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Location</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
                  </div>
                  <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lagos" />
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <div className="relative">
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="block w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                      >
                        <option value="">Select state</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Configuration */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Tax Configuration</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-gray-400" />
                        Expected Profit Margin
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">%</span>
                    </div>
                    <p className="text-[11px] text-gray-400">Used to detect anomalies in your financial records.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        Tax Reminder Day
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={taxReminderDay}
                        onChange={(e) => setTaxReminderDay(Number(e.target.value))}
                        className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[15px] text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">Day of the month to receive tax filing reminders (1-28).</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" isLoading={savingBiz}>
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'business' && !biz && (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-400">No business selected. Create or select a business first.</p>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="px-5 pt-5 pb-4">
              <h2 className="text-[14px] font-semibold text-gray-900">Change Password</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Must be at least 8 characters with uppercase, lowercase, and a number.</p>
            </div>
            <div className="px-5 pb-5">
              <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Min. 8 characters"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                />
                <div className="pt-2">
                  <Button type="submit" size="sm" isLoading={savingPw}>
                    <Lock className="h-3.5 w-3.5" /> Update Password
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Session Info */}
          <div className="rounded-md border border-gray-200 bg-white shadow-sm">
            <div className="px-5 pt-5 pb-4">
              <h2 className="text-[14px] font-semibold text-gray-900">Session</h2>
            </div>
            <div className="px-5 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={Mail} label="Signed in as" value={user?.email || '—'} />
                <InfoItem
                  icon={Shield}
                  label="Account Status"
                  value={user?.isActive ? 'Active' : 'Inactive'}
                  badge={user?.isActive ? 'emerald' : 'red'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-2">
        <img src="/logo.png" alt="PayMyTax" className="h-4 opacity-20" />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function InfoItem({ icon: Icon, label, value, capitalize, badge }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
  badge?: 'emerald' | 'red';
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        {badge ? (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset mt-0.5 ${
            badge === 'emerald'
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
              : 'bg-red-50 text-red-600 ring-red-200'
          }`}>
            {value}
          </span>
        ) : (
          <p className={`text-[13px] font-medium text-gray-700 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
        )}
      </div>
    </div>
  );
}
