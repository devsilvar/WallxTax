import {
  Shield,
  CreditCard,
  Clock,
  TrendingUp,
  Receipt,
  Wallet,
  BarChart3,
  Zap,
  FileText,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ─── Testimonials ─── */
export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  color: string;
  verified?: boolean;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Adebayo Ogunlesi',
    role: 'CEO, Greenfield Ventures',
    quote:
      'WallXERP completely transformed how we handle taxes. What used to take our accountant days now takes minutes.',
    avatar: 'AO',
    color: 'from-violet-500 to-purple-600',
    verified: true,
  },
  {
    name: 'Chioma Nwosu',
    role: 'Founder, CraftHub Lagos',
    quote:
      'Finally, a tax platform that actually understands Nigerian businesses. The reminders have saved us from NRS penalties.',
    avatar: 'CN',
    color: 'from-purple-500 to-indigo-600',
    verified: true,
  },
  {
    name: 'Ibrahim Musa',
    role: 'MD, Sahel Logistics',
    quote:
      'Crystal-clear picture of our tax obligations. The PDF statements look incredibly professional.',
    avatar: 'IM',
    color: 'from-fuchsia-500 to-purple-600',
    verified: true,
  },
];

/* ─── FAQs ─── */
export interface FAQItem {
  q: string;
  a: string;
  category?: 'general' | 'pricing' | 'tax' | 'security';
}

export const faqs: FAQItem[] = [
  {
    q: 'Is wallXTax really free to use?',
    a: 'Yes! wallXTax provides a completely free tier for small businesses. No monthly subscription fee or hidden charges to get started. You can track unlimited manual sales and expenses, calculate taxes, and export reports for free.',
    category: 'pricing',
  },
  {
    q: 'How does the AI Virtual CFO help my business?',
    a: 'Think of it as having a financial expert in your pocket 24/7. Our AI analyzes your sales, expenses, and cash flow to give you smart recommendations like "Stock up on inventory now" or "You can save ₦50K on taxes this month." It learns your business patterns and alerts you to opportunities you might miss.',
    category: 'general',
  },
  {
    q: 'Can I track my business from my phone?',
    a: "Absolutely! Record sales, log expenses, check your cash position, and even send invoices — all from your mobile device. Whether you're at the market, in a meeting, or on the go, your business data is always at your fingertips.",
    category: 'general',
  },
  {
    q: 'What happens to my debtors? Can the app help me get paid?',
    a: "Yes! Our Debtors Management feature tracks who owes you, sends automated payment reminders, and shows you which customers pay on time. You'll never forget who owes what, and your customers get professional reminders without awkward phone calls.",
    category: 'general',
  },
  {
    q: 'How is my tax calculated? Is it really NRS-compliant?',
    a: '100% NRS-compliant. Nigeria has more than one tax obligation: VAT is a flat 7.5%, and company income tax is charged on your chargeable profit at the rate your turnover attracts. WallXERP computes what is due from your actual sales and allowable expenses — every figure is auditable, and locked periods stay immutable after filing. No guesswork, no penalties.',
    category: 'tax',
  },
  {
    q: 'Can I open a business bank account through the app?',
    a: 'Yes! We partner with licensed Nigerian banking infrastructure to provision a Dedicated Virtual Account (DVA) directly from the platform. It integrates seamlessly with your sales and expense tracking, making bank reconciliation effortless.',
    category: 'general',
  },
  {
    q: 'Is my financial data secure?',
    a: "Absolutely. We use bank-grade AES-256 encryption and TLS 1.3 security. Your data is encrypted both in transit and at rest. We never sell your data to third parties, and all payment processing is protected by Paystack's PCI-DSS Level 1 certified infrastructure.",
    category: 'security',
  },
  {
    q: 'What if I already use accounting software?',
    a: "wallXTax complements your existing tools. You can import your data via Excel/CSV, or use us as your primary system — we're designed to be simple enough for non-accountants while powerful enough to replace complex software. Many businesses switch completely because we're easier and smarter.",
    category: 'general',
  },
  {
    q: 'Can I manage multiple businesses from one account?',
    a: 'Yes! Switch between businesses with one click. Starter plans support up to 2 businesses, Business supports 5, and Scale offers unlimited businesses. Each business gets its own independent ledger, dashboard, and tax filings.',
    category: 'pricing',
  },
  {
    q: 'Do I need accounting knowledge to use this?',
    a: 'Not at all! We built wallXTax for business owners, not accountants. If you can send a WhatsApp message, you can use our app. The interface is intuitive, and the AI CFO explains everything in plain English — no jargon, no confusion.',
    category: 'general',
  },
  {
    q: 'How fast can I start using it?',
    a: "Under 5 minutes. Sign up, add your business details, and you're live. Import past transactions if you have them, or start fresh. You'll be tracking your first sale before your coffee gets cold.",
    category: 'general',
  },
  {
    q: 'What if I miss a tax deadline?',
    a: "You won't — that's the point! Our Smart Notifications send you reminders days before any NRS deadline. You'll get alerts via email and in-app notifications. We've helped thousands avoid penalties by keeping them ahead of deadlines.",
    category: 'tax',
  },
  {
    q: 'Can I generate invoices for my customers?',
    a: 'Yes! Create professional, branded e-invoices in seconds. Add your logo, payment terms, and bank details. Customers receive them instantly via email or WhatsApp, and you track payment status in real-time — no more chasing paper receipts.',
    category: 'general',
  },
  {
    q: 'How does the Cash at Hand feature work?',
    a: 'It gives you a live, accurate picture of your cash position at any moment. Every sale, expense, and bank transaction updates your balance instantly. No more surprises. You always know exactly how much cash you have available to reinvest or pay bills.',
    category: 'general',
  },
  {
    q: 'What kind of support do I get?',
    a: 'You get real human support via email, WhatsApp, and in-app chat. Plus, our AI CFO answers common questions instantly. Most issues are resolved within hours. We also provide comprehensive documentation and workflow guides.',
    category: 'general',
  },
];

