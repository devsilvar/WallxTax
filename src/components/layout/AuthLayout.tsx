import { Link, Outlet } from 'react-router-dom';
import { Shield, LineChart, Clock, CheckCircle2, Fingerprint } from 'lucide-react';

const highlights = [
  { icon: LineChart, text: 'Track sales & expenses in real time' },
  { icon: Shield, text: 'Bank-grade encryption on all data' },
  { icon: Clock, text: 'File your taxes in under 5 minutes' },
  { icon: CheckCircle2, text: 'Stay FIRS-compliant, always' },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex-col justify-between p-12">
        {/* Background accents */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(147,51,234,0.25),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_100%,rgba(139,92,246,0.2),transparent)]" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary-500/15 rounded-full blur-[100px] animate-blob-morph" />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-[100px] animate-blob-morph" style={{ animationDelay: '3s' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(to right, #9333ea 1px, transparent 1px), linear-gradient(to bottom, #9333ea 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <Link to="/">
            <img src="/logo.png" alt="PayMyTax" className="h-10 brightness-0 invert" />
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-1.5 mb-6 w-fit">
            <Fingerprint className="h-3.5 w-3.5 text-primary-400 animate-icon-pulse" />
            <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">Simple & Secure</span>
          </div>
          
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Tax compliance
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">made simple.</span>
          </h2>
          <p className="mt-4 max-w-sm font-body text-base text-slate-400 leading-relaxed">
            Join thousands of Nigerian businesses managing their taxes with confidence.
          </p>

          <div className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }, i) => (
              <div 
                key={text} 
                className="group flex items-center gap-3 transition-transform duration-300 hover:translate-x-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/5 group-hover:bg-primary-500/20 group-hover:border-primary-500/30 transition-colors duration-300">
                  <Icon className="h-4.5 w-4.5 text-primary-400 group-hover:animate-icon-bounce" />
                </div>
                <span className="font-body text-[15px] text-slate-300 group-hover:text-white transition-colors duration-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-body text-sm text-slate-500">
            &copy; {new Date().getFullYear()} PayMyTax by WallX
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-slate-50/50">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden text-center">
          <Link to="/">
            <img src="/logo.png" alt="PayMyTax" className="h-10 mx-auto" />
          </Link>
          <p className="mt-3 font-body text-sm text-slate-500">
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
