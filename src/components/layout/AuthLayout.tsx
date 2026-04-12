import { Link, Outlet } from 'react-router-dom';
import { Shield, BarChart3, Clock, CheckCircle2 } from 'lucide-react';

const highlights = [
  { icon: BarChart3, text: 'Track sales & expenses in real time' },
  { icon: Shield, text: 'Bank-grade encryption on all data' },
  { icon: Clock, text: 'File your taxes in under 5 minutes' },
  { icon: CheckCircle2, text: 'Stay FIRS-compliant, always' },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 flex-col justify-between p-12">
        {/* Background accents */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(168,85,247,0.35),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_100%,rgba(99,102,241,0.25),transparent)]" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-purple-400/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <Link to="/">
            <img src="/logo.png" alt="PayMyTax" className="h-10 brightness-0 invert" />
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Tax compliance
            <br />
            made simple.
          </h2>
          <p className="mt-4 max-w-sm font-body text-base text-purple-200/80 leading-relaxed">
            Join thousands of Nigerian businesses managing their taxes with confidence.
          </p>

          <div className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <Icon className="h-4.5 w-4.5 text-purple-200" />
                </div>
                <span className="font-body text-[15px] text-purple-100/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-body text-sm text-purple-300/50">
            &copy; {new Date().getFullYear()} PayMyTax by WallX
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gray-50/50">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden text-center">
          <Link to="/">
            <img src="/logo.png" alt="PayMyTax" className="h-10 mx-auto" />
          </Link>
          <p className="mt-3 font-body text-sm text-gray-500">
            Simple tax management for Nigerian businesses
          </p>
        </div>

        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
