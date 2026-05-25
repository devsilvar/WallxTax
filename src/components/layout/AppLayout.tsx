import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';
import Sidebar from './Sidebar.tsx';
import NotificationBell from './NotificationBell.tsx';
import UserMenu from './UserMenu.tsx';
import CommandPalette from '@/components/CommandPalette.tsx';

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

// Mac users get ⌘K, everyone else gets Ctrl+K. Detected once at module load — the
// platform doesn't change mid-session.
const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const SHORTCUT_LABEL = IS_MAC ? '⌘K' : 'Ctrl K';

export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Global Cmd/Ctrl+K → open palette. Escape inside the palette is handled there.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const pageTitle = pageTitles[location.pathname] || '';

  return (
    <div className="flex h-screen bg-gray-100/50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <img src="/logo.png" alt="PayMyTax" className="h-6" />
            {pageTitle && (
              <h2 className="text-base font-semibold text-gray-900 hidden sm:block">{pageTitle}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open search and quick actions"
              className="hidden md:flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-600"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>Search…</span>
              <kbd className="ml-2 inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                {SHORTCUT_LABEL}
              </kbd>
            </button>
            {/* Mobile: just the icon — palette is keyboard-driven, but tap-to-open still works */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open search"
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
