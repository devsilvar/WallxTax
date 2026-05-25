import { useEffect, useState } from 'react';
import { Users, Building2, FileText, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import type { AdminDashboardStats } from '@/types/index.ts';
import api from '@/lib/axios.ts';

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const statCards = [
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'bg-gray-900 text-white' },
  { key: 'totalBusinesses' as const, label: 'Total Businesses', icon: Building2, color: 'bg-gray-900 text-white' },
  { key: 'totalTaxReports' as const, label: 'Tax Reports', icon: FileText, color: 'bg-gray-900 text-white' },
  { key: 'totalRevenueProcessed' as const, label: 'Revenue Processed', icon: TrendingUp, color: 'bg-gray-900 text-white', isCurrency: true },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((r) => setStats(r.data.data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="py-20 text-center text-gray-400">Loading...</div>;
  if (!stats) return <div className="py-20 text-center text-gray-400">Failed to load stats.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Platform overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color, isCurrency }) => (
          <Card key={key} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {isCurrency ? formatNaira(stats[key] as number) : stats[key]}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent Signups</h2>
        </div>
        {stats.recentSignups.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400">No recent signups.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentSignups.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      {u.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.email}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(u.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