export const pricingFaqs = faqs.filter(
  (f) => f.category === 'pricing' || f.q.includes('free') || f.q.includes('multiple businesses') || f.q.includes('support'),
);

/* ─── Trust Indicators ─── */
export const trustIndicators = [
  { icon: Shield, text: 'Bank-Grade AES-256 Encryption' },
  { icon: CreditCard, text: 'Paystack PCI-DSS Certified' },
  { icon: Clock, text: 'Active NRS Compliance' },
];

/* ─── Pricing Plans (from subtext.md) ─── */
export interface PricingPlan {
  id: 'free' | 'starter' | 'business' | 'scale';
  name: string;
  tagline: string;
  monthlyPrice: number; // in NGN
  annualPrice: number; // in NGN/year
  popular?: boolean;
  trialBadge?: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Essential compliance foundation for solopreneurs & new vendors.',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Up to 3 team members',
      '1 business profile',
      '5 invoices / month (with WallX badge)',
      'Unlimited manual sales & expenses',
      'Dedicated Virtual Account (DVA)',
      'FIRS/NRS tax calculation & filing',
      '5 AI CFO trial queries / month',
      'Tax deadline email reminders',
    ],
    ctaText: 'Start Free',
    ctaLink: '/register',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Ideal for growing retail stores and small service businesses.',
    monthlyPrice: 5000,
    annualPrice: 50000, // ₦50k/yr (save ~₦10k)
    features: [
      'Up to 5 team members',
      'Up to 2 businesses',
      'Unlimited invoices (your own branding)',
      'Excel & CSV bulk sales import',
      '30 AI CFO queries / month',
      'Tax + overdue invoice reminders',
      'All 11 PDF document generators',
      'Full data export anytime',
    ],
    ctaText: 'Choose Starter',
    ctaLink: '/register?plan=starter',
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Full power for established SMEs, multi-location stores, & agencies.',
    monthlyPrice: 15000,
    annualPrice: 150000, // ₦150k/yr (save ~₦30k)
    popular: true,
    trialBadge: '14-Day Free Trial',
    features: [
      'Up to 10 team members',
      'Up to 5 businesses',
      'Unlimited invoices & receipts',
      'Customer Credit (BNPL & Debtors flow)',
      'Marketplace product listings (up to 3 featured items)',
      '200 AI CFO queries / month',
      'All 19 automated reminder triggers',
      'Granular team permission overrides',
    ],
    ctaText: 'Start 14-Day Trial',
    ctaLink: '/register?plan=business',
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'High volume, multi-branch operations and enterprise compliance.',
    monthlyPrice: 35000,
    annualPrice: 350000, // ₦350k/yr (save ~₦70k)
    features: [
      'Unlimited team members',
      'Unlimited businesses',
      'Bulk invoice dispatch',
      'Custom debt collection workflows',
      'Marketplace listings with priority placement',
      'Unlimited AI CFO queries',
      'Priority reminder scheduling',
      'White-label PDF document suite',
      'Dedicated account manager & SLA',
    ],
    ctaText: 'Get Scale',
    ctaLink: '/register?plan=scale',
  },
];

