import { useEffect, useState } from 'react';
import { Users, Building2, Calculator, DollarSign } from 'lucide-react';
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
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'bg-blue-50 text-blue-600' },
  { key: 'totalBusinesses' as const, label: 'Total Businesses', icon: Building2, color: 'bg-green-50 text-green-600' },
  { key: 'totalTaxReports' as const, label: 'Tax Reports', icon: Calculator, color: 'bg-yellow-50 text-yellow-600' },
  { key: 'totalRevenueProcessed' as const, label: 'Revenue Processed', icon: DollarSign, color: 'bg-purple-50 text-purple-600', isCurrency: true },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 font-body text-sm text-gray-500">Platform overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color, isCurrency }) => (
          <Card key={key}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-body text-xs text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {isCurrency ? formatNaira(stats[key] as number) : stats[key]}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Signups</h2>
        {stats.recentSignups.length === 0 ? (
          <p className="font-body text-sm text-gray-400">No recent signups.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentSignups.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.email}</p>
                  <p className="font-body text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className="font-body text-xs text-gray-400">{timeAgo(u.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
