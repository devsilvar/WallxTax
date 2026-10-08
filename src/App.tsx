import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import ErrorBoundary from '@/components/ErrorBoundary.tsx';
import AuthLayout from '@/components/layout/AuthLayout.tsx';
import AppLayout from '@/components/layout/AppLayout.tsx';
import ProtectedRoute from '@/routes/ProtectedRoute.tsx';
import GuestRoute from '@/routes/GuestRoute.tsx';
import AdminRoute from '@/routes/AdminRoute.tsx';
import AdminLayout from '@/components/layout/AdminLayout.tsx';
import PageLoader from '@/components/ui/PageLoader.tsx';
import ScrollToTop from '@/components/ScrollToTop.tsx';

import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';

// Marketing editorial pages
const MarketingLayout = lazy(
  () => import('@/components/marketing/MarketingLayout.tsx'),
);
const Home = lazy(() => import('@/pages/marketing/Home.tsx'));
const About = lazy(() => import('@/pages/marketing/About.tsx'));
const Pricing = lazy(() => import('@/pages/marketing/Pricing.tsx'));
const Contact = lazy(() => import('@/pages/marketing/Contact.tsx'));

const Login = lazy(() => import('@/pages/Login.tsx'));
const Register = lazy(() => import('@/pages/Register.tsx'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword.tsx'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword.tsx'));
const VerifyEmailPending = lazy(() => import('@/pages/VerifyEmailPending.tsx'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail.tsx'));
const Dashboard = lazy(() => import('@/pages/Dashboard.tsx'));

const Sales = lazy(() => import('@/pages/Sales.tsx'));
const Expenses = lazy(() => import('@/pages/Expenses.tsx'));
const Invoices = lazy(() => import('@/pages/Invoices.tsx'));
const InvoiceForm = lazy(() => import('@/pages/InvoiceForm.tsx'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail.tsx'));
const Debtors = lazy(() => import('@/pages/Debtors.tsx'));
const DebtorDetail = lazy(() => import('@/pages/DebtorDetail.tsx'));
const Customers = lazy(() => import('@/pages/Customers.tsx'));
const AIAssistant = lazy(() => import('@/pages/AIAssistant.tsx'));
const isSimulatorEnabled =
  import.meta.env.VITE_ENABLE_TRANSFER_SIMULATOR === 'true';
const TestTransferSimulator = isSimulatorEnabled
  ? lazy(() => import('@/pages/TestTransferSimulator.tsx'))
  : () => null;
const TaxReports = lazy(() => import('@/pages/TaxReports.tsx'));
const PaymentCallback = lazy(() => import('@/pages/PaymentCallback.tsx'));
const Transactions = lazy(() => import('@/pages/Transactions.tsx'));
const Settings = lazy(() => import('@/pages/Settings.tsx'));
const Account = lazy(() => import('@/pages/Account.tsx'));
const Subscription = lazy(() => import('@/pages/Subscription.tsx'));
const InvitationAccept = lazy(() => import('@/pages/InvitationAccept.tsx'));
const NotFound = lazy(() => import('@/pages/NotFound.tsx'));

// Admin pages
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin.tsx'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard.tsx'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers.tsx'));
const AdminUserDetail = lazy(() => import('@/pages/admin/AdminUserDetail.tsx'));
const AdminBusinesses = lazy(() => import('@/pages/admin/AdminBusinesses.tsx'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs.tsx'));
const AdminWithdrawals = lazy(
  () => import('@/pages/admin/AdminWithdrawals.tsx'),
);
const AdminTransactions = lazy(
  () => import('@/pages/admin/AdminTransactions.tsx'),
);
const AdminUnverifiedInflows = lazy(
  () => import('@/pages/admin/AdminUnverifiedInflows.tsx'),
);
const AdminAISettings = lazy(() => import('@/pages/admin/AdminAISettings.tsx'));
const AdminSubscriptions = lazy(
  () => import('@/pages/admin/AdminSubscriptions.tsx'),
);
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews.tsx'));

function SalesUnverifiedRedirect() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={`/sales?tab=unverified${qs ? `&${qs}` : ''}`} replace />;
}

function SubscriptionGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const businessStoreLoading = useBusinessStore((s) => s.isLoading);

  if (!isAuthenticated) {
    return <Navigate to='/pricing' replace />;
  }

  if (businessStoreLoading) {
    return <PageLoader />;
  }

  return (
    <AppLayout>
      <Subscription />
    </AppLayout>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchBusinesses = useBusinessStore((s) => s.fetchBusinesses);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
      fetchBusinesses();
    }
  }, [isAuthenticated, fetchMe, fetchBusinesses]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster
        position='top-right'
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            zIndex: 99999,
          },
        }}
      />
      <ErrorBoundary>
        <Suspense
          fallback={
            <PageLoader
              minHeight='min-h-screen'
              message='Loading WallXERP...'
            />
          }
        >
          <Routes>
            {/* Guest routes */}
            <Route element={<GuestRoute />}>
              <Route element={<AuthLayout />}>
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route path='/forgot-password' element={<ForgotPassword />} />
                <Route path='/reset-password' element={<ResetPassword />} />
                <Route
                  path='/verify-email-pending'
                  element={<VerifyEmailPending />}
                />
              </Route>
            </Route>

            {/* Email verification — standalone public route, accessible in any auth state */}
            <Route element={<AuthLayout />}>
              <Route path='/verify-email' element={<VerifyEmail />} />
            </Route>

            {/* Team invitation acceptance — accessible in any auth state */}
            <Route path='/invite' element={<InvitationAccept />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/sales' element={<Sales />} />
                <Route
                  path='/sales/unverified'
                  element={<SalesUnverifiedRedirect />}
                />
                {isSimulatorEnabled && (
                  <Route
                    path='/test/transfer-simulator'
                    element={<TestTransferSimulator />}
                  />
                )}
                <Route path='/expenses' element={<Expenses />} />
                <Route path='/invoices' element={<Invoices />} />
                <Route path='/invoices/new' element={<InvoiceForm />} />
                <Route path='/invoices/:id' element={<InvoiceDetail />} />
                <Route path='/invoices/:id/edit' element={<InvoiceForm />} />
                <Route path='/debtors' element={<Debtors />} />
                <Route path='/debtors/:id' element={<DebtorDetail />} />
                <Route path='/customers' element={<Customers />} />
                <Route path='/ai' element={<AIAssistant />} />
                <Route path='/tax' element={<TaxReports />} />
                <Route
                  path='/payments'
                  element={<Navigate to='/tax?tab=payments' replace />}
                />
                <Route
                  path='/payments/callback'
                  element={<PaymentCallback />}
                />
                <Route path='/transactions' element={<Transactions />} />
                <Route
                  path='/reminders'
                  element={<Navigate to='/dashboard' replace />}
                />
                <Route path='/account' element={<Account />} />
                <Route path='/settings' element={<Settings />} />
              </Route>
            </Route>

            {/* Admin login — standalone, no guest guard (has its own dark layout) */}
            <Route path='/admin/login' element={<AdminLogin />} />

            {/* Admin protected routes */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path='/admin' element={<AdminDashboard />} />
                <Route path='/admin/users' element={<AdminUsers />} />
                <Route
                  path='/admin/users/:userId'
                  element={<AdminUserDetail />}
                />
                <Route path='/admin/businesses' element={<AdminBusinesses />} />
                <Route
                  path='/admin/withdrawals'
                  element={<AdminWithdrawals />}
                />
                <Route
                  path='/admin/settlement/withdrawals'
                  element={<AdminWithdrawals />}
                />
                <Route
                  path='/admin/transactions'
                  element={<AdminTransactions />}
                />
                <Route
                  path='/admin/unverified-inflows'
                  element={<AdminUnverifiedInflows />}
                />
                <Route path='/admin/audit-logs' element={<AdminAuditLogs />} />
                <Route
                  path='/admin/ai-settings'
                  element={<AdminAISettings />}
                />
                <Route
                  path='/admin/subscriptions'
                  element={<AdminSubscriptions />}
                />
                <Route
                  path='/admin/reviews'
                  element={<AdminReviews />}
                />
              </Route>
            </Route>

            {/* In-app subscription billing desk — authenticated users enter AppLayout, unauthenticated guests redirect to public /pricing */}
            <Route path='/subscription' element={<SubscriptionGuard />} />

            {/* Marketing editorial pages — public pricing is always accessible here */}
            <Route element={<MarketingLayout />}>
              <Route path='/' element={<Home />} />
              <Route path='/about' element={<About />} />
              <Route path='/pricing' element={<Pricing />} />
              <Route path='/contact' element={<Contact />} />
            </Route>

            <Route path='*' element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
