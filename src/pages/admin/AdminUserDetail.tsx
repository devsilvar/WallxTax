import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, Shield, Calendar } from 'lucide-react';
import Card from '@/components/ui/Card.tsx';
import Button from '@/components/ui/Button.tsx';
import api from '@/lib/axios.ts';
import toast from 'react-hot-toast';
import type { AdminUserDetail as AdminUserDetailType } from '@/types/index.ts';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api.get(`/admin/users/${userId}`)
      .then((r) => setUser(r.data.data))
      .finally(() => setIsLoading(false));
  }, [userId]);

  const handleToggle = async () => {
    if (!user) return;
    setToggling(true);
    try {
      await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      setUser({ ...user, isActive: !user.isActive });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed');
    } finally { setToggling(false); }
  };

  if (isLoading) return <div className="py-20 text-center text-gray-400">Loading...</div>;
  if (!user) return <div className="py-20 text-center text-gray-400">User not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/users')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.email}</h1>
          <p className="mt-0.5 font-body text-sm text-gray-500">User details and associated businesses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile</h2>
          <div className="space-y-3 font-body text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-gray-400" /> {user.email}</div>
            {user.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400" /> {user.phone}</div>}
            <div className="flex items-center gap-2 text-gray-600"><Shield className="h-4 w-4 text-gray-400" /> <span className="capitalize">{user.role}</span></div>
            <div className="flex items-center gap-2 text-gray-600"><Calendar className="h-4 w-4 text-gray-400" /> Joined {formatDate(user.createdAt)}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {user.isVerified ? 'Verified' : 'Unverified'}
            </span>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="mt-4">
            <Button
              size="sm"
              variant={user.isActive ? 'danger' : 'primary'}
              onClick={handleToggle}
              isLoading={toggling}
            >
              {user.isActive ? 'Deactivate User' : 'Activate User'}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Businesses ({user.businesses.length})</h2>
          {user.businesses.length === 0 ? (
            <p className="font-body text-sm text-gray-400">No businesses registered.</p>
          ) : (
            <div className="space-y-3">
              {user.businesses.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{b.businessName}</p>
                    <p className="font-body text-xs text-gray-400">{b.businessType} · {b.ownerName}</p>
                  </div>
                  <span className="font-body text-xs text-gray-400">{formatDate(b.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
