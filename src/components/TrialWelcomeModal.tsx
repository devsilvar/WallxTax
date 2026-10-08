import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Clock, Crown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTrialTimer } from '@/hooks/useTrialTimer';

interface TrialWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  businessName?: string;
  trigger: 'registration' | 'business_creation';
}

export default function TrialWelcomeModal({
  isOpen,
  onClose,
  userName,
  businessName,
  trigger,
}: TrialWelcomeModalProps) {
  const { daysLeft, hoursLeft, minutesLeft, secondsLeft, percentRemaining } = useTrialTimer();

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
    ? `Welcome to WallXERP, ${userName || 'there'}!` 
    : `${businessName || 'Your Business'} is Ready!`;

  const subtitle = trigger === 'registration'
    ? 'Your account has been created successfully. You now have full access to all features during your free trial.'
    : 'Your business profile is set up and ready. Start exploring all features available during your free trial.';

  return createPortal(
    <div className='fixed inset-0 z-[9999] w-screen h-screen min-h-screen flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-hidden'>
      {/* Backdrop */}
      <div className='absolute inset-0 cursor-default' onClick={onClose} />

      {/* Modal Dialog */}
      <div className='relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='relative p-5 sm:p-6 pb-4 border-b border-gray-100'>
          <button
            type='button'
            onClick={onClose}
            className='absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'
            aria-label='Close welcome modal'
          >
            <X className='h-4 w-4' />
          </button>

          <div className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 mb-3'>
            <span className='relative flex h-2 w-2'>
              <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
              <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
            </span>
            <span>10-Day Free Trial Active</span>
          </div>

          <h2 className='text-xl sm:text-2xl font-bold text-gray-900 tracking-tight'>
            {title}
          </h2>
          <p className='mt-1.5 text-sm text-gray-600 leading-relaxed'>
            {subtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className='p-5 sm:p-6 space-y-5'>
          {/* Live Trial Countdown */}
          <div className='rounded-xl border-2 border-emerald-200/80 bg-emerald-50/40 p-4 sm:p-5'>
            <div className='flex items-start gap-3 mb-3'>
              <div className='h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm'>
                <Clock className='h-5 w-5' />
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='text-sm font-bold text-gray-900'>Your Free Trial Period</h3>
                <p className='text-xs text-gray-600 mt-0.5'>
                  Full unrestricted access to all features
                </p>
              </div>
            </div>

            {/* Live Timer Display with Seconds */}
            <div className='bg-white rounded-lg border border-emerald-200 p-3 mb-3'>
              <div className='grid grid-cols-4 gap-2 text-center'>
                <div>
                  <div className='text-2xl font-bold text-emerald-600 tabular-nums'>
                    {daysLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5'>
                    Days
                  </div>
                </div>
                <div>
                  <div className='text-2xl font-bold text-emerald-600 tabular-nums'>
                    {hoursLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5'>
                    Hours
                  </div>
                </div>
                <div>
                  <div className='text-2xl font-bold text-emerald-600 tabular-nums'>
                    {minutesLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5'>
                    Minutes
                  </div>
                </div>
                <div>
                  <div className='text-2xl font-bold text-emerald-600 tabular-nums'>
                    {secondsLeft.toString().padStart(2, '0')}
                  </div>
                  <div className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5'>
                    Seconds
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='w-full h-2 rounded-full bg-gray-200 overflow-hidden'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000'
                style={{ width: `${percentRemaining}%` }}
              />
            </div>
            <p className='text-[11px] text-gray-500 text-center mt-2'>
              {percentRemaining}% of trial remaining
            </p>
          </div>

          {/* What's Available */}
          <div>
            <h3 className='text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5'>
              Available During Trial:
            </h3>
            <ul className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
              <li className='flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                <span className='text-gray-700'>Up to 5 businesses</span>
              </li>
              <li className='flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                <span className='text-gray-700'>10 team members</span>
              </li>
              <li className='flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                <span className='text-gray-700'>30 AI CFO queries/month</span>
              </li>
              <li className='flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                <span className='text-gray-700'>All premium features</span>
              </li>
            </ul>
          </div>

          {/* Upgrade Callout */}
          <div className='rounded-xl border border-primary-100 bg-primary-50/40 p-3.5 sm:p-4 flex items-start gap-3'>
            <div className='h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm'>
              <Crown className='h-4.5 w-4.5' />
            </div>
            <div className='text-xs flex-1'>
              <span className='font-bold text-gray-900 block mb-1'>
                Ready to Upgrade After Trial?
              </span>
              <p className='text-gray-600 leading-relaxed'>
                Check out our subscription plans anytime. Starter at <strong>₦5,000/month</strong>, 
                Business at <strong>₦12,000/quarter</strong>, or Scale-Up at <strong>₦45,000/year</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className='p-4 sm:p-5 bg-gray-50/80 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5'>
          <Link
            to='/subscription'
            onClick={onClose}
            className='text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline inline-flex items-center gap-1'
          >
            <span>View Subscription Plans</span>
            <ArrowRight className='h-3 w-3' />
          </Link>

          <button
            type='button'
            onClick={onClose}
            className='w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-sm transition-colors'
          >
            Start Exploring Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
