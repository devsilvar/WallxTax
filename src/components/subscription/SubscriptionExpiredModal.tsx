/**
 * SubscriptionExpiredModal — WallXERP
 *
 * Appears when a user's free trial and grace period have both expired,
 * guiding them to the subscription plan selection page without locking them
 * out of the upgrade flow itself.
 *
 * @author WallX Engineering Team
 */

import { Link, useLocation } from 'react-router-dom';
import { LockKeyhole, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const WHATSAPP_SUPPORT_URL =
  'https://wa.me/2348147490832?text=Hello%20WallXERP%20Support,%20my%20trial%20expired%20and%20I%20would%20like%20to%20activate%20a%20plan.';

export default function SubscriptionExpiredModal() {
  const location = useLocation();
  const { isExpired, hasAccess, tier } = useSubscriptionStatus();

  // Do not lock out users on the subscription upgrade page or admin portal
  const isExcludedPath =
    location.pathname.startsWith('/subscription') ||
    location.pathname.startsWith('/pricing') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/admin');

  if (!isExpired || hasAccess || isExcludedPath) {
    return null;
  }

  const isFreeTrial = tier === 'free';
  const heading = isFreeTrial
    ? 'Your 10-Day Free Trial Has Concluded'
    : 'Your Subscription Has Expired';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-expired-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-purple-900/30 via-black/50 to-black/60 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="w-full max-w-[360px] bg-white rounded-xl shadow-2xl overflow-hidden border border-purple-100/50">
        {/* Brand accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700" />
        
        {/* Content */}
        <div className="px-5 pt-6 pb-5">
          {/* Icon with brand accent */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/10 rounded-lg blur-lg" />
              <div className="relative h-11 w-11 rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center border border-primary-200/50">
                <LockKeyhole className="h-5 w-5 text-primary-700" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h2
            id="subscription-expired-title"
            className="text-lg font-semibold text-gray-900 text-center mb-2 leading-tight tracking-tight"
          >
            {heading}
          </h2>
          
          <p className="text-gray-600 text-center text-[13px] leading-relaxed mb-5">
            Choose a plan to continue using WallXERP.
          </p>

          {/* Feature list with CheckCircle2 matching subscription boxes */}
          <div className="mb-5">
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 mt-px text-primary-600"
                  strokeWidth={1.8}
                />
                <span className="text-[13.5px] font-normal leading-snug tracking-[-0.01em] antialiased text-gray-900">
                  Your data is safe and securely preserved
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 mt-px text-primary-600"
                  strokeWidth={1.8}
                />
                <span className="text-[13.5px] font-normal leading-snug tracking-[-0.01em] antialiased text-gray-900">
                  Instant activation after payment verification
                </span>
              </li>
            </ul>
          </div>

          {/* Actions with brand styling */}
          <div className="space-y-2">
            <Link
              to="/subscription"
              className="group w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 hover:from-primary-700 hover:to-primary-800 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <span>View Plans</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </Link>

            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              <MessageSquare className="h-3.5 w-3.5 text-gray-600" strokeWidth={2} />
              <span>Chat with support</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
