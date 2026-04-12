import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import Sidebar from './Sidebar.tsx';
import CreateBusinessModal from '@/components/CreateBusinessModal.tsx';
import { useBusinessStore } from '@/stores/business.store.ts';
import { useAuthStore } from '@/stores/auth.store.ts';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/expenses': 'Expenses',
  '/tax': 'Tax Reports',
  '/payments': 'Payments',
  '/reminders': 'Reminders',
  '/account': 'Bank Account',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const businesses = useBusinessStore((s) => s.businesses);
  const isLoading = useBusinessStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && businesses.length === 0) {
      setShowOnboarding(true);
    }
  }, [isLoading, businesses.length]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = pageTitles[location.pathname] || '';

  return (
    <div className="flex h-screen bg-gray-50/80">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <Menu className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
            </button>
            <img src="/logo.png" alt="PayMyTax" className="h-5 sm:h-6" />
            {pageTitle && (
              <h2 className="text-[13px] sm:text-[15px] font-semibold text-gray-900 tracking-tight hidden sm:block">{pageTitle}</h2>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-1.5 hover:border-gray-200 transition-colors cursor-pointer">
              <Search className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              <span className="text-[12px] text-gray-400">Search...</span>
              <kbd className="ml-4 rounded-md border border-gray-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">⌘K</kbd>
            </div>
            <button className="relative flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all" aria-label="View notifications">
              <Bell className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-gray-500" />
            </button>
            <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white text-[11px] sm:text-[12px] font-bold shadow-sm shadow-primary-500/20" role="img" aria-label={`User profile: ${user?.email?.charAt(0).toUpperCase() || 'U'}`}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <CreateBusinessModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        required={businesses.length === 0}
      />
    </div>
  );
}
