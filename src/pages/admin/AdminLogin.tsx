import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store.ts';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import Card from '@/components/ui/Card.tsx';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios.ts';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // Fetch user to verify admin role
      const { data } = await api.get('/auth/me');
      const user = data.data;
      if (user.role !== 'admin') {
        useAuthStore.getState().logout();
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      useAuthStore.setState({ user });
      toast.success('Welcome, Admin');
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Admin Portal</h1>
          <p className="mt-1 font-body text-sm text-gray-400">
            PayMyTax administration panel
          </p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Admin Sign In</h2>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@paymytax.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign in to Admin
            </Button>
            <p className="text-center text-sm text-gray-500">
              Not an admin?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Go to customer login
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
