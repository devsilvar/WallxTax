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
import { Lock, ArrowRight, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Top brand header */}
        <div className="bg-linear-to-br from-purple-700 via-purple-800 to-indigo-900 p-6 text-white text-center relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-4 border border-white/20">
            <Lock className="h-7 w-7 text-amber-300" />
          </div>
          <h2
            id="subscription-expired-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-white"
          >
            {heading}
          </h2>
          <p className="mt-2 text-sm text-purple-200">
            Choose a plan that fits your business to resume sales recording, automated invoicing, and tax filings.
          </p>
        </div>

        {/* Modal body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3 bg-purple-50/60 p-4 rounded-xl border border-purple-100 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <strong>Your records are 100% safe:</strong> All historical sales, expenses, invoices, and debtor records remain securely preserved.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <strong>Instant activation:</strong> Simply transfer to our Zenith Bank account and upload proof for instant confirmation.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <Link
              to="/subscription"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <span>View Plans & Upgrade Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>Need help? Chat with billing on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
