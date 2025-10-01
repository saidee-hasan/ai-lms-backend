import { z } from 'zod';

export const registerValidation = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['student', 'instructor', 'admin']).default('student')
  })
});

export const loginValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

export const updateProfileValidation = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    avatar: z.string().url('Invalid URL').optional()
  })
});

export const changePasswordValidation = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters')
  })
});

export const forgotPasswordValidation = z.object({
  body: z.object({
    email: z.string().email('Invalid email address')
  })
});

export const resetPasswordValidation = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters')
  })
});