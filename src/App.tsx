import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import ErrorBoundary from '@/components/ErrorBoundary.tsx';
import AuthLayout from '@/components/layout/AuthLayout.tsx';
import AppLayout from '@/components/layout/AppLayout.tsx';
import ProtectedRoute from '@/routes/ProtectedRoute.tsx';
import GuestRoute from '@/routes/GuestRoute.tsx';
import AdminRoute from '@/routes/AdminRoute.tsx';
import AdminLayout from '@/components/layout/AdminLayout.tsx';
import PageLoader from '@/components/ui/PageLoader.tsx';

import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';

// Lazy-loaded page components for optimal code splitting
const Landing = lazy(() => import('@/pages/Landing.tsx'));
const Login = lazy(() => import('@/pages/Login.tsx'));
const Register = lazy(() => import('@/pages/Register.tsx'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword.tsx'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword.tsx'));
const Dashboard = lazy(() => import('@/pages/Dashboard.tsx'));
const Sales = lazy(() => import('@/pages/Sales.tsx'));
const Expenses = lazy(() => import('@/pages/Expenses.tsx'));
const Invoices = lazy(() => import('@/pages/Invoices.tsx'));
const InvoiceForm = lazy(() => import('@/pages/InvoiceForm.tsx'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail.tsx'));
const UnverifiedTransactions = lazy(() => import('@/pages/UnverifiedTransactions.tsx'));
const TestTransferSimulator = lazy(() => import('@/pages/TestTransferSimulator.tsx'));
const AIAssistant = lazy(() => import('@/pages/AIAssistant.tsx'));
const TaxReports = lazy(() => import('@/pages/TaxReports.tsx'));
const Payments = lazy(() => import('@/pages/Payments.tsx'));
const PaymentCallback = lazy(() => import('@/pages/PaymentCallback.tsx'));
const Transactions = lazy(() => import('@/pages/Transactions.tsx'));
const Reminders = lazy(() => import('@/pages/Reminders.tsx'));
const Settings = lazy(() => import('@/pages/Settings.tsx'));
const Account = lazy(() => import('@/pages/Account.tsx'));
const NotFound = lazy(() => import('@/pages/NotFound.tsx'));

// Admin pages
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin.tsx'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard.tsx'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers.tsx'));
const AdminUserDetail = lazy(() => import('@/pages/admin/AdminUserDetail.tsx'));
const AdminBusinesses = lazy(() => import('@/pages/admin/AdminBusinesses.tsx'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs.tsx'));
const AdminWithdrawals = lazy(() => import('@/pages/admin/AdminWithdrawals.tsx'));

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
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader minHeight="min-h-screen" message="Loading PayMyTax..." />}>
          <Routes>
            {/* Guest routes */}
            <Route element={<GuestRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/sales/unverified" element={<UnverifiedTransactions />} />
                <Route path="/test/transfer-simulator" element={<TestTransferSimulator />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="/ai" element={<AIAssistant />} />
                <Route path="/tax" element={<TaxReports />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/callback" element={<PaymentCallback />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/account" element={<Account />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Admin login — standalone, no guest guard (has its own dark layout) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin protected routes */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
                <Route path="/admin/businesses" element={<AdminBusinesses />} />
                <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
                <Route path="/admin/settlement/withdrawals" element={<AdminWithdrawals />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              </Route>
            </Route>

            {/* Landing page */}
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
