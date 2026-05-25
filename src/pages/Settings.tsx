import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
  ChevronRight,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  Check,
  Briefcase,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';

// Must match CreateBusinessModal — backend stores the enum value (`sole_proprietorship` / `llc`).
const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship (Individual)' },
  { value: 'llc', label: 'Registered Business (LLC)' },
];

const businessTypeLabel = (value?: string | null) =>
  BUSINESS_TYPES.find((t) => t.value === value)?.label ?? value ?? '—';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

type TabId = 'profile' | 'business' | 'security';

const TABS: Array<{ id: TabId; label: string; description: string; icon: typeof User }> = [
  { id: 'profile', label: 'Profile', description: 'Your account details', icon: User },
  { id: 'business', label: 'Business', description: 'Company & tax setup', icon: Building2 },
  { id: 'security', label: 'Security', description: 'Password & sessions', icon: Lock },
];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const biz = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);

  const [activeTab, setActiveTab] = useState<TabId>('profile');

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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Snapshot of last loaded biz — drives the "unsaved changes" detection.
  const initial = useMemo(
    () =>
      biz
        ? {
            bizName: biz.businessName,
            ownerName: biz.ownerName,
            bizType: biz.businessType ?? '',
            taxId: biz.taxId ?? '',
            address: biz.address ?? '',
            city: biz.city ?? '',
            state: biz.state ?? '',
            profitMargin: Number(biz.defaultProfitMargin ?? 20),
            taxReminderDay: Number(biz.taxReminderDay ?? 25),
          }
        : null,
    [biz]
  );

  useEffect(() => {
    if (initial) {
      setBizName(initial.bizName);
      setOwnerName(initial.ownerName);
      setBizType(initial.bizType);
      setTaxId(initial.taxId);
      setAddress(initial.address);
      setCity(initial.city);
      setState(initial.state);
      setProfitMargin(initial.profitMargin);
      setTaxReminderDay(initial.taxReminderDay);
    }
  }, [initial]);

  const isDirty =
    !!initial &&
    (bizName !== initial.bizName ||
      ownerName !== initial.ownerName ||
      bizType !== initial.bizType ||
      taxId !== initial.taxId ||
      address !== initial.address ||
      city !== initial.city ||
      state !== initial.state ||
      profitMargin !== initial.profitMargin ||
      taxReminderDay !== initial.taxReminderDay);

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
        defaultProfitMargin: Number(profitMargin),
        taxReminderDay: Number(taxReminderDay),
      });
      toast.success('Business settings updated');
      fetchBusinesses();
    } catch (err: any) {
      const apiErr = err.response?.data?.error;
      const fieldMsg = Array.isArray(apiErr?.details) && apiErr.details[0]
        ? `${apiErr.details[0].field}: ${apiErr.details[0].message}`
        : null;
      toast.error(fieldMsg || apiErr?.message || 'Update failed');
    } finally {
      setSavingBiz(false);
    }
  };

  const handleResetBusiness = () => {
    if (!initial) return;
    setBizName(initial.bizName);
    setOwnerName(initial.ownerName);
    setBizType(initial.bizType);
    setTaxId(initial.taxId);
    setAddress(initial.address);
    setCity(initial.city);
    setState(initial.state);
    setProfitMargin(initial.profitMargin);
    setTaxReminderDay(initial.taxReminderDay);
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.error('Password must contain uppercase, lowercase, and a number');
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your account, business profile, and security preferences.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Vertical tabs (desktop) */}
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="space-y-1 sticky top-2">
            {TABS.map(({ id, label, description, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveTab(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-primary-50 ring-1 ring-inset ring-primary-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-semibold ${
                          isActive ? 'text-primary-700' : 'text-gray-800'
                        }`}
                      >
                        {label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-gray-500">{description}</span>
                    </span>
                    <ChevronRight
                      className={`mt-1 h-3.5 w-3.5 shrink-0 transition-all ${
                        isActive
                          ? 'text-primary-500 opacity-100'
                          : 'text-gray-300 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Horizontal tabs (mobile) */}
        <div className="lg:hidden -mb-2">
          <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content panel */}
        <section className="min-w-0">
          {activeTab === 'profile' && <ProfilePanel user={user} biz={biz} onEditBusiness={() => setActiveTab('business')} />}

          {activeTab === 'business' && biz && (
            <BusinessPanel
              bizName={bizName}
              setBizName={setBizName}
              ownerName={ownerName}
              setOwnerName={setOwnerName}
              bizType={bizType}
              setBizType={setBizType}
              taxId={taxId}
              setTaxId={setTaxId}
              address={address}
              setAddress={setAddress}
              city={city}
              setCity={setCity}
              state={state}
              setState={setState}
              profitMargin={profitMargin}
              setProfitMargin={setProfitMargin}
              taxReminderDay={taxReminderDay}
              setTaxReminderDay={setTaxReminderDay}
              isDirty={isDirty}
              savingBiz={savingBiz}
              onSubmit={handleBusinessUpdate}
              onReset={handleResetBusiness}
            />
          )}

          {activeTab === 'business' && !biz && (
            <Card>
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Building2 className="h-6 w-6 text-gray-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-700">No business selected</p>
                <p className="mt-1 text-[13px] text-gray-500">
                  Create or select a business from the sidebar to edit its details.
                </p>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <SecurityPanel
              user={user}
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showCurrent={showCurrent}
              setShowCurrent={setShowCurrent}
              showNew={showNew}
              setShowNew={setShowNew}
              savingPw={savingPw}
              onSubmit={handlePasswordChange}
            />
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Profile panel ─────────────────────────────────────────

function ProfilePanel({
  user,
  biz,
  onEditBusiness,
}: {
  user: any;
  biz: any;
  onEditBusiness: () => void;
}) {
  const initial = user?.email?.charAt(0).toUpperCase() || 'U';
  const displayName = user?.email?.split('@')[0] ?? 'Account';

  return (
    <div className="space-y-5">
      {/* Identity hero */}
      <Card>
        <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-bold text-white shadow-lg shadow-primary-500/20">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-900">{displayName}</h2>
            <p className="truncate text-sm text-gray-500">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={user?.isActive ? 'emerald' : 'red'}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge tone="slate" capitalize>
                {user?.role ?? 'user'}
              </Badge>
              {user?.isVerified && (
                <Badge tone="emerald">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Account info grid */}
      <Card title="Account information" subtitle="How we identify and contact you.">
        <dl className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <DetailRow icon={Mail} label="Email address" value={user?.email || '—'} />
          <DetailRow icon={Shield} label="Role" value={user?.role || 'user'} capitalize />
        </dl>
      </Card>

      {/* Business summary */}
      {biz && (
        <Card
          title="Active business"
          subtitle="The business you are currently working in."
          action={
            <button
              onClick={onEditBusiness}
              className="text-[13px] font-semibold text-primary-600 hover:text-primary-700"
            >
              Edit details →
            </button>
          }
        >
          <dl className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <DetailRow icon={Building2} label="Business name" value={biz.businessName} />
            <DetailRow icon={User} label="Owner" value={biz.ownerName} />
            <DetailRow icon={Briefcase} label="Type" value={businessTypeLabel(biz.businessType)} />
            {biz.taxId && <DetailRow icon={FileText} label="Tax ID / TIN" value={biz.taxId} />}
            {biz.city && <DetailRow icon={MapPin} label="City" value={biz.city} />}
            {biz.state && <DetailRow icon={MapPin} label="State" value={biz.state} />}
          </dl>

          {biz.virtualAccountNumber && (
            <div className="mx-6 mb-6 mt-2 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-blue-600">
                  Virtual account
                </p>
                <CopyRow text={biz.virtualAccountNumber} />
                {biz.virtualAccountBank && (
                  <p className="mt-0.5 text-[12px] text-blue-700/80">{biz.virtualAccountBank}</p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Business panel ────────────────────────────────────────

interface BusinessPanelProps {
  bizName: string;
  setBizName: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  bizType: string;
  setBizType: (v: string) => void;
  taxId: string;
  setTaxId: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  profitMargin: number;
  setProfitMargin: (v: number) => void;
  taxReminderDay: number;
  setTaxReminderDay: (v: number) => void;
  isDirty: boolean;
  savingBiz: boolean;
  onSubmit: (e: FormEvent) => void;
  onReset: () => void;
}

function BusinessPanel(props: BusinessPanelProps) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-5">
      {/* Basic information */}
      <Card title="Basic information" subtitle="Identifying details for this business.">
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2">
          <Input
            label="Business name"
            value={props.bizName}
            onChange={(e) => props.setBizName(e.target.value)}
            required
          />
          <Input
            label="Owner name"
            value={props.ownerName}
            onChange={(e) => props.setOwnerName(e.target.value)}
            required
          />
          <FieldShell label="Business type" required>
            <Select value={props.bizType} onChange={(v) => props.setBizType(v)} required>
              <option value="">Select a type</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FieldShell>
          <Input
            label="Tax ID / TIN"
            value={props.taxId}
            onChange={(e) => props.setTaxId(e.target.value)}
            placeholder="Optional"
            maxLength={50}
          />
        </div>
      </Card>

      {/* Location */}
      <Card title="Location" subtitle="Where this business operates.">
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Input
              label="Address"
              value={props.address}
              onChange={(e) => props.setAddress(e.target.value)}
              placeholder="Street address (optional)"
            />
          </div>
          <Input
            label="City"
            value={props.city}
            onChange={(e) => props.setCity(e.target.value)}
            placeholder="e.g. Lagos"
          />
          <FieldShell label="State">
            <Select value={props.state} onChange={(v) => props.setState(v)}>
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FieldShell>
        </div>
      </Card>

      {/* Tax configuration */}
      <Card
        title="Tax configuration"
        subtitle="How PayMyTax checks your numbers and reminds you to file."
      >
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2">
          <FieldShell
            label="Expected profit margin"
            iconLeft={<Percent className="h-3.5 w-3.5 text-gray-400" />}
            hint="Used to detect anomalies in your monthly numbers."
          >
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={props.profitMargin}
                onChange={(e) => props.setProfitMargin(Number(e.target.value))}
                className={fieldInputClass + ' pr-9'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-gray-400">
                %
              </span>
            </div>
          </FieldShell>
          <FieldShell
            label="Tax reminder day"
            iconLeft={<Calendar className="h-3.5 w-3.5 text-gray-400" />}
            hint="Day of month to receive tax filing reminders (1–28)."
          >
            <input
              type="number"
              min={1}
              max={28}
              value={props.taxReminderDay}
              onChange={(e) => props.setTaxReminderDay(Number(e.target.value))}
              className={fieldInputClass}
            />
          </FieldShell>
        </div>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0">
        <div
          className={`mx-4 flex items-center justify-between gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur transition-all sm:mx-0 ${
            props.isDirty ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 text-[13px]">
            {props.isDirty ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-amber-700">You have unsaved changes</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-gray-500">All changes saved</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onReset}
              disabled={!props.isDirty || props.savingBiz}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Discard
            </button>
            <Button type="submit" size="sm" isLoading={props.savingBiz} disabled={!props.isDirty}>
              <Save className="h-3.5 w-3.5" />
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Security panel ────────────────────────────────────────

function SecurityPanel({
  user,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showCurrent,
  setShowCurrent,
  showNew,
  setShowNew,
  savingPw,
  onSubmit,
}: {
  user: any;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showCurrent: boolean;
  setShowCurrent: (v: boolean) => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  savingPw: boolean;
  onSubmit: (e: FormEvent) => void;
}) {
  const checks = [
    { label: 'At least 8 characters', pass: newPassword.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(newPassword) },
    { label: 'One number', pass: /\d/.test(newPassword) },
    {
      label: 'Passwords match',
      pass: newPassword.length > 0 && newPassword === confirmPassword,
    },
  ];

  return (
    <div className="space-y-5">
      <Card
        title="Change password"
        subtitle="Choose a strong password you don't use anywhere else."
      >
        <form onSubmit={onSubmit} className="grid gap-5 px-6 pb-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3.5">
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent(!showCurrent)}
              placeholder="Enter your current password"
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew(!showNew)}
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm new password"
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter the new password"
            />
            <div className="pt-1">
              <Button type="submit" size="sm" isLoading={savingPw}>
                <KeyRound className="h-3.5 w-3.5" /> Update password
              </Button>
            </div>
          </div>

          {/* Live requirements */}
          <aside className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Password requirements
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[13px]">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      c.pass ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {c.pass ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span className={c.pass ? 'text-gray-700' : 'text-gray-500'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </aside>
        </form>
      </Card>

      <Card title="Session" subtitle="Where this account is currently signed in.">
        <dl className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <DetailRow icon={Mail} label="Signed in as" value={user?.email || '—'} />
          <DetailRow
            icon={Shield}
            label="Account status"
            value={user?.isActive ? 'Active' : 'Inactive'}
          />
        </dl>
      </Card>

      {/* Danger / advisory */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-[13px] text-amber-800">
          For your security, changing your password signs you out of all other devices.
        </p>
      </div>
    </div>
  );
}

// ─── Reusable bits ─────────────────────────────────────────

const fieldInputClass =
  'block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500';

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200/70 bg-white shadow-sm shadow-gray-200/50">
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="pt-5">{children}</div>
    </section>
  );
}

function FieldShell({
  label,
  required,
  iconLeft,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  iconLeft?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {iconLeft}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Select({
  value,
  onChange,
  required,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={fieldInputClass + ' appearance-none pr-10'}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className={fieldInputClass + ' pr-10'}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </dt>
        <dd
          className={`mt-0.5 truncate text-[13.5px] font-medium text-gray-800 ${
            capitalize ? 'capitalize' : ''
          }`}
          title={value}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function Badge({
  tone,
  capitalize,
  children,
}: {
  tone: 'emerald' | 'red' | 'slate';
  capitalize?: boolean;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]} ${capitalize ? 'capitalize' : ''}`}
    >
      {children}
    </span>
  );
}

function CopyRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <div className="mt-0.5 flex items-center gap-2">
      <span className="font-mono text-[13.5px] font-semibold tabular-nums text-blue-900">
        {text}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-100"
        aria-label="Copy account number"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