/* ─── Plan Comparison Matrix ─── */
export interface MatrixRow {
  category: string;
  rows: {
    feature: string;
    free: string;
    starter: string;
    business: string;
    scale: string;
    tooltip?: string;
  }[];
}

export const planComparisonMatrix: MatrixRow[] = [
  {
    category: 'Capacity & Structure',
    rows: [
      {
        feature: 'Team Member Seats',
        free: '3 seats',
        starter: '5 seats',
        business: '10 seats',
        scale: 'Unlimited',
      },
      {
        feature: 'Businesses Managed',
        free: '1',
        starter: '2',
        business: '5',
        scale: 'Unlimited',
      },
      {
        feature: 'Invoices / Month',
        free: '5 (WallX badge)',
        starter: 'Unlimited (Own branding)',
        business: 'Unlimited',
        scale: 'Unlimited + Bulk dispatch',
      },
      {
        feature: 'Sales Entry & Ledger',
        free: 'Unlimited manual',
        starter: 'Manual + Excel/CSV import',
        business: 'Manual + Excel/CSV import',
        scale: 'Manual + Excel/CSV import',
      },
    ],
  },
  {
    category: 'Intelligence & Automation',
    rows: [
      {
        feature: 'AI Virtual CFO',
        free: '5 queries/mo',
        starter: '30 queries/mo',
        business: '200 queries/mo',
        scale: 'Unlimited + custom prompts',
      },
      {
        feature: 'Automated Reminders',
        free: 'Tax deadline only',
        starter: 'Tax + Overdue invoices',
        business: 'All 19 reminder types',
        scale: 'All + Priority dispatch',
      },
      {
        feature: 'PDF Statements & Receipts',
        free: 'Tax statement + Receipt',
        starter: 'All 11 generators',
        business: 'All 11 generators',
        scale: 'All + White-label suite',
      },
    ],
  },
  {
    category: 'Money & Growth',
    rows: [
      {
        feature: 'Customer Credits & BNPL',
        free: '—',
        starter: '—',
        business: 'Included',
        scale: 'Included + Debt notes',
      },
      {
        feature: 'Marketplace Listings',
        free: '—',
        starter: '—',
        business: 'Included (up to 3 products)',
        scale: 'Included + Priority placement',
      },
    ],
  },
  {
    category: 'Core Compliance (Always Free)',
    rows: [
      {
        feature: 'NRS Tax Calculation (VAT + Income Tax)',
        free: '✓ Included',
        starter: '✓ Included',
        business: '✓ Included',
        scale: '✓ Included',
      },
      {
        feature: 'Dedicated Virtual Account (DVA)',
        free: '✓ Included',
        starter: '✓ Included',
        business: '✓ Included',
        scale: '✓ Included',
      },
      {
        feature: 'Historical Data Retention',
        free: '✓ Never deleted',
        starter: '✓ Never deleted',
        business: '✓ Never deleted',
        scale: '✓ Never deleted',
      },
    ],
  },
];

/* ─── Core Product Features ─── */
export interface FeatureItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  tag?: string;
}

