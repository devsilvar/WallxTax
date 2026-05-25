import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store.ts';
import { useBusinessStore } from '@/stores/business.store.ts';

function GlobalLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-gray-100/50">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-gray-200 bg-white p-4 hidden md:block">
        <div className="space-y-3">
          <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-8 w-3/4 rounded-lg bg-gray-100 animate-pulse" />
          <div className="h-8 w-1/2 rounded-lg bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar skeleton */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
            <div className="h-6 w-24 rounded-lg bg-gray-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary-400 animate-pulse" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="space-y-6">
              {/* Header skeleton */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="h-8 w-48 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="h-4 w-72 rounded-lg bg-gray-200 animate-pulse" />
                </div>
                <div className="h-10 w-28 rounded-lg bg-gray-200 animate-pulse" />
              </div>

              {/* KPI cards skeleton */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white shadow-lg p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="h-8 w-8 rounded-xl bg-gray-100 animate-pulse" />
                    </div>
                    <div className="h-7 w-3/4 rounded-lg bg-gray-100 animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Content skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded-lg bg-gray-100 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-lg bg-gray-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded-lg bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-lg bg-gray-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded-lg bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded-lg bg-gray-100 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-lg bg-gray-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded-lg bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-lg bg-gray-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded-lg bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const businessStoreLoading = useBusinessStore((s) => s.isLoading);

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Still loading auth user or businesses - show global loading skeleton
  if (businessStoreLoading) {
    return <GlobalLoadingSkeleton />;
  }

  return <Outlet />;
}