import { z } from 'zod';
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
  USERNAME_ALLOWED_CHARS_DISPLAY,
  PASSWORD_MIN_LENGTH,
} from './constants';

/**
 * Username validation schema.
 * Matches database CHECK constraint: ^[a-z0-9_]{3,24}$
 */
export const usernameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
  .max(USERNAME_MAX_LENGTH, `Username must be at most ${USERNAME_MAX_LENGTH} characters`)
  .transform((val) => val.trim())
  .refine(
    (val) => USERNAME_REGEX.test(val),
    `Username can only contain ${USERNAME_ALLOWED_CHARS_DISPLAY}`
  );

/**
 * Password validation schema.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);

/**
 * Login form schema.
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/**
 * Registration form schema.
 */
export const registerSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Inferred types */
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