export const featuresList: FeatureItem[] = [
  {
    id: 'sales',
    icon: TrendingUp,
    iconColor: 'from-emerald-500 to-teal-500',
    title: 'Real-Time Sales Tracking',
    description:
      'Log daily sales, point-of-sale entries, and bank transfers with instant revenue analytics and customer trend tracking.',
    tag: 'Core Ledger',
  },
  {
    id: 'expenses',
    icon: Receipt,
    iconColor: 'from-rose-500 to-pink-500',
    title: 'Categorized Expense Management',
    description:
      'Capture allowable operating costs, bills, and bad debt write-offs to shield your profit from over-taxation.',
    tag: 'Deductions',
  },
  {
    id: 'cash-at-hand',
    icon: Wallet,
    iconColor: 'from-amber-500 to-orange-500',
    title: 'Cash at Hand Register',
    description:
      'Keep your actual physical drawer balance synchronized with digital transfers and settled invoices without discrepancy.',
  },
  {
    id: 'debtors',
    icon: Clock,
    iconColor: 'from-blue-500 to-cyan-500',
    title: 'Debtors & Credit Sales (BNPL)',
    description:
      'Issue goods on credit with accrual-basis accounting, track aging receivables, and schedule automatic debtor reminders.',
    tag: 'Accrual Accounting',
  },
  {
    id: 'performance',
    icon: BarChart3,
    iconColor: 'from-violet-500 to-purple-500',
    title: 'Executive Financial KPIs',
    description:
      'Get immediate clarity on gross profit margins, revenue growth, top-selling items, and seasonal expenditure spikes.',
  },
  {
    id: 'ai-cfo',
    icon: Zap,
    iconColor: 'from-indigo-500 to-purple-600',
    title: 'Virtual CFO Assistant',
    description:
      'Ask financial questions in plain Nigerian business terms. Forecast tax liabilities, review inventory trends, and spot cost leaks.',
    tag: 'AI Powered',
  },
  {
    id: 'invoicing',
    icon: FileText,
    iconColor: 'from-sky-500 to-blue-500',
    title: 'Professional E-Invoices',
    description:
      'Generate FIRS-compliant VAT invoices with your logo, download A4 PDFs, and send directly via email or WhatsApp.',
  },
  {
    id: 'bank-account',
    icon: CreditCard,
    iconColor: 'from-primary-500 to-indigo-500',
    title: 'Dedicated Virtual Account (DVA)',
    description:
      'Get a dedicated Nigerian bank account number for your business that automatically captures inbound transfers into sales.',
    tag: 'Auto-Capture',
  },
  {
    id: 'notifications',
    icon: Bell,
    iconColor: 'from-fuchsia-500 to-pink-500',
    title: 'Smart Filing Reminders',
    description:
      'Receive timely alerts ahead of the 21st monthly NRS filing deadline so you never incur punitive interest or late charges.',
  },
  {
    id: 'tax-calc',
    icon: ShieldCheck,
    iconColor: 'from-emerald-500 to-green-500',
    title: 'Official NRS Tax Engine',
    description:
      'Automated VAT and income-tax calculations derived from your real sales and expenses, strictly following Nigerian tax rules, with full audit logs.',
    tag: 'NRS 2026',
  },
];

/* ─── 3-Step Process ─── */
export interface StepItem {
  stepNum: number;
  title: string;
  description: string;
  image: string;
  webpSm: string;
  webpMd: string;
}

export const howItWorksSteps: StepItem[] = [
  {
    stepNum: 1,
    title: 'Create Your Account',
    description:
      'Set up your business profile in under 2 minutes. Enter your business details and configure your default profit margins.',
    image: '/images/step-1-account.jpg',
    webpSm: '/images-optimized/step-1-account-sm.webp',
    webpMd: '/images-optimized/step-1-account-md.webp',
  },
  {
    stepNum: 2,
    title: 'Record Transactions',
    description:
      'Track sales and allowable expenses. Collect counter payments via your Dedicated Virtual Account or import bulk files.',
    image: '/images/step-2-transactions.jpg',
    webpSm: '/images-optimized/step-2-transactions-sm.webp',
    webpMd: '/images-optimized/step-2-transactions-md.webp',
  },
  {
    stepNum: 3,
    title: 'File & Pay Tax',
    description:
      'Review your auto-computed tax report, finalize with one click, and remit payment securely via Paystack with an instant receipt.',
    image: '/images/step-3-file-tax.jpg',
    webpSm: '/images-optimized/step-3-file-tax-sm.webp',
    webpMd: '/images-optimized/step-3-file-tax-md.webp',
  },
];

/* ─── Support Channels ─── */
export interface SupportChannel {
  id: 'email' | 'whatsapp' | 'inapp';
  title: string;
  description: string;
  contact: string;
  href: string;
  actionText: string;
  telHref?: string;
}

export const supportChannels: SupportChannel[] = [
  {
    id: 'email',
    title: 'Email Support',
    description: 'Direct response from our accounting and technical team within 2 hours during business hours.',
    contact: 'support@paymytax.com',
    href: 'mailto:support@paymytax.com',
    actionText: 'Email Us',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Business',
    description: 'Chat directly with support representatives for rapid assistance, onboarding, and quick questions.',
    contact: '+234 814 749 0832',
    telHref: 'tel:2348147490832',
    href: 'https://wa.me/2348147490832?text=Hello%20WallXERP%20Support,%20I%20have%20an%20inquiry%20regarding%20my%20account.',
    actionText: 'Chat on WhatsApp',
  },
  {
    id: 'inapp',
    title: 'In-App Support Desk',
    description: 'Active subscribers can open ticket threads directly from the dashboard with transaction context.',
    contact: 'Available in dashboard',
    href: '/login',
    actionText: 'Open Dashboard',
  },
];
