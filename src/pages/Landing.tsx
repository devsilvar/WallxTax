import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  CreditCard,
  CheckCircle2,
  HelpCircle,
  Clock,
  FileText,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Receipt,
  Bell,
  Play,
  Users,
  Menu,
  X,
  ArrowUpRight,
  Layers,
  Target,
  Fingerprint,
  Calculator,
  Building2,
  Landmark,
  Scale,
  FileCheck,
  Banknote,
  PieChart,
  LineChart,
  BarChart2,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';

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

/* ─── Animated Icon Component ─── */
function AnimatedIcon({ 
  icon: Icon, 
  className = '', 
  animation = 'pulse',
  delay = 0 
}: { 
  icon: typeof Shield; 
  className?: string; 
  animation?: 'pulse' | 'float' | 'bounce' | 'glow' | 'swing';
  delay?: number;
}) {
  const animationClass = {
    pulse: 'animate-icon-pulse',
    float: 'animate-icon-float',
    bounce: 'animate-icon-bounce',
    glow: 'animate-icon-glow',
    swing: 'animate-icon-swing',
  }[animation];

  return (
    <Icon 
      className={`${className} ${animationClass}`} 
      style={{ animationDelay: `${delay}ms` }}
    />
  );
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
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-all duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[300px] max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className='flex flex-col h-full'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-slate-100'>
            <img src='/logo.png' alt='PayMyTax' className='h-8' />
            <button
              onClick={onClose}
              className='p-2 hover:bg-slate-100 rounded-lg transition-colors'
              aria-label='Close menu'
            >
              <X className='h-5 w-5 text-slate-500' />
            </button>
          </div>
          <nav className='flex-1 px-4 py-6 space-y-1'>
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={onClose}
                className='block px-4 py-3 text-[15px] font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors'
              >
                {item}
              </a>
            ))}
          </nav>
          <div className='p-4 border-t border-slate-100 space-y-3'>
            <Link to='/login' onClick={onClose} className='block'>
              <Button variant='ghost' className='w-full justify-center'>
                Sign in
              </Button>
            </Link>
            <Link to='/register' className='block'>
              <Button className='w-full justify-center rounded-full'>
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
    icon: Fingerprint,
    title: 'Create Your Account',
    description:
      'Sign up in under 60 seconds. Add your business details and connect your account.',
  },
  {
    icon: Layers,
    title: 'Record Transactions',
    description:
      'Log sales and expenses as they happen. Import from bank transfers or enter manually.',
  },
  {
    icon: FileCheck,
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
    color: 'from-primary-500 to-indigo-600',
  },
  {
    name: 'Chioma Nwosu',
    role: 'Founder, CraftHub Lagos',
    quote:
      'Finally, a tax platform that actually understands Nigerian businesses. The reminders have saved us from FIRS penalties.',
    avatar: 'CN',
    color: 'from-indigo-500 to-violet-600',
  },
  {
    name: 'Ibrahim Musa',
    role: 'MD, Sahel Logistics',
    quote:
      'Crystal-clear picture of our tax obligations. The PDF statements look incredibly professional.',
    avatar: 'IM',
    color: 'from-violet-500 to-primary-600',
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
      className='py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-slate-50/80 to-white'
    >
      <div className='mx-auto max-w-3xl px-4 sm:px-6'>
        <ScrollReveal className='text-center mb-10 sm:mb-14'>
          <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
            <HelpCircle className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 animate-icon-pulse' />
            <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
              FAQ
            </span>
          </span>
          <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight'>
            Common{' '}
            <span className='bg-gradient-to-r from-primary-600 via-violet-500 to-indigo-500 bg-clip-text text-transparent'>
              questions
            </span>
          </h2>
          <p className='mt-4 sm:mt-5 font-body text-base sm:text-lg text-slate-500'>
            Everything you need to know about PayMyTax and tax compliance in
            Nigeria.
          </p>
        </ScrollReveal>

        <div className='divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm'>
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.q}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className='flex w-full items-center justify-between px-4 sm:px-6 py-4 sm:py-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100'
                  aria-expanded={isOpen}
                >
                  <span className='text-sm sm:text-base font-semibold text-slate-900 pr-3'>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className='overflow-hidden'>
                    <p className='px-4 sm:px-6 pb-4 sm:pb-5 font-body text-sm sm:text-base leading-relaxed text-slate-500'>
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
      <header className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50'>
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
                className='relative font-sans text-[15px] font-medium text-slate-600 hover:text-primary-600 transition-colors duration-200 py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary-500 after:to-violet-500 after:transition-all after:duration-300 hover:after:w-full'
              >
                {item}
              </a>
            ))}
          </nav>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Link to='/login' className='hidden sm:block'>
              <Button variant='ghost' size='sm' className='text-[15px] text-slate-600 hover:text-primary-600'>
                Sign in
              </Button>
            </Link>
            <Link to='/register' className='hidden sm:block'>
              <button className='group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-violet-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-500 hover:to-violet-500 active:scale-[0.98]'>
                Get Started 
                <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
              </button>
            </Link>
            <button
              onClick={() => setMobileNavOpen(true)}
              className='lg:hidden flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors'
              aria-label='Open navigation menu'
            >
              <Menu className='h-5 w-5 text-slate-600' />
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* ── Hero ── */}
      <section className='relative pt-20 sm:pt-24 lg:pt-28 pb-12 sm:pb-16 lg:pb-20'>
        {/* Premium gradient background */}
        <div className='absolute inset-0 bg-gradient-to-b from-primary-50/60 via-white to-white' />
        
        {/* Subtle grid pattern */}
        <div
          className='absolute inset-0 opacity-[0.02]'
          style={{
            backgroundImage: `linear-gradient(to right, #9333ea 1px, transparent 1px), linear-gradient(to bottom, #9333ea 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Animated gradient orbs */}
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-primary-400/20 via-transparent to-transparent blur-3xl animate-aurora' />
        <div
          className='absolute top-32 -right-32 w-[400px] h-[400px] bg-violet-300/15 blur-3xl animate-blob-morph'
          style={{ animationDelay: '2s' }}
        />
        <div
          className='absolute top-48 -left-32 w-[350px] h-[350px] bg-indigo-300/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '4s' }}
        />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12'>
          <div className='text-center'>
            {/* Premium Trust Badge */}
            <ScrollReveal delay={0}>
              <div className='inline-flex items-center gap-3 bg-white rounded-full border border-slate-200/80 px-4 py-2 mb-8 sm:mb-10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary-200'>
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
                <div className='h-4 w-px bg-slate-200' />
                <span className='font-body text-sm font-semibold text-slate-700'>
                  Trusted by <span className='text-primary-600'>2,500+</span> businesses
                </span>
              </div>
            </ScrollReveal>

            {/* Headline */}
            <ScrollReveal delay={100}>
              <h1 className='relative text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]'>
                Stop stressing about
                <span className='block mt-2'>
                  <span className='relative inline-block'>
                    <span className='bg-gradient-to-r from-primary-600 via-violet-500 to-indigo-500 bg-clip-text text-transparent animate-gradient'>
                      business taxes
                    </span>
                    <svg
                      className='absolute -bottom-1.5 left-0 w-full'
                      viewBox='0 0 300 12'
                      fill='none'
                      aria-hidden='true'
                    >
                      <path
                        d='M3 8 C58 3, 115 4, 148 6 C165 7, 185 8, 220 6 C245 5, 270 4, 297 5'
                        stroke='url(#underlineGradHero)'
                        strokeWidth='3'
                        strokeLinecap='round'
                        opacity='0.8'
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
                          <stop stopColor='#9333ea' />
                          <stop offset='0.5' stopColor='#8b5cf6' />
                          <stop offset='1' stopColor='#6366f1' />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </span>
              </h1>
            </ScrollReveal>

            {/* Subheadline */}
            <ScrollReveal delay={200}>
              <p className='mx-auto mt-5 sm:mt-6 max-w-xl sm:max-w-2xl font-body text-base sm:text-lg lg:text-xl leading-relaxed text-slate-500 px-2'>
                Track sales, auto-compute FIRS-compliant taxes, and pay online
                in minutes. Built exclusively for Nigerian businesses who want
                clarity, not complexity.
              </p>
            </ScrollReveal>

            {/* CTA Buttons - Pill Shaped */}
            <ScrollReveal delay={300}>
              <div className='mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0'>
                <Link to='/register' className='w-full sm:w-auto group'>
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-primary-600 via-violet-600 to-indigo-600 px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-bold text-white shadow-2xl shadow-primary-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/40 active:scale-[0.98] overflow-hidden'>
                    <span className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700' />
                    <span className='relative flex items-center gap-2'>
                      Start for free
                      <ArrowRight className='h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1' />
                    </span>
                  </button>
                </Link>
                <Link to='/login' className='w-full sm:w-auto'>
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-slate-200 bg-white/80 backdrop-blur px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-semibold text-slate-700 shadow-lg transition-all duration-300 hover:border-primary-200 hover:bg-white hover:shadow-xl hover:text-primary-700 active:scale-[0.98]'>
                    <Play className='h-4 w-4 fill-current' /> See how it works
                  </button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Trust indicators */}
            <ScrollReveal delay={400}>
              <div className='mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-3 px-4'>
                {trustIndicators.map(({ icon: Icon, text }, i) => (
                  <div
                    key={text}
                    className='group flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 border border-slate-100 hover:border-primary-200 hover:bg-primary-50/50 hover:-translate-y-0.5 transition-all duration-300 cursor-default shadow-sm'
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <Icon className='h-4 w-4 text-primary-500 group-hover:animate-icon-bounce' />
                    <span className='font-body text-xs sm:text-sm text-slate-600 font-medium'>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Dashboard Preview - Sharp Edges */}
            <ScrollReveal delay={500}>
              <div className='mt-12 sm:mt-16 lg:mt-20 relative mx-auto max-w-5xl px-2 sm:px-0'>
                {/* Glow effect */}
                <div className='absolute -inset-8 rounded-xl bg-gradient-to-r from-primary-500/20 via-violet-500/15 to-indigo-500/20 blur-3xl' />
                
                {/* Floating decorative elements */}
                <div
                  className='absolute -top-6 -left-6 sm:-left-10 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-primary-400/25 to-violet-400/25 blur-xl rounded-full animate-float'
                  style={{ animationDelay: '0s' }}
                />
                <div
                  className='absolute -bottom-6 -right-6 sm:-right-10 w-20 sm:w-28 h-20 sm:h-28 bg-gradient-to-br from-violet-400/20 to-indigo-400/20 blur-xl rounded-full animate-float'
                  style={{ animationDelay: '2s' }}
                />

                {/* Browser mockup - Sharper edges */}
                <div className='relative overflow-hidden rounded-lg border border-slate-200/60 bg-white shadow-2xl shadow-slate-900/10 mx-2 sm:mx-0'>
                  {/* Browser chrome */}
                  <div className='flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 sm:px-4 py-2 sm:py-3'>
                    <div className='flex gap-1.5'>
                      <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-red-400' />
                      <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-amber-400' />
                      <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-green-400' />
                    </div>
                    <div className='mx-auto hidden sm:flex h-5 sm:h-6 items-center rounded bg-slate-100 px-2 sm:px-3'>
                      <span className='font-body text-[9px] sm:text-[10px] text-slate-400'>
                        app.paymytax.com/dashboard
                      </span>
                    </div>
                  </div>

                  <div className='grid grid-cols-12'>
                    {/* Sidebar */}
                    <div className='col-span-3 hidden lg:block border-r border-slate-100 bg-slate-50/50 p-3 sm:p-4'>
                      <div className='flex items-center gap-2 mb-4 sm:mb-6'>
                        <div className='h-7 sm:h-8 w-7 sm:w-8 rounded bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center'>
                          <span className='text-white text-[10px] sm:text-xs font-bold'>
                            P
                          </span>
                        </div>
                        <span className='text-[10px] sm:text-xs font-semibold text-slate-800'>
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
                          className={`mb-0.5 flex items-center gap-2 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-medium ${i === 0 ? 'bg-primary-50 text-primary-700' : 'text-slate-400'}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Main content */}
                    <div className='col-span-12 lg:col-span-9 p-3 sm:p-5'>
                      <div className='flex items-center justify-between mb-3 sm:mb-5'>
                        <div>
                          <div className='text-xs sm:text-sm font-semibold text-slate-800'>
                            Good morning, John
                          </div>
                          <div className='font-body text-[9px] sm:text-[11px] text-slate-400'>
                            {"Here's your tax overview"}
                          </div>
                        </div>
                        <div className='flex items-center gap-1.5 sm:gap-2'>
                          <div className='h-5 sm:h-7 w-5 sm:w-7 rounded-full bg-primary-100 flex items-center justify-center'>
                            <Bell className='h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary-600' />
                          </div>
                          <div className='h-5 sm:h-7 w-5 sm:w-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold'>
                            J
                          </div>
                        </div>
                      </div>

                      {/* Stats cards - Sharper edges */}
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
                            className='rounded border border-slate-100 bg-white p-2 sm:p-3 shadow-sm'
                          >
                            <div className='font-body text-[8px] sm:text-[10px] text-slate-400'>
                              {s.label}
                            </div>
                            <div className='mt-0.5 text-[11px] sm:text-sm font-bold text-slate-800'>
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

                      {/* Chart area - Sharper edges */}
                      <div className='rounded border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-2 sm:p-4'>
                        <div className='flex items-center justify-between mb-1.5 sm:mb-3'>
                          <span className='text-[10px] sm:text-xs font-semibold text-slate-700'>
                            Monthly Revenue
                          </span>
                          <span className='font-body text-[8px] sm:text-[10px] text-slate-400 hidden sm:block'>
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
                                stopColor='#9333ea'
                                stopOpacity='0.3'
                              />
                              <stop
                                offset='100%'
                                stopColor='#9333ea'
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
                            stroke='#9333ea'
                            strokeWidth='2'
                            strokeLinecap='round'
                          />
                          <circle cx='400' cy='4' r='3' fill='#9333ea' />
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
        className='relative py-20 sm:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-white via-slate-50/30 to-white'
      >
        {/* Ambient background */}
        <div
          className='absolute inset-0 opacity-[0.03] pointer-events-none'
          style={{
            backgroundImage:
              'linear-gradient(to right, #9333ea 1px, transparent 1px), linear-gradient(to bottom, #9333ea 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 75%)',
          }}
        />
        <div className='absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-400/10 blur-[120px] rounded-full pointer-events-none' />
        <div className='absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-violet-400/10 blur-[120px] rounded-full pointer-events-none' />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          {/* Heading */}
          <ScrollReveal className='text-center mb-14 sm:mb-20'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-primary-500' />
              </span>
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent'>
                Built for Nigeria
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-5 max-w-3xl mx-auto leading-tight'>
              Making tax compliance{' '}
              <span className='bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent'>
                effortless
              </span>{' '}
              for Nigerian businesses
            </h2>
            <p className='font-body text-base sm:text-lg text-slate-500 max-w-xl mx-auto'>
              Simple tools that help you stay compliant without the headache
            </p>
          </ScrollReveal>

          {/* Content Grid */}
          <div className='grid lg:grid-cols-5 gap-10 sm:gap-12 lg:gap-16 items-center'>
            {/* Stats Grid - Sharper edges */}
            <div className='lg:col-span-2 grid grid-cols-2 gap-4 sm:gap-5'>
              {[
                {
                  icon: Landmark,
                  value: '7.5%',
                  label: 'FIRS Tax Rate',
                  iconBg: 'bg-primary-100',
                  iconColor: 'text-primary-600',
                  accent: 'from-primary-500/0 via-primary-500/60 to-primary-500/0',
                  animation: 'bounce' as const,
                },
                {
                  icon: Scale,
                  value: '100%',
                  label: 'FIRS Compliant',
                  iconBg: 'bg-violet-100',
                  iconColor: 'text-violet-600',
                  accent: 'from-violet-500/0 via-violet-500/60 to-violet-500/0',
                  animation: 'pulse' as const,
                },
                {
                  icon: Target,
                  value: '<2min',
                  label: 'Setup Time',
                  iconBg: 'bg-indigo-100',
                  iconColor: 'text-indigo-600',
                  accent: 'from-indigo-500/0 via-indigo-500/60 to-indigo-500/0',
                  animation: 'swing' as const,
                },
                {
                  icon: Calculator,
                  value: 'Auto',
                  label: 'Tax Calculation',
                  iconBg: 'bg-fuchsia-100',
                  iconColor: 'text-fuchsia-600',
                  accent: 'from-fuchsia-500/0 via-fuchsia-500/60 to-fuchsia-500/0',
                  animation: 'glow' as const,
                },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 100}>
                  <div className='group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white/70 backdrop-blur-sm p-5 sm:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200'>
                    <div
                      className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <div
                      className={`inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg ${stat.iconBg} ${stat.iconColor} mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
                    >
                      <AnimatedIcon icon={stat.icon} className='h-5 w-5 sm:h-6 sm:w-6' animation={stat.animation} delay={i * 200} />
                    </div>
                    <div className='text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 tracking-tight'>
                      {stat.value}
                    </div>
                    <div className='text-xs sm:text-sm text-slate-500 font-medium'>
                      {stat.label}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Creative Visual */}
            <ScrollReveal delay={200} className='lg:col-span-3'>
              <div className='relative mx-auto max-w-lg lg:max-w-none aspect-[5/4] sm:aspect-[6/5]'>
                {/* Glow halo */}
                <div className='absolute inset-0 bg-gradient-to-br from-primary-500/15 via-violet-500/15 to-indigo-500/15 rounded-xl blur-3xl' />

                {/* Rotating conic ring */}
                <div
                  className='absolute inset-8 rounded-full opacity-20'
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, #9333ea 60deg, transparent 120deg, #8b5cf6 180deg, transparent 240deg, #6366f1 300deg, transparent 360deg)',
                    animation: 'spin 20s linear infinite',
                    filter: 'blur(30px)',
                  }}
                />

                {/* Floating badge — top left */}
                <div
                  className='absolute top-4 left-2 sm:left-0 z-20 animate-bounce-gentle'
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className='flex items-center gap-2.5 rounded-lg bg-white/95 backdrop-blur-xl border border-slate-200/80 px-3.5 py-2.5 shadow-xl shadow-slate-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30'>
                      <CheckCircle2 className='h-5 w-5 text-white animate-icon-pulse' strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-slate-400 leading-tight'>
                        Tax Filed
                      </div>
                      <div className='text-xs font-bold text-slate-900 leading-tight'>
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
                  <div className='flex items-center gap-2.5 rounded-lg bg-white/95 backdrop-blur-xl border border-slate-200/80 px-3.5 py-2.5 shadow-xl shadow-slate-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center shadow-lg shadow-primary-500/30'>
                      <Banknote className='h-5 w-5 text-white animate-icon-swing' strokeWidth={2} />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-slate-400 leading-tight'>
                        Saved
                      </div>
                      <div className='text-xs font-bold text-slate-900 leading-tight'>
                        ₦45,000
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center card - Sharper edges */}
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='w-[85%] sm:w-[80%] rounded-lg bg-white border border-slate-200/80 shadow-2xl shadow-slate-900/10 overflow-hidden'>
                    {/* Header */}
                    <div className='px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-primary-500/5 to-violet-500/5'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2.5'>
                          <div className='h-8 w-8 rounded bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center'>
                            <PieChart className='h-4 w-4 text-white' />
                          </div>
                          <div>
                            <div className='text-[11px] sm:text-xs font-bold text-slate-800'>
                              Tax Summary
                            </div>
                            <div className='text-[9px] sm:text-[10px] text-slate-400'>
                              Q1 2026
                            </div>
                          </div>
                        </div>
                        <div className='px-2 py-1 rounded-full bg-green-50 border border-green-200'>
                          <span className='text-[9px] sm:text-[10px] font-bold text-green-600'>
                            On Track
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className='p-4 sm:p-5 space-y-3 sm:space-y-4'>
                      {/* Progress bars */}
                      {[
                        { label: 'Sales Recorded', value: 87, color: 'from-primary-500 to-violet-500' },
                        { label: 'Expenses Logged', value: 72, color: 'from-violet-500 to-indigo-500' },
                        { label: 'Tax Computed', value: 100, color: 'from-green-500 to-emerald-500' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className='flex justify-between mb-1'>
                            <span className='text-[10px] sm:text-[11px] font-medium text-slate-600'>
                              {item.label}
                            </span>
                            <span className='text-[10px] sm:text-[11px] font-bold text-slate-800'>
                              {item.value}%
                            </span>
                          </div>
                          <div className='h-1.5 bg-slate-100 rounded-full overflow-hidden'>
                            <div
                              className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Amount due */}
                      <div className='pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-slate-100'>
                        <div className='flex items-center justify-between'>
                          <span className='text-[10px] sm:text-[11px] text-slate-500'>
                            Amount Due
                          </span>
                          <span className='text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent'>
                            ₦25,500
                          </span>
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

      {/* ── Features Section ── */}
      <section
        id='features'
        className='relative py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50/50 overflow-hidden'
      >
        <div className='absolute top-0 right-0 w-[600px] h-[600px] bg-primary-400/5 blur-[150px] rounded-full pointer-events-none' />
        
        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          <ScrollReveal className='text-center mb-12 sm:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-violet-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Layers className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 animate-icon-float' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Features
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-5'>
              Everything you need to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-violet-500 to-indigo-500 bg-clip-text text-transparent'>
                stay compliant
              </span>
            </h2>
            <p className='font-body text-base sm:text-lg text-slate-500 max-w-2xl mx-auto'>
              Powerful features designed specifically for Nigerian businesses
            </p>
          </ScrollReveal>

          <StaggerReveal
            className='grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
            staggerDelay={100}
          >
            {[
              {
                icon: LineChart,
                title: 'Real-time Tracking',
                description: 'Monitor sales and expenses as they happen with live dashboard updates.',
                gradient: 'from-primary-500 to-violet-600',
                bgGradient: 'from-primary-50 to-violet-50',
              },
              {
                icon: Calculator,
                title: 'Auto Tax Computation',
                description: 'Taxes calculated automatically using the official FIRS formula.',
                gradient: 'from-violet-500 to-indigo-600',
                bgGradient: 'from-violet-50 to-indigo-50',
              },
              {
                icon: FileText,
                title: 'Professional Reports',
                description: 'Generate PDF statements ready for FIRS submission in one click.',
                gradient: 'from-indigo-500 to-primary-600',
                bgGradient: 'from-indigo-50 to-primary-50',
              },
              {
                icon: Bell,
                title: 'Smart Reminders',
                description: 'Never miss a deadline with automated tax filing reminders.',
                gradient: 'from-fuchsia-500 to-primary-600',
                bgGradient: 'from-fuchsia-50 to-primary-50',
              },
              {
                icon: Building2,
                title: 'Multi-Business',
                description: 'Manage multiple businesses from a single dashboard seamlessly.',
                gradient: 'from-primary-500 to-fuchsia-600',
                bgGradient: 'from-primary-50 to-fuchsia-50',
              },
              {
                icon: Fingerprint,
                title: 'Bank-grade Security',
                description: 'Your data encrypted with enterprise-level security protocols.',
                gradient: 'from-violet-500 to-fuchsia-600',
                bgGradient: 'from-violet-50 to-fuchsia-50',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className='group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white p-5 sm:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200'
              >
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className={`inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${feature.bgGradient} mb-4 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className='h-5 w-5 sm:h-6 sm:w-6 text-primary-600' />
                </div>
                
                <h3 className='text-base sm:text-lg font-bold text-slate-900 mb-2'>
                  {feature.title}
                </h3>
                <p className='font-body text-sm text-slate-500 leading-relaxed'>
                  {feature.description}
                </p>
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id='how-it-works'
        className='relative py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-slate-50/50 to-white overflow-hidden'
      >
        <div className='absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-400/5 blur-[150px] rounded-full pointer-events-none' />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          <ScrollReveal className='text-center mb-12 sm:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-violet-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Target className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 animate-icon-bounce' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                How It Works
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-5'>
              Three steps to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-violet-500 to-indigo-500 bg-clip-text text-transparent'>
                tax peace
              </span>
            </h2>
            <p className='font-body text-base sm:text-lg text-slate-500 max-w-xl mx-auto'>
              Get started in minutes, not hours
            </p>
          </ScrollReveal>

          <StaggerReveal
            className='grid md:grid-cols-3 gap-6 sm:gap-8'
            staggerDelay={150}
          >
            {steps.map((step, i) => (
              <div
                key={step.title}
                className='group relative'
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className='hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary-200 via-violet-200 to-transparent' />
                )}
                
                <div className='relative overflow-hidden rounded-lg border border-slate-200/80 bg-white p-6 sm:p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200'>
                  {/* Step number */}
                  <div className='absolute top-4 right-4 text-6xl sm:text-7xl font-bold text-slate-100 select-none'>
                    {i + 1}
                  </div>
                  
                  <div className='relative'>
                    <div className='inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 mb-5 sm:mb-6 shadow-lg shadow-primary-500/25 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500'>
                      <step.icon className='h-7 w-7 sm:h-8 sm:w-8 text-white' strokeWidth={1.5} />
                    </div>
                    
                    <h3 className='text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3'>
                      {step.title}
                    </h3>
                    <p className='font-body text-sm sm:text-base text-slate-500 leading-relaxed'>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </StaggerReveal>

          {/* CTA */}
          <ScrollReveal delay={400} className='text-center mt-10 sm:mt-14'>
            <Link to='/register'>
              <button className='group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary-600 to-violet-600 px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-bold text-white shadow-xl shadow-primary-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/30 active:scale-[0.98]'>
                Get started now
                <ArrowRight className='h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1' />
              </button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section
        id='testimonials'
        className='relative py-16 sm:py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50/50 overflow-hidden'
      >
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-400/5 blur-[150px] rounded-full pointer-events-none' />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          <ScrollReveal className='text-center mb-12 sm:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-violet-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Users className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 animate-icon-pulse' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Testimonials
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-5'>
              Loved by{' '}
              <span className='bg-gradient-to-r from-primary-600 via-violet-500 to-indigo-500 bg-clip-text text-transparent'>
                Nigerian businesses
              </span>
            </h2>
            <p className='font-body text-base sm:text-lg text-slate-500 max-w-xl mx-auto'>
              See what our customers have to say
            </p>
          </ScrollReveal>

          <StaggerReveal
            className='grid md:grid-cols-3 gap-5 sm:gap-6'
            staggerDelay={100}
          >
            {testimonials.map((t) => (
              <div
                key={t.name}
                className='group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white p-5 sm:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200'
              >
                {/* Quote mark */}
                <div className='absolute top-4 right-4 text-5xl font-serif text-primary-100 select-none'>
                  &ldquo;
                </div>
                
                <div className='relative'>
                  <p className='font-body text-sm sm:text-base text-slate-600 leading-relaxed mb-5 sm:mb-6'>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  
                  <div className='flex items-center gap-3'>
                    <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className='text-sm font-bold text-slate-900'>
                        {t.name}
                      </div>
                      <div className='font-body text-xs text-slate-500'>
                        {t.role}
                      </div>
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
      <section className='relative py-16 sm:py-20 lg:py-28 overflow-hidden'>
        {/* Background gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-primary-600 via-violet-600 to-indigo-700' />
        
        {/* Pattern overlay */}
        <div
          className='absolute inset-0 opacity-10'
          style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        
        {/* Glowing orbs */}
        <div className='absolute top-0 left-1/4 w-[400px] h-[400px] bg-white/10 blur-[100px] rounded-full' />
        <div className='absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-white/10 blur-[80px] rounded-full' />

        <div className='relative mx-auto max-w-4xl px-4 sm:px-6 text-center'>
          <ScrollReveal>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight'>
              Ready to simplify your taxes?
            </h2>
            <p className='font-body text-base sm:text-lg lg:text-xl text-white/80 mb-8 sm:mb-10 max-w-2xl mx-auto'>
              Join thousands of Nigerian businesses already using PayMyTax to stay compliant effortlessly.
            </p>
            
            <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
              <Link to='/register'>
                <button className='group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-bold text-primary-700 shadow-xl shadow-black/20 transition-all duration-300 hover:bg-primary-50 hover:shadow-2xl active:scale-[0.98]'>
                  Start for free
                  <ArrowRight className='h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1' />
                </button>
              </Link>
              <Link to='/login'>
                <button className='w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/50 active:scale-[0.98]'>
                  Sign in
                </button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='bg-slate-950 text-slate-400 py-12 sm:py-16'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6'>
          <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12'>
            {/* Brand */}
            <div className='sm:col-span-2 lg:col-span-1'>
              <img src='/logo.png' alt='PayMyTax' className='h-10 mb-4 brightness-0 invert opacity-90' />
              <p className='font-body text-sm leading-relaxed max-w-xs'>
                Simplifying tax compliance for Nigerian businesses. Track, compute, and pay your taxes with ease.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className='font-semibold text-white mb-4'>Product</h4>
              <ul className='space-y-2.5 font-body text-sm'>
                <li><a href='#features' className='hover:text-white transition-colors'>Features</a></li>
                <li><a href='#how-it-works' className='hover:text-white transition-colors'>How It Works</a></li>
                <li><a href='#faq' className='hover:text-white transition-colors'>FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className='font-semibold text-white mb-4'>Company</h4>
              <ul className='space-y-2.5 font-body text-sm'>
                <li><a href='#' className='hover:text-white transition-colors'>About Us</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Contact</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className='font-semibold text-white mb-4'>Legal</h4>
              <ul className='space-y-2.5 font-body text-sm'>
                <li><a href='#' className='hover:text-white transition-colors'>Privacy Policy</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className='pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4'>
            <p className='font-body text-sm'>
              &copy; {new Date().getFullYear()} PayMyTax. All rights reserved.
            </p>
            <div className='flex items-center gap-4'>
              <a href='#' className='hover:text-white transition-colors' aria-label='Twitter'>
                <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' />
                </svg>
              </a>
              <a href='#' className='hover:text-white transition-colors' aria-label='LinkedIn'>
                <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
