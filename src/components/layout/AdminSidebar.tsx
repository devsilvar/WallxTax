import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  ScrollText,
  ArrowLeft,
  LogOut,
  X,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store.ts';
import api from '@/lib/axios.ts';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isOpen]);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => {
        const pending = res.data?.data?.withdrawalSla?.pendingCount || 0;
        setPendingWithdrawals(pending);
      })
      .catch(() => {});
  }, []);

  const handleNavClick = () => {
    onClose?.();
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
    {
      to: '/admin/withdrawals',
      label: 'Withdrawals',
      icon: Wallet,
      badge: pendingWithdrawals > 0 ? pendingWithdrawals : undefined,
    },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/admin/ai-settings', label: 'AI Settings', icon: Bot },
  ];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4.5 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-bold text-base shadow-sm shadow-primary-500/20">
            PMT
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 tracking-tight">PayMyTax</span>
              <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Platform Management</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Core Controls
        </div>
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, end, badge }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4.5 w-4.5 transition-colors ${
                          isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                      <span>{label}</span>
                    </div>
                    {badge !== undefined && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Admin User Info & Footer */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/50 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white border border-gray-200/60 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900">
              {user?.email || 'admin@paymytax.com'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <ShieldCheck className="h-3 w-3" /> Super Admin
            </div>
          </div>
        </div>

        <div className="space-y-0.5">
          <NavLink
            to="/dashboard"
            onClick={handleNavClick}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-white hover:text-gray-900 hover:shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-gray-400" />
            Switch to SME Portal
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r border-gray-200/80 bg-white shrink-0 shadow-xs z-20">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — overlay drawer */}
      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
