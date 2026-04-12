import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  BarChart3,
  CreditCard,
  CheckCircle2,
  HelpCircle,
  Rocket,
  Clock,
  FileText,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Star,
  Receipt,
  Bell,
  Play,
  Users,
  BadgeCheck,
  Sparkles,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import HandDrawnArrow from '@/components/HandDrawnArrow.tsx';

/* ─── Mobile Navigation ─── */
function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navLinks = [
    'Features',
    'How It Works',
    'Pricing',
    'Testimonials',
    'FAQ',
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[300px] max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className='flex flex-col h-full'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
            <img src='/logo.png' alt='PayMyTax' className='h-8' />
            <button
              onClick={onClose}
              className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              aria-label='Close menu'
            >
              <X className='h-5 w-5 text-gray-500' />
            </button>
          </div>
          <nav className='flex-1 px-4 py-6 space-y-1'>
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={onClose}
                className='block px-4 py-3 text-[15px] font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 rounded-xl transition-colors'
              >
                {item}
              </a>
            ))}
          </nav>
          <div className='p-4 border-t border-gray-100 space-y-3'>
            <Link to='/login' onClick={onClose} className='block'>
              <Button variant='ghost' className='w-full justify-center'>
                Sign in
              </Button>
            </Link>
            <Link to='/register' className='block'>
              <Button className='w-full justify-center'>
                Get Started <ArrowRight className='h-4 w-4' />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Data ─── */

const steps = [
  {
    icon: Users,
    title: 'Create Your Account',
    description:
      'Sign up in under 60 seconds. Add your business details and connect your account.',
  },
  {
    icon: Receipt,
    title: 'Record Transactions',
    description:
      'Log sales and expenses as they happen. Import from bank transfers or enter manually.',
  },
  {
    icon: BadgeCheck,
    title: 'File & Pay Tax',
    description:
      'Review your auto-computed report, finalize, and pay FIRS directly. Done.',
  },
];

const stats = [
  { value: 'Q2 2026', label: 'Launch Ready', icon: Zap },
  { value: '< 2 min', label: 'Quick Setup', icon: Clock },
  { value: '100%', label: 'FIRS Compliant', icon: Shield },
  { value: '7.5%', label: 'VAT Rate', icon: TrendingUp },
];

const testimonials = [
  {
    name: 'Adebayo Ogunlesi',
    role: 'CEO, Greenfield Ventures',
    quote:
      'PayMyTax completely transformed how we handle taxes. What used to take our accountant days now takes minutes.',
    avatar: 'AO',
    color: 'from-violet-500 to-purple-600',
  },
  {
    name: 'Chioma Nwosu',
    role: 'Founder, CraftHub Lagos',
    quote:
      'Finally, a tax platform that actually understands Nigerian businesses. The reminders have saved us from FIRS penalties.',
    avatar: 'CN',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    name: 'Ibrahim Musa',
    role: 'MD, Sahel Logistics',
    quote:
      'Crystal-clear picture of our tax obligations. The PDF statements look incredibly professional.',
    avatar: 'IM',
    color: 'from-fuchsia-500 to-purple-600',
  },
];

const faqs = [
  {
    q: 'Is PayMyTax free to use?',
    a: 'Yes! PayMyTax is free for small businesses. We only charge a small processing fee when you pay taxes through the platform.',
  },
  {
    q: 'How is my tax calculated?',
    a: 'We follow the FIRS formula: Tax Payable = 7.5% x Gross Profit, where Gross Profit = Total Sales - Total Expenses.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Absolutely. All data is encrypted in transit and at rest. We use bank-grade security with Paystack for all payments.',
  },
  {
    q: 'Can I manage multiple businesses?',
    a: 'Yes. You can add multiple businesses to your account and switch between them seamlessly from the dashboard.',
  },
];

