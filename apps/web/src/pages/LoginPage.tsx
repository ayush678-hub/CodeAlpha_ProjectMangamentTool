import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome back!', `Signed in as ${data.user.name}`);
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed';
      toast.error('Login failed', msg);
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Welcome back</h1>
        <p className="text-slate-400">Sign in to your Collabo workspace</p>
      </div>

      <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
        <Input
          {...register('email')}
          label="Email"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          error={errors.email?.message}
          autoComplete="email"
        />

        <Input
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon={Lock}
          iconRight={showPassword ? EyeOff : Eye}
          onIconRightClick={() => setShowPassword(!showPassword)}
          error={errors.password?.message}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={loginMutation.isPending}
          className="mt-2"
        >
          Sign in
        </Button>
      </form>

      {/* Demo accounts */}
      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs font-medium text-slate-400 mb-2">Demo accounts:</p>
        <div className="space-y-1">
          {[
            { email: 'admin@collabo.dev', role: 'Owner' },
            { email: 'member@collabo.dev', role: 'Member' },
          ].map(({ email, role }) => (
            <button
              key={email}
              type="button"
              onClick={() => {
                loginMutation.mutate({ email, password: 'Password123!' });
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/8 transition-colors group"
            >
              <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{email}</span>
              <span className="text-xs text-primary-400">{role}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-slate-500 mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
