import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { toast } from '../stores/uiStore';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();
  const [sent, setSent] = React.useState(false);

  const mutation = useMutation({
    mutationFn: (data: { email: string }) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
    onError: () => toast.error('Error', 'Something went wrong'),
  });

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Check your email</h2>
        <p className="text-slate-400 mb-6">We've sent a password reset link to your email if it exists in our system.</p>
        <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-100 mb-2">Reset password</h1>
      <p className="text-slate-400 mb-8">Enter your email and we'll send you a reset link.</p>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          {...register('email', { required: 'Email is required' })}
          label="Email"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          error={errors.email?.message}
        />
        <Button type="submit" fullWidth size="lg" isLoading={mutation.isPending}>
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}

// Missing React import
import React from 'react';
