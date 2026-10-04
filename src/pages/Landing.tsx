import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  ShieldCheck,
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
  BadgeCheck,
  Menu,
  BarChart3,
  Wallet,
  Zap,
  X,
  Lock,
  Globe2,
} from 'lucide-react';
import Button from '@/components/ui/Button.tsx';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import OptimizedLogo from '@/components/ui/OptimizedLogo.tsx';

/* ─── High-Performance Shared Scroll Observer ─── */
let sharedObserver: IntersectionObserver | null = null;
const observerCallbacks = new Map<Element, () => void>();

function getSharedObserver() {
  if (typeof window === 'undefined') return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = observerCallbacks.get(entry.target);
            if (cb) {
              cb();
              observerCallbacks.delete(entry.target);
            }
            sharedObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: '120px 0px 80px 0px' },
    );
  }
  return sharedObserver;
}

function useScrollAnimation<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Immediately reveal if already in/near viewport on mount
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight + 120 && rect.bottom > -80) {
      setIsVisible(true);
      return;
    }

    const observer = getSharedObserver();
    if (!observer) {
      setIsVisible(true);
      return;
    }

    observerCallbacks.set(element, () => setIsVisible(true));
    observer.observe(element);

    return () => {
      observerCallbacks.delete(element);
      observer?.unobserve(element);
    };
  }, []);

  return { ref, isVisible };
}

