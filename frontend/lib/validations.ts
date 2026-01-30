import { z } from 'zod';

// =============================================================================
// Task Validation Schemas
// =============================================================================

/**
 * Schema for creating a new task
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional()
    .or(z.literal('')),
});

/**
 * Schema for updating an existing task
 */
export const updateTaskSchema = createTaskSchema;

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// =============================================================================
// Authentication Validation Schemas
// =============================================================================

/**
 * Schema for login form
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for registration form
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be under 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must accept the Terms of Service and Privacy Policy',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for forgot password form
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema for reset password form
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// =============================================================================
// Password Strength Utility
// =============================================================================

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Calculate password strength based on various criteria
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 3) return 'fair';
  if (score <= 4) return 'good';
  return 'strong';
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak': return 'bg-error-500';
    case 'fair': return 'bg-warning-500';
    case 'good': return 'bg-info-500';
    case 'strong': return 'bg-success-500';
  }
}
