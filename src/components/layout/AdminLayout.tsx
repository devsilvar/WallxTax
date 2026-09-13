import { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, Activity, ArrowUpRight } from 'lucide-react';
import AdminSidebar from './AdminSidebar.tsx';
import { useAuthStore } from '@/stores/auth.store.ts';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const crumbs = [{ label: 'Admin', to: '/admin' }];

    if (path === '/admin') {
      crumbs.push({ label: 'Dashboard', to: '/admin' });
    } else if (path.startsWith('/admin/users')) {
      crumbs.push({ label: 'Users', to: '/admin/users' });
      if (path.split('/').length > 3) {
        crumbs.push({ label: 'User Detail', to: path });
      }
    } else if (path.startsWith('/admin/businesses')) {
      crumbs.push({ label: 'Businesses', to: '/admin/businesses' });
    } else if (path.startsWith('/admin/withdrawals') || path.startsWith('/admin/settlement/withdrawals')) {
      crumbs.push({ label: 'Withdrawals & Settlement', to: '/admin/withdrawals' });
    } else if (path.startsWith('/admin/audit-logs')) {
      crumbs.push({ label: 'Audit Logs', to: '/admin/audit-logs' });
    }

    return crumbs;
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 antialiased font-sans">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header — Mobile & Desktop Unified */}
        <header className="h-16 border-b border-gray-200/80 bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar menu"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors -ml-1"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs on desktop */}
            <nav aria-label="Breadcrumbs" className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <div key={crumb.to + idx} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    {isLast ? (
                      <span className="font-semibold text-gray-900">{crumb.label}</span>
                    ) : (
                      <Link to={crumb.to} className="hover:text-gray-900 transition-colors">
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="sm:hidden flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Admin Portal</span>
            </div>
          </div>

          {/* Right Header Status Strip */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live System Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] font-semibold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <span>Live Ops · FIRS Synced</span>
            </div>

            {/* Switch to User App CTA */}
            <Link
              to="/dashboard"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-colors border border-gray-200/80"
            >
              <span>User App</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
            </Link>

            {/* Admin User Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs border border-primary-200">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[130px]">
                  {user?.email || 'admin@paymytax.com'}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
