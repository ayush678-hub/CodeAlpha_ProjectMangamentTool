import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AtSign } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Account created!', 'Welcome to Collabo 🎉');
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed';
      toast.error('Registration failed', msg);
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Create account</h1>
        <p className="text-slate-400">Get started with Collabo for free</p>
      </div>

      <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
        <Input
          {...register('name')}
          label="Full Name"
          placeholder="Alex Johnson"
          icon={User}
          error={errors.name?.message}
          autoComplete="name"
        />

        <Input
          {...register('username')}
          label="Username"
          placeholder="alexjohnson"
          icon={AtSign}
          error={errors.username?.message}
          autoComplete="username"
        />

        <Input
          {...register('email')}
          label="Work Email"
          type="email"
          placeholder="alex@company.com"
          icon={Mail}
          error={errors.email?.message}
          autoComplete="email"
        />

        <Input
          {...register('password')}
          label="Password"
          type="password"
          placeholder="Min. 8 chars, 1 uppercase, 1 number"
          icon={Lock}
          error={errors.password?.message}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={registerMutation.isPending}
          className="mt-2"
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
