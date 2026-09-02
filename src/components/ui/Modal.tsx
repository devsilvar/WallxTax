/**
 * Modal — the shared modal primitive for the design system.
 *
 * Extracted from the shell that `SalesImportModal.tsx` hand-rolled (its header
 * comment asked for this exact extraction "when we have a third caller" —
 * AddSaleModal / AddExpenseModal are callers #3 and #4).
 *
 * Mobile-first: on phones the panel docks to the bottom edge (thumb-reach
 * bottom sheet); from `sm:` up it centers like a classic dialog.
 *
 * IMPORTANT — footer-outside-form contract:
 *   `footer` renders OUTSIDE the <form> element (children own the body). A
 *   submit button placed in `footer` must carry the `form="…"` attribute
 *   pointing at the form's id, otherwise onSubmit never fires.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Optional lucide icon rendered in the header chip */
  icon?: ReactNode;
  size?: ModalSize;
  /** Action bar under the body — see the footer-outside-form contract above */
  footer?: ReactNode;
  children: ReactNode;
  /** Allow closing via Escape / backdrop tap. Default true */
  dismissible?: boolean;
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  children,
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape-to-close + focus trap (Tab cycles inside the panel only)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dismissible, onClose]);

  // Body scroll lock + focus management (in on open, back on close)
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(raf);
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 sm:items-center sm:p-4'
      onClick={(e) => {
        // Only a direct tap on the backdrop closes — clicks inside the panel
        // bubble here but e.target !== e.currentTarget filters them out.
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='modal-title'
        tabIndex={-1}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none animate-scale-in sm:max-h-[90vh] sm:rounded-xl ${SIZE_CLASS[size]}`}
      >
        {/* Drag handle — mobile-only sheet affordance */}
        <div className='flex justify-center pt-2 sm:hidden'>
          <span className='h-1 w-10 rounded-full bg-gray-300' />
        </div>

        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6'>
          <div className='flex items-center gap-3'>
            {icon && <div className='rounded-lg bg-primary-50 p-2'>{icon}</div>}
            <div>
              <h2 id='modal-title' className='text-lg font-semibold text-gray-900'>
                {title}
              </h2>
              {subtitle && <p className='text-xs text-gray-500'>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={() => {
              // Respect dismissible — an in-flight save must not be dismissed
              if (dismissible) onClose();
            }}
            disabled={!dismissible}
            aria-label='Close modal'
            className='rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-5 py-5 sm:px-6'>{children}</div>

        {/* Footer — stacked full-width on mobile, row from sm: */}
        {footer && (
          <div className='flex flex-col-reverse items-stretch gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
