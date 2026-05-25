import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import ErrorBoundary from '@/components/ErrorBoundary.tsx';
import AuthLayout from '@/components/layout/AuthLayout.tsx';
import AppLayout from '@/components/layout/AppLayout.tsx';
import ProtectedRoute from '@/routes/ProtectedRoute.tsx';
import GuestRoute from '@/routes/GuestRoute.tsx';

import Landing from '@/pages/Landing.tsx';
import Login from '@/pages/Login.tsx';
import Register from '@/pages/Register.tsx';
import Dashboard from '@/pages/Dashboard.tsx';
import Sales from '@/pages/Sales.tsx';
import Expenses from '@/pages/Expenses.tsx';
import Invoices from '@/pages/Invoices.tsx';
import InvoiceForm from '@/pages/InvoiceForm.tsx';
import InvoiceDetail from '@/pages/InvoiceDetail.tsx';
import TaxReports from '@/pages/TaxReports.tsx';
import Payments from '@/pages/Payments.tsx';
import Reminders from '@/pages/Reminders.tsx';
import Settings from '@/pages/Settings.tsx';
import Account from '@/pages/Account.tsx';
import NotFound from '@/pages/NotFound.tsx';

import AdminRoute from '@/routes/AdminRoute.tsx';
import AdminLayout from '@/components/layout/AdminLayout.tsx';
import AdminLogin from '@/pages/admin/AdminLogin.tsx';
import AdminDashboard from '@/pages/admin/AdminDashboard.tsx';
import AdminUsers from '@/pages/admin/AdminUsers.tsx';
import AdminUserDetail from '@/pages/admin/AdminUserDetail.tsx';
import AdminBusinesses from '@/pages/admin/AdminBusinesses.tsx';
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs.tsx';

import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';

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
        <Routes>
          {/* Guest routes */}
          <Route element={<GuestRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="/tax" element={<TaxReports />} />
              <Route path="/payments" element={<Payments />} />
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
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            </Route>
          </Route>

          {/* Landing page */}
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
