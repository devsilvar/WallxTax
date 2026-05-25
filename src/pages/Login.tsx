import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store.ts';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import toast from 'react-hot-toast';
import api from '@/lib/axios.ts';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // Fetch user to determine redirect
      const { data } = await api.get('/auth/me');
      const user = data.data;
      useAuthStore.setState({ user });
      toast.success('Welcome back!');
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100/50 px-3 py-1 mb-4 shadow-sm">
          <Sparkles className="h-3 w-3 text-primary-500 fill-primary-500" />
          <span className="text-xs font-semibold text-primary-600">Welcome back</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="mt-2 font-body text-[15px] text-slate-500">
          Continue managing your business taxes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full py-3 text-[15px] rounded-xl">
          Sign in
          {!isLoading && <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />}
        </Button>
      </form>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <p className="text-center font-body text-[15px] text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
