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
  ArrowUpRight,
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
                className='block px-4 py-3 text-[15px] font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors'
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
    color: 'from-primary-500 to-teal-600',
  },
  {
    name: 'Chioma Nwosu',
    role: 'Founder, CraftHub Lagos',
    quote:
      'Finally, a tax platform that actually understands Nigerian businesses. The reminders have saved us from FIRS penalties.',
    avatar: 'CN',
    color: 'from-teal-500 to-cyan-600',
  },
  {
    name: 'Ibrahim Musa',
    role: 'MD, Sahel Logistics',
    quote:
      'Crystal-clear picture of our tax obligations. The PDF statements look incredibly professional.',
    avatar: 'IM',
    color: 'from-emerald-500 to-primary-600',
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
          <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
            <HelpCircle className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 animate-icon-pulse' />
            <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
              FAQ
            </span>
          </span>
          <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight'>
            Common{' '}
            <span className='bg-gradient-to-r from-primary-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent'>
              questions
            </span>
          </h2>
          <p className='mt-4 sm:mt-5 font-body text-base sm:text-lg text-slate-500'>
            Everything you need to know about PayMyTax and tax compliance in
            Nigeria.
          </p>
        </ScrollReveal>

        <div className='divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm'>
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
                className='relative font-sans text-[15px] font-medium text-slate-600 hover:text-primary-600 transition-colors duration-200 py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary-500 after:to-teal-500 after:transition-all after:duration-300 hover:after:w-full'
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
              <button className='group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-500 hover:to-teal-500 active:scale-[0.98]'>
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
            backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Animated gradient orbs */}
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-primary-400/20 via-transparent to-transparent blur-3xl animate-aurora' />
        <div
          className='absolute top-32 -right-32 w-[400px] h-[400px] bg-teal-300/15 blur-3xl animate-blob-morph'
          style={{ animationDelay: '2s' }}
        />
        <div
          className='absolute top-48 -left-32 w-[350px] h-[350px] bg-cyan-300/10 blur-3xl animate-blob-morph'
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
                    <span className='bg-gradient-to-r from-primary-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent animate-gradient'>
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
                          <stop stopColor='#10b981' />
                          <stop offset='0.5' stopColor='#14b8a6' />
                          <stop offset='1' stopColor='#06b6d4' />
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

            {/* CTA Buttons */}
            <ScrollReveal delay={300}>
              <div className='mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0'>
                <Link to='/register' className='w-full sm:w-auto group'>
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-cyan-600 px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-bold text-white shadow-2xl shadow-primary-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/40 active:scale-[0.98] overflow-hidden'>
                    <span className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700' />
                    <span className='relative flex items-center gap-2'>
                      Start for free
                      <ArrowRight className='h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1' />
                    </span>
                  </button>
                </Link>
                <Link to='/login' className='w-full sm:w-auto'>
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-slate-200 bg-white/80 backdrop-blur px-7 sm:px-8 py-3.5 sm:py-4 text-[15px] sm:text-base font-semibold text-slate-700 shadow-lg transition-all duration-300 hover:border-primary-200 hover:bg-white hover:shadow-xl hover:text-primary-700 active:scale-[0.98]'>
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

            {/* Dashboard Preview */}
            <ScrollReveal delay={500}>
              <div className='mt-12 sm:mt-16 lg:mt-20 relative mx-auto max-w-5xl px-2 sm:px-0'>
                {/* Glow effect */}
                <div className='absolute -inset-8 rounded-3xl bg-gradient-to-r from-primary-500/20 via-teal-500/15 to-cyan-500/20 blur-3xl' />
                
                {/* Floating decorative elements */}
                <div
                  className='absolute -top-6 -left-6 sm:-left-10 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-primary-400/25 to-teal-400/25 blur-xl rounded-full animate-float'
                  style={{ animationDelay: '0s' }}
                />
                <div
                  className='absolute -bottom-6 -right-6 sm:-right-10 w-20 sm:w-28 h-20 sm:h-28 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 blur-xl rounded-full animate-float'
                  style={{ animationDelay: '2s' }}
                />

                {/* Browser mockup */}
                <div className='relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-900/10 mx-2 sm:mx-0'>
                  {/* Browser chrome */}
                  <div className='flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 sm:px-4 py-2 sm:py-3'>
                    <div className='flex gap-1.5'>
                      <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-red-400' />
                      <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-amber-400' />
                      <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-green-400' />
                    </div>
                    <div className='mx-auto hidden sm:flex h-5 sm:h-6 items-center rounded-md bg-slate-100 px-2 sm:px-3'>
                      <span className='font-body text-[9px] sm:text-[10px] text-slate-400'>
                        app.paymytax.com/dashboard
                      </span>
                    </div>
                  </div>

                  <div className='grid grid-cols-12'>
                    {/* Sidebar */}
                    <div className='col-span-3 hidden lg:block border-r border-slate-100 bg-slate-50/50 p-3 sm:p-4'>
                      <div className='flex items-center gap-2 mb-4 sm:mb-6'>
                        <div className='h-7 sm:h-8 w-7 sm:w-8 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center'>
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
                          className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-medium ${i === 0 ? 'bg-primary-50 text-primary-700' : 'text-slate-400'}`}
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
                          <div className='h-5 sm:h-7 w-5 sm:w-7 rounded-full bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold'>
                            J
                          </div>
                        </div>
                      </div>

                      {/* Stats cards */}
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
                            className='rounded-xl border border-slate-100 bg-white p-2 sm:p-3 shadow-sm'
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

                      {/* Chart area */}
                      <div className='rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-2 sm:p-4'>
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
                                stopColor='#10b981'
                                stopOpacity='0.3'
                              />
                              <stop
                                offset='100%'
                                stopColor='#10b981'
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
                            stroke='#10b981'
                            strokeWidth='2'
                            strokeLinecap='round'
                          />
                          <circle cx='400' cy='4' r='3' fill='#10b981' />
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
              'linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 75%)',
          }}
        />
        <div className='absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-400/10 blur-[120px] rounded-full pointer-events-none' />
        <div className='absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-teal-400/10 blur-[120px] rounded-full pointer-events-none' />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6'>
          {/* Heading */}
          <ScrollReveal className='text-center mb-14 sm:mb-20'>
            <span className='inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-primary-500' />
              </span>
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-primary-600 to-teal-600 bg-clip-text text-transparent'>
                Built for Nigeria
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-5 max-w-3xl mx-auto leading-tight'>
              Making tax compliance{' '}
              <span className='bg-gradient-to-r from-primary-600 to-teal-600 bg-clip-text text-transparent'>
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
            {/* Stats Grid */}
            <div className='lg:col-span-2 grid grid-cols-2 gap-4 sm:gap-5'>
              {[
                {
                  icon: TrendingUp,
                  value: '7.5%',
                  label: 'FIRS Tax Rate',
                  iconBg: 'bg-primary-100',
                  iconColor: 'text-primary-600',
                  accent: 'from-primary-500/0 via-primary-500/60 to-primary-500/0',
                  animation: 'bounce' as const,
                },
                {
                  icon: Shield,
                  value: '100%',
                  label: 'FIRS Compliant',
                  iconBg: 'bg-teal-100',
                  iconColor: 'text-teal-600',
                  accent: 'from-teal-500/0 via-teal-500/60 to-teal-500/0',
                  animation: 'pulse' as const,
                },
                {
                  icon: Clock,
                  value: '<2min',
                  label: 'Setup Time',
                  iconBg: 'bg-cyan-100',
                  iconColor: 'text-cyan-600',
                  accent: 'from-cyan-500/0 via-cyan-500/60 to-cyan-500/0',
                  animation: 'swing' as const,
                },
                {
                  icon: Zap,
                  value: 'Auto',
                  label: 'Tax Calculation',
                  iconBg: 'bg-amber-100',
                  iconColor: 'text-amber-600',
                  accent: 'from-amber-500/0 via-amber-500/60 to-amber-500/0',
                  animation: 'glow' as const,
                },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 100}>
                  <div className='group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-5 sm:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200'>
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
                <div className='absolute inset-0 bg-gradient-to-br from-primary-500/15 via-teal-500/15 to-cyan-500/15 rounded-3xl blur-3xl' />

                {/* Rotating conic ring */}
                <div
                  className='absolute inset-8 rounded-full opacity-20'
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, #10b981 60deg, transparent 120deg, #14b8a6 180deg, transparent 240deg, #06b6d4 300deg, transparent 360deg)',
                    animation: 'spin 20s linear infinite',
                    filter: 'blur(30px)',
                  }}
                />

                {/* Floating badge — top left */}
                <div
                  className='absolute top-4 left-2 sm:left-0 z-20 animate-bounce-gentle'
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className='flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/80 px-3.5 py-2.5 shadow-xl shadow-slate-900/10'>
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
                  <div className='flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/80 px-3.5 py-2.5 shadow-xl shadow-slate-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center shadow-lg shadow-primary-500/30'>
                      <Zap className='h-5 w-5 text-white fill-white animate-icon-glow' strokeWidth={2} />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-slate-400 leading-tight'>
                        Auto-calculated
                      </div>
                      <div className='text-xs font-bold text-slate-900 leading-tight'>
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
                  <div className='rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200/80 px-4 py-3 shadow-xl shadow-slate-900/10'>
                    <div className='flex items-center gap-2 mb-2'>
                      <TrendingUp className='h-3.5 w-3.5 text-green-500 animate-icon-bounce' />
                      <span className='text-[10px] font-semibold text-slate-700'>
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
                  <div className='relative w-[88%] sm:w-[82%] lg:w-[78%] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1 shadow-2xl shadow-slate-900/40'>
                    <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 sm:p-6 lg:p-7'>
                      {/* Subtle pattern */}
                      <div
                        className='absolute inset-0 opacity-[0.06]'
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                          backgroundSize: '20px 20px',
                        }}
                      />
                      {/* Glow corner */}
                      <div className='absolute -top-20 -right-20 w-48 h-48 bg-primary-500/25 rounded-full blur-3xl' />
                      <div className='absolute -bottom-20 -left-20 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl' />

                      <div className='relative'>
                        {/* Header */}
                        <div className='flex items-center justify-between mb-5 sm:mb-6'>
                          <div className='flex items-center gap-2'>
                            <div className='h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center'>
                              <Receipt className='h-4 w-4 text-white animate-icon-float' />
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

                        {/* Tax Payable */}
                        <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 via-teal-500 to-cyan-500 p-[1.5px]'>
                          <div className='rounded-xl bg-gradient-to-br from-primary-600/90 to-teal-600/90 backdrop-blur-sm px-4 py-3.5 sm:py-4'>
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
        className='py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-white to-slate-50/50 relative overflow-hidden'
      >
        <div
          className='absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-primary-400/10 to-teal-400/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '1s' }}
        />
        <div
          className='absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-bl from-teal-400/10 to-cyan-400/10 blur-3xl animate-blob-morph'
          style={{ animationDelay: '3s' }}
        />

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-2xl text-center mb-8 sm:mb-10'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Sparkles className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 fill-primary-500 animate-sparkle' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                Features
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight'>
              Everything you need to{' '}
              <span className='bg-gradient-to-r from-primary-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent'>
                stay compliant
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-base sm:text-lg text-slate-500 leading-relaxed'>
              Powerful tools that make tax filing feel simple
            </p>
          </ScrollReveal>

          {/* Bento Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-4 auto-rows-[minmax(180px,auto)] gap-4 sm:gap-5'>
            {/* 1. Sales & Expense Tracking — HERO (2×2) */}
            <ScrollReveal
              delay={0}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-2 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-teal-50 p-6 sm:p-7 group hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-200 transition-all duration-500'>
                <div className='absolute -top-16 -right-16 w-48 h-48 bg-primary-200/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                <div className='relative flex h-full flex-col'>
                  <div className='w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-primary-500/10 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500'>
                    <BarChart3 className='w-7 h-7 text-primary-600 group-hover:animate-icon-bounce' strokeWidth={1.5} />
                  </div>
                  <h3 className='text-xl sm:text-2xl font-bold text-slate-900 mb-3'>
                    Sales & Expense Tracking
                  </h3>
                  <p className='text-sm sm:text-base text-slate-600 leading-relaxed mb-6'>
                    Log every naira in and out. Auto-categorize transactions and
                    see profit margins at a glance.
                  </p>

                  {/* Live mini visual */}
                  <div className='mt-auto rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 p-4 shadow-sm'>
                    <div className='flex items-center justify-between mb-3'>
                      <span className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider'>
                        This month
                      </span>
                      <span className='text-[11px] font-bold text-green-600'>
                        +24% ↑
                      </span>
                    </div>
                    <div className='space-y-2.5'>
                      <div>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs text-slate-500'>Sales</span>
                          <span className='text-xs font-bold text-slate-800 tabular-nums'>
                            ₦700K
                          </span>
                        </div>
                        <div className='h-2 rounded-full bg-slate-100 overflow-hidden'>
                          <div className='h-full w-[85%] rounded-full bg-gradient-to-r from-primary-500 to-teal-500' />
                        </div>
                      </div>
                      <div>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs text-slate-500'>Expenses</span>
                          <span className='text-xs font-bold text-slate-800 tabular-nums'>
                            ₦360K
                          </span>
                        </div>
                        <div className='h-2 rounded-full bg-slate-100 overflow-hidden'>
                          <div className='h-full w-[45%] rounded-full bg-gradient-to-r from-cyan-400 to-teal-400' />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 2. FIRS-Compliant — small (1×1) */}
            <ScrollReveal delay={100} className='lg:col-span-1 lg:row-span-1 h-full'>
              <div className='group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5 transition-all duration-300'>
                <div className='w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300'>
                  <Shield className='w-5 h-5 text-primary-600 group-hover:animate-icon-pulse' strokeWidth={1.5} />
                </div>
                <h3 className='text-base font-bold text-slate-900 mb-1.5'>
                  FIRS-Compliant
                </h3>
                <p className='text-xs sm:text-sm text-slate-600 leading-relaxed'>
                  7.5% VAT calculator follows FIRS rules precisely
                </p>
              </div>
            </ScrollReveal>

            {/* 3. One-Click Payment — small (1×1) */}
            <ScrollReveal delay={200} className='lg:col-span-1 lg:row-span-1 h-full'>
              <div className='group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5 transition-all duration-300'>
                <div className='w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300'>
                  <CreditCard className='w-5 h-5 text-teal-600 group-hover:animate-icon-bounce' strokeWidth={1.5} />
                </div>
                <h3 className='text-base font-bold text-slate-900 mb-1.5'>
                  One-Click Payment
                </h3>
                <p className='text-xs sm:text-sm text-slate-600 leading-relaxed'>
                  Pay instantly via Paystack — card, transfer, or USSD
                </p>
              </div>
            </ScrollReveal>

            {/* 4. Smart Tax Reminders — wide (2×1) */}
            <ScrollReveal
              delay={300}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-1 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-teal-50 p-5 sm:p-6 group hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-500'>
                <div className='flex items-center gap-5 h-full'>
                  <div className='flex-shrink-0 w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-cyan-500/10 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500'>
                    <Bell className='w-6 h-6 text-cyan-600 group-hover:animate-icon-swing' strokeWidth={1.5} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-lg sm:text-xl font-bold text-slate-900 mb-1'>
                      Smart Tax Reminders
                    </h3>
                    <p className='text-xs sm:text-sm text-slate-600 leading-relaxed'>
                      Never miss a deadline. Automated notifications keep you
                      penalty-free.
                    </p>
                  </div>
                  {/* Date chip */}
                  <div className='hidden sm:flex flex-shrink-0 flex-col items-center justify-center w-14 h-16 rounded-xl bg-white border border-cyan-200 shadow-sm'>
                    <div className='text-[9px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 w-full text-center py-0.5 rounded-t-[10px]'>
                      Apr
                    </div>
                    <div className='text-xl font-bold text-slate-900 flex-1 flex items-center'>
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
              <div className='group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/40 p-5 sm:p-6 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-500'>
                <div className='flex h-full flex-col'>
                  <div className='w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500'>
                    <TrendingUp className='w-6 h-6 text-primary-600 group-hover:animate-icon-bounce' strokeWidth={1.5} />
                  </div>
                  <h3 className='text-lg font-bold text-slate-900 mb-2'>
                    Real-Time Dashboard
                  </h3>
                  <p className='text-sm text-slate-600 leading-relaxed mb-5'>
                    {"Bird's-eye view of revenue, expenses & tax liability."}
                  </p>

                  {/* Live chart */}
                  <div className='mt-auto rounded-xl bg-white border border-slate-100 p-3 shadow-sm'>
                    <svg viewBox='0 0 120 50' className='w-full h-14'>
                      <defs>
                        <linearGradient id='dashChartGrad' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='0%' stopColor='#10b981' stopOpacity='0.3' />
                          <stop offset='100%' stopColor='#10b981' stopOpacity='0' />
                        </linearGradient>
                      </defs>
                      <path
                        d='M0,42 L20,36 L40,38 L60,22 L80,28 L100,14 L120,8 L120,50 L0,50 Z'
                        fill='url(#dashChartGrad)'
                      />
                      <path
                        d='M0,42 L20,36 L40,38 L60,22 L80,28 L100,14 L120,8'
                        fill='none'
                        stroke='#10b981'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <circle cx='120' cy='8' r='3' fill='#10b981' />
                    </svg>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 6. PDF Statements — wide + tall (3×2) */}
            <ScrollReveal
              delay={500}
              className='sm:col-span-2 lg:col-span-3 lg:row-span-2 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-900/20'>
                {/* Subtle grid */}
                <div
                  className='absolute inset-0 opacity-[0.04]'
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />
                {/* Glow */}
                <div className='absolute -top-24 -right-24 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl group-hover:bg-primary-500/30 transition-colors duration-500' />
                <div className='absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-colors duration-500' />

                <div className='relative flex flex-col lg:flex-row items-center justify-between gap-6 h-full'>
                  <div className='flex-1'>
                    <div className='w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500'>
                      <FileText className='w-7 h-7 text-white group-hover:animate-icon-float' strokeWidth={1.5} />
                    </div>
                    <h3 className='text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3'>
                      Professional PDF Statements
                    </h3>
                    <p className='text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mb-6'>
                      Generate clean, accountant-ready tax reports with a single click. Perfect for audits or bookkeeping.
                    </p>
                    <button className='inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors'>
                      View sample
                      <ArrowUpRight className='h-4 w-4' />
                    </button>
                  </div>

                  {/* PDF Preview */}
                  <div className='relative lg:w-[300px] aspect-[3/4] max-w-[250px] lg:max-w-none'>
                    <div className='absolute inset-0 rounded-lg bg-white shadow-2xl shadow-primary-900/30 overflow-hidden transform rotate-3 group-hover:rotate-6 transition-transform duration-500'>
                      <div className='h-full bg-gradient-to-b from-slate-50 to-white p-4'>
                        <div className='flex items-center gap-2 mb-4'>
                          <div className='h-8 w-8 rounded bg-gradient-to-br from-primary-500 to-teal-600' />
                          <div className='flex-1'>
                            <div className='h-2 w-20 bg-slate-200 rounded' />
                            <div className='h-1.5 w-14 bg-slate-100 rounded mt-1' />
                          </div>
                        </div>
                        <div className='h-2 w-full bg-slate-100 rounded mb-2' />
                        <div className='h-2 w-3/4 bg-slate-100 rounded mb-4' />
                        <div className='grid grid-cols-3 gap-2 mb-4'>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className='rounded bg-slate-50 p-2'>
                              <div className='h-1 w-full bg-slate-100 rounded mb-1' />
                              <div className='h-3 w-full bg-gradient-to-r from-primary-100 to-teal-100 rounded' />
                            </div>
                          ))}
                        </div>
                        <div className='h-16 w-full bg-gradient-to-r from-primary-50 to-teal-50 rounded border border-primary-100/50' />
                      </div>
                    </div>
                    <div className='absolute inset-0 rounded-lg bg-white shadow-2xl shadow-primary-900/20 overflow-hidden -rotate-3 group-hover:-rotate-6 transition-transform duration-500'>
                      <div className='h-full bg-gradient-to-b from-slate-50 to-white p-4'>
                        <div className='flex items-center gap-2 mb-4'>
                          <div className='h-8 w-8 rounded bg-gradient-to-br from-primary-500 to-teal-600' />
                          <div className='flex-1'>
                            <div className='h-2 w-20 bg-slate-200 rounded' />
                            <div className='h-1.5 w-14 bg-slate-100 rounded mt-1' />
                          </div>
                        </div>
                        <div className='h-2 w-full bg-slate-100 rounded mb-2' />
                        <div className='h-2 w-3/4 bg-slate-100 rounded mb-4' />
                        <div className='grid grid-cols-3 gap-2 mb-4'>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className='rounded bg-slate-50 p-2'>
                              <div className='h-1 w-full bg-slate-100 rounded mb-1' />
                              <div className='h-3 w-full bg-gradient-to-r from-primary-100 to-teal-100 rounded' />
                            </div>
                          ))}
                        </div>
                        <div className='h-16 w-full bg-gradient-to-r from-primary-50 to-teal-50 rounded border border-primary-100/50' />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id='how-it-works'
        className='py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-slate-50/50 to-white relative overflow-hidden'
      >
        <div className='absolute inset-0 opacity-[0.02]' style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-2xl text-center mb-12 sm:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Zap className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary-500 fill-primary-500 animate-icon-glow' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-600'>
                How It Works
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight'>
              Get started in{' '}
              <span className='bg-gradient-to-r from-primary-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent'>
                3 simple steps
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-base sm:text-lg text-slate-500'>
              From signup to filing — it only takes minutes
            </p>
          </ScrollReveal>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8'>
            {steps.map((step, i) => (
              <ScrollReveal key={step.title} delay={i * 150}>
                <div className='group relative h-full'>
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className='hidden md:block absolute top-16 left-[calc(50%+60px)] w-[calc(100%-120px)] h-0.5 bg-gradient-to-r from-primary-200 via-teal-200 to-primary-200' />
                  )}
                  
                  <div className='relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 transition-all duration-500 hover:shadow-xl hover:shadow-primary-500/5 hover:border-primary-200 hover:-translate-y-1'>
                    {/* Step number */}
                    <div className='absolute top-4 right-4 text-5xl sm:text-6xl font-bold text-slate-100 select-none'>
                      {i + 1}
                    </div>
                    
                    <div className='relative'>
                      <div className='w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-teal-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500'>
                        <step.icon className='w-7 h-7 text-primary-600 group-hover:animate-icon-bounce' strokeWidth={1.5} />
                      </div>
                      <h3 className='text-lg sm:text-xl font-bold text-slate-900 mb-3'>
                        {step.title}
                      </h3>
                      <p className='font-body text-sm sm:text-[15px] text-slate-500 leading-relaxed'>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section
        id='testimonials'
        className='py-12 sm:py-16 lg:py-20 relative overflow-hidden'
      >
        <div className='absolute inset-0 z-0'>
          <img
            src='https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1600&h=900&fit=crop&q=80'
            alt=''
            className='w-full h-full object-cover object-center'
          />
          <div className='absolute inset-0 bg-white/90 backdrop-blur-sm' />
          <div className='absolute inset-0 bg-gradient-to-b from-white via-transparent to-white' />
        </div>

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative z-10'>
          <ScrollReveal className='mx-auto max-w-2xl text-center mb-10 sm:mb-14 lg:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100/50 px-4 sm:px-5 py-1.5 mb-5 sm:mb-6 shadow-sm'>
              <Star className='h-3.5 sm:h-4 w-3.5 sm:w-4 text-amber-500 fill-amber-500 animate-icon-pulse' />
              <span className='font-body text-xs sm:text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-primary-600 to-teal-600 bg-clip-text text-transparent'>
                Testimonials
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight'>
              Loved by{' '}
              <span className='bg-gradient-to-r from-primary-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent'>
                business owners
              </span>
            </h2>
            <p className='mt-4 sm:mt-5 font-body text-base sm:text-lg text-slate-500'>
              {"Don't just take our word for it. Here's what real Nigerian entrepreneurs are saying."}
            </p>
          </ScrollReveal>

          <StaggerReveal
            staggerDelay={150}
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
          >
            {testimonials.map((t) => (
              <div
                key={t.name}
                className='group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 lg:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-200/50 hover:-translate-y-1'
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className='absolute top-4 right-6 sm:right-8 text-5xl sm:text-6xl lg:text-7xl font-serif bg-gradient-to-br from-primary-100 to-teal-50 bg-clip-text text-transparent leading-none select-none'>
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

                <p className='font-body text-sm sm:text-[15px] lg:text-base leading-relaxed text-slate-600 relative z-10'>
                  "{t.quote}"
                </p>

                <div className='mt-6 sm:mt-8 flex items-center gap-4 pt-5 border-t border-slate-100'>
                  <div
                    className={`relative flex h-12 sm:h-14 w-12 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white text-base sm:text-lg font-bold shadow-xl shadow-primary-500/20`}
                  >
                    {t.avatar}
                    <div className='absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 border-2 border-white' />
                  </div>
                  <div>
                    <div className='text-base sm:text-lg font-bold text-slate-900'>
                      {t.name}
                    </div>
                    <div className='font-body text-xs sm:text-sm text-slate-500'>
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

      {/* ── Footer ── */}
      <footer className='bg-slate-950 text-slate-400'>
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
              <p className='mt-4 sm:mt-5 max-w-sm font-body text-sm sm:text-base leading-relaxed text-slate-500'>
                The simplest way for Nigerian SMEs to track sales, compute
                taxes, and stay FIRS-compliant.
              </p>
            </div>

            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 sm:mb-6'>
                Product
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                {['Features', 'How It Works', 'Testimonials', 'FAQ'].map(
                  (item) => (
                    <a
                      key={item}
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                      className='block font-body text-sm sm:text-[15px] text-slate-500 hover:text-white transition-colors duration-200'
                    >
                      {item}
                    </a>
                  ),
                )}
              </div>
            </div>

            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 sm:mb-6'>
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
                    className='block font-body text-sm sm:text-[15px] text-slate-500 hover:text-white transition-colors duration-200'
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 sm:mb-6'>
                Support
              </h4>
              <div className='space-y-3 sm:space-y-4'>
                <a
                  href='#faq'
                  className='block font-body text-sm sm:text-[15px] text-slate-500 hover:text-white transition-colors duration-200'
                >
                  Help & FAQ
                </a>
                <a
                  href='mailto:support@paymytax.com'
                  className='block font-body text-sm sm:text-[15px] text-slate-500 hover:text-white transition-colors duration-200'
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>

          <div className='mt-10 sm:mt-14 lg:mt-16 pt-6 sm:pt-8 border-t border-slate-800 flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
            <p className='font-body text-xs sm:text-[15px] text-slate-600 text-center sm:text-left'>
              © {new Date().getFullYear()} PayMyTax by WallX. All rights
              reserved.
            </p>
            <div className='flex items-center gap-1.5 font-body text-xs sm:text-[15px] text-slate-600'>
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
