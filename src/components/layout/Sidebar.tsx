import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  FileText,
  Calculator,
  CreditCard,
  Bell,
  Landmark,
  Settings,
  Shield,
  ChevronDown,
  Plus,
  Check,
  X,
  Zap,
  AlertCircle,
  Bot,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';
import CreateBusinessModal from '@/components/CreateBusinessModal.tsx';

// Nav grouped by what the user is trying to do, not by what the data is.
// "Operate" = day-to-day bookkeeping. "Money" = tax + payments + bank.
// "Account" = settings/notifications.
const navSections: Array<{
  label: string;
  items: Array<{ to: string; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: 'Operate',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/sales', label: 'Sales', icon: Receipt },
      { to: '/sales/unverified', label: 'Unverified', icon: AlertCircle },
      { to: '/expenses', label: 'Expenses', icon: Wallet },
      { to: '/invoices', label: 'Invoices', icon: FileText },
      { to: '/ai', label: 'AI Assistant', icon: Bot },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/tax', label: 'Tax Reports', icon: Calculator },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/account', label: 'Bank Account', icon: Landmark },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/reminders', label: 'Reminders', icon: Bell },
      { to: '/settings', label: 'Settings', icon: Settings },
      ...(import.meta.env.DEV ? [{ to: '/test/transfer-simulator', label: 'Test Transfer', icon: Zap }] : []),
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const businesses = useBusinessStore((s) => s.businesses);
  const setActiveBusiness = useBusinessStore((s) => s.setActiveBusiness);

  const [showBizDropdown, setShowBizDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Lock body scroll when mobile sidebar is open
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
      {/* Logo */}
      <div className='flex items-center justify-between px-5 py-5'>
        <img src='/logo.png' alt='PayMyTax' className='h-8' />
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className='md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors'
        >
          <X className='h-4 w-4 text-gray-500' />
        </button>
      </div>

      {/* Business selector */}
      <div className='relative mx-4 mb-2'>
        {activeBusiness ? (
          <button
            onClick={() => setShowBizDropdown(!showBizDropdown)}
            className='flex w-full items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50/80 to-gray-50/40 px-3 py-2.5 text-left transition-all duration-200 hover:border-primary-200 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-primary-50/20 group'
          >
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white text-[12px] font-bold shrink-0 shadow-sm shadow-primary-500/20'>
                {activeBusiness.businessName.charAt(0).toUpperCase()}
              </div>
              <div className='min-w-0'>
                <p className='text-[13px] font-semibold text-gray-900 truncate'>
                  {activeBusiness.businessName}
                </p>
                <p className='text-[10px] text-gray-400'>Active workspace</p>
              </div>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform duration-200 group-hover:text-primary-500 ${showBizDropdown ? 'rotate-180' : ''}`}
            />
          </button>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className='flex w-full items-center gap-2 rounded-xl border border-dashed border-primary-200 px-3 py-2.5 text-[13px] font-medium text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-all'
          >
            <Plus className='h-4 w-4' />
            Create Business
          </button>
        )}

        {/* Dropdown */}
        {showBizDropdown && (
          <>
            <div
              className='fixed inset-0 z-10'
              onClick={() => setShowBizDropdown(false)}
            />
            <div className='absolute left-0 right-0 top-full z-20 mt-1.5 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-gray-200/50 animate-in'>
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => {
                    setActiveBusiness(biz);
                    setShowBizDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-[13px] transition-colors ${
                    biz.id === activeBusiness?.id
                      ? 'text-primary-700 font-medium bg-primary-50/70'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                        biz.id === activeBusiness?.id
                          ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {biz.businessName.charAt(0).toUpperCase()}
                    </div>
                    <span className='truncate'>{biz.businessName}</span>
                  </div>
                  {biz.id === activeBusiness?.id && (
                    <Check className='h-3.5 w-3.5 text-primary-500' />
                  )}
                </button>
              ))}
              <div className='border-t border-gray-50 mt-1 pt-1 px-1.5'>
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowBizDropdown(false);
                  }}
                  className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-primary-600 hover:bg-primary-50 transition-colors'
                >
                  <Plus className='h-3.5 w-3.5' />
                  New Business
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateBusinessModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Quick actions — shortcuts to the two highest-frequency flows.
          Both deep-link to the page; the page's existing CTA opens its modal. */}
      <div className='px-4 mt-1 mb-3 space-y-1.5'>
        <NavLink
          to='/sales'
          onClick={handleNavClick}
          className='flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-[13px] font-semibold text-white shadow-sm shadow-primary-500/20 transition-all duration-200 hover:bg-primary-700 active:scale-[0.99]'
        >
          <Plus className='h-4 w-4' strokeWidth={2.4} />
          Record sale
        </NavLink>
        <NavLink
          to='/tax'
          onClick={handleNavClick}
          className='flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-all duration-200 hover:border-primary-200 hover:bg-primary-50/40 hover:text-primary-700'
        >
          <Zap className='h-4 w-4 text-amber-500' strokeWidth={2.2} />
          Calculate tax
        </NavLink>
      </div>

      {/* Navigation — grouped by intent (Operate / Money / Account) */}
      <nav className='flex-1 overflow-y-auto px-3' aria-label='Main navigation'>
        {navSections.map((section) => (
          <div key={section.label} className='mb-4 last:mb-0'>
            <p className='px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider'>
              {section.label}
            </p>
            <ul className='space-y-0.5'>
              {section.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-50 to-primary-50/40 text-primary-700'
                          : 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-700'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className='absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-primary-500 to-primary-600' />
                        )}
                        <Icon
                          className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary-600' : ''}`}
                          strokeWidth={isActive ? 2 : 1.8}
                        />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Admin link */}
      {user?.role === 'admin' && (
        <div className='px-3 pb-1'>
          <NavLink
            to='/admin'
            onClick={handleNavClick}
            className={({ isActive }) =>
              `group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-red-50/80 text-red-700'
                  : 'text-gray-500 hover:bg-gray-50/80 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className='absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-red-500' />
                )}
                <Shield
                  className='h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110'
                  strokeWidth={isActive ? 2 : 1.8}
                />
                Admin Panel
              </>
            )}
          </NavLink>
        </div>
      )}

    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible at lg+ */}
      <aside className="hidden lg:flex h-screen w-[260px] flex-col bg-white border-r border-gray-100 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar — overlay drawer */}
      <div className="lg:hidden">
        {/* Backdrop with blur */}
        <div
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Navigation sidebar"
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