/* ─── Fast & Crisp Scroll Reveal Components ─── */
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
  const effectiveDelay = Math.min(delay, 120);

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform] ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transitionDelay: `${effectiveDelay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function StaggerReveal({
  children,
  className = '',
  staggerDelay = 35,
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
          className='transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]'
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
            transitionDelay: isVisible
              ? `${Math.min(i * staggerDelay, 180)}ms`
              : '0ms',
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);

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
        <div className='flex flex-col h-full overflow-y-auto overscroll-contain'>
          <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0'>
            <OptimizedLogo size='md' className='h-8 w-auto' />
            <button
              onClick={onClose}
              className='min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 hover:bg-gray-100 rounded-xl transition-colors'
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
          <div className='p-4 border-t border-gray-100 space-y-3 shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]'>
            {isAuthenticated ? (
              <>
                <Link
                  to='/dashboard'
                  onClick={onClose}
                  className='flex items-center gap-3 p-3 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50/70 to-purple-50/50 hover:from-primary-50 hover:to-purple-50 transition-all group'
                >
                  <div className='flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-purple-600 text-white text-sm font-bold shrink-0 overflow-hidden ring-2 ring-white shadow-sm'>
                    {activeBusiness?.logoUrl ? (
                      <img
                        src={activeBusiness.logoUrl}
                        alt={activeBusiness.businessName}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      (activeBusiness?.businessName || user?.email || 'B')
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  <div className='min-w-0 flex-1 text-left'>
                    <p className='text-sm font-bold text-gray-900 truncate'>
                      {activeBusiness?.businessName ||
                        user?.email?.split('@')[0] ||
                        'My Business'}
                    </p>
                    <p className='text-xs font-semibold text-primary-600 flex items-center gap-1 group-hover:text-primary-700'>
                      Go to Dashboard <ArrowRight className='h-3 w-3' />
                    </p>
                  </div>
                </Link>
                <Link to='/dashboard' onClick={onClose} className='block'>
                  <Button className='w-full justify-center rounded-full'>
                    Open Dashboard <ArrowRight className='h-4 w-4' />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to='/login' onClick={onClose} className='block'>
                  <Button
                    variant='ghost'
                    className='w-full justify-center rounded-full'
                  >
                    Sign in
                  </Button>
                </Link>
                <Link to='/register' className='block'>
                  <Button className='w-full justify-center rounded-full'>
                    Get Started <ArrowRight className='h-4 w-4' />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Data ─── */
const testimonials = [
  {
    name: 'Adebayo Ogunlesi',
    role: 'CEO, Greenfield Ventures',
    quote:
      'WallXERP completely transformed how we handle taxes. What used to take our accountant days now takes minutes.',
    avatar: 'AO',
    color: 'from-violet-500 to-purple-600',
  },
  {
    name: 'Chioma Nwosu',
    role: 'Founder, CraftHub Lagos',
    quote:
      'Finally, a tax platform that actually understands Nigerian businesses. The reminders have saved us from NRS penalties.',
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
    q: 'Is wallXTax really free to use?',
    a: 'Yes! wallXTax is completely free for small businesses. No monthly fees, no hidden charges. We only charge a small, transparent processing fee when you pay taxes through the platform — and even that goes toward your convenience.',
  },
  {
    q: 'How does the AI Virtual CFO help my business?',
    a: 'Think of it as having a financial expert in your pocket 24/7. Our AI analyzes your sales, expenses, and cash flow to give you smart recommendations like "Stock up on inventory now" or "You can save ₦50K on taxes this month." It learns your business patterns and alerts you to opportunities you might miss.',
  },
  {
    q: 'Can I track my business from my phone?',
    a: "Absolutely! Record sales, log expenses, check your cash position, and even send invoices — all from your mobile device. Whether you're at the market, in a meeting, or on the go, your business data is always at your fingertips.",
  },
  {
    q: 'What happens to my debtors? Can the app help me get paid?',
    a: "Yes! Our Debtors Management feature tracks who owes you, sends automated payment reminders, and shows you which customers pay on time. You'll never forget who owes what, and your customers get professional reminders without awkward phone calls.",
  },
  {
    q: 'How is my tax calculated? Is it really NRS-compliant?',
    a: '100% NRS-compliant. We use the official formula: Tax Payable = 7.5% × Gross Profit (Sales minus Expenses). Every calculation is auditable and matches exactly what NRS expects — no guesswork, no penalties.',
  },
  {
    q: 'Can I open a business bank account through the app?',
    a: 'Yes! We partner with licensed Nigerian banks to help you open a dedicated business account directly from the app. It integrates seamlessly with your sales and expense tracking, making reconciliation effortless.',
  },
  {
    q: 'Is my financial data secure?',
    a: "Absolutely. We use the same bank-grade AES-256 encryption and TLS 1.3 security that protect major Nigerian banks. Your data is encrypted both in transit and at rest. We never share your information with third parties, and all payments go through Paystack's secure infrastructure.",
  },
  {
    q: 'What if I already use accounting software?',
    a: "wallXTax complements your existing tools. You can import your data, or use us as your primary system — we're designed to be simple enough for non-accountants while powerful enough to replace complex software. Many businesses switch completely because we're easier and smarter.",
  },
  {
    q: 'Can I manage multiple businesses from one account?',
    a: 'Yes! Switch between unlimited businesses with one click. Perfect if you run multiple ventures, manage businesses for family members, or have separate brands. Each business gets its own dashboard, reports, and tax calculations.',
  },
  {
    q: 'Do I need accounting knowledge to use this?',
    a: 'Not at all! We built wallXTax for business owners, not accountants. If you can send a WhatsApp message, you can use our app. The interface is intuitive, and the AI CFO explains everything in plain English — no jargon, no confusion.',
  },
  {
    q: 'How fast can I start using it?',
    a: "Under 5 minutes. Sign up, add your business details, and you're live. Import past transactions if you have them, or start fresh. You'll be tracking your first sale before your coffee gets cold.",
  },
  {
    q: 'What if I miss a tax deadline?',
    a: "You won't — that's the point! Our Smart Notifications send you reminders days before any NRS deadline. You'll get alerts via email, SMS, and in-app notifications. We've helped thousands avoid penalties by keeping them ahead of deadlines.",
  },
  {
    q: 'Can I generate invoices for my customers?',
    a: 'Yes! Create professional, branded e-invoices in seconds. Add your logo, payment terms, and bank details. Customers receive them instantly via email or WhatsApp, and you track payment status in real-time — no more chasing paper receipts.',
  },
  {
    q: 'How does the Cash at Hand feature work?',
    a: 'It gives you a live, accurate picture of your cash position at any moment. Every sale, expense, and bank transaction updates your balance instantly. No more surprises. You always know exactly how much cash you have available to reinvest or pay bills.',
  },
  {
    q: 'What kind of support do I get?',
    a: 'You get real human support via email, WhatsApp, and in-app chat. Plus, our AI CFO answers common questions instantly. Most issues are resolved within hours, not days. We also have video tutorials and a comprehensive help center.',
  },
];

const trustIndicators = [
  { icon: Shield, text: 'High Data Encryption' },
  { icon: CreditCard, text: 'Practical Growth Metrics' },
  { icon: Clock, text: 'Setup in 5 minutes' },
];

/* ─── FAQ Accordion ─── */
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id='faq'
      className='scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-white relative overflow-hidden'
    >
      <div className='mx-auto max-w-3xl px-4 sm:px-6'>
        <ScrollReveal className='text-center mb-12 sm:mb-14'>
          <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
            <HelpCircle className='h-3.5 w-3.5 text-primary-600' />
            <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
              Got Questions?
            </span>
          </span>
          <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug max-w-3xl mx-auto'>
            Frequently asked{' '}
            <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
              questions
            </span>
          </h2>
          <p className='mt-4 font-body text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed'>
            Everything you need to know about wallXTax and how it transforms
            your business
          </p>
        </ScrollReveal>

        <div className='divide-y divide-gray-200/50 rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur overflow-hidden shadow-sm'>
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
                    className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className='overflow-hidden'>
                    <p className='px-4 sm:px-6 pb-4 sm:pb-5 font-body text-sm sm:text-base leading-relaxed text-gray-600'>
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

/* ─── Interactive 3D Hero Mockup Component (Zero-dependency Motion) ─── */
function HeroDashboardPreview() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (y - 0.5) * -10,
      y: (x - 0.5) * 14,
    });
    setMousePos({ x: x * 100, y: y * 100 });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className='mt-10 sm:mt-14 lg:mt-16 relative mx-auto max-w-5xl px-2 sm:px-0'>
      {/* Dynamic ambient backdrops */}
      <div
        className={`absolute -inset-8 rounded-3xl bg-gradient-to-r from-primary-500/25 via-purple-500/15 to-pink-500/25 blur-3xl transition-opacity duration-300 pointer-events-none ${
          isHovered ? 'opacity-80' : 'opacity-40'
        }`}
      />
      <div className='absolute -top-4 -left-4 sm:-left-8 w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-br from-primary-400/20 to-purple-400/20 blur-xl pointer-events-none' />
      <div className='absolute -bottom-4 -right-4 sm:-right-8 w-20 sm:w-32 h-20 sm:h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-xl pointer-events-none' />
      <div className='absolute top-1/2 -right-6 w-12 h-12 bg-gradient-to-br from-fuchsia-400/15 to-purple-400/15 blur-lg pointer-events-none' />

      {/* Floating Badge 1 - Top Left: Live NRS Engine Active */}
      <div
        className='absolute -top-4 -left-1 sm:-left-5 z-30 hidden sm:flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md border border-gray-200/80 px-3.5 py-1.5 shadow-lg shadow-primary-900/10 transition-all duration-300 hover:scale-105 animate-bounce-gentle select-none cursor-default'
        style={{ animationDuration: '6s' }}
      >
        <span className='relative flex h-2 w-2'>
          <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
          <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
        </span>
        <span className='text-xs font-bold text-gray-800 tracking-tight'>
          NRS Engine Active
        </span>
      </div>

      {/* Floating Badge 2 - Bottom Right: Auto Tax Calculation */}
      <div
        className='absolute -bottom-4 -right-1 sm:-right-5 z-30 hidden sm:flex items-center gap-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200/80 px-3.5 py-2 shadow-lg shadow-primary-900/10 transition-all duration-300 hover:scale-105 animate-sway select-none cursor-default'
        style={{ animationDuration: '7s', animationDelay: '1s' }}
      >
        <div className='h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white shadow-sm'>
          <Zap className='h-3.5 w-3.5 fill-current' />
        </div>
        <div className='text-left'>
          <div className='text-[9px] uppercase font-bold text-gray-600 leading-tight'>
            Auto-calculated
          </div>
          <div className='text-xs font-bold text-gray-900 tabular-nums leading-tight'>
            ₦25,500 in 0.3s
          </div>
        </div>
      </div>

      {/* 3D Interactive Browser Mockup Container */}
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className='relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl shadow-primary-900/10 mx-2 sm:mx-0 will-change-transform'
        style={{
          transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${isHovered ? 1.015 : 1}, ${isHovered ? 1.015 : 1}, 1)`,
          transition: isHovered
            ? 'transform 0.12s ease-out'
            : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Dynamic Specular Light Glare following mouse */}
        {isHovered && (
          <div
            className='absolute inset-0 pointer-events-none z-20 transition-opacity duration-300'
            style={{
              background: `radial-gradient(circle 420px at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.45), transparent 80%)`,
            }}
          />
        )}

        {/* Browser Top Bar */}
        <div className='flex items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-3 sm:px-4 py-2 sm:py-3'>
          <div className='flex gap-1.5'>
            <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-red-400 transition-transform duration-200 hover:scale-125' />
            <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-amber-400 transition-transform duration-200 hover:scale-125' />
            <span className='h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-green-400 transition-transform duration-200 hover:scale-125' />
          </div>
          <div className='mx-auto hidden sm:flex h-5 sm:h-6 items-center rounded-md bg-gray-100 px-2 sm:px-3'>
            <span className='font-body text-[9px] sm:text-[10px] text-gray-600 font-medium'>
              app.paymytax.com/dashboard
            </span>
          </div>
        </div>

        <div className='grid grid-cols-12'>
          <div className='col-span-3 hidden lg:block border-r border-gray-100 bg-gray-50/50 p-3 sm:p-4'>
            <div className='flex items-center gap-2 mb-4 sm:mb-6'>
              <div className='h-7 sm:h-8 w-7 sm:w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm'>
                <span className='text-white text-[10px] sm:text-xs font-bold'>
                  P
                </span>
              </div>
              <span className='text-[10px] sm:text-xs font-semibold text-gray-800'>
                WallXERP
              </span>
            </div>
            {['Dashboard', 'Sales', 'Expenses', 'Tax Reports', 'Payments'].map(
              (item, i) => (
                <div
                  key={item}
                  className={`mb-0.5 flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-medium transition-colors ${
                    i === 0
                      ? 'bg-primary-50 text-primary-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  {item}
                </div>
              ),
            )}
          </div>

          <div className='col-span-12 lg:col-span-9 p-3 sm:p-5'>
            <div className='flex items-center justify-between mb-3 sm:mb-5'>
              <div>
                <div className='text-xs sm:text-sm font-semibold text-gray-800'>
                  Good morning, John
                </div>
                <div className='font-body text-[9px] sm:text-[11px] text-gray-600 font-medium'>
                  Here's your tax overview
                </div>
              </div>
              <div className='flex items-center gap-1.5 sm:gap-2'>
                <div className='relative h-6 sm:h-7 w-6 sm:w-7 rounded-full bg-primary-100 flex items-center justify-center group hover:bg-primary-200 transition-colors cursor-pointer'>
                  <Bell className='h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary-600 group-hover:rotate-12 transition-transform' />
                  <span className='absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500 animate-ping' />
                  <span className='absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500' />
                </div>
                <div className='h-6 sm:h-7 w-6 sm:w-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold shadow-sm'>
                  J
                </div>
              </div>
            </div>

            <div className='grid grid-cols-3 gap-1.5 sm:gap-3 mb-3 sm:mb-5'>
              {[
                {
                  label: 'Total Sales',
                  value: '₦700,000',
                  change: '+12%',
                  color: 'text-emerald-700',
                },
                {
                  label: 'Total Expenses',
                  value: '₦360,000',
                  change: '-3%',
                  color: 'text-red-600',
                },
                {
                  label: 'Tax Payable',
                  value: '₦25,500',
                  change: '7.5%',
                  color: 'text-primary-700',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className='rounded border border-gray-100 bg-white p-1.5 sm:p-3 shadow-xs min-w-0 transition-all duration-300 hover:shadow-md hover:border-primary-200 hover:-translate-y-0.5 cursor-default'
                >
                  <div className='font-body text-[8px] sm:text-[10px] text-gray-600 font-medium truncate'>
                    {s.label}
                  </div>
                  <div className='mt-0.5 text-[10px] sm:text-sm font-bold text-gray-800 tabular-nums truncate'>
                    {s.value}
                  </div>
                  <div
                    className={`mt-0.5 font-body text-[8px] sm:text-[10px] font-semibold ${s.color}`}
                  >
                    {s.change}
                  </div>
                </div>
              ))}
            </div>

            <div className='rounded border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-2 sm:p-4'>
              <div className='flex items-center justify-between mb-1.5 sm:mb-3'>
                <span className='text-[10px] sm:text-xs font-semibold text-gray-700'>
                  Monthly Revenue
                </span>
                <span className='font-body text-[8px] sm:text-[10px] text-gray-600 font-medium hidden sm:block'>
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
                    <stop offset='0%' stopColor='#7c3aed' stopOpacity='0.35' />
                    <stop offset='100%' stopColor='#7c3aed' stopOpacity='0' />
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
                <circle
                  cx='400'
                  cy='4'
                  r='3.5'
                  fill='#7c3aed'
                  className='animate-pulse'
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Footer ─── */
const FOOTER_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
];

const FOOTER_ACCOUNT_LINKS = [
  { label: 'Create Account', to: '/register' },
  { label: 'Sign In', to: '/login' },
  { label: 'Dashboard', to: '/dashboard' },
];

const FOOTER_SUPPORT_LINKS = [
  { label: 'Help & FAQ', href: '#faq' },
  { label: 'Contact Us', href: 'mailto:support@paymytax.com' },
];

/* Colour lift + underline wipe that hugs the text width, mirroring the header
   nav idiom. `block w-fit` (not `inline-block`) keeps one link per line — an
   inline-block would let short labels share a line and collide with `space-y`. */
const FOOTER_LINK =
  'relative block w-fit font-body text-sm sm:text-[15px] text-gray-400 ' +
  'transition-colors duration-200 hover:text-white ' +
  'after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-current ' +
  'after:transition-all after:duration-300 after:ease-out hover:after:w-full ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 focus-visible:rounded-sm ' +
  'motion-reduce:transition-none motion-reduce:after:transition-none';

/* ─── Component ─── */
export default function Landing() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);

  useEffect(() => {
    if (isAuthenticated) {
      if (!user) void fetchMe();
      if (!activeBusiness) void fetchBusinesses();
    }
  }, [isAuthenticated, user, activeBusiness, fetchMe, fetchBusinesses]);

  return (
    <div className='min-h-screen bg-white overflow-x-hidden'>
      {/* ── Navigation ── */}
      <header className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3'>
          <Link to='/' className='flex items-center gap-2 sm:gap-3'>
            <OptimizedLogo
              size='lg'
              className='h-8 sm:h-10 lg:h-12 w-auto'
              fetchPriority='high'
            />
          </Link>
          <nav className='hidden lg:flex items-center gap-6 xl:gap-8 my-3'>
            {['Features', 'How It Works', 'Testimonials', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className='relative font-sans text-[15px] xl:text-[16px] font-medium text-gray-600 hover:text-primary-600 transition-colors duration-200 py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary-500 after:transition-all after:duration-300 hover:after:w-full'
              >
                {item}
              </a>
            ))}
          </nav>
          <div className='flex items-center gap-2 sm:gap-3'>
            {isAuthenticated ? (
              <Link
                to='/dashboard'
                className='flex items-center gap-2 sm:gap-3 rounded-full border border-gray-200/80 bg-white/95 hover:bg-gray-50/90 pl-1.5 pr-1.5 sm:pr-4 py-1.5 shadow-sm hover:shadow-md transition-all duration-200 group'
                title='Go to Dashboard'
              >
                <div className='flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-purple-600 text-white text-xs sm:text-sm font-bold shrink-0 overflow-hidden ring-2 ring-primary-100 shadow-sm'>
                  {activeBusiness?.logoUrl ? (
                    <img
                      src={activeBusiness.logoUrl}
                      alt={activeBusiness.businessName}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    (activeBusiness?.businessName || user?.email || 'B')
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <div className='text-left min-w-0 hidden sm:block'>
                  <p className='text-xs sm:text-sm font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[160px] leading-tight'>
                    {activeBusiness?.businessName ||
                      user?.email?.split('@')[0] ||
                      'My Business'}
                  </p>
                  <p className='text-[10px] sm:text-[11px] font-semibold text-primary-600 flex items-center gap-1 leading-tight group-hover:text-primary-700'>
                    <span>Dashboard</span>
                    <ArrowRight className='h-2.5 w-2.5 sm:h-3 sm:w-3 transition-transform group-hover:translate-x-0.5' />
                  </p>
                </div>
              </Link>
            ) : (
              <>
                <Link to='/login' className='hidden sm:block'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='rounded-full px-4 py-2 text-sm xl:text-[15px] font-semibold text-gray-700 hover:text-primary-600 hover:bg-gray-100/80 transition-all duration-200'
                  >
                    Sign in
                  </Button>
                </Link>
                <Link to='/register' className='hidden sm:block'>
                  <button className='inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white px-5 py-2 text-sm xl:text-[15px] font-semibold shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200'>
                    Get Started <ArrowRight className='h-4 w-4' />
                  </button>
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileNavOpen(true)}
              className='lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors'
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
      <section className='relative pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 lg:pb-16 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-b from-primary-50/80 via-white to-white' />
        <div
          className='absolute inset-0 opacity-[0.03]'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237c3aed' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary-400/15 via-transparent to-transparent blur-3xl pointer-events-none' />
        <div className='absolute top-40 -right-40 w-[500px] h-[500px] bg-purple-300/10 blur-3xl pointer-events-none' />
        <div className='absolute top-60 -left-40 w-[400px] h-[400px] bg-indigo-300/10 blur-3xl pointer-events-none' />

        <div className='relative mx-auto max-w-7xl px-4 sm:px-6 py-10'>
          <div className='text-center'>
            {/* Compact Trust Badge */}
            <ScrollReveal delay={0}>
              <div className='inline-flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full border border-gray-200 px-2.5 sm:px-3 py-1 sm:py-1.5 mb-5 sm:mb-7 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group cursor-default'>
                <span className='relative flex h-1.5 w-1.5 mr-0.5'>
                  <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                  <span className='relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500' />
                </span>
                <div className='flex -space-x-1 group-hover:space-x-0.5 transition-all duration-300 shrink-0'>
                  {['nigerian1', 'nigerian2', 'nigerian3', 'nigerian4'].map(
                    (imageName, i) => (
                      <picture key={i}>
                        <source
                          type='image/webp'
                          srcSet={`/images-optimized/${imageName}-sm.webp 32w, /images-optimized/${imageName}-md.webp 48w`}
                          sizes='32px'
                        />
                        <img
                          src={`/assets/${imageName}.${imageName === 'nigerian2' ? 'jpg' : 'jfif'}`}
                          alt={`Business owner ${i + 1}`}
                          className='h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-white object-cover transition-transform duration-300 group-hover:scale-105'
                          loading='eager'
                        />
                      </picture>
                    ),
                  )}
                </div>
                <span className='font-body text-[11px] sm:text-xs font-semibold text-gray-700 pl-0.5 group-hover:text-primary-700 transition-colors'>
                  Trusted by 100+ businesses
                </span>
              </div>
            </ScrollReveal>

            {/* Headline - Refined Typography & Authoritative Hierarchy */}
            <ScrollReveal delay={100}>
              <h1 className='relative text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.18] sm:leading-[1.14] max-w-4xl lg:max-w-5xl mx-auto mb-6 sm:mb-8'>
                The Toolkit for African{' '}
                <span className='relative inline-block mt-1 sm:mt-0 group'>
                  <span className='bg-gradient-to-r from-primary-700 via-primary-500 to-purple-500 bg-clip-text text-transparent animate-gradient'>
                    Business Owners
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

            {/* Subheadline - Premium Typography & Balanced Rhythm */}
            <ScrollReveal delay={100}>
              <div className='mx-auto max-w-4xl lg:max-w-5xl px-4 sm:px-6 my-6 sm:my-7'>
                <p className='font-body text-base sm:text-lg md:text-xl lg:text-[22px] leading-relaxed text-gray-700 font-normal max-w-3xl sm:max-w-4xl mx-auto'>
                  Track your{' '}
                  <strong className='font-semibold text-gray-900'>Sales</strong>
                  ,{' '}
                  <strong className='font-semibold text-gray-900'>
                    Expenses
                  </strong>
                  , and{' '}
                  <strong className='font-semibold text-gray-900'>
                    Business Profit & Loss
                  </strong>{' '}
                  <span className='hidden sm:inline text-primary-400 font-light mx-2 select-none'>
                    —
                  </span>
                  <span className='block sm:inline mt-1 sm:mt-0 text-gray-600'>
                    with{' '}
                    <strong className='font-semibold text-gray-900'>
                      Tax Management
                    </strong>
                    ,{' '}
                    <strong className='font-semibold text-gray-900'>
                      Debtor Management
                    </strong>
                    ,{' '}
                    <em className='italic font-semibold text-primary-600 not-italic-font'>
                      A.I Powered Virtual CFO
                    </em>
                    , and other Business Management tools.
                  </span>
                </p>
              </div>
            </ScrollReveal>

            {/* CTA Buttons - Pill Shaped with Sheen & Glow */}
            <ScrollReveal delay={150}>
              <div className='mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 px-4 sm:px-0'>
                <Link
                  to={isAuthenticated ? '/dashboard' : '/register'}
                  className='w-full sm:w-auto'
                >
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-[15px] font-bold text-white shadow-xl shadow-primary-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/50 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden group'>
                    <span className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700' />
                    <span className='relative flex items-center gap-2'>
                      {isAuthenticated ? 'Go to Dashboard' : 'Start Free Today'}{' '}
                      <ArrowRight className='h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1' />
                    </span>
                  </button>
                </Link>
                <Link
                  to={isAuthenticated ? '/tax' : '/login'}
                  className='w-full sm:w-auto'
                >
                  <button className='w-full sm:w-auto relative inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white/80 backdrop-blur px-6 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-[15px] font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-md hover:text-primary-700 hover:-translate-y-0.5 active:scale-[0.98]'>
                    {isAuthenticated ? (
                      <>
                        <FileText className='h-4 w-4' /> View Tax Reports
                      </>
                    ) : (
                      <>
                        <FileText className='h-4 w-4' /> View Tax Reports
                      </>
                    )}
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
                    className='flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur border border-gray-200/80 hover:bg-primary-50/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 cursor-default group'
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <Icon className='h-4 w-4 text-primary-500 group-hover:scale-110 transition-transform duration-300' />
                    <span className='font-body text-xs sm:text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors'>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Interactive 3D Dashboard Preview */}
            <ScrollReveal delay={500}>
              <HeroDashboardPreview />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Making Tax Compliance Effortless ── */}
      <section className='relative py-20 sm:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white'>
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
          <ScrollReveal className='text-center mb-14 sm:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <ShieldCheck className='h-3.5 w-3.5 text-primary-600' />
              <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
                Built For Nigeria
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 max-w-4xl mx-auto leading-snug'>
              Making tax compliance{' '}
              <span className='bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent'>
                effortless
              </span>{' '}
              for Nigerian businesses
            </h2>
            <p className='font-body text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed'>
              Simple tools that help you stay compliant without the headache
            </p>
          </ScrollReveal>

          {/* Content Grid — Stats + Creative Visual */}
          <div className='grid lg:grid-cols-5 gap-10 sm:gap-12 lg:gap-16 items-center'>
            {/* Stats Grid */}
            <div className='lg:col-span-2 grid grid-cols-2 gap-3.5 sm:gap-4'>
              {[
                { icon: Receipt, value: '7.5%', label: 'NRS Tax Rate' },
                { icon: BadgeCheck, value: '100%', label: 'NRS Compliant' },
                { icon: Zap, value: '<2min', label: 'Setup Time' },
                { icon: BarChart3, value: 'Auto', label: 'Calculation' },
              ].map((stat, i) => (
                <ScrollReveal key={stat.label} delay={i * 100}>
                  <div className='group relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4 sm:p-5 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-500/10 hover:border-primary-300'>
                    <div className='mb-3 sm:mb-4'>
                      <stat.icon
                        className='h-6 w-6 sm:h-7 sm:w-7 text-gray-700 transition-transform duration-300 group-hover:scale-110'
                        strokeWidth={1.4}
                      />
                    </div>
                    <div className='text-2xl sm:text-3xl font-bold text-gray-900 mb-1 tracking-tight'>
                      {stat.value}
                    </div>
                    <div className='text-xs sm:text-sm text-gray-600 font-medium'>
                      {stat.label}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Creative Visual — Floating phone mockup with live tax calc */}
            <ScrollReveal delay={200} className='lg:col-span-3'>
              <div className='relative mx-auto max-w-lg lg:max-w-none min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] flex items-center justify-center py-6 sm:py-8 lg:py-0'>
                {/* Glow halo */}
                <div className='absolute inset-0 bg-gradient-to-br from-primary-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-3xl pointer-events-none' />

                {/* Rotating conic ring */}
                <div
                  className='absolute inset-4 sm:inset-8 rounded-full opacity-30 pointer-events-none'
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, #7c3aed 60deg, transparent 120deg, #a855f7 180deg, transparent 240deg, #d946ef 300deg, transparent 360deg)',
                    animation: 'spin 20s linear infinite',
                    filter: 'blur(30px)',
                  }}
                />

                {/* Floating badge — top left */}
                <div
                  className='absolute -top-1 left-0 sm:top-4 sm:left-2 lg:left-0 z-20 scale-[0.85] sm:scale-100 origin-top-left animate-bounce-gentle'
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className='flex items-center gap-2.5 rounded bg-white/95 backdrop-blur-xl border border-gray-200/80 px-3.5 py-2.5 shadow-xl shadow-primary-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30'>
                      <CheckCircle2
                        className='h-5 w-5 text-white'
                        strokeWidth={2.5}
                      />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-gray-600 leading-tight'>
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
                  className='absolute -bottom-1 right-0 sm:bottom-6 sm:right-2 lg:right-0 z-20 scale-[0.85] sm:scale-100 origin-bottom-right animate-bounce-gentle'
                  style={{ animationDelay: '1.8s' }}
                >
                  <div className='flex items-center gap-2.5 rounded bg-white/95 backdrop-blur-xl border border-gray-200/80 px-3.5 py-2.5 shadow-xl shadow-primary-900/10'>
                    <div className='h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/30'>
                      <Zap
                        className='h-5 w-5 text-white fill-white'
                        strokeWidth={2}
                      />
                    </div>
                    <div>
                      <div className='text-[10px] font-medium text-gray-600 leading-tight'>
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
                  className='hidden sm:block absolute top-6 right-2 sm:right-4 z-20 animate-sway'
                  style={{ animationDelay: '0s' }}
                >
                  <div className='rounded bg-white/95 backdrop-blur-xl border border-gray-200/80 px-4 py-3 shadow-xl shadow-primary-900/10'>
                    <div className='flex items-center gap-2 mb-2'>
                      <TrendingUp className='h-3.5 w-3.5 text-emerald-600' />
                      <span className='text-[10px] font-semibold text-gray-700'>
                        Revenue
                      </span>
                      <span className='text-[10px] font-bold text-emerald-700'>
                        +24%
                      </span>
                    </div>
                    <svg viewBox='0 0 80 24' className='w-20 h-6'>
                      <defs>
                        <linearGradient
                          id='miniChartGrad'
                          x1='0'
                          y1='0'
                          x2='0'
                          y2='1'
                        >
                          <stop
                            offset='0%'
                            stopColor='#10b981'
                            stopOpacity='0.4'
                          />
                          <stop
                            offset='100%'
                            stopColor='#10b981'
                            stopOpacity='0'
                          />
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
                <div className='relative w-[92%] sm:w-[84%] lg:w-[78%] max-w-[420px] rounded-2xl bg-gradient-to-br from-gray-900 via-primary-950 to-purple-950 p-1 shadow-2xl shadow-primary-900/40 my-auto z-10'>
                  {/* Inner card */}
                  <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-purple-950 p-4 sm:p-6 lg:p-7'>
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
                      <div className='flex items-center justify-between mb-4 sm:mb-6'>
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
                        <div className='flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 sm:px-3.5 py-2 sm:py-2.5 backdrop-blur-sm'>
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

                        <div className='flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 sm:px-3.5 py-2 sm:py-2.5 backdrop-blur-sm'>
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

                        <div className='flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-3 sm:px-3.5 py-2 sm:py-2.5 backdrop-blur-sm'>
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
                      <div className='relative flex items-center gap-3 my-3 sm:my-4'>
                        <div className='h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent' />
                        <span className='text-[9px] font-mono font-bold uppercase tracking-wider text-white/40'>
                          × 7.5% NRS
                        </span>
                        <div className='h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent' />
                      </div>

                      {/* Tax Payable — hero number */}
                      <div className='relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 via-purple-500 to-fuchsia-500 p-[1.5px]'>
                        <div className='rounded-xl bg-gradient-to-br from-primary-600/90 to-purple-700/90 backdrop-blur-sm px-3.5 sm:px-4 py-3 sm:py-4'>
                          <div className='flex items-end justify-between gap-2'>
                            <div>
                              <div className='text-[10px] uppercase tracking-wider text-white/70 font-semibold mb-0.5'>
                                Tax Payable
                              </div>
                              <div className='text-xl sm:text-2xl lg:text-3xl font-bold text-white tabular-nums leading-none'>
                                ₦25,500
                              </div>
                            </div>
                            <button className='flex items-center gap-1.5 rounded-lg bg-white text-primary-700 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold shadow-lg hover:shadow-xl transition-shadow shrink-0'>
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
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id='features'
        className='scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-[#ebedf1] border-y border-slate-300/40 relative overflow-hidden'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-4xl text-center mb-12 sm:mb-16'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Zap className='h-3.5 w-3.5 text-primary-600 fill-primary-600' />
              <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
                Features
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug'>
              Everything you need to run your business &{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                stay compliant
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto'>
              Comprehensive business management tools for growth and compliance
            </p>
          </ScrollReveal>

          {/* Professional Bento Grid - Pure White Boxes with Sharp Architectural Shadow on Ash Background */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(160px,auto)] gap-3 sm:gap-3.5 lg:gap-4'>
            {/* 1. Sales Tracking — Featured (2×2) */}
            <ScrollReveal
              delay={0}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-2 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-6 sm:p-8 group shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='relative flex h-full flex-col'>
                  <div className='w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300'>
                    <TrendingUp
                      className='w-7 h-7 text-white'
                      strokeWidth={2.5}
                    />
                  </div>
                  <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-3'>
                    Sales Tracking
                  </h3>
                  <p className='text-sm sm:text-base text-gray-600 leading-relaxed mb-6'>
                    Track every sale in real-time. Monitor revenue streams,
                    customer trends, and growth patterns with precision.
                  </p>

                  {/* Live sales chart */}
                  <div className='mt-auto rounded-lg bg-slate-50 border border-slate-200/80 p-4 sm:p-5 shadow-xs'>
                    <div className='flex items-center justify-between mb-3'>
                      <span className='text-[11px] font-semibold text-gray-600 uppercase tracking-wider'>
                        Live Sales
                      </span>
                      <span className='text-[11px] font-bold text-emerald-600'>
                        +32% ↑
                      </span>
                    </div>
                    <div className='space-y-2.5'>
                      <div>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs text-gray-600 font-medium'>
                            Today
                          </span>
                          <span className='text-xs font-bold text-gray-800 tabular-nums'>
                            ₦850K
                          </span>
                        </div>
                        <div className='h-2 rounded-full bg-slate-200/80 overflow-hidden'>
                          <div className='h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500' />
                        </div>
                      </div>
                      <div>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs text-gray-600 font-medium'>
                            This Week
                          </span>
                          <span className='text-xs font-bold text-gray-800 tabular-nums'>
                            ₦4.2M
                          </span>
                        </div>
                        <div className='h-2 rounded-full bg-slate-200/80 overflow-hidden'>
                          <div className='h-full w-[78%] rounded-full bg-gradient-to-r from-teal-400 to-cyan-400' />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 2. Expense Tracking (1×1) */}
            <ScrollReveal
              delay={100}
              className='lg:col-span-1 lg:row-span-1 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-300'>
                  <Receipt className='w-6 h-6 text-white' strokeWidth={2.5} />
                </div>
                <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-1.5'>
                  Expense Tracking
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Monitor spending, categorize costs, optimize cash flow
                </p>
              </div>
            </ScrollReveal>

            {/* 3. Cash at Hand Register (1×1) */}
            <ScrollReveal
              delay={150}
              className='lg:col-span-1 lg:row-span-1 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300'>
                  <Wallet className='w-6 h-6 text-white' strokeWidth={2.5} />
                </div>
                <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-1.5'>
                  Cash at Hand Register
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Live cash position tracking with precision accuracy
                </p>
              </div>
            </ScrollReveal>

            {/* 4. Debtors Management (2×1) */}
            <ScrollReveal
              delay={200}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-1 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 group shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='flex items-center gap-3 sm:gap-5 h-full'>
                  <div className='flex-shrink-0 w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300'>
                    <Clock className='w-6 h-6 text-white' strokeWidth={2.5} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-1'>
                      Debtors Management
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                      Track receivables, automate follow-ups, and maintain
                      healthy cash flow with smart reminders.
                    </p>
                  </div>
                  {/* Status badge */}
                  <div className='hidden sm:flex flex-shrink-0 flex-col items-center justify-center px-3.5 py-2.5 rounded-lg bg-blue-50 border border-blue-200 shadow-xs'>
                    <div className='text-[10px] font-bold text-blue-600 uppercase tracking-wider'>
                      Due
                    </div>
                    <div className='text-lg font-bold text-gray-900'>5</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 5. Business Performance Tracking (1×2) */}
            <ScrollReveal
              delay={250}
              className='sm:col-span-2 lg:col-span-1 lg:row-span-2 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='flex h-full flex-col'>
                  <div className='w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300'>
                    <BarChart3
                      className='w-6 h-6 text-white'
                      strokeWidth={2.5}
                    />
                  </div>
                  <h3 className='text-lg font-bold text-gray-900 mb-2'>
                    Business Performance
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed mb-5'>
                    Complete analytics dashboard with KPIs, trends, and
                    actionable insights.
                  </p>

                  {/* Performance metrics */}
                  <div className='mt-auto space-y-3'>
                    <div className='rounded-lg bg-slate-50 border border-slate-200/80 p-3 shadow-xs'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-[10px] font-semibold text-gray-600 uppercase tracking-wider'>
                          Profit Margin
                        </span>
                        <span className='text-xs font-bold text-emerald-600'>
                          +18%
                        </span>
                      </div>
                      <div className='h-1.5 rounded-full bg-slate-200/80 overflow-hidden'>
                        <div className='h-full w-[78%] rounded-full bg-gradient-to-r from-violet-500 to-purple-500' />
                      </div>
                    </div>
                    <div className='rounded-lg bg-slate-50 border border-slate-200/80 p-3 shadow-xs'>
                      <svg viewBox='0 0 120 40' className='w-full h-10'>
                        <defs>
                          <linearGradient
                            id='perfChartGrad'
                            x1='0'
                            y1='0'
                            x2='0'
                            y2='1'
                          >
                            <stop
                              offset='0%'
                              stopColor='#8b5cf6'
                              stopOpacity='0.3'
                            />
                            <stop
                              offset='100%'
                              stopColor='#8b5cf6'
                              stopOpacity='0'
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d='M0,32 L20,28 L40,30 L60,18 L80,22 L100,10 L120,6 L120,40 L0,40 Z'
                          fill='url(#perfChartGrad)'
                        />
                        <path
                          d='M0,32 L20,28 L40,30 L60,18 L80,22 L100,10 L120,6'
                          fill='none'
                          stroke='#8b5cf6'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 6. AI-Powered Virtual CFO (2×2) */}
            <ScrollReveal
              delay={300}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-2 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='relative flex h-full flex-col'>
                  <div className='flex items-start justify-between mb-5'>
                    <div className='w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300'>
                      <Zap
                        className='w-6 h-6 text-white fill-white'
                        strokeWidth={2.5}
                      />
                    </div>
                    <span className='inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 shadow-xs'>
                      <span className='relative flex h-2 w-2'>
                        <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75' />
                        <span className='relative inline-flex rounded-full h-2 w-2 bg-indigo-500' />
                      </span>
                      AI Powered
                    </span>
                  </div>

                  <h3 className='text-xl sm:text-2xl font-bold text-gray-900 mb-3'>
                    Virtual CFO Assistant
                  </h3>
                  <p className='text-sm sm:text-base text-gray-600 leading-relaxed mb-6'>
                    Your intelligent financial advisor. Get instant insights,
                    forecasts, and recommendations powered by advanced AI.
                  </p>

                  {/* AI conversation preview */}
                  <div className='mt-auto space-y-3'>
                    <div className='flex gap-2.5 items-start'>
                      <div className='w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0'>
                        <Zap className='w-3.5 h-3.5 text-white fill-white' />
                      </div>
                      <div className='flex-1 rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 shadow-xs'>
                        <p className='text-xs text-gray-700 leading-relaxed font-medium'>
                          "Your cash flow is optimal this month. Consider
                          investing ₦200K in inventory for Q2 growth."
                        </p>
                      </div>
                    </div>
                    <div className='grid grid-cols-3 gap-2.5'>
                      {[
                        { label: 'Forecast', value: '₦8.5M', trend: '+12%' },
                        { label: 'Savings', value: '₦450K', trend: '+8%' },
                        { label: 'ROI', value: '24%', trend: '+3%' },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className='rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-center shadow-xs'
                        >
                          <div className='text-[9px] font-semibold text-gray-600 uppercase tracking-wider mb-1'>
                            {stat.label}
                          </div>
                          <div className='text-xs sm:text-sm font-bold text-gray-900 tabular-nums mb-0.5'>
                            {stat.value}
                          </div>
                          <div className='text-[9px] font-semibold text-emerald-600'>
                            {stat.trend}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 7. E-Invoicing (1×1) */}
            <ScrollReveal
              delay={350}
              className='lg:col-span-1 lg:row-span-1 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform duration-300'>
                  <FileText className='w-6 h-6 text-white' strokeWidth={2.5} />
                </div>
                <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-1.5'>
                  E-Invoicing
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Professional invoices in seconds — branded and trackable
                </p>
              </div>
            </ScrollReveal>

            {/* 8. Open Business Bank Account (1×1) */}
            <ScrollReveal
              delay={400}
              className='lg:col-span-1 lg:row-span-1 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform duration-300'>
                  <CreditCard
                    className='w-6 h-6 text-white'
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-1.5'>
                  Business Bank Account
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Open dedicated account — seamless integration
                </p>
              </div>
            </ScrollReveal>

            {/* 9. Smart Notifications & Reminders (2×1) */}
            <ScrollReveal
              delay={450}
              className='sm:col-span-2 lg:col-span-2 lg:row-span-1 h-full'
            >
              <div className='relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 group shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='flex items-center gap-3 sm:gap-5 h-full'>
                  <div className='flex-shrink-0 w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300'>
                    <Bell className='w-6 h-6 text-white' strokeWidth={2.5} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-1'>
                      Smart Notifications
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                      Stay ahead with intelligent alerts for payments,
                      deadlines, and business events — never miss what matters.
                    </p>
                  </div>
                  {/* Live notification badge */}
                  <div className='hidden sm:flex flex-shrink-0 relative'>
                    <div className='w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-md shadow-fuchsia-500/25'>
                      <span className='text-lg font-bold text-white'>3</span>
                    </div>
                    <span className='absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 animate-ping' />
                    <span className='absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500' />
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* 10. Tax Compliance (NRS) - Small accent (1×1) */}
            <ScrollReveal
              delay={500}
              className='lg:col-span-1 lg:row-span-1 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300'>
                  <ShieldCheck
                    className='w-6 h-6 text-white'
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-1.5'>
                  NRS Compliant
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Automated 7.5% tax calculations — always accurate
                </p>
              </div>
            </ScrollReveal>

            {/* 11. One-Click Tax Payment - Small accent (1×1) */}
            <ScrollReveal
              delay={550}
              className='lg:col-span-1 lg:row-span-1 h-full'
            >
              <div className='group relative h-full overflow-hidden rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_24px_-4px_rgba(15,23,42,0.12)] hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_32px_-4px_rgba(15,23,42,0.18)] hover:border-slate-300 hover:-translate-y-1 transition-all duration-300'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300'>
                  <Zap
                    className='w-6 h-6 text-white fill-white'
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className='text-base sm:text-lg font-bold text-gray-900 mb-1.5'>
                  Instant Payment
                </h3>
                <p className='text-xs sm:text-sm text-gray-600 leading-relaxed'>
                  Pay taxes in one click — Paystack powered
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us - Refined Professional Section ── */}
      <section className='py-16 sm:py-20 lg:py-28 bg-white relative overflow-hidden'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-2xl mb-12 sm:mb-16 text-center'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-3.5 py-1.5 mb-4 shadow-sm'>
              <BadgeCheck className='h-3.5 w-3.5 text-primary-600' />
              <span className='font-body text-xs font-semibold tracking-wide text-primary-700'>
                Why Businesses Trust Us
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug mb-3'>
              Built for{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                modern businesses
              </span>
            </h2>
            <p className='font-body text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed'>
              Enterprise-grade tools designed to save time and reduce complexity
            </p>
          </ScrollReveal>

          {/* Horizontal cards with images on the left */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto'>
            <ScrollReveal delay={0}>
              <div className='group relative flex items-center gap-4 bg-white border border-gray-200/80 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-gray-900/5 hover:border-gray-300 transition-all duration-300'>
                <div className='flex-shrink-0 w-24 h-full'>
                  <picture>
                    <source
                      type='image/webp'
                      srcSet='/images-optimized/step-3-file-tax-sm.webp 640w, /images-optimized/step-3-file-tax-md.webp 768w'
                      sizes='96px'
                    />
                    <img
                      src='/images/step-3-file-tax.jpg'
                      alt='Tax Calculation'
                      className='w-full h-full object-cover'
                      loading='lazy'
                    />
                  </picture>
                </div>
                <div className='flex-1 min-w-0 py-4 pr-5'>
                  <h3 className='text-base font-bold text-gray-900 mb-1 leading-tight'>
                    Precise Tax Calculation
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed'>
                    NRS-compliant 7.5% VAT calculations with real-time tracking
                    and audit trails.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className='group relative flex items-center gap-4 bg-white border border-gray-200/80 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-gray-900/5 hover:border-gray-300 transition-all duration-300'>
                <div className='flex-shrink-0 w-24 h-full'>
                  <picture>
                    <source
                      type='image/webp'
                      srcSet='/images-optimized/compliance-secure-sm.webp 640w, /images-optimized/compliance-secure-md.webp 768w'
                      sizes='96px'
                    />
                    <img
                      src='/images/compliance-secure.jpg'
                      alt='Security'
                      className='w-full h-full object-cover'
                      loading='lazy'
                    />
                  </picture>
                </div>
                <div className='flex-1 min-w-0 py-4 pr-5'>
                  <h3 className='text-base font-bold text-gray-900 mb-1 leading-tight'>
                    Bank-Level Security
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed'>
                    AES-256 encryption and TLS 1.3 protection for all your
                    financial data.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className='group relative flex items-center gap-4 bg-white border border-gray-200/80 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-gray-900/5 hover:border-gray-300 transition-all duration-300'>
                <div className='flex-shrink-0 w-24 h-full'>
                  <picture>
                    <source
                      type='image/webp'
                      srcSet='/images-optimized/analytics-feature-sm.webp 640w, /images-optimized/analytics-feature-md.webp 768w'
                      sizes='96px'
                    />
                    <img
                      src='/images/analytics-feature.jpg'
                      alt='Analytics'
                      className='w-full h-full object-cover'
                      loading='lazy'
                    />
                  </picture>
                </div>
                <div className='flex-1 min-w-0 py-4 pr-5'>
                  <h3 className='text-base font-bold text-gray-900 mb-1 leading-tight'>
                    Smart Analytics
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed'>
                    Live dashboards with trend analysis and actionable business
                    insights.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className='group relative flex items-center gap-4 bg-white border border-gray-200/80 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-gray-900/5 hover:border-gray-300 transition-all duration-300'>
                <div className='flex-shrink-0 w-24 h-full'>
                  <picture>
                    <source
                      type='image/webp'
                      srcSet='/images-optimized/step-2-transactions-sm.webp 640w, /images-optimized/step-2-transactions-md.webp 768w'
                      sizes='96px'
                    />
                    <img
                      src='/images/step-2-transactions.jpg'
                      alt='Automated Filing'
                      className='w-full h-full object-cover'
                      loading='lazy'
                    />
                  </picture>
                </div>
                <div className='flex-1 min-w-0 py-4 pr-5'>
                  <h3 className='text-base font-bold text-gray-900 mb-1 leading-tight'>
                    Automated Filing
                  </h3>
                  <p className='text-sm text-gray-600 leading-relaxed'>
                    One-click tax payments and professional PDF statements for
                    NRS submission.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id='how-it-works'
        className='scroll-mt-20 sm:scroll-mt-24 py-14 sm:py-18 lg:py-24 bg-white relative overflow-hidden'
      >
        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative'>
          <ScrollReveal className='mx-auto max-w-4xl text-center mb-10 sm:mb-14'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <CheckCircle2 className='h-3.5 w-3.5 text-primary-600' />
              <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
                Simple Process
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug'>
              Get compliant in{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                three simple steps
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-sm sm:text-base text-gray-600 leading-relaxed'>
              Your path to effortless tax management, designed for clarity and
              speed
            </p>
          </ScrollReveal>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6 xl:gap-8 relative max-w-xl sm:max-w-2xl lg:max-w-none mx-auto'>
            {[
              {
                title: 'Create Your Account',
                description:
                  'Sign up in seconds. Set up your business profile and connect securely in just a few minutes.',
                stepNum: 1,
                image: '/images/step-1-account.jpg',
              },
              {
                title: 'Record Transactions',
                description:
                  'Track income and expenses effortlessly. Import from your bank or enter manually with our intuitive interface.',
                stepNum: 2,
                image: '/images/step-2-transactions.jpg',
              },
              {
                title: 'File & Pay Tax',
                description:
                  'Review your auto-calculated NRS tax, finalize with confidence, and pay securely in minutes.',
                stepNum: 3,
                image: '/images/step-3-file-tax.jpg',
              },
            ].map((step, index) => (
              <ScrollReveal
                key={step.title}
                delay={index * 150}
                className='relative group'
              >
                <div className='flex flex-col h-full rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-md transition-all duration-500 hover:shadow-xl hover:shadow-primary-500/15 hover:-translate-y-1.5'>
                  {/* Image Section with gradient overlay */}
                  <div className='relative h-36 sm:h-44 lg:h-40 xl:h-44 overflow-hidden bg-gray-100'>
                    <img
                      src={step.image}
                      alt={step.title}
                      className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                    />
                    {/* Gradient overlay for depth */}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent' />

                    {/* Step Number Badge - Refined proportion */}
                    <div className='absolute top-3.5 right-3.5 w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-md border border-white/80'>
                      <span className='text-lg sm:text-xl font-bold text-gray-900'>
                        {step.stepNum}
                      </span>
                    </div>

                    {/* Step indicator text */}
                    <div className='absolute bottom-3.5 left-4 right-4'>
                      <div className='text-white/90 font-semibold text-xs sm:text-[13px] tracking-wide'>
                        STEP {step.stepNum} OF 3
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className='flex-grow p-5 sm:p-6 lg:p-5 xl:p-6 flex flex-col justify-between'>
                    {/* Title and Description */}
                    <div>
                      <h3 className='text-lg sm:text-xl font-bold text-gray-900 leading-tight mb-2 sm:mb-2.5'>
                        {step.title}
                      </h3>
                      <p className='font-body text-xs sm:text-sm lg:text-[14px] leading-relaxed text-gray-600'>
                        {step.description}
                      </p>
                    </div>

                    {/* Progress bar — always visible, subtle */}
                    <div className='mt-4 sm:mt-5'>
                      <div className='h-1 w-full bg-gray-100 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500 group-hover:from-primary-600 group-hover:to-purple-600'
                          style={{ width: `${(step.stepNum / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {index < 2 && (
                    <div className='hidden lg:flex absolute -right-4 xl:-right-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 xl:h-10 xl:w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 shadow-md transition-all duration-300 group-hover:bg-primary-50 group-hover:border-primary-400 group-hover:text-primary-500'>
                      <ChevronRight className='h-4 w-4 xl:h-5 xl:w-5' />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase Gallery - Creative Premium Section ── */}
      <section className='py-14 sm:py-18 lg:py-24 bg-gradient-to-b from-gray-50/50 to-white relative overflow-hidden'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6'>
          {/* Header - Consistent centered style */}
          <ScrollReveal className='mx-auto max-w-4xl text-center mb-10 sm:mb-14'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Globe2 className='h-3.5 w-3.5 text-primary-600' />
              <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
                In Practice
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug'>
              Trusted by{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                growing businesses
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed'>
              From startups to established enterprises — see how businesses
              across Nigeria manage taxes with clarity and confidence
            </p>
          </ScrollReveal>

          {/* Creative Masonry Gallery */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-max'>
            {[
              {
                imageName: 'workspace',
                title: 'Professional Setup',
                subtitle: 'Clean workspace, clear finances',
                span: 'sm:col-span-1 lg:col-span-1',
                height: 'h-44 sm:h-48 lg:h-52',
              },
              {
                imageName: 'team-efficiency',
                title: 'Team Efficiency',
                subtitle: 'Collaborative financial management',
                span: 'sm:col-span-1 lg:col-span-2 lg:row-span-1',
                height: 'h-44 sm:h-48 lg:h-52',
              },
              {
                imageName: 'mobile-interface',
                title: 'On-The-Go',
                subtitle: 'Tax management, anywhere, anytime',
                span: 'sm:col-span-1 lg:col-span-1 lg:row-span-2',
                height: 'h-44 sm:h-48 lg:h-full lg:min-h-[440px]',
              },
              {
                imageName: 'business-growth',
                title: 'Growth Metrics',
                subtitle: 'Track expansion with precision',
                span: 'sm:col-span-1 lg:col-span-1',
                height: 'h-44 sm:h-48 lg:h-52',
              },
              {
                imageName: 'dashboard-hero',
                title: 'Real-Time Insights',
                subtitle: 'Live dashboards for smart decisions',
                span: 'sm:col-span-1 lg:col-span-1',
                height: 'h-44 sm:h-48 lg:h-52',
              },
              {
                imageName: 'compliance-secure',
                title: 'Security & Trust',
                subtitle: 'Enterprise protection for your data',
                span: 'sm:col-span-1 lg:col-span-2',
                height: 'h-44 sm:h-48 lg:h-52',
              },
            ].map((item, i) => (
              <ScrollReveal
                key={item.title}
                delay={i * 100}
                className={`group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer ${item.height} ${item.span || ''}`}
              >
                {/* Image with sophisticated overlay */}
                <picture>
                  <source
                    type='image/webp'
                    srcSet={`
                      /images-optimized/${item.imageName}-sm.webp 640w,
                      /images-optimized/${item.imageName}-md.webp 768w,
                      /images-optimized/${item.imageName}-lg.webp 1024w
                    `}
                    sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                  />
                  <img
                    src={`/images/${item.imageName}.jpg`}
                    alt={item.title}
                    className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                    loading={i < 3 ? 'eager' : 'lazy'}
                  />
                </picture>

                {/* Gradient Overlay - Elegant */}
                <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500' />

                {/* Content - Positioned at bottom */}
                <div className='absolute inset-0 flex flex-col justify-end p-4 sm:p-5'>
                  <h3 className='text-lg sm:text-xl font-bold text-white leading-snug mb-1'>
                    {item.title}
                  </h3>
                  <p className='font-body text-xs sm:text-sm text-white/90'>
                    {item.subtitle}
                  </p>

                  {/* Hover indicator */}
                  <div className='mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                    <div className='flex-1 h-0.5 bg-gradient-to-r from-white to-transparent' />
                    <ChevronRight className='h-4 w-4 text-white' />
                  </div>
                </div>

                {/* Corner accent on hover */}
                <div className='absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-2xl' />
              </ScrollReveal>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className='mt-10 sm:mt-14 flex justify-center'>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <button className='group px-6 sm:px-7 py-3 sm:py-3.5 min-h-[44px] rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white text-sm sm:text-base font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 hover:-translate-y-0.5'>
                <span className='flex items-center gap-2'>
                  {isAuthenticated
                    ? 'Go to Dashboard'
                    : 'Join growing businesses'}
                  <ArrowRight className='h-4.5 w-4.5 group-hover:translate-x-1 transition-transform' />
                </span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section
        id='testimonials'
        className='scroll-mt-20 sm:scroll-mt-24 py-14 sm:py-18 lg:py-24 relative overflow-hidden'
      >
        <div className='absolute inset-0 z-0'>
          <picture>
            <source
              type='image/webp'
              srcSet='/images-optimized/dashboard-hero-sm.webp 640w, /images-optimized/dashboard-hero-md.webp 768w, /images-optimized/dashboard-hero-lg.webp 1024w'
              sizes='100vw'
            />
            <img
              src='/images/dashboard-hero.jpg'
              alt='Business success'
              className='w-full h-full object-cover object-center'
              loading='lazy'
            />
          </picture>
          <div className='absolute inset-0 bg-gradient-to-br from-white via-white/95 to-white/90' />
        </div>

        <div className='mx-auto max-w-7xl px-4 sm:px-6 relative z-10'>
          <ScrollReveal className='mx-auto max-w-4xl text-center mb-10 sm:mb-14'>
            <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
              <Star className='h-3.5 w-3.5 text-primary-600 fill-primary-600' />
              <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
                Real Results
              </span>
            </span>
            <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug'>
              Trusted by{' '}
              <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
                Nigerian businesses
              </span>
            </h2>
            <p className='mt-3 sm:mt-4 font-body text-sm sm:text-base text-gray-700 leading-relaxed'>
              Hear from business owners who've transformed their tax management
            </p>
          </ScrollReveal>

          <StaggerReveal
            staggerDelay={150}
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'
          >
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur p-5 sm:p-6 transition-all duration-500 hover:shadow-lg hover:shadow-primary-500/10 hover:border-primary-100/50 hover:-translate-y-1 ${i === 2 ? 'md:col-span-2 lg:col-span-1 md:max-w-md md:mx-auto lg:max-w-none w-full' : ''}`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className='absolute top-3 right-5 sm:right-6 text-5xl sm:text-6xl font-serif bg-gradient-to-br from-primary-100 to-purple-50 bg-clip-text text-transparent leading-none select-none'>
                  "
                </div>

                <div className='flex gap-0.5 mb-4 sm:mb-5'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className='h-4 sm:h-4.5 w-4 sm:w-4.5 fill-amber-400 text-amber-400'
                    />
                  ))}
                </div>

                <p className='font-body text-xs sm:text-sm lg:text-[14px] leading-relaxed text-gray-600 relative z-10'>
                  "{t.quote}"
                </p>

                <div className='mt-5 sm:mt-6 flex items-center gap-3.5 pt-4 border-t border-gray-100'>
                  <div
                    className={`relative flex h-11 sm:h-12 w-11 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white text-sm sm:text-base font-bold shadow-md shadow-primary-500/20`}
                  >
                    {t.avatar}
                    <div className='absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white' />
                  </div>
                  <div>
                    <div className='text-sm sm:text-base font-bold text-gray-900'>
                      {t.name}
                    </div>
                    <div className='font-body text-xs sm:text-[13px] text-gray-600 font-medium'>
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
      <section className='relative py-14 sm:py-18 lg:py-24 overflow-hidden bg-gradient-to-b from-white to-gray-50'>
        {/* Ambient glows */}
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-primary-400/15 via-transparent to-transparent blur-3xl pointer-events-none' />
        <div className='absolute bottom-0 right-0 w-[400px] h-[400px] bg-fuchsia-300/10 blur-3xl rounded-full pointer-events-none' />

        <ScrollReveal className='relative mx-auto max-w-4xl px-4 sm:px-6 text-center'>
          <span className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 px-4 py-1.5 mb-4 sm:mb-5 shadow-sm'>
            <Zap className='h-3.5 w-3.5 text-primary-600 fill-primary-600' />
            <span className='font-body text-xs sm:text-sm font-semibold tracking-wide text-primary-700'>
              Free To Start
            </span>
          </span>
          <h2 className='text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-snug'>
            Ready to simplify how your business run and{' '}
            <span className='bg-gradient-to-r from-primary-600 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent'>
              still stay compliant?
            </span>
          </h2>
          <p className='mt-3 sm:mt-4 font-body text-sm sm:text-base text-gray-600 max-w-3xl mx-auto leading-relaxed'>
            Join thousands of African businesses that trust wallX-ERP to manage
            their business in real-time from anywhere
          </p>

          <div className='mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center'>
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className='w-full sm:w-auto'
            >
              <button className='group w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 min-h-[44px] rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 text-white text-sm sm:text-base font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 hover:-translate-y-0.5'>
                <span className='flex items-center justify-center gap-2'>
                  {isAuthenticated
                    ? 'Go to Dashboard'
                    : 'Start Your Free Trial'}
                  <ArrowRight className='h-4.5 w-4.5 group-hover:translate-x-1 transition-transform' />
                </span>
              </button>
            </Link>
          </div>

          {/* Trust line below CTAs */}
          <div className='mt-6 sm:mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-gray-600 font-medium'>
            <span className='inline-flex items-center gap-1.5'>
              <CheckCircle2
                className='h-4 w-4 text-emerald-600'
                strokeWidth={2.5}
              />
              No credit card required
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <Lock className='h-4 w-4 text-primary-600' strokeWidth={2} />
              Bank-grade security
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <BadgeCheck
                className='h-4 w-4 text-fuchsia-600'
                strokeWidth={2}
              />
              NRS-compliant
            </span>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className='bg-gray-950 text-gray-400'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-10 lg:pb-12'>
          <div className='grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-3 lg:grid-cols-4'>
            <div className='md:col-span-3 lg:col-span-1'>
              <Link
                to='/'
                aria-label='WallXERP by WallX — home'
                className='inline-block rounded-sm opacity-80 transition-opacity duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950'
              >
                <OptimizedLogo
                  size='md'
                  className='h-8 sm:h-10 w-auto brightness-0 invert'
                  loading='lazy'
                />
              </Link>
              <p className='mt-4 sm:mt-5 max-w-sm font-body text-sm sm:text-base leading-relaxed text-gray-400'>
                The simplest way for Nigerian SMEs to track sales, compute
                taxes, and stay NRS-compliant.
              </p>
              {/* Social icons (inline SVGs — lucide-react drops brand icons) */}
              <div className='mt-6 flex items-center gap-3'>
                {[
                  {
                    href: 'https://twitter.com/paymytax',
                    label: 'X (Twitter)',
                    path: 'M18.244 2H21l-6.55 7.485L22 22h-6.094l-4.77-6.232L5.6 22H2.843l7.014-8.01L2 2h6.243l4.31 5.69L18.244 2zm-1.07 18h1.69L7.93 4H6.118l11.056 16z',
                  },
                  {
                    href: 'https://linkedin.com/company/paymytax',
                    label: 'LinkedIn',
                    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.025-3.037-1.851-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.354V9h3.414v1.561h.048c.476-.9 1.637-1.851 3.37-1.851 3.6 0 4.266 2.37 4.266 5.455v6.287zM5.337 7.433a2.062 2.062 0 11.001-4.124 2.062 2.062 0 010 4.124zM7.114 20.452H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
                  },
                  {
                    href: 'https://instagram.com/paymytax',
                    label: 'Instagram',
                    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={s.label}
                    className='flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-gray-800 text-gray-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500/70 hover:bg-white/10 hover:text-white active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
                  >
                    <svg
                      className='h-4 w-4'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      aria-hidden='true'
                    >
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Product
              </h3>
              <div className='space-y-3 sm:space-y-4'>
                {FOOTER_LINKS.map((item) => (
                  <a key={item.label} href={item.href} className={FOOTER_LINK}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Account
              </h3>
              <div className='space-y-3 sm:space-y-4'>
                {FOOTER_ACCOUNT_LINKS.map((item) => (
                  <Link key={item.label} to={item.to} className={FOOTER_LINK}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className='font-sans text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 sm:mb-6'>
                Support
              </h3>
              <div className='space-y-3 sm:space-y-4'>
                {FOOTER_SUPPORT_LINKS.map((item) => (
                  <a key={item.label} href={item.href} className={FOOTER_LINK}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className='mt-10 sm:mt-14 lg:mt-16 pt-6 sm:pt-8 border-t border-gray-800 flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
            <p className='font-body text-xs sm:text-[15px] text-gray-400 text-center sm:text-left'>
              © {new Date().getFullYear()} WallXERP by WallX. All rights
              reserved.
            </p>
            <p className='flex items-center gap-1.5 font-body text-xs sm:text-[15px] text-gray-400 group'>
              <span className='transition-colors duration-200 group-hover:text-gray-300'>
                Made with
              </span>
              <span className='text-red-500 transition-transform duration-200 ease-out group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:scale-100'>
                ♥
              </span>
              <span className='transition-colors duration-200 group-hover:text-gray-300'>
                in Lagos, Nigeria
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
