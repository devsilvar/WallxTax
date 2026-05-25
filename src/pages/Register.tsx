import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store.ts';
import Button from '@/components/ui/Button.tsx';
import Input from '@/components/ui/Input.tsx';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-gray-300" />
      )}
      <span className={`text-xs font-body ${met ? 'text-green-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
  const allMet = Object.values(rules).every(Boolean);
  const passwordTouched = password.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!allMet) {
      toast.error('Password does not meet requirements');
      return;
    }
    setIsLoading(true);
    try {
      await register(email, phone, password);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-2 font-body text-[15px] text-gray-500">
          Start managing your taxes in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 2348012345678"
        />

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>

          {/* Password strength rules */}
          {passwordTouched && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              <PasswordRule met={rules.length} label="8+ characters" />
              <PasswordRule met={rules.uppercase} label="Uppercase letter" />
              <PasswordRule met={rules.lowercase} label="Lowercase letter" />
              <PasswordRule met={rules.number} label="Number" />
            </div>
          )}
        </div>

        <div className="relative">
          <Input
            label="Confirm password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
            error={
              confirmPassword.length > 0 && password !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full py-3 text-[15px] rounded-lg">
          Create account
          {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </form>

      <div className="mt-8 border-t border-gray-100 pt-6">
        <p className="text-center font-body text-[15px] text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
