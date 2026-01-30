'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import {
  resetPasswordSchema,
  type ResetPasswordInput,
  calculatePasswordStrength,
  getPasswordStrengthColor,
} from '@/lib/validations';
import { CheckCircle, Eye, EyeOff, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword, isLoading } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [password, setPassword] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Watch password for strength indicator
  const watchedPassword = watch('password');
  React.useEffect(() => {
    setPassword(watchedPassword || '');
  }, [watchedPassword]);

  const passwordStrength = calculatePasswordStrength(password);
  const strengthColor = getPasswordStrengthColor(passwordStrength);
  const strengthLabels = { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' };

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) return;
    try {
      await resetPassword(token, data.password);
    } catch (error) {
      // Error is handled in AuthProvider
    }
  };

  // Show error if no token
  if (!token) {
    return (
      <div className="w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl shadow-xl p-6 sm:p-8 text-center"
        >
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-error-600" />
            </div>
          </div>

          {/* Header */}
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>

          {/* Actions */}
          <div className="space-y-4">
            <Link href="/forgot-password">
              <Button className="w-full">Request New Link</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl shadow-xl p-6 sm:p-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
          <p className="text-muted-foreground mt-2">
            Your new password must be different from previous passwords.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              error={errors.password?.message}
              disabled={isLoading}
              iconTrailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register('password')}
            />

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {['weak', 'fair', 'good', 'strong'].map((level, index) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        index <=
                        ['weak', 'fair', 'good', 'strong'].indexOf(passwordStrength)
                          ? strengthColor
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength:{' '}
                  <span className="font-medium">{strengthLabels[passwordStrength]}</span>
                </p>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            disabled={isLoading}
            iconTrailing={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isLoading}
          >
            Reset Password
          </Button>
        </form>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-md px-4">
          <div className="glass rounded-2xl shadow-xl p-6 sm:p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  );
}