/* ─── FAQ Accordion ─── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id='faq'
      className='py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-50/80 to-white'
    >
      <div className='mx-auto max-w-3xl px-4 sm:px-6'>
        <div className='text-center mb-10 sm:mb-14'>
          <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
            <HelpCircle className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500' />
            <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
              FAQ
            </span>
          </span>
          <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight'>
            Common{' '}
            <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent animate-gradient'>
              questions
            </span>
          </h2>
          <p className='mt-4 sm:mt-5 font-body text-base sm:text-lg text-gray-500'>
            Everything you need to know about PayMyTax and tax compliance in
            Nigeria.
          </p>
        </div>

        <div className='divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm'>
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.q}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className='flex w-full items-center justify-between px-4 sm:px-6 py-4 sm:py-5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100'
                  aria-expanded={isOpen}
                >
                  <span className='text-sm sm:text-base font-semibold text-gray-900 pr-3'>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className='overflow-hidden'>
                    <p className='px-4 sm:px-6 pb-4 sm:pb-5 font-body text-sm sm:text-base leading-relaxed text-gray-500'>
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Component ─── */
export default function Landing() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className='min-h-screen bg-white overflow-x-hidden'>
      {/* ── Navigation ── */}
      <header className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3'>
          <Link to='/' className='flex items-center gap-2 sm:gap-3'>
            <img
              src='/logo.png'
              alt='PayMyTax'
              className='h-7 sm:h-8 lg:h-10 w-auto'
            />
          </Link>
          <nav className='hidden lg:flex items-center gap-8'>
            {['Features', 'How It Works', 'Pricing', 'Testimonials', 'FAQ'].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className='relative font-sans text-[15px] font-medium text-gray-600 hover:text-primary-600 transition-colors duration-200 py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary-500 after:transition-all after:duration-300 hover:after:w-full'
                >
                  {item}
                </a>
              ),
            )}
          </nav>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link to='/login' className='hidden sm:block'>
              <Button variant='ghost' size='sm'>
                Sign in
              </Button>
            </Link>
            <Link to='/register' className='hidden sm:block'>
              <Button size='sm'>
                Get Started <ArrowRight className='h-4 w-4' />
              </Button>
            </Link>
            <button
              onClick={() => setMobileNavOpen(true)}
              className='lg:hidden flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors'
              aria-label='Open navigation menu'
            >
              <Menu className='h-5 w-5 text-gray-600' />
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* ── Hero ── */}
      <section className='relative pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 lg:pb-16'>
        <div className='absolute inset-0 bg-gradient-to-b from-primary-50/80 via-white to-white' />
        <div
          className='absolute inset-0 opacity-[0.03]'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237c3aed' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary-400/15 via-transparent to-transparent blur-3xl animate-blob-morph' />
        <div
          className='absolute top-40 -right-40 w-[500px] h-[500px] bg-purple-300/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '3s' }}
        />
        <div
          className='absolute top-60 -left-40 w-[400px] h-[400px] bg-indigo-300/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '1.5s' }}
        />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          <div className='text-center'>
            {/* Premium Trust Badge - with real user avatars */}
            <div className='inline-flex items-center gap-2 sm:gap-3 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-6 py-2 sm:py-2.5 mb-6 sm:mb-10 shadow-lg shadow-primary-500/5 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300'>
              <div className='flex -space-x-2'>
                {[
                  'https://i.pravatar.cc/150?img=12',
                  'https://i.pravatar.cc/150?img=33',
                  'https://i.pravatar.cc/150?img=8',
                  'https://i.pravatar.cc/150?img=47',
                  'https://i.pravatar.cc/150?img=68',
                ].map((avatar, i) => (
                  <img
                    key={i}
                    src={avatar}
                    alt={`User ${i + 1}`}
                    className='h-6 sm:h-7 w-6 sm:w-7 rounded-full border-2 border-white hover:scale-110 hover:z-10 transition-transform duration-300 object-cover'
                    style={{ transitionDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
              <span className='font-body text-xs sm:text-sm font-semibold bg-gradient-to-r from-primary-700 to-purple-600 bg-clip-text text-transparent'>
                Trusted by 2,500+ Nigerian businesses
              </span>
            </div>

            {/* Headline with animated gradient */}
            <h1 className='relative text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]'>
              Stop stressing about
              <span className='hidden xs:block' />
              <span className='relative inline-block mt-2 sm:mt-0'>
                <span className='bg-gradient-to-r from-primary-700 via-primary-500 to-purple-500 bg-clip-text text-transparent animate-gradient ml-5'>
                  business taxes
                </span>
                {/* Hand-drawn style underline */}
                <svg
                  className='absolute -bottom-2 left-0 w-full'
                  viewBox='0 0 300 16'
                  fill='none'
                  aria-hidden='true'
                >
                  {/* Slightly imperfect, hand-drawn feel */}
                  <path
                    d='M3 10 C58 4, 115 5, 148 8 C165 9, 185 11, 220 9 C245 8, 270 6, 297 7'
                    stroke='url(#underlineGradHero)'
                    strokeWidth='3.5'
                    strokeLinecap='round'
                    opacity='0.9'
                  />
                  <path
                    d='M5 11.5 C60 5.5, 118 6, 150 9 C167 10, 188 12.5, 223 10.5 C248 9.5, 272 7.5, 295 8.5'
                    stroke='url(#underlineGradHero)'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                    opacity='0.6'
                  />
                  <path
                    d='M3 10 C58 4, 115 5, 148 8 C165 9, 185 11, 220 9 C245 8, 270 6, 297 7'
                    stroke='url(#underlineGlowHero)'
                    strokeWidth='7'
                    strokeLinecap='round'
                    strokeOpacity='0.15'
                  />
                  <defs>
                    <linearGradient
                      id='underlineGradHero'
                      x1='0'
                      y1='0'
                      x2='300'
                      y2='0'
                      gradientUnits='userSpaceOnUse'
                    >
                      <stop stopColor='#7c3aed' />
                      <stop offset='0.5' stopColor='#8b5cf6' />
                      <stop offset='1' stopColor='#a855f7' />
                    </linearGradient>
                    <linearGradient
                      id='underlineGlowHero'
                      x1='0'
                      y1='0'
                      x2='300'
                      y2='0'
                      gradientUnits='userSpaceOnUse'
                    >
                      <stop stopColor='#7c3aed' />
                      <stop offset='1' stopColor='#a855f7' />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className='mx-auto mt-4 sm:mt-5 max-w-xl sm:max-w-2xl font-body text-base sm:text-lg leading-relaxed text-gray-500 px-2'>
              Track sales, auto-compute FIRS-compliant taxes, and pay online in
              minutes. Built exclusively for Nigerian businesses who want
              clarity, not complexity.
            </p>

            {/* CTA Buttons with premium styling */}
            <div className='mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0'>
              <Link to='/register' className='w-full sm:w-auto group'>
                <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-2xl shadow-primary-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/50 hover:from-primary-700 hover:via-primary-600 hover:to-purple-700 active:scale-[0.98] overflow-hidden'>
                  <span className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700' />
                  <span className='relative flex items-center gap-2'>
                    Start for free
                    <ArrowRight className='h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1' />
                  </span>
                </button>
              </Link>
              <Link to='/login' className='w-full sm:w-auto'>
                <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white/80 backdrop-blur px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-gray-700 shadow-lg transition-all duration-300 hover:border-primary-200 hover:bg-white hover:shadow-xl hover:text-primary-700 active:scale-[0.98] overflow-hidden'>
                  <Play className='h-4 w-4 fill-current' />
                  See how it works
                </button>
              </Link>
            </div>

            {/* Premium Trust indicators */}
            <div className='mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-3 px-4'>
              {[
                { icon: Shield, text: 'Bank-grade security', delay: '0ms' },
                {
                  icon: CreditCard,
                  text: 'No credit card required',
                  delay: '100ms',
                },
                { icon: Clock, text: 'Setup in 2 minutes', delay: '200ms' },
              ].map(({ icon: Icon, text, delay }) => (
                <div
                  key={text}
                  className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50/80 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 hover:-translate-y-0.5 hover:rotate-1 transition-all duration-300 cursor-default'
                  style={{ transitionDelay: delay }}
                >
                  <Icon className='h-4 w-4 text-primary-500' />
                  <span className='font-body text-xs sm:text-sm text-gray-600 font-medium'>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Dashboard Preview */}
            <div className='mt-10 sm:mt-14 lg:mt-16 relative mx-auto max-w-5xl px-2 sm:px-0'>
              {/* Ambient glow */}
              <div className='absolute -inset-8 rounded-3xl bg-gradient-to-r from-primary-500/30 via-purple-500/20 to-pink-500/30 blur-3xl' />
              {/* Floating decorative elements - organic blob shapes */}
              <div
                className='absolute -top-4 -left-4 sm:-left-8 w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-br from-primary-400/20 to-purple-400/20 blur-xl animate-blob-morph animate-bounce-gentle'
                style={{ animationDelay: '0s' }}
              />
              <div
                className='absolute -bottom-4 -right-4 sm:-right-8 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-xl animate-blob-morph'
                style={{ animationDelay: '2s' }}
              />
              <div
                className='absolute top-1/2 -right-6 w-12 h-12 bg-gradient-to-br from-fuchsia-400/15 to-purple-400/15 blur-lg animate-sway'
                style={{ animationDelay: '1s' }}
              />

              {/* Browser mockup */}
              <div className='relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-2xl shadow-primary-900/10 mx-2 sm:mx-0'>
                <div className='flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 sm:px-4 py-2 sm:py-3'>
                  <div className='flex gap-1.5'>
                    <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-red-400' />
                    <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-amber-400' />
                    <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-green-400' />
                  </div>
                  <div className='mx-auto hidden sm:flex h-5 sm:h-6 items-center rounded-md bg-gray-100 px-2 sm:px-3'>
                    <span className='font-body text-[9px] sm:text-[10px] text-gray-400'>
                      app.paymytax.com/dashboard
                    </span>
                  </div>
                </div>

                <div className='grid grid-cols-12'>
                  {/* Sidebar */}
                  <div className='col-span-3 hidden lg:block border-r border-gray-100 bg-gray-50/50 p-3 sm:p-4'>
                    <div className='flex items-center gap-2 mb-4 sm:mb-6'>
                      <div className='h-7 sm:h-8 w-7 sm:w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center'>
                        <span className='text-white text-[10px] sm:text-xs font-bold'>
                          P
                        </span>
                      </div>
                      <span className='text-[10px] sm:text-xs font-semibold text-gray-800'>
                        PayMyTax
                      </span>
                    </div>
                    {[
                      'Dashboard',
                      'Sales',
                      'Expenses',
                      'Tax Reports',
                      'Payments',
                    ].map((item, i) => (
                      <div
                        key={item}
                        className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-medium ${i === 0 ? 'bg-primary-50 text-primary-700' : 'text-gray-400'}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className='col-span-12 lg:col-span-9 p-3 sm:p-5'>
                    <div className='flex items-center justify-between mb-3 sm:mb-5'>
                      <div>
                        <div className='text-xs sm:text-sm font-semibold text-gray-800'>
                          Good morning, John
                        </div>
                        <div className='font-body text-[9px] sm:text-[11px] text-gray-400'>
                          Here's your tax overview
                        </div>
                      </div>
                      <div className='flex items-center gap-1.5 sm:gap-2'>
                        <div className='h-5 sm:h-7 w-5 sm:w-7 rounded-full bg-primary-100 flex items-center justify-center'>
                          <Bell className='h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary-600' />
                        </div>
                        <div className='h-5 sm:h-7 w-5 sm:w-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold'>
                          J
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className='grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5'>
                      {[
                        {
                          label: 'Total Sales',
                          value: '₦700,000',
                          change: '+12%',
                          color: 'text-green-500',
                        },
                        {
                          label: 'Total Expenses',
                          value: '₦360,000',
                          change: '-3%',
                          color: 'text-red-400',
                        },
                        {
                          label: 'Tax Payable',
                          value: '₦25,500',
                          change: '7.5%',
                          color: 'text-primary-500',
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className='rounded-xl border border-gray-100 bg-white p-2 sm:p-3 shadow-sm'
                        >
                          <div className='font-body text-[8px] sm:text-[10px] text-gray-400'>
                            {s.label}
                          </div>
                          <div className='mt-0.5 text-[11px] sm:text-sm font-bold text-gray-800'>
                            {s.value}
                          </div>
                          <div
                            className={`mt-0.5 font-body text-[8px] sm:text-[10px] font-medium ${s.color}`}
                          >
                            {s.change}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    <div className='rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-2 sm:p-4'>
                      <div className='flex items-center justify-between mb-1.5 sm:mb-3'>
                        <span className='text-[10px] sm:text-xs font-semibold text-gray-700'>
                          Monthly Revenue
                        </span>
                        <span className='font-body text-[8px] sm:text-[10px] text-gray-400 hidden sm:block'>
                          Last 6 months
                        </span>
                      </div>
                      <svg viewBox='0 0 400 80' className='w-full h-12 sm:h-20'>
                        <defs>
                          <linearGradient
                            id='heroChartGrad'
                            x1='0'
                            y1='0'
                            x2='0'
                            y2='1'
                          >
                            <stop
                              offset='0%'
                              stopColor='#7c3aed'
                              stopOpacity='0.3'
                            />
                            <stop
                              offset='100%'
                              stopColor='#7c3aed'
                              stopOpacity='0'
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d='M0,65 C30,60 60,48 100,40 C140,32 170,44 200,28 C230,12 260,20 300,16 C340,12 370,8 400,4 L400,80 L0,80 Z'
                          fill='url(#heroChartGrad)'
                        />
                        <path
                          d='M0,65 C30,60 60,48 100,40 C140,32 170,44 200,28 C230,12 260,20 300,16 C340,12 370,8 400,4'
                          fill='none'
                          stroke='#7c3aed'
                          strokeWidth='2'
                          strokeLinecap='round'
                        />
                        <circle cx='400' cy='4' r='3' fill='#7c3aed' />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof / Trust Section ── */}
      <section className='py-16 sm:py-20 lg:py-24 bg-gray-50'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6'>
          {/* Top Section - Badge & Heading */}
          <div className='text-center mb-12 sm:mb-16'>
            <div className='inline-flex items-center gap-2 bg-white rounded-full border border-gray-200 px-4 py-2 mb-6 shadow-sm'>
              <div className='flex -space-x-2'>
                {[
                  'https://i.pravatar.cc/150?img=12',
                  'https://i.pravatar.cc/150?img=33',
                  'https://i.pravatar.cc/150?img=8',
                  'https://i.pravatar.cc/150?img=47',
                ].map((avatar, i) => (
                  <img
                    key={i}
                    src={avatar}
                    alt={`Business owner ${i + 1}`}
                    className='h-7 w-7 rounded-full border-2 border-white object-cover'
                  />
                ))}
              </div>
              <span className='font-body text-sm font-semibold text-gray-700 pl-1'>
                Trusted by 2,500+ businesses
              </span>
            </div>
            
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-5 max-w-3xl mx-auto leading-tight'>
              Making tax compliance{' '}
              <span className='text-primary-600'>effortless</span> for Nigerian SMEs
            </h2>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10'>
            <div className='text-center'>
              <div className='text-4xl sm:text-5xl font-bold text-gray-900 mb-2'>
                2,500+
              </div>
              <div className='text-sm sm:text-base text-gray-600'>
                Active businesses
              </div>
            </div>
            
            <div className='text-center'>
              <div className='text-4xl sm:text-5xl font-bold text-gray-900 mb-2'>
                ₦45M+
              </div>
              <div className='text-sm sm:text-base text-gray-600'>
                Tax processed
              </div>
            </div>
            
            <div className='text-center'>
              <div className='text-4xl sm:text-5xl font-bold text-gray-900 mb-2'>
                99.8%
              </div>
              <div className='text-sm sm:text-base text-gray-600'>
                Accuracy rate
              </div>
            </div>
            
            <div className='text-center'>
              <div className='text-4xl sm:text-5xl font-bold text-gray-900 mb-2'>
                &lt;2min
              </div>
              <div className='text-sm sm:text-base text-gray-600'>
                Average setup time
              </div>
            </div>
          </div>

          {/* Bottom Trust Bar */}
          <div className='mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-gray-200'>
            <div className='flex flex-wrap items-center justify-center gap-x-12 gap-y-6'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center'>
                  <CheckCircle2 className='w-5 h-5 text-green-600' />
                </div>
                <div>
                  <div className='text-sm font-semibold text-gray-900'>FIRS Compliant</div>
                  <div className='text-xs text-gray-500'>7.5% VAT calculation</div>
                </div>
              </div>
              
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center'>
                  <Shield className='w-5 h-5 text-primary-600' />
                </div>
                <div>
                  <div className='text-sm font-semibold text-gray-900'>Bank-grade Security</div>
                  <div className='text-xs text-gray-500'>256-bit encryption</div>
                </div>
              </div>
              
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center'>
                  <Users className='w-5 h-5 text-purple-600' />
                </div>
                <div>
                  <div className='text-sm font-semibold text-gray-900'>Trusted Platform</div>
                  <div className='text-xs text-gray-500'>Used across Nigeria</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero Image Section ── */}
      <section className='py-12 sm:py-16 lg:py-20 bg-gray-50 relative overflow-hidden'>
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]'></div>
        <div className='absolute top-0 left-1/4 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl'></div>
        <div className='absolute bottom-0 right-1/4 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl'></div>

        <div className='mx-auto max-w-6xl px-4 sm:px-6 relative'>
          <div className='text-center mb-8 sm:mb-10'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Rocket className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Getting Started
              </span>
            </span>
            <h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight max-w-2xl mx-auto'>
              Set up your tax system in{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                3 simple steps
              </span>
            </h2>
          </div>

          <div className='grid sm:grid-cols-3 gap-4 sm:gap-6'>
            <div className='bg-white rounded-xl p-5 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-4'>
                <span className='text-primary-600 font-bold text-xl'>1</span>
              </div>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>
                Create Account
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                Sign up with your email and business details. Takes less than a
                minute.
              </p>
            </div>

            <div className='bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4'>
                <span className='text-purple-600 font-bold text-xl'>2</span>
              </div>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>
                Log Transactions
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                Record your sales and expenses as they happen. Simple forms, no
                hassle.
              </p>
            </div>

            <div className='bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='w-12 h-12 rounded-lg bg-fuchsia-100 flex items-center justify-center mb-4'>
                <span className='text-fuchsia-600 font-bold text-xl'>3</span>
              </div>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>
                File & Pay
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                Review your tax, approve, and pay directly to FIRS. All
                automated.
              </p>
            </div>
          </div>

          <div className='mt-8 sm:mt-10 text-center'>
            <Link to='/register'>
              <button className='inline-flex items-center gap-2.5 rounded-lg bg-primary-600 px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-primary-700 transition-colors duration-200 shadow-lg hover:shadow-xl'>
                Get started for free <ArrowRight className='w-4 h-4' />
              </button>
            </Link>
            <p className='mt-4 text-sm text-gray-500'>
              No credit card required • Free for small businesses
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id='features'
        className='py-12 sm:py-16 lg:py-20 bg-white relative overflow-hidden'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <div className='mx-auto max-w-2xl text-center mb-8 sm:mb-10'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Sparkles className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 fill-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Features
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight'>
              Everything you need to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                stay compliant
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-base sm:text-lg text-gray-500 leading-relaxed'>
              Powerful tools that make tax filing feel simple
            </p>
          </div>

          {/* Bento Grid Layout - Asymmetric */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'>
            {/* Feature 1 - Large spanning card */}
            <div className='md:col-span-2 lg:col-span-2 bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl p-5 sm:p-6 border border-primary-100'>
              <div className='flex items-start gap-4'>
                <div className='flex-shrink-0 w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm'>
                  <BarChart3
                    className='w-6 h-6 text-primary-600'
                    strokeWidth={1.5}
                  />
                </div>
                <div className='flex-1'>
                  <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-2'>
                    Sales & Expense Tracking
                  </h3>
                  <p className='text-sm sm:text-base text-gray-600 leading-relaxed'>
                    Log every naira in and out. Auto-categorize transactions and
                    see profit margins at a glance.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 - Compact card */}
            <div className='bg-white rounded-2xl p-5 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4'>
                <Shield
                  className='w-5 h-5 text-primary-600'
                  strokeWidth={1.5}
                />
              </div>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>
                FIRS-Compliant
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                7.5% VAT calculator follows FIRS rules precisely
              </p>
            </div>

            {/* Feature 3 - Compact card */}
            <div className='bg-white rounded-2xl p-5 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4'>
                <CreditCard
                  className='w-5 h-5 text-purple-600'
                  strokeWidth={1.5}
                />
              </div>
              <h3 className='text-lg font-bold text-gray-900 mb-2'>
                One-Click Payment
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                Pay tax instantly via Paystack — card, transfer, or USSD
              </p>
            </div>

            {/* Feature 4 - Medium card with accent */}
            <div className='md:col-span-2 lg:col-span-1 bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-2xl p-5 border border-fuchsia-100'>
              <div className='w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm'>
                <Bell className='w-6 h-6 text-fuchsia-600' strokeWidth={1.5} />
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                Smart Tax Reminders
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed'>
                Never miss a deadline. Automated notifications keep you
                penalty-free.
              </p>
            </div>

            {/* Feature 5 - Tall card */}
            <div className='lg:row-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4'>
                <FileText
                  className='w-6 h-6 text-indigo-600'
                  strokeWidth={1.5}
                />
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-3'>
                PDF Tax Statements
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed mb-6'>
                Download professionally formatted tax statements. Monthly
                reports or custom date ranges on demand.
              </p>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-xs text-gray-500'>
                  <div className='w-1.5 h-1.5 rounded-full bg-primary-500'></div>
                  <span>Monthly summaries</span>
                </div>
                <div className='flex items-center gap-2 text-xs text-gray-500'>
                  <div className='w-1.5 h-1.5 rounded-full bg-primary-500'></div>
                  <span>Custom date ranges</span>
                </div>
                <div className='flex items-center gap-2 text-xs text-gray-500'>
                  <div className='w-1.5 h-1.5 rounded-full bg-primary-500'></div>
                  <span>Print-ready formats</span>
                </div>
              </div>
            </div>

            {/* Feature 6 - Wide card */}
            <div className='md:col-span-2 lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all duration-300'>
              <div className='flex items-start gap-5'>
                <div className='flex-shrink-0 w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center'>
                  <TrendingUp
                    className='w-6 h-6 text-violet-600'
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3 className='text-xl font-bold text-gray-900 mb-2'>
                    Real-Time Dashboard
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed max-w-xl'>
                    Bird's-eye view of revenue, expenses, tax liability, and
                    payment history. Make data-driven decisions with clarity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id='how-it-works'
        className='py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-gray-50/50 to-white relative overflow-hidden'
      >
        <div
          className='absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-primary-400/10 to-purple-400/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '1s' }}
        />
        <div
          className='absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-bl from-purple-400/10 to-fuchsia-400/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '3s' }}
        />

        {/* Hand-drawn arrows between steps - desktop only */}
        <HandDrawnArrow
          className='absolute top-1/2 left-[30%] hidden lg:block animate-bounce-gentle'
          color='#a855f7'
        />
        <HandDrawnArrow
          className='absolute top-1/2 right-[30%] hidden lg:block animate-bounce-gentle'
          color='#a855f7'
        />

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <div className='mx-auto max-w-2xl text-center mb-10 sm:mb-14 lg:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Play className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 fill-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                How It Works
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight'>
              Three steps to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent animate-gradient'>
                tax peace of mind
              </span>
            </h2>
            <p className='mt-4 sm:mt-5 font-body text-base sm:text-lg text-gray-500'>
              No accounting degree required. We've made tax filing ridiculously
              simple.
            </p>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8'>
            {steps.map((step, index) => (
              <div key={step.title} className='relative group'>
                {index < steps.length - 1 && (
                  <div className='hidden lg:flex absolute top-1/2 -right-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-500 shadow-lg'>
                    <ChevronRight className='h-4 w-4' />
                  </div>
                )}
                <div className='flex flex-col items-center rounded-2xl overflow-hidden border border-gray-100 bg-white transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-100'>
                  {/* Step image */}
                  <div className='relative w-full aspect-[4/3] overflow-hidden'>
                    {index === 0 && (
                      <img
                        src='https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&h=450&fit=crop&q=80'
                        alt='Business owner signing up on laptop'
                        className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                      />
                    )}
                    {index === 1 && (
                      <img
                        src='https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=450&fit=crop&q=80'
                        alt='Business owner tracking transactions'
                        className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                      />
                    )}
                    {index === 2 && (
                      <img
                        src='https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=450&fit=crop&q=80'
                        alt='Business owner completing tax filing'
                        className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                      />
                    )}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent' />
                    <span className='absolute top-3 sm:top-4 left-3 sm:left-4 font-body text-xs sm:text-sm font-bold uppercase tracking-widest text-white bg-primary-500/90 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-1.5 rounded-full'>
                      Step {index + 1}
                    </span>
                  </div>

                  {/* Step content */}
                  <div className='p-5 sm:p-6 lg:p-7 text-center w-full'>
                    <step.icon
                      className='h-8 sm:h-10 w-8 sm:w-10 text-primary-500 transition-transform duration-300 group-hover:scale-110 mx-auto'
                      strokeWidth={1.3}
                    />
                    <h3 className='mt-4 sm:mt-5 text-lg sm:text-xl font-bold text-gray-900'>
                      {step.title}
                    </h3>
                    <p className='mt-2 sm:mt-3 max-w-xs font-body text-sm sm:text-[15px] leading-relaxed text-gray-500 mx-auto'>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section
        id='testimonials'
        className='py-12 sm:py-16 lg:py-24 relative overflow-hidden'
      >
        {/* Background image with overlay */}
        <div className='absolute inset-0 z-0'>
          <img
            src='https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&h=900&fit=crop&q=80'
            alt='Team collaboration'
            className='w-full h-full object-cover object-center'
          />
          <div className='absolute inset-0 bg-white/90 backdrop-blur-sm' />
          <div className='absolute inset-0 bg-gradient-to-b from-white via-transparent to-white' />
        </div>

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative z-10'>
          <div className='mx-auto max-w-2xl text-center mb-10 sm:mb-14 lg:mb-16 relative'>
            {/* Decorative elements */}
            <div className='absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-full blur-2xl' />

            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Star className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 fill-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent'>
                Testimonials
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight'>
              Loved by{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent animate-gradient'>
                business owners
              </span>
            </h2>
            <p className='mt-4 sm:mt-5 font-body text-base sm:text-lg text-gray-500'>
              Don't just take our word for it. Here's what real Nigerian
              entrepreneurs are saying.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
            {testimonials.map((t) => (
              <div
                key={t.name}
                className='group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 sm:p-7 lg:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-200/50 hover:-translate-y-1'
              >
                {/* Gradient accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                {/* Quote mark */}
                <div className='absolute top-4 right-6 sm:right-8 text-5xl sm:text-6xl lg:text-7xl font-serif bg-gradient-to-br from-primary-100 to-purple-50 bg-clip-text text-transparent leading-none select-none'>
                  "
                </div>

                {/* Stars */}
                <div className='flex gap-0.5 mb-5 sm:mb-6'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className='h-4 sm:h-4.5 w-4 sm:w-4.5 fill-amber-400 text-amber-400'
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className='font-body text-sm sm:text-[15px] lg:text-base leading-relaxed text-gray-600 relative z-10'>
                  "{t.quote}"
                </p>

                {/* Author */}
                <div className='mt-6 sm:mt-8 flex items-center gap-4 pt-5 border-t border-gray-100'>
                  <div
                    className={`relative flex h-12 sm:h-14 w-12 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white text-base sm:text-lg font-bold shadow-xl shadow-primary-500/20`}
                  >
                    {t.avatar}
                    {/* Online indicator */}
                    <div className='absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white' />
                  </div>
                  <div>
                    <div className='text-base sm:text-lg font-bold text-gray-900'>
                      {t.name}
                    </div>
                    <div className='font-body text-xs sm:text-sm text-gray-500'>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── Get Started CTA ── */}
      <section
        id='get-started'
        className='relative overflow-hidden px-4 sm:px-6 py-16 sm:py-20 lg:py-24'
      >
        {/* Creative Gradient Background */}
        <div className='absolute inset-0 bg-gradient-to-br from-violet-600 via-primary-600 to-indigo-700'></div>
        
        {/* Diagonal Accent Stripes */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent'></div>
          <div className='absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent'></div>
        </div>
        
        {/* Mesh Pattern Overlay */}
        <div className='absolute inset-0 opacity-[0.15] mix-blend-overlay' style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Floating Orbs */}
        <div className='absolute top-20 left-[10%] w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse'></div>
        <div className='absolute bottom-20 right-[15%] w-96 h-96 bg-fuchsia-400/20 rounded-full blur-3xl animate-pulse' style={{ animationDelay: '1s' }}></div>
        
        <div className='relative mx-auto max-w-4xl'>
          <div className='text-center'>
            <div className='inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 sm:px-5 py-2 mb-6 sm:mb-7 shadow-lg'>
              <Zap className='h-4 w-4 text-amber-300 fill-amber-300' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-white/90'>
                Join 2,500+ Businesses
              </span>
            </div>

            <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-4 sm:mb-5'>
              Stop stressing about taxes.
              <br />
              <span className='text-purple-200'>Start growing your business.</span>
            </h2>
            
            <p className='text-base sm:text-lg text-purple-100/90 max-w-2xl mx-auto mb-8 sm:mb-9 leading-relaxed'>
              Join thousands of Nigerian SMEs who've simplified their tax filing. Free to start, easy to use.
            </p>

            <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 sm:mb-10'>
              <Link to='/register' className='w-full sm:w-auto'>
                <button className='w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-8 sm:px-10 py-4 text-base sm:text-lg font-bold text-primary-700 shadow-2xl transition-all duration-300 hover:bg-gray-50 hover:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-100'>
                  Get started — it's free
                  <ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
                </button>
              </Link>
              <Link to='/login' className='w-full sm:w-auto'>
                <button className='w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-white/30 bg-white/5 backdrop-blur-sm px-8 sm:px-10 py-4 text-base sm:text-lg font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/50 active:scale-95'>
                  Sign in
                </button>
              </Link>
            </div>

            <div className='flex flex-wrap items-center justify-center gap-x-8 gap-y-4'>
              {[
                { icon: Shield, text: 'No credit card required' },
                { icon: Shield, text: 'Bank-grade security' },
                { icon: Clock, text: 'Setup in 2 minutes' },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className='flex items-center gap-2 text-white/80'
                >
                  <Icon className='h-5 w-5 text-green-300' />
                  <span className='font-body text-sm sm:text-base'>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='bg-gray-950 text-gray-400'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-10 lg:pb-12'>
          <div className='grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-4'>
            {/* Brand */}
            <div className='md:col-span-2 lg:col-span-1'>
              <Link to='/' className='inline-block'>
                <img
                  src='/logo.png'
                  alt='PayMyTax'
                  className='h-8 sm:h-10 w-auto brightness-0 invert'
                />
              </Link>
              <p className='mt-4 sm:mt-5 max-w-sm font-body text-sm sm:text-base leading-relaxed text-gray-500'>
                The simplest way for Nigerian SMEs to track sales, compute
                taxes, and stay FIRS-compliant.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Product
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                {[
                  'Features',
                  'How It Works',
                  'Pricing',
                  'Testimonials',
                  'FAQ',
                ].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Account */}
            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Account
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                <Link
                  to='/register'
                  className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                >
                  Create Account
                </Link>
                <Link
                  to='/login'
                  className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                >
                  Sign In
                </Link>
                <Link
                  to='/dashboard'
                  className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                >
                  Dashboard
                </Link>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Support
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                <a
                  href='#faq'
                  className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                >
                  Help & FAQ
                </a>
                <a
                  href='#pricing'
                  className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                >
                  Pricing
                </a>
                <a
                  href='mailto:support@paymytax.com'
                  className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>

          <div className='mt-10 sm:mt-14 lg:mt-16 pt-6 sm:pt-8 border-t border-gray-800 flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
            <p className='font-body text-xs sm:text-[15px] text-gray-600 text-center sm:text-left'>
              © {new Date().getFullYear()} PayMyTax by WallX. All rights
              reserved.
            </p>
            <div className='flex items-center gap-1.5 font-body text-xs sm:text-[15px] text-gray-600'>
              <span>Made with</span>
              <span className='text-red-500'>♥</span>
              <span>in Lagos, Nigeria</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
