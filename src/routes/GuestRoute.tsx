import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store.ts';

export default function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (isAuthenticated) {
    // Admin users go to admin dashboard, regular users go to customer dashboard
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
