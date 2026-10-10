import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTrialTimer } from '@/hooks/useTrialTimer';

interface TrialWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  businessName?: string;
  trigger: 'registration' | 'business_creation';
  createdAt?: string; // Pass account creation timestamp
}

export default function TrialWelcomeModal({
  isOpen,
  onClose,
  userName,
  businessName,
  trigger,
  createdAt,
}: TrialWelcomeModalProps) {
  const { daysLeft, hoursLeft, minutesLeft, secondsLeft, percentRemaining } = useTrialTimer(createdAt);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = trigger === 'registration' 
    ? `Welcome, ${userName || 'there'}!` 
    : `${businessName || 'Your Business'} is Ready`;

  return createPortal(
    <div className='fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-purple-900/30 via-black/50 to-black/60 backdrop-blur-md overflow-hidden'>
      {/* Backdrop */}
      <div className='absolute inset-0 cursor-default' onClick={onClose} />

      {/* Modal Dialog */}
      <div className='relative z-10 w-full max-w-[400px] rounded-xl bg-white shadow-2xl border border-gray-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        {/* Brand accent bar */}
        <div className='h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700' />
        
        {/* Header */}
        <div className='relative p-5 pb-4'>
          <button
            type='button'
            onClick={onClose}
            className='absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'
            aria-label='Close welcome modal'
          >
            <X className='h-4 w-4' />
          </button>

          <div className='inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 ring-1 ring-inset ring-primary-600/20 mb-3'>
            <span className='relative flex h-2 w-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75' />
              <span className='relative inline-flex rounded-full h-2 w-2 bg-primary-500' />
            </span>
            <span>30-Day Free Trial Active</span>
          </div>

          <h2 className='text-xl font-bold text-gray-900 tracking-tight leading-tight'>
            {title}
          </h2>
        </div>

        {/* Content Body */}
        <div className='px-5 pb-5 space-y-4'>
          {/* Digital Countdown Timer */}
          <div className='rounded-lg border border-primary-200 bg-gradient-to-br from-primary-50/80 to-primary-50/40 p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <div className='h-8 w-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0'>
                <Clock className='h-4 w-4' />
              </div>
              <h3 className='text-sm font-semibold text-gray-900'>Trial Countdown</h3>
            </div>

            {/* Digital Timer Display with Colons */}
            <div className='bg-gray-900 rounded-lg p-3 mb-2.5'>
              <div className='flex items-center justify-center gap-1 text-primary-400'>
                {/* Days */}
                <div className='flex flex-col items-center'>
                  <div className='text-2xl font-bold tabular-nums font-mono tracking-tight'>
                    {daysLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5'>
                    Days
                  </div>
                </div>
                
                <span className='text-2xl font-bold text-primary-500/60 pb-3'>:</span>
                
                {/* Hours */}
                <div className='flex flex-col items-center'>
                  <div className='text-2xl font-bold tabular-nums font-mono tracking-tight'>
                    {hoursLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5'>
                    Hours
                  </div>
                </div>
                
                <span className='text-2xl font-bold text-primary-500/60 pb-3'>:</span>
                
                {/* Minutes */}
                <div className='flex flex-col items-center'>
                  <div className='text-2xl font-bold tabular-nums font-mono tracking-tight'>
                    {minutesLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5'>
                    Mins
                  </div>
                </div>
                
                <span className='text-2xl font-bold text-primary-500/60 pb-3'>:</span>
                
                {/* Seconds */}
                <div className='flex flex-col items-center'>
                  <div className='text-2xl font-bold tabular-nums font-mono tracking-tight'>
                    {secondsLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5'>
                    Secs
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='w-full h-1.5 rounded-full bg-gray-200 overflow-hidden'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000'
                style={{ width: `${percentRemaining}%` }}
              />
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h3 className='text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5'>
              Trial Includes:
            </h3>
            <ul className='grid grid-cols-2 gap-2'>
              <li className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-primary-600 shrink-0' strokeWidth={1.8} />
                <span className='text-[13px] text-gray-700 font-normal leading-snug tracking-[-0.01em] antialiased'>
                  5 businesses
                </span>
              </li>
              <li className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-primary-600 shrink-0' strokeWidth={1.8} />
                <span className='text-[13px] text-gray-700 font-normal leading-snug tracking-[-0.01em] antialiased'>
                  10 team members
                </span>
              </li>
              <li className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-primary-600 shrink-0' strokeWidth={1.8} />
                <span className='text-[13px] text-gray-700 font-normal leading-snug tracking-[-0.01em] antialiased'>
                  30 AI queries/mo
                </span>
              </li>
              <li className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-primary-600 shrink-0' strokeWidth={1.8} />
                <span className='text-[13px] text-gray-700 font-normal leading-snug tracking-[-0.01em] antialiased'>
                  All features
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions Footer */}
        <div className='px-5 pb-4 flex items-center justify-between gap-2.5'>
          <Link
            to='/subscription'
            onClick={onClose}
            className='text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline inline-flex items-center gap-1'
          >
            <span>View Plans</span>
            <ArrowRight className='h-3 w-3' />
          </Link>

          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-sm transition-colors'
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
