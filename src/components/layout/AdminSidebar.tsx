import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  ScrollText,
  ArrowLeft,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store.ts';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isOpen]);

  const handleNavClick = () => {
    onClose?.();
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white font-bold text-sm">
            A
          </div>
          <span className="text-base font-semibold text-gray-900">Admin</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-100 px-3 py-4 space-y-1">
        <NavLink
          to="/dashboard"
          onClick={handleNavClick}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </NavLink>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r border-gray-100 bg-white shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — overlay drawer */}
      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
