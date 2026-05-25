import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
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
  BarChart3,
  Zap,
  X,
  DollarSign,
  PieChart,
  Lock,
  Calculator,
  CheckCheck,
  Lightbulb,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';

/* ─── Gradient Icon Component ─── */
function GradientIcon({
  Icon,
  gradient,
  delay = 0,
}: {
  Icon: React.ComponentType<any>;
  gradient: string;
  delay?: number;
}) {
  return (
    <div className='relative'>
      <style>{`
        @keyframes gradient-rotate-${delay} {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-animate-${delay} {
          animation: gradient-rotate-${delay} 6s ease infinite;
          animation-delay: ${delay * 0.3}s;
        }
      `}</style>
      <div
        className={`gradient-animate-${delay} w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} bg-[length:200%_200%] shadow-lg shadow-primary-500/20`}
      >
        <Icon className='h-6 w-6 text-white' strokeWidth={1.5} />
      </div>
    </div>
  );
}

/* ─── Custom Hooks ─── */
function useScrollAnimation<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ─── Scroll Reveal Components ─── */
function ScrollReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function StaggerReveal({
  children,
  className = '',
  staggerDelay = 100,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation();
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={className}>
      {childArray.map((child, i) => (
        <div
          key={i}
          className='transition-all duration-700 ease-out'
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
            transitionDelay: isVisible ? `${i * staggerDelay}ms` : '0ms',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/* ─── Mobile Navigation ─── */
function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navLinks = ['Features', 'How It Works', 'Testimonials', 'FAQ'];

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

const trustIndicators = [
  { icon: Shield, text: 'Bank-grade security' },
  { icon: CreditCard, text: 'No credit card required' },
  { icon: Clock, text: 'Setup in 2 minutes' },
];

/* ─── FAQ Accordion ─── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id='faq'
      className='py-16 sm:py-20 lg:py-28 bg-white relative overflow-hidden'
    >
      <div className='mx-auto max-w-3xl px-4 sm:px-6'>
        <ScrollReveal className='text-center mb-14 sm:mb-16'>
          <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-5 py-2 mb-6 shadow-sm'>
            <HelpCircle className='h-4 sm:h-4 w-4 sm:w-4 text-primary-500' />
            <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
              Got Questions?
            </span>
          </span>
          <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight'>
            Frequently asked{' '}
            <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
              questions
            </span>
          </h2>
          <p className='mt-6 font-body text-base sm:text-lg text-gray-600'>
            Find answers to common questions about WallxTax and tax compliance.
          </p>
        </ScrollReveal>

        <div className='divide-y divide-gray-200 rounded-lg border-2 border-gray-200 bg-white overflow-hidden shadow-sm'>
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
  const { ref: statsRef } = useScrollAnimation();

  return (
    <div className='min-h-screen bg-white overflow-x-hidden'>
      {/* ── Navigation ── */}
      <header className='fixed  top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3'>
          <Link to='/' className='flex items-center gap-2 sm:gap-3'>
            <img
              src='/logo.png'
              alt='PayMyTax'
              className='h-10 sm:h-10 lg:h-12 w-auto'
            />
          </Link>
          <nav className='hidden lg:flex items-center gap-8 my-3'>
            {['Features', 'How It Works', 'Testimonials', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className='relative font-sans text-[16px] font-medium text-gray-600 hover:text-primary-600 transition-colors duration-200 py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary-500 after:transition-all after:duration-300 hover:after:w-full'
              >
                {item}
              </a>
            ))}
          </nav>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link to='/login' className='hidden sm:block text-[16px]'>
              <Button variant='ghost' size='sm' className='text-[16px]'>
                Sign in
              </Button>
            </Link>
            <Link to='/register' className='hidden sm:block'>
              <Button size='sm' className='text-[16px]'>
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

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 py-10'>
          <div className='text-center'>
            {/* Premium Trust Badge */}
            <ScrollReveal delay={0}>
              <div className='inline-flex items-center gap-2 bg-white rounded-full border border-gray-200 px-4 py-2 mb-6 sm:mb-10 shadow-sm hover:shadow-md transition-shadow duration-300'>
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
            </ScrollReveal>

            {/* Headline */}
            <ScrollReveal delay={100}>
              <h1 className='relative text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]'>
                Stop stressing about
                <span className='hidden xs:block' />
                <span className='relative inline-block mt-2 sm:mt-0'>
                  <span className='bg-gradient-to-r from-primary-700 via-primary-500 to-purple-500 bg-clip-text text-transparent animate-gradient ml-3'>
                    business taxes
                  </span>
                  <svg
                    className='absolute -bottom-2 left-0 w-full'
                    viewBox='0 0 300 16'
                    fill='none'
                    aria-hidden='true'
                  >
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
                    </defs>
                  </svg>
                </span>
              </h1>
            </ScrollReveal>

            {/* Subheadline */}
            <ScrollReveal delay={200}>
              <p className='mx-auto mt-4 sm:mt-5 max-w-xl sm:max-w-2xl font-body text-base sm:text-lg lg:text-xl leading-relaxed text-gray-500 px-2'>
                Track sales, auto-compute FIRS-compliant taxes, and pay online
                in minutes. Built exclusively for Nigerian businesses who want
                clarity, not complexity.
              </p>
            </ScrollReveal>

            {/* CTA Buttons - Pill Shaped */}
            <ScrollReveal delay={300}>
              <div className='mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0'>
                <Link to='/register' className='w-full sm:w-auto'>
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 px-8 sm:px-10 py-4 text-sm sm:text-base font-bold text-white shadow-2xl shadow-primary-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/60 hover:-translate-y-1 active:scale-[0.98] overflow-hidden group'>
                    <span className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700' />
                    <span className='relative flex items-center gap-2'>
                      Start Free Today{' '}
                      <ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
                    </span>
                  </button>
                </Link>
                <Link to='/login' className='w-full sm:w-auto'>
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-300 bg-white/70 backdrop-blur px-8 sm:px-10 py-4 text-sm sm:text-base font-semibold text-gray-700 shadow-md transition-all duration-300 hover:border-primary-300 hover:bg-white hover:shadow-xl hover:text-primary-700 hover:-translate-y-0.5 active:scale-[0.98]'>
                    <Play className='h-4 w-4 fill-current' /> Watch Demo
                  </button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Trust indicators */}
            <ScrollReveal delay={400}>
              <div className='mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-3 px-4'>
                {trustIndicators.map(({ icon: Icon, text }, i) => (
                  <div
                    key={text}
                    className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50/80 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 hover:-translate-y-0.5 hover:rotate-1 transition-all duration-300 cursor-default'
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <Icon className='h-4 w-4 text-primary-500' />
                    <span className='font-body text-xs sm:text-sm text-gray-600 font-medium'>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Dashboard Preview */}
            <ScrollReveal delay={500}>
              <div className='mt-10 sm:mt-14 lg:mt-16 relative mx-auto max-w-5xl px-2 sm:px-0'>
                <div className='absolute -inset-8 rounded-3xl bg-gradient-to-r from-primary-500/30 via-purple-500/20 to-pink-500/30 blur-3xl' />
                <div
                  className='absolute -top-4 -left-4 sm:-left-8 w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-br from-primary-400/20 to-purple-400/20 blur-xl animate-blob-morph animate-bounce-gently'
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

                      <div className='rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-2 sm:p-4'>
                        <div className='flex items-center justify-between mb-1.5 sm:mb-3'>
                          <span className='text-[10px] sm:text-xs font-semibold text-gray-700'>
                            Monthly Revenue
                          </span>
                          <span className='font-body text-[8px] sm:text-[10px] text-gray-400 hidden sm:block'>
                            Last 6 months
                          </span>
                        </div>
                        <svg
                          viewBox='0 0 400 80'
                          className='w-full h-12 sm:h-20'
                        >
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
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Making Tax Compliance Effortless ── */}
      <section
        ref={statsRef as React.Ref<HTMLDivElement>}
        className='relative py-20 sm:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white'
      >
        {/* Ambient background — grid + glows */}
        <div
          className='absolute inset-0 opacity-[0.04] pointer-events-none'
          style={{
            backgroundImage:
              'linear-gradient(to right, #7c3aed 1px, transparent 1px), linear-gradient(to bottom, #7c3aed 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 75%)',
          }}
        />
        <div className='absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-400/15 blur-[120px] rounded-full pointer-events-none' />
        <div className='absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-fuchsia-400/15 blur-[120px] rounded-full pointer-events-none' />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          {/* Heading */}
          <ScrollReveal className='text-center mb-14 sm:mb-20'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-primary-500' />
              </span>
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent'>
                Built for Nigeria
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-5 max-w-3xl mx-auto leading-tight'>
              Making tax compliance{' '}
              <span className='bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent'>
                effortless
              </span>{' '}
              for Nigerian businesses
            </h2>
            <p className='font-body text-base sm:text-lg text-gray-500 max-w-xl mx-auto'>
              Simple tools that help you stay compliant without the headache
            </p>
          </ScrollReveal>

          {/* Content Grid — Stats + Creative Visual */}
          <div className='grid lg:grid-cols-5 gap-10 sm:gap-12 lg:gap-16 items-center'>
            {/* Stats Grid */}
            <div className='lg:col-span-2 grid grid-cols-2 gap-5 sm:gap-6'>
              {[
                {
                  icon: TrendingUp,
                  gradient: 'from-amber-500 via-orange-400 to-red-500',
                  value: '7.5%',
                  label: 'FIRS Tax Rate',
                },
                {
                  icon: Shield,
                  gradient: 'from-green-500 via-emerald-400 to-teal-500',
                  value: '100%',
                  label: 'FIRS Compliant',
                },
                {
                  icon: Clock,
                  gradient: 'from-blue-500 via-indigo-400 to-purple-500',
                  value: '<2min',
                  label: 'Setup Time',
                },
                {
                  icon: Zap,
                  gradient: 'from-yellow-500 via-amber-400 to-orange-500',
                  value: 'Auto',
                  label: 'Calculation',
                },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 100}>
                  <div className='group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-6 sm:p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/20 hover:border-primary-300'>
                    <GradientIcon Icon={stat.icon} gradient={stat.gradient} delay={i} />
                    <div className='mt-5 text-3xl sm:text-4xl font-bold text-gray-900 mb-1 tracking-tight'>
                      {stat.value}
                    </div>
                    <div className='text-sm text-gray-600 font-medium'>
                      {stat.label}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Creative Visual — Floating phone mockup with live tax calc */}
            <ScrollReveal delay={200} className='lg:col-span-3'>
              <div className='relative mx-auto max-w-lg lg:max-w-none aspect-[5/4] sm:aspect-[6/5]'>
                {/* Glow halo */}
                <div className='absolute inset-0 bg-gradient-to-br from-primary-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-3xl' />

                {/* Rotating conic ring */}
                <div
                  className='absolute inset-8 rounded-full opacity-30'
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, #7c3aed 60deg, transparent 120deg, #a855f7 180deg, transparent 240deg, #d946ef 300deg, transparent 360deg)',
                    animation: 'spin 20s linear infinite',
                    filter: 'blur(30px)',
                  }}
                />

                {/* Floating badge — top left */}
                <div
                  className='absolute top-4 left-2 sm:left-0 z-20 animate-bounce-gentle'
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className='flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-xl border border-gray-200/80 px-3.5 py-2.5 shadow-xl shadow-primary-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30'>
                      <CheckCircle2 className='h-5 w-5 text-white' strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-gray-400 leading-tight'>
                        Tax Filed
                      </div>
                      <div className='text-xs font-bold text-gray-900 leading-tight'>
                        March 2026
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge — bottom right */}
                <div
                  className='absolute bottom-6 right-2 sm:right-0 z-20 animate-bounce-gentle'
                  style={{ animationDelay: '1.8s' }}
                >
                  <div className='flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-xl border border-gray-200/80 px-3.5 py-2.5 shadow-xl shadow-primary-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/30'>
                      <Zap
                        className='h-5 w-5 text-white fill-white'
                        strokeWidth={2}
                      />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-gray-400 leading-tight'>
                        Auto-calculated
                      </div>
                      <div className='text-xs font-bold text-gray-900 leading-tight'>
                        in 0.3 seconds
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating mini chart — top right */}
                <div
                  className='absolute top-10 right-0 sm:right-4 z-20 animate-sway'
                  style={{ animationDelay: '0s' }}
                >
                  <div className='rounded-xl bg-white/95 backdrop-blur-xl border border-gray-200/80 px-4 py-3 shadow-xl shadow-primary-900/10'>
                    <div className='flex items-center gap-2 mb-2'>
                      <TrendingUp className='h-3.5 w-3.5 text-green-500' />
                      <span className='text-[10px] font-semibold text-gray-700'>
                        Revenue
                      </span>
                      <span className='text-[10px] font-bold text-green-500'>
                        +24%
                      </span>
                    </div>
                    <svg viewBox='0 0 80 24' className='w-20 h-6'>
                      <defs>
                        <linearGradient id='miniChartGrad' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='0%' stopColor='#10b981' stopOpacity='0.4' />
                          <stop offset='100%' stopColor='#10b981' stopOpacity='0' />
                        </linearGradient>
                      </defs>
                      <path
                        d='M0,20 L15,16 L30,18 L45,10 L60,12 L80,4 L80,24 L0,24 Z'
                        fill='url(#miniChartGrad)'
                      />
                      <path
                        d='M0,20 L15,16 L30,18 L45,10 L60,12 L80,4'
                        fill='none'
                        stroke='#10b981'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </div>
                </div>

                {/* Central Tax Calculation Card */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='relative w-[88%] sm:w-[82%] lg:w-[78%] rounded-2xl bg-gradient-to-br from-gray-900 via-primary-950 to-purple-950 p-1 shadow-2xl shadow-primary-900/40'>
                    {/* Inner card */}
                    <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-purple-950 p-5 sm:p-6 lg:p-7'>
                      {/* Subtle pattern */}
                      <div
                        className='absolute inset-0 opacity-[0.08]'
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                          backgroundSize: '20px 20px',
                        }}
                      />
                      {/* Glow corner */}
                      <div className='absolute -top-20 -right-20 w-48 h-48 bg-primary-500/30 rounded-full blur-3xl' />
                      <div className='absolute -bottom-20 -left-20 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl' />

                      <div className='relative'>
                        {/* Header */}
                        <div className='flex items-center justify-between mb-5 sm:mb-6'>
                          <div className='flex items-center gap-2'>
                            <div className='h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center'>
                              <Receipt className='h-4 w-4 text-white' />
                            </div>
                            <div>
                              <div className='text-[10px] uppercase tracking-wider text-white/50 font-semibold'>
                                Tax Summary
                              </div>
                              <div className='text-xs font-bold text-white'>
                                March 2026
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-400/30 px-2.5 py-1'>
                            <div className='h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse' />
                            <span className='text-[10px] font-semibold text-green-300'>
                              Live
                            </span>
                          </div>
                        </div>

                        {/* Calculation rows */}
                        <div className='space-y-2.5 sm:space-y-3 mb-4 sm:mb-5'>
                          <div className='flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 backdrop-blur-sm'>
                            <div className='flex items-center gap-2'>
                              <div className='h-6 w-6 rounded-md bg-green-500/20 flex items-center justify-center'>
                                <TrendingUp className='h-3 w-3 text-green-400' />
                              </div>
                              <span className='text-xs text-white/70 font-medium'>
                                Total Sales
                              </span>
                            </div>
                            <span className='text-sm font-bold text-white tabular-nums'>
                              ₦700,000
                            </span>
                          </div>

                          <div className='flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 backdrop-blur-sm'>
                            <div className='flex items-center gap-2'>
                              <div className='h-6 w-6 rounded-md bg-red-500/20 flex items-center justify-center'>
                                <Receipt className='h-3 w-3 text-red-400' />
                              </div>
                              <span className='text-xs text-white/70 font-medium'>
                                Expenses
                              </span>
                            </div>
                            <span className='text-sm font-bold text-white tabular-nums'>
                              −₦360,000
                            </span>
                          </div>

                          <div className='flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 backdrop-blur-sm'>
                            <div className='flex items-center gap-2'>
                              <div className='h-6 w-6 rounded-md bg-primary-500/20 flex items-center justify-center'>
                                <BarChart3 className='h-3 w-3 text-primary-300' />
                              </div>
                              <span className='text-xs text-white/70 font-medium'>
                                Gross Profit
                              </span>
                            </div>
                            <span className='text-sm font-bold text-white tabular-nums'>
                              ₦340,000
                            </span>
                          </div>
                        </div>

                        {/* Divider with formula */}
                        <div className='relative flex items-center gap-3 my-4'>
                          <div className='h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent' />
                          <span className='text-[9px] font-mono font-bold uppercase tracking-wider text-white/40'>
                            × 7.5% FIRS
                          </span>
                          <div className='h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent' />
                        </div>

                        {/* Tax Payable — hero number */}
                        <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 via-purple-500 to-fuchsia-500 p-[1.5px]'>
                          <div className='rounded-xl bg-gradient-to-br from-primary-600/90 to-purple-700/90 backdrop-blur-sm px-4 py-3.5 sm:py-4'>
                            <div className='flex items-end justify-between'>
                              <div>
                                <div className='text-[10px] uppercase tracking-wider text-white/70 font-semibold mb-0.5'>
                                  Tax Payable
                                </div>
                                <div className='text-2xl sm:text-3xl font-bold text-white tabular-nums leading-none'>
                                  ₦25,500
                                </div>
                              </div>
                              <button className='flex items-center gap-1.5 rounded-lg bg-white text-primary-700 px-3 py-1.5 text-[11px] font-bold shadow-lg hover:shadow-xl transition-shadow'>
                                Pay now
                                <ArrowRight className='h-3 w-3' />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id='features'
        className='py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-white to-gray-50/50 relative overflow-hidden'
      >
        <div
          className='absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-primary-400/10 to-purple-400/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '1s' }}
        />
        <div
          className='absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-bl from-purple-400/10 to-fuchsia-400/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '3s' }}
        />

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-2xl text-center mb-8 sm:mb-10'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Sparkles className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 fill-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Features
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight'>
              Everything you need to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                stay compliant
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-base sm:text-lg text-gray-500 leading-relaxed'>
              Powerful tools that make tax filing feel simple
            </p>
          </ScrollReveal>

          {/*
            Bento Grid — 4 columns × 4 rows on lg
            ┌─────────────┬───────┬───────┐
            │  Sales (2×2)│ FIRS  │ 1-Clk │
            │             ├───────┴───────┤
            │             │ Reminders(2×1)│
            ├───────┬─────┴───────────────┤
            │ Dash  │   PDF Statements    │
            │ (1×2) │     (2×2)           │
            ├───────┤                     │
            │ Dash2 │                     │
            └───────┴─────────────────────┘
          */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-4 auto-rows-[minmax(180px,auto)] gap-4 sm:gap-5'>
            {/* 1. Sales & Expense Tracking — HERO (2×2) */}
            <ScrollReveal
              delay={0}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-2 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-purple-50 p-6 sm:p-7 group hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-200 transition-all duration-500'>
                <div className='absolute -top-16 -right-16 w-48 h-48 bg-primary-200/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                <div className='relative flex h-full flex-col'>
                  <div className='w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-primary-500/10 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500'>
                    <BarChart3
                      className='w-7 h-7 text-primary-600'
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-3'>
                    Sales & Expense Tracking
                  </h3>
                  <p className='text-sm sm:text-base text-gray-600 leading-relaxed mb-6'>
                    Log every naira in and out. Auto-categorize transactions and
                    see profit margins at a glance.
                  </p>

                  {/* Live mini visual — revenue vs expenses bars */}
                  <div className='mt-auto rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 p-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-3'>
                      <span className='text-[11px] font-semibold text-gray-500 uppercase tracking-wider'>
                        This month
                      </span>
                      <span className='text-[11px] font-bold text-green-600'>
                        +24% ↑
                      </span>
                    </div>
                    <div className='space-y-2.5'>
                      <div>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs text-gray-500'>Sales</span>
                          <span className='text-xs font-bold text-gray-800 tabular-nums'>
                            ₦700K
                          </span>
                        </div>
                        <div className='h-2 rounded-full bg-gray-100 overflow-hidden'>
                          <div className='h-full w-[85%] rounded-full bg-gradient-to-r from-primary-500 to-purple-500' />
                        </div>
                      </div>
                      <div>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs text-gray-500'>Expenses</span>
                          <span className='text-xs font-bold text-gray-800 tabular-nums'>
                            ₦360K
                          </span>
                        </div>
                        <div className='h-2 rounded-full bg-gray-100 overflow-hidden'>
                          <div className='h-full w-[45%] rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-400' />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 2. FIRS-Compliant — small (1×1) */}
            <ScrollReveal delay={100} className='lg:col-span-1 lg:row-span-1 h-full'>
              <div className='group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5 transition-all duration-300'>
                <div className='w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300'>
                  <Shield className='w-5 h-5 text-primary-600' strokeWidth={1.5} />
                </div>
                <h3 className='text-base font-bold text-gray-900 mb-1.5'>
                  FIRS-Compliant
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  7.5% VAT calculator follows FIRS rules precisely
                </p>
              </div>
            </ScrollReveal>

            {/* 3. One-Click Payment — small (1×1) */}
            <ScrollReveal delay={200} className='lg:col-span-1 lg:row-span-1 h-full'>
              <div className='group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5 transition-all duration-300'>
                <div className='w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300'>
                  <CreditCard
                    className='w-5 h-5 text-purple-600'
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className='text-base font-bold text-gray-900 mb-1.5'>
                  One-Click Payment
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Pay instantly via Paystack — card, transfer, or USSD
                </p>
              </div>
            </ScrollReveal>

            {/* 4. Smart Tax Reminders — wide (2×1) */}
            <ScrollReveal
              delay={300}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-1 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 to-purple-50 p-5 sm:p-6 group hover:shadow-lg hover:shadow-fuchsia-500/10 transition-all duration-500'>
                <div className='flex items-center gap-5 h-full'>
                  <div className='flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-fuchsia-500/10 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500'>
                    <Bell
                      className='w-6 h-6 text-fuchsia-600'
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-1'>
                      Smart Tax Reminders
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                      Never miss a deadline. Automated notifications keep you
                      penalty-free.
                    </p>
                  </div>
                  {/* Date chip */}
                  <div className='hidden sm:flex flex-shrink-0 flex-col items-center justify-center w-14 h-16 rounded-xl bg-white border border-fuchsia-200 shadow-sm'>
                    <div className='text-[9px] font-bold uppercase tracking-wider text-fuchsia-600 bg-fuchsia-50 w-full text-center py-0.5 rounded-t-[10px]'>
                      Apr
                    </div>
                    <div className='text-xl font-bold text-gray-900 flex-1 flex items-center'>
                      25
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 5. Real-Time Dashboard — tall (1×2) */}
            <ScrollReveal
              delay={400}
              className='lg:col-span-1 lg:row-span-2 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-violet-50/40 p-5 sm:p-6 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-500'>
                <div className='flex h-full flex-col'>
                  <div className='w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500'>
                    <TrendingUp
                      className='w-6 h-6 text-violet-600'
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className='text-lg font-bold text-gray-900 mb-2'>
                    Real-Time Dashboard
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed mb-5'>
                    Bird's-eye view of revenue, expenses & tax liability.
                  </p>

                  {/* Live chart */}
                  <div className='mt-auto rounded-xl bg-white border border-gray-100 p-3 shadow-sm'>
                    <svg viewBox='0 0 120 50' className='w-full h-14'>
                      <defs>
                        <linearGradient id='dashChartGrad' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='0%' stopColor='#8b5cf6' stopOpacity='0.3' />
                          <stop offset='100%' stopColor='#8b5cf6' stopOpacity='0' />
                        </linearGradient>
                      </defs>
                      <path
                        d='M0,42 L20,36 L40,38 L60,22 L80,28 L100,14 L120,8 L120,50 L0,50 Z'
                        fill='url(#dashChartGrad)'
                      />
                      <path
                        d='M0,42 L20,36 L40,38 L60,22 L80,28 L100,14 L120,8'
                        fill='none'
                        stroke='#8b5cf6'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <circle cx='120' cy='8' r='3' fill='#8b5cf6' />
                      <circle cx='120' cy='8' r='6' fill='#8b5cf6' fillOpacity='0.25' />
                    </svg>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 6. PDF Tax Statements — wide (2×2) */}
            <ScrollReveal
              delay={500}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-2 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-primary-50/40 p-6 sm:p-7 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-500'>
                <div className='absolute -bottom-20 -right-20 w-56 h-56 bg-indigo-200/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

                <div className='relative grid sm:grid-cols-5 gap-5 h-full items-center'>
                  {/* Left: copy */}
                  <div className='sm:col-span-3'>
                    <div className='w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500'>
                      <FileText
                        className='w-6 h-6 text-indigo-600'
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className='text-xl font-bold text-gray-900 mb-2'>
                      PDF Tax Statements
                    </h3>
                    <p className='text-sm text-gray-600 leading-relaxed mb-4'>
                      Download professionally formatted statements — monthly or
                      custom date ranges, on demand.
                    </p>
                    <div className='space-y-1.5'>
                      {[
                        'Monthly summaries',
                        'Custom date ranges',
                        'Print-ready formats',
                      ].map((item) => (
                        <div
                          key={item}
                          className='flex items-center gap-2 text-xs text-gray-600'
                        >
                          <CheckCircle2
                            className='w-3.5 h-3.5 text-indigo-500 flex-shrink-0'
                            strokeWidth={2.5}
                          />
                          <span className='font-medium'>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: document mockup */}
                  <div className='sm:col-span-2 hidden sm:flex items-center justify-center'>
                    <div className='relative w-full max-w-[180px] aspect-[3/4] group-hover:-rotate-2 transition-transform duration-500'>
                      {/* Back doc */}
                      <div className='absolute inset-0 translate-x-2 translate-y-2 rounded-lg bg-white border border-gray-200 shadow-sm' />
                      {/* Front doc */}
                      <div className='absolute inset-0 rounded-lg bg-white border border-gray-200 shadow-lg p-3 flex flex-col'>
                        <div className='flex items-center justify-between pb-2 border-b border-gray-100'>
                          <div className='h-1.5 w-10 rounded-full bg-gradient-to-r from-primary-500 to-purple-500' />
                          <div className='text-[7px] font-bold text-gray-400 uppercase'>
                            PDF
                          </div>
                        </div>
                        <div className='mt-2 space-y-1'>
                          <div className='h-1 w-full rounded-full bg-gray-100' />
                          <div className='h-1 w-4/5 rounded-full bg-gray-100' />
                          <div className='h-1 w-3/5 rounded-full bg-gray-100' />
                        </div>
                        <div className='mt-3 grid grid-cols-2 gap-1'>
                          <div className='h-6 rounded bg-primary-50 border border-primary-100' />
                          <div className='h-6 rounded bg-purple-50 border border-purple-100' />
                        </div>
                        <div className='mt-2 space-y-1'>
                          <div className='h-1 w-full rounded-full bg-gray-100' />
                          <div className='h-1 w-5/6 rounded-full bg-gray-100' />
                          <div className='h-1 w-4/6 rounded-full bg-gray-100' />
                        </div>
                        <div className='mt-auto pt-2 flex items-center justify-between'>
                          <div className='h-1.5 w-8 rounded-full bg-gray-200' />
                          <div className='text-[7px] font-bold text-indigo-500'>
                            ₦25,500
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section className='py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-3xl text-center mb-16 sm:mb-20'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-6 shadow-sm'>
              <Lightbulb className='h-4 sm:h-4 w-4 sm:w-4 text-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Why Choose Us
              </span>
            </span>
            <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight'>
              Everything you need to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                stay compliant
              </span>
            </h2>
            <p className='mt-6 font-body text-base sm:text-lg text-gray-600'>
              Powerful features built specifically for Nigerian businesses.
            </p>
          </ScrollReveal>

          <div className='grid md:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-stretch'>
            {/* Feature Cards */}
            {[
              {
                icon: Calculator,
                gradient: 'from-blue-500 via-cyan-400 to-teal-500',
                title: 'Smart Tax Calculation',
                description: 'Automatic FIRS-compliant tax calculations based on your sales and expenses. No guesswork.',
                image: '/images/analytics-feature.jpg',
              },
              {
                icon: Lock,
                gradient: 'from-emerald-500 via-green-400 to-lime-500',
                title: 'Bank-Grade Security',
                description: 'Your financial data is encrypted and protected with enterprise-grade security standards.',
                image: '/images/compliance-secure.jpg',
              },
              {
                icon: PieChart,
                gradient: 'from-purple-500 via-pink-400 to-rose-500',
                title: 'Real-Time Analytics',
                description: 'Get instant insights into your business finances with interactive charts and reports.',
                image: '/images/dashboard-hero.jpg',
              },
              {
                icon: CheckCheck,
                gradient: 'from-amber-500 via-orange-400 to-red-500',
                title: 'Compliance Ready',
                description: 'Generate professional tax reports that meet all FIRS requirements in seconds.',
                image: '/images/analytics-feature.jpg',
              },
            ].map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 100} className='group'>
                <div className='flex flex-col h-full rounded-lg border-2 border-gray-200 overflow-hidden bg-white transition-all duration-500 hover:border-primary-300 hover:shadow-2xl hover:shadow-primary-500/15 hover:-translate-y-2'>
                  {/* Feature Image */}
                  <div className='relative h-40 sm:h-48 overflow-hidden bg-gray-100'>
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent' />
                  </div>

                  {/* Content */}
                  <div className='flex-grow p-6 sm:p-7 flex flex-col'>
                    <GradientIcon Icon={feature.icon} gradient={feature.gradient} delay={i} />
                    <h3 className='mt-5 text-lg sm:text-xl font-bold text-gray-900'>
                      {feature.title}
                    </h3>
                    <p className='mt-3 font-body text-sm sm:text-[15px] leading-relaxed text-gray-600 flex-grow'>
                      {feature.description}
                    </p>
                    <div className='mt-4 inline-flex items-center text-primary-600 font-semibold text-sm group-hover:gap-2 transition-all duration-300'>
                      Learn more
                      <ArrowRight className='h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity' />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id='how-it-works'
        className='py-16 sm:py-20 lg:py-28 bg-white relative overflow-hidden'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-2xl text-center mb-16 sm:mb-20'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-6 shadow-sm'>
              <Rocket className='h-4 sm:h-4 w-4 sm:w-4 text-primary-500' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Simple Process
              </span>
            </span>
            <h2 className='text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold text-gray-900 leading-tight'>
              Get compliant in{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                three simple steps
              </span>
            </h2>
            <p className='mt-5 sm:mt-6 font-body text-base sm:text-lg text-gray-600'>
              Your path to effortless tax management, designed for clarity and speed.
            </p>
          </ScrollReveal>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10'>
            {[
              {
                icon: Users,
                gradient: 'from-blue-500 via-cyan-400 to-teal-500',
                title: 'Create Your Account',
                description: 'Sign up in under 60 seconds. Add your business details and connect your account in minutes.',
                stepNum: 1,
              },
              {
                icon: DollarSign,
                gradient: 'from-purple-500 via-pink-400 to-rose-500',
                title: 'Record Transactions',
                description: 'Log sales and expenses as they happen. Import from bank transfers or enter manually.',
                stepNum: 2,
              },
              {
                icon: CheckCheck,
                gradient: 'from-emerald-500 via-green-400 to-lime-500',
                title: 'File & Pay Tax',
                description: 'Review your auto-computed report, finalize, and pay FIRS directly. Done in minutes.',
                stepNum: 3,
              },
            ].map((step, index) => (
              <ScrollReveal
                key={step.title}
                delay={index * 150}
                className='relative group'
              >
                <div className='flex flex-col h-full rounded-lg border-2 border-gray-200 bg-white p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/15 hover:border-primary-300 hover:-translate-y-2'>
                  {/* Step Number */}
                  <div className='absolute -top-5 -right-5 w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-lg'>
                    <span className='text-xl font-bold text-gray-700'>{step.stepNum}</span>
                  </div>

                  {/* Gradient Icon */}
                  <GradientIcon Icon={step.icon} gradient={step.gradient} delay={index} />

                  {/* Content */}
                  <h3 className='mt-6 text-xl sm:text-2xl font-bold text-gray-900'>
                    {step.title}
                  </h3>
                  <p className='mt-4 font-body text-sm sm:text-[15px] leading-relaxed text-gray-600 flex-grow'>
                    {step.description}
                  </p>

                  {/* Arrow divider */}
                  {index < 2 && (
                    <div className='hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-gray-400 group-hover:border-primary-300 group-hover:text-primary-500 transition-all duration-300'>
                      <ChevronRight className='h-5 w-5' />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section
        id='testimonials'
        className='py-16 sm:py-20 lg:py-28 relative overflow-hidden'
      >
        <div className='absolute inset-0 z-0'>
          <img
            src='/images/dashboard-hero.jpg'
            alt='Business success'
            className='w-full h-full object-cover object-center'
          />
          <div className='absolute inset-0 bg-gradient-to-br from-white via-white/95 to-white/90' />
        </div>

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative z-10'>
          <ScrollReveal className='mx-auto max-w-3xl text-center mb-16 sm:mb-20'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-5 py-2 mb-6 shadow-sm'>
              <span className='flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700'>
                Real Results
              </span>
            </span>
            <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight'>
              Trusted by{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                thousands of businesses
              </span>
            </h2>
            <p className='mt-6 font-body text-base sm:text-lg text-gray-700'>
              Hear from business owners who've transformed their tax management.
            </p>
          </ScrollReveal>

          <StaggerReveal
            staggerDelay={150}
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
          >
            {testimonials.map((t) => (
              <div
                key={t.name}
                className='group relative overflow-hidden rounded-lg border-2 border-gray-300 bg-white/95 backdrop-blur p-7 sm:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/20 hover:border-primary-400 hover:-translate-y-2'
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className='absolute top-4 right-6 sm:right-8 text-5xl sm:text-6xl lg:text-7xl font-serif bg-gradient-to-br from-primary-100 to-purple-50 bg-clip-text text-transparent leading-none select-none'>
                  "
                </div>

                <div className='flex gap-0.5 mb-5 sm:mb-6'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className='h-4 sm:h-4.5 w-4 sm:w-4.5 fill-amber-400 text-amber-400'
                    />
                  ))}
                </div>

                <p className='font-body text-sm sm:text-[15px] lg:text-base leading-relaxed text-gray-600 relative z-10'>
                  "{t.quote}"
                </p>

                <div className='mt-6 sm:mt-8 flex items-center gap-4 pt-5 border-t border-gray-100'>
                  <div
                    className={`relative flex h-12 sm:h-14 w-12 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white text-base sm:text-lg font-bold shadow-xl shadow-primary-500/20`}
                  >
                    {t.avatar}
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
          </StaggerReveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── Final CTA ── */}
      <section className='py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50'>
        <ScrollReveal className='mx-auto max-w-4xl px-4 sm:px-6 text-center'>
          <h2 className='text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight'>
            Ready to simplify your{' '}
            <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
              tax management?
            </span>
          </h2>
          <p className='mt-6 font-body text-lg text-gray-600 max-w-2xl mx-auto'>
            Join thousands of Nigerian businesses that trust WallxTax for their tax compliance and reporting needs.
          </p>
          <div className='mt-10 flex flex-col sm:flex-row items-center justify-center gap-5'>
            <Link to='/register'>
              <button className='px-10 py-4 rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 text-white font-bold shadow-xl shadow-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/60 transition-all duration-300 hover:-translate-y-1 group'>
                <span className='flex items-center gap-2'>
                  Start Your Free Trial <ArrowRight className='h-5 w-5 group-hover:translate-x-1 transition-transform' />
                </span>
              </button>
            </Link>
            <Link to='/login'>
              <button className='px-10 py-4 rounded-full border-2 border-gray-300 text-gray-700 font-semibold hover:border-primary-400 hover:text-primary-700 transition-all duration-300 hover:-translate-y-0.5'>
                Schedule Demo
              </button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className='bg-gray-950 text-gray-400'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-10 lg:pb-12'>
          <div className='grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-4'>
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

            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Product
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                {['Features', 'How It Works', 'Testimonials', 'FAQ'].map(
                  (item) => (
                    <a
                      key={item}
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                      className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                    >
                      {item}
                    </a>
                  ),
                )}
              </div>
            </div>

            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Account
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                {['Create Account', 'Sign In', 'Dashboard'].map((item) => (
                  <Link
                    key={item}
                    to={
                      item === 'Dashboard'
                        ? '/dashboard'
                        : `/${item.toLowerCase().replace(/\s+/g, '-')}`
                    }
                    className='block font-body text-sm sm:text-[15px] text-gray-500 hover:text-white transition-colors duration-200'
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

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
