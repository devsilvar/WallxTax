import { Link, Outlet } from 'react-router-dom';
import { ShieldCheck, TrendingUp, Zap, BadgeCheck, Lock } from 'lucide-react';

const highlights = [
  {
    icon: TrendingUp,
    title: 'Real-Time Tracking',
    circleStyle:
      'border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.3)] ring-1 ring-emerald-300/30 group-hover:shadow-[0_0_22px_rgba(52,211,153,0.5)] group-hover:border-emerald-300',
  },
  {
    icon: Zap,
    title: 'Fast Tax Calculation',
    circleStyle:
      'border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.3)] ring-1 ring-amber-300/30 group-hover:shadow-[0_0_22px_rgba(251,191,36,0.5)] group-hover:border-amber-300',
  },
  {
    icon: ShieldCheck,
    title: 'Bank-Grade Security',
    circleStyle:
      'border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.3)] ring-1 ring-cyan-300/30 group-hover:shadow-[0_0_22px_rgba(34,211,238,0.5)] group-hover:border-cyan-300',
  },
  {
    icon: BadgeCheck,
    title: 'Seamless Remittance',
    circleStyle:
      'border-2 border-fuchsia-400/50 bg-gradient-to-br from-fuchsia-500/20 to-purple-500/10 text-fuchsia-300 shadow-[0_0_14px_rgba(232,121,249,0.3)] ring-1 ring-fuchsia-300/30 group-hover:shadow-[0_0_22px_rgba(232,121,249,0.5)] group-hover:border-fuchsia-300',
  },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding & value proposition (60% width on desktop) */}
      <div className="hidden lg:flex lg:w-[58%] xl:w-[60%] 2xl:w-[62%] relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-950 flex-col justify-between p-10 lg:p-12 xl:p-16 2xl:p-20">
        {/* Background ambient accents */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(168,85,247,0.35),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_100%,rgba(99,102,241,0.25),transparent)] pointer-events-none" />
        <div className="absolute top-20 -left-20 w-80 h-80 bg-purple-400/20 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-indigo-400/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Content container — unified max-width ensures logo, hero text, feature grid, and metrics align strictly */}
        <div className="relative z-10 flex flex-col justify-between h-full w-full max-w-xl xl:max-w-2xl mx-auto">
          {/* Top: Brand Logo */}
          <div>
            <Link
              to="/"
              className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-xl transition-transform hover:scale-[1.02] duration-200"
            >
              <img
                src="/logo.png"
                alt="PayMyTax"
                className="h-14 xl:h-16 w-auto brightness-0 invert object-contain drop-shadow-sm"
              />
            </Link>
          </div>

          {/* Center: Hero Messaging & Highlights */}
          <div className="my-auto py-8 xl:py-10">
            {/* Status indicator badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-purple-100 text-xs font-semibold tracking-wide shadow-sm w-fit mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Official FIRS 7.5% Tax Engine</span>
            </div>

            <h2 className="text-3xl sm:text-4xl xl:text-[44px] 2xl:text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Tax compliance
              <br />
              <span className="bg-gradient-to-r from-purple-200 via-white to-purple-100 bg-clip-text text-transparent">
                made effortless.
              </span>
            </h2>

            <p className="mt-4 max-w-lg font-body text-base xl:text-lg text-purple-100/80 leading-relaxed">
              Join thousands of Nigerian SMEs managing sales, computing accurate tax liabilities, and staying penalty-free with confidence.
            </p>

            {/* Core Features — Clean, boxless, neatly aligned icon + title */}
            <div className="mt-8 xl:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 xl:gap-y-5">
              {highlights.map(({ icon: Icon, title, circleStyle }) => (
                <div
                  key={title}
                  className="group flex items-center gap-3.5 py-1 cursor-default transition-transform duration-200"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 group-hover:scale-110 ${circleStyle}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <span className="font-semibold text-white text-sm xl:text-[15px] tracking-tight group-hover:text-purple-100 transition-colors">
                    {title}
                  </span>
                </div>
              ))}
            </div>

            {/* SME Trust metrics bar */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 sm:gap-6 text-purple-200/80 text-xs sm:text-sm font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-white font-bold">₦700M+</span> Volume Tracked
              </span>
              <span className="h-1 w-1 rounded-full bg-purple-300/40 hidden sm:inline-block" />
              <span className="flex items-center gap-1.5">
                <span className="text-white font-bold">100%</span> FIRS Compliant
              </span>
              <span className="h-1 w-1 rounded-full bg-purple-300/40 hidden sm:inline-block" />
              <span className="flex items-center gap-1.5">
                <span className="text-white font-bold">&lt; 5 min</span> Filing Time
              </span>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <p className="font-body text-xs text-purple-200/60">
              &copy; {new Date().getFullYear()} PayMyTax by WallX. Built for Nigerian businesses.
            </p>
            <div className="hidden xl:flex items-center gap-2 text-xs text-purple-200/60">
              <Lock className="h-3.5 w-3.5 text-purple-300" />
              <span>Bank-grade 256-bit encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form (40% width on desktop) */}
      <div className="flex flex-1 lg:w-[42%] xl:w-[40%] 2xl:w-[38%] flex-col items-center justify-center px-6 sm:px-10 lg:px-8 xl:px-12 py-10 sm:py-12 bg-gray-50/70 overflow-y-auto min-h-screen">
        {/* Mobile logo header */}
        <div className="mb-8 sm:mb-10 lg:hidden text-center">
          <Link
            to="/"
            className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl transition-transform hover:scale-[1.02] duration-200"
          >
            <img
              src="/logo.png"
              alt="PayMyTax"
              className="h-12 sm:h-14 w-auto mx-auto object-contain drop-shadow-sm"
            />
          </Link>
          <p className="mt-3 font-body text-sm text-gray-500">
            Simple tax management for Nigerian businesses
          </p>
        </div>

        {/* Form container */}
        <div className="w-full max-w-[420px] sm:max-w-[440px] my-auto">
          <Outlet />
        </div>

        {/* Mobile footer note */}
        <div className="mt-8 lg:hidden text-center">
          <p className="text-xs text-gray-400 font-body">
            &copy; {new Date().getFullYear()} PayMyTax by WallX
          </p>
        </div>
      </div>
    </div>
  );
}
