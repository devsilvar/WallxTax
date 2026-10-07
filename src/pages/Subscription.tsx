import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  ArrowRight,
  Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useDocumentTitle } from '@/components/marketing/useDocumentTitle.ts';

function ZenithBankLogo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-[#E31B23] flex items-center justify-center shadow-2xs shrink-0 ${className}`}
      aria-label='Zenith Bank Plc'
    >
      <svg viewBox='0 0 40 40' className='h-5 w-5' fill='none' aria-hidden='true'>
        <path
          d='M8 10 H32 L14 26 H32 V30 H8 L26 14 H8 Z'
          fill='white'
        />
      </svg>
    </div>
  );
}

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      className={className}
      fill='currentColor'
      aria-hidden='true'
    >
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' />
    </svg>
  );
}

interface PlanOption {
  id: 'free' | 'starter' | 'business' | 'scale';
  name: string;
  priceMonth: number;
  priceAnnual: number;
  tagline: string;
  popular?: boolean;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonth: 0,
    priceAnnual: 0,
    tagline: 'Essential compliance foundation for sole vendors and new businesses.',
    features: [
      'Up to 3 team members',
      '1 business profile',
      '5 invoices / month',
      'Manual sales & expenses tracking',
      'Dedicated Virtual Account (DVA)',
      'FIRS/NRS tax calculation & filing',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonth: 5000,
    priceAnnual: 50000,
    tagline: 'Ideal for growing retail stores and active service businesses.',
    features: [
      'Up to 5 team members',
      'Up to 2 businesses',
      'Unlimited invoices (custom branding)',
      'Excel & CSV bulk sales import',
      '30 AI CFO queries / month',
      'All 11 PDF document generators',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonth: 15000,
    priceAnnual: 150000,
    popular: true,
    tagline: 'Full power for established SMEs, multi-location stores, & agencies.',
    features: [
      'Up to 10 team members',
      'Up to 5 businesses',
      'Unlimited invoices & receipts',
      'Customer Credit (BNPL & Debtors flow)',
      '200 AI CFO queries / month',
      'All 19 automated reminder triggers',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    priceMonth: 35000,
    priceAnnual: 350000,
    tagline: 'High volume multi-branch operations and enterprise compliance.',
    features: [
      'Unlimited team members',
      'Unlimited businesses',
      'Bulk invoice dispatch',
      'Custom debt collection workflows',
      'Unlimited AI CFO queries',
      'White-label PDF document suite',
    ],
  },
];

const BANK_DETAILS = {
  bankName: 'Zenith Bank Plc',
  accountNumber: '1214382269',
  accountName: 'WallX Africa Limited',
  sortCode: '057150013',
};

const WHATSAPP_NUMBER = '2348147490832';
const DISPLAY_PHONE = '+234 814 749 0832';

export default function Subscription() {
  useDocumentTitle(
    'Subscription & Plans | WallXERP',
    'Manage your subscription plan tier, direct Zenith Bank payment transfer, and proof of payment upload.',
  );

  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);

  // Default to query param if provided, otherwise 'business' (most popular upgrade)
  const initialPlanParam = searchParams.get('plan') as PlanOption['id'] | null;
  const validInitial = PLANS.some((p) => p.id === initialPlanParam)
    ? initialPlanParam!
    : 'business';

  const [selectedPlanId, setSelectedPlanId] = useState<PlanOption['id']>(validInitial);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[2];
  const isPaidPlan = selectedPlan.id !== 'free';
  const payableAmount =
    billingCycle === 'annual'
      ? selectedPlan.priceAnnual
      : selectedPlan.priceMonth;

  // Form fields
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessName, setBusinessName] = useState(
    activeBusiness?.businessName || '',
  );
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.fullName && !name) setName(user.fullName);
    if (user?.email && !email) setEmail(user.email);
    if (user?.phone && !phone) setPhone(user.phone);
    if (activeBusiness?.businessName && !businessName) {
      setBusinessName(activeBusiness.businessName);
    }
  }, [user, activeBusiness, name, email, phone, businessName]);

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
      setCopied(true);
      toast.success('Zenith Bank account number copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy account number');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB');
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmitProof = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone or WhatsApp number');
      return;
    }
    if (!file) {
      toast.error('Please select your payment receipt or transfer screenshot');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());
      if (businessName.trim()) {
        formData.append('businessName', businessName.trim());
      }
      formData.append(
        'plan',
        `${selectedPlan.name} (${billingCycle.toUpperCase()})`,
      );
      formData.append('amount', payableAmount.toLocaleString());
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      formData.append('file', file);

      const res = await fetch('/api/v1/subscription/proof', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Submission failed');
      }

      setSubmitted(true);
      toast.success('Proof of payment received! Sent to subscription@wallx.co');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit proof. You can also chat on WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20WallXERP%20Billing,%20I%20have%20transferred%20₦${payableAmount.toLocaleString()}%20for%20the%20${encodeURIComponent(
    selectedPlan.name,
  )}%20(${billingCycle})%20plan%20to%20Zenith%20Bank%201214382269.%20Email:%20${encodeURIComponent(
    email || name || 'Subscriber',
  )}`;

  return (
    <div
      className={`space-y-6 ${
        !isAuthenticated ? 'mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10' : ''
      }`}
    >
      {/* ── 1. Page Header (Crisp & Minimalist matching Invoices) ── */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-gray-900'>
              Subscription & Plans
            </h1>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20'>
              <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
              Free Plan Active
            </span>
          </div>
          <p className='mt-0.5 font-body text-xs text-gray-500 sm:text-sm'>
            Review your active plan, explore higher tiers, and activate upgrades via direct corporate bank transfer.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <a
            href={whatsappUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs'
          >
            <WhatsAppIcon className='h-3.5 w-3.5 text-emerald-600' />
            <span>Chat Desk: {DISPLAY_PHONE}</span>
          </a>
        </div>
      </div>

      {/* ── 2. Current Plan Status Strip (Clean Card like Invoices/Account) ── */}
      <div className='rounded-xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-2xs'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='flex items-start sm:items-center gap-3.5'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-200/80 text-gray-700 shrink-0'>
              <Crown className='h-5 w-5 text-gray-700' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='text-[11px] font-semibold uppercase tracking-wider text-gray-500'>
                  Your Current Plan
                </span>
                <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
                  Active
                </span>
              </div>
              <p className='text-sm font-bold text-gray-900 mt-0.5'>
                Free Plan <span className='text-xs font-normal text-gray-500'>• ₦0/month (Compliance Foundation)</span>
              </p>
              <p className='text-xs text-gray-500 mt-0.5'>
                Includes 1 business profile, up to 3 team members, 5 monthly invoices, and NRS compliance tax filing.
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3 self-start sm:self-center border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end'>
            <div className='text-left sm:text-right'>
              <span className='text-[10px] font-medium text-gray-400 block uppercase tracking-wider'>Selected Plan</span>
              <span className='text-xs font-bold text-primary-700 block'>
                {selectedPlan.name} {selectedPlan.id !== 'free' ? `(${billingCycle})` : ''}
              </span>
            </div>
            {selectedPlan.id !== 'free' && (
              <span className='text-sm font-extrabold text-gray-900 tabular-nums'>
                ₦{payableAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Plan Tier Cards (All 4 Plans Grid) ── */}
      <div className='space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-100'>
          <div>
            <h2 className='text-sm font-semibold text-gray-900'>
              1. Choose a Plan Tier
            </h2>
            <p className='text-xs text-gray-500'>
              Select a tier below to view bank transfer instructions and upload your receipt
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className='inline-flex items-center rounded-lg border border-gray-200 bg-gray-50/80 p-0.5 text-xs self-start sm:self-auto'>
            <button
              type='button'
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              type='button'
              onClick={() => setBillingCycle('annual')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Annual</span>
              <span className='rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800'>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Plans Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = plan.id === 'free';
            const price =
              billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonth;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`cursor-pointer rounded-xl p-4 sm:p-5 border transition-all duration-150 relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary-600 bg-purple-50/20 ring-1 ring-primary-600 shadow-2xs'
                    : isCurrent
                      ? 'border-gray-300 bg-gray-50/40 hover:border-gray-400'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className='absolute -top-2.5 right-3'>
                    <span className='px-2 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs'>
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  {/* Header Row */}
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='text-base font-bold text-gray-900'>
                      {plan.name}
                    </h3>
                    {isCurrent ? (
                      <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20'>
                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
                        Current Plan
                      </span>
                    ) : (
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className='h-2.5 w-2.5 stroke-[3]' />}
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className='flex items-baseline gap-1 my-2'>
                    <span className='text-2xl font-extrabold text-gray-900 tabular-nums'>
                      {plan.id === 'free' ? '₦0' : `₦${price.toLocaleString()}`}
                    </span>
                    <span className='text-xs text-gray-500 font-medium'>
                      {plan.id === 'free'
                        ? 'free forever'
                        : `/${billingCycle === 'annual' ? 'yr' : 'mo'}`}
                    </span>
                  </div>

                  <p className='text-xs text-gray-500 mb-4 min-h-[32px]'>
                    {plan.tagline}
                  </p>

                  {/* Feature Checklist */}
                  <ul className='space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600'>
                    {plan.features.map((feat) => (
                      <li key={feat} className='flex items-start gap-2'>
                        <Check className='h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5' />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA */}
                <div className='mt-5 pt-3 border-t border-gray-100'>
                  {isCurrent ? (
                    <button
                      type='button'
                      disabled
                      className='w-full py-2 px-3 rounded-lg bg-gray-100 text-gray-500 font-semibold text-xs cursor-default'
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-2xs'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      {isSelected ? 'Selected' : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Payment Transfer & Upload Desk ── */}
      {isPaidPlan ? (
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {/* Zenith Bank Account Details Card */}
          <div className='lg:col-span-5 rounded-xl border border-gray-200/90 bg-white p-5 shadow-2xs space-y-4'>
            <div>
              <div className='flex items-center justify-between pb-3 border-b border-gray-100'>
                <div className='flex items-center gap-2.5'>
                  <ZenithBankLogo className='h-8 w-8' />
                  <div>
                    <h3 className='text-sm font-bold text-gray-900 leading-tight'>
                      {BANK_DETAILS.bankName}
                    </h3>
                    <p className='text-[11px] text-gray-500'>
                      Official Collection Account
                    </p>
                  </div>
                </div>

                <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20'>
                  Verified
                </span>
              </div>
            </div>

            {/* Account Number Box */}
            <div className='rounded-lg border border-red-200/70 bg-red-50/20 p-3.5'>
              <div className='text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5'>
                Account Number
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='font-mono text-2xl font-bold tracking-wider text-gray-900 tabular-nums select-all'>
                  {BANK_DETAILS.accountNumber}
                </span>
                <button
                  type='button'
                  onClick={copyAccountNumber}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-gray-50 text-red-700 border border-red-200 shadow-2xs'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className='h-3 w-3' /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className='h-3 w-3' /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Details Table */}
            <div className='rounded-lg border border-gray-100 divide-y divide-gray-100 text-xs'>
              <div className='flex items-center justify-between p-2.5 bg-gray-50/50'>
                <span className='text-gray-500'>Account Name</span>
                <span className='font-semibold text-gray-900'>
                  {BANK_DETAILS.accountName}
                </span>
              </div>
              <div className='flex items-center justify-between p-2.5'>
                <span className='text-gray-500'>Plan Selected</span>
                <span className='font-semibold text-gray-900'>
                  {selectedPlan.name} ({billingCycle})
                </span>
              </div>
              <div className='flex items-center justify-between p-2.5 bg-gray-50/50'>
                <span className='text-gray-500'>Amount to Transfer</span>
                <span className='font-extrabold text-primary-700 text-sm tabular-nums'>
                  ₦{payableAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <p className='text-[11px] text-gray-500 leading-relaxed'>
              💡 <strong>Transfer Tip:</strong> Include your business name or email
              in the transfer narration for fast automated matching.
            </p>

            {/* Direct WhatsApp Quick Chat */}
            <div className='pt-2 border-t border-gray-100'>
              <a
                href={whatsappUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors'
              >
                <WhatsAppIcon className='h-4 w-4 text-emerald-600' />
                <span>Need Instant Help? Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Proof of Payment Upload Card */}
          <div className='lg:col-span-7 rounded-xl border border-gray-200/90 bg-white p-5 shadow-2xs'>
            <div className='pb-3 border-b border-gray-100 mb-4'>
              <h2 className='text-sm font-semibold text-gray-900'>
                2. Upload Proof of Payment
              </h2>
              <p className='text-xs text-gray-500 mt-0.5'>
                After transferring ₦{payableAmount.toLocaleString()} to Zenith Bank Plc, upload your receipt below.
                It is automatically sent to{' '}
                <span className='font-medium text-gray-700'>subscription@wallx.co</span>.
              </p>
            </div>

            {submitted ? (
              <div className='p-6 rounded-lg bg-emerald-50/60 border border-emerald-200 text-center space-y-3'>
                <div className='h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto'>
                  <CheckCircle2 className='h-6 w-6' />
                </div>
                <h3 className='text-base font-bold text-gray-900'>
                  Proof of Payment Submitted!
                </h3>
                <p className='text-xs text-gray-600 max-w-md mx-auto'>
                  Your payment receipt for the{' '}
                  <strong>{selectedPlan.name}</strong> plan (₦{payableAmount.toLocaleString()}) has been received and dispatched to our subscription activation team.
                </p>
                <div className='pt-2 flex flex-wrap items-center justify-center gap-2'>
                  <a
                    href={whatsappUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors'
                  >
                    <WhatsAppIcon className='h-3.5 w-3.5' />
                    <span>Notify Support on WhatsApp</span>
                  </a>
                  <button
                    type='button'
                    onClick={() => {
                      setSubmitted(false);
                      setFile(null);
                    }}
                    className='inline-flex items-center px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold'
                  >
                    Upload Another Receipt
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1'>
                      Full Name *
                    </label>
                    <input
                      type='text'
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder='e.g. Adebayo Adeleke'
                      className='w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1'>
                      Email Address *
                    </label>
                    <input
                      type='email'
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='e.g. adebayo@example.com'
                      className='w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1'>
                      Phone / WhatsApp *
                    </label>
                    <input
                      type='tel'
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder='e.g. 08147490832'
                      className='w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-gray-700 mb-1'>
                      Business Name
                    </label>
                    <input
                      type='text'
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder='e.g. Balogun Ventures'
                      className='w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
                    />
                  </div>
                </div>

                {/* Selected Plan Summary Banner */}
                <div className='p-3 rounded-lg bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs'>
                  <div>
                    <span className='text-gray-500'>Target Plan:</span>{' '}
                    <span className='font-bold text-gray-900'>
                      {selectedPlan.name} ({billingCycle})
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500'>Amount Paid:</span>{' '}
                    <span className='font-extrabold text-primary-700 tabular-nums'>
                      ₦{payableAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* File Upload Dropzone */}
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>
                    Upload Payment Receipt / Transfer Screenshot *
                  </label>
                  <div className='relative rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors p-5 text-center bg-gray-50/50 hover:bg-white cursor-pointer'>
                    <input
                      type='file'
                      required
                      accept='image/jpeg,image/png,image/webp,application/pdf'
                      onChange={handleFileChange}
                      className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                    />
                    {file ? (
                      <div className='flex items-center justify-center gap-2.5 text-emerald-700'>
                        <FileText className='h-6 w-6 text-emerald-600 shrink-0' />
                        <div className='text-left min-w-0'>
                          <p className='text-xs font-bold text-gray-900 truncate max-w-xs'>
                            {file.name}
                          </p>
                          <p className='text-[10px] text-gray-500'>
                            {(file.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud className='mx-auto h-7 w-7 text-gray-400 mb-1.5' />
                        <p className='text-xs font-semibold text-gray-700'>
                          Click or drag transfer receipt here
                        </p>
                        <p className='text-[10px] text-gray-500 mt-0.5'>
                          PNG, JPG, WebP or PDF (up to 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className='block text-xs font-semibold text-gray-700 mb-1'>
                    Transaction Reference or Notes (Optional)
                  </label>
                  <input
                    type='text'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='e.g. Session ID 000015, paid from Zenith Mobile App'
                    className='w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
                  />
                </div>

                {/* Submit Button */}
                <div className='pt-1'>
                  <button
                    type='submit'
                    disabled={submitting}
                    className='w-full py-2.5 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-bold text-xs sm:text-sm shadow-2xs hover:shadow transition-all flex items-center justify-center gap-1.5'
                  >
                    {submitting ? (
                      <>
                        <span className='animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent' />
                        <span>Dispatching Proof to subscription@wallx.co...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Proof of Payment</span>
                        <ArrowRight className='h-3.5 w-3.5' />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Free Plan Selected View */
        <div className='rounded-xl border border-gray-200/90 bg-white p-6 shadow-2xs text-center space-y-3'>
          <div className='h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-1 ring-emerald-200/80'>
            <Check className='h-5 w-5 stroke-[2.5]' />
          </div>
          <h3 className='text-sm font-bold text-gray-900'>
            You are Currently on the Free Plan
          </h3>
          <p className='text-xs text-gray-500 max-w-md mx-auto'>
            The Free plan includes 1 business, up to 3 team members, and 5 invoices per month at no cost.
            If you need more team seats, unlimited invoices, bulk sales import, or AI CFO queries, select{' '}
            <strong className='text-gray-800'>Starter</strong>,{' '}
            <strong className='text-gray-800'>Business</strong>, or{' '}
            <strong className='text-gray-800'>Scale</strong> above.
          </p>
          <div className='pt-2'>
            <button
              type='button'
              onClick={() => setSelectedPlanId('business')}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-2xs transition-colors'
            >
              <span>Explore Business Plan (₦15,000/mo)</span>
              <ArrowRight className='h-3.5 w-3.5' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
