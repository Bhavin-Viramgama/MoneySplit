import { useState, type FormEvent, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { registerSchema } from '../../../lib/validation';
import { USERNAME_REGEX, PASSWORD_MIN_LENGTH } from '../../../lib/constants';
import { useAuth } from '../hooks/useAuth';
import type { ZodError } from 'zod';

/**
 * Registration form with username + password + confirm password.
 * Live validation feedback, password strength indicator.
 */
export function RegisterForm() {
  const { signUp, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Live username format feedback
  const usernameStatus = useMemo(() => {
    if (!username) return null;
    const trimmed = username.trim();
    if (trimmed.length < 3) return { valid: false, message: 'Too short' };
    if (trimmed.length > 24) return { valid: false, message: 'Too long' };
    if (!USERNAME_REGEX.test(trimmed)) {
      return { valid: false, message: 'Only letters, numbers, and underscores' };
    }
    return { valid: true, message: 'Looks good!' };
  }, [username]);

  // Password strength indicator
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= PASSWORD_MIN_LENGTH) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 'weak', color: 'var(--color-ms-negative)', width: '20%' };
    if (score <= 2) return { level: 'fair', color: 'var(--color-ms-warning)', width: '40%' };
    if (score <= 3) return { level: 'good', color: 'var(--color-ms-accent)', width: '65%' };
    if (score <= 4) return { level: 'strong', color: 'var(--color-ms-positive)', width: '85%' };
    return { level: 'excellent', color: 'var(--color-ms-positive)', width: '100%' };
  }, [password]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Validate with Zod
    const result = registerSchema.safeParse({ username, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      (result.error as ZodError).issues.forEach((issue) => {
        const field = issue.path[0];
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Attempt registration
    const { error } = await signUp(result.data.username, result.data.password);
    if (error) {
      setGeneralError(error);
    }
    // On success, the auth context handles redirect via session change
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* General error */}
      {generalError && (
        <div
          role="alert"
          className="
            ms-animate-fade-in
            p-3 rounded-[var(--radius-ms-md)]
            bg-[var(--color-ms-negative-muted)]
            border border-[var(--color-ms-negative)]/20
            text-sm text-[var(--color-ms-negative-light)]
            flex items-center gap-2
          "
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          {generalError}
        </div>
      )}

      {/* Username */}
      <div className="ms-animate-fade-in" style={{ animationDelay: '60ms', opacity: 0 }}>
        <Input
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="your_username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          disabled={loading}
          helperText={
            usernameStatus
              ? undefined
              : 'Letters, numbers, and underscores. 3–24 characters.'
          }
          leftIcon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        />
        {/* Live username validation */}
        {usernameStatus && !errors.username && (
          <p
            className={`text-xs mt-1 flex items-center gap-1 ${
              usernameStatus.valid
                ? 'text-[var(--color-ms-positive)]'
                : 'text-[var(--color-ms-warning)]'
            }`}
          >
            {usernameStatus.valid ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {usernameStatus.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="ms-animate-fade-in" style={{ animationDelay: '120ms', opacity: 0 }}>
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
          showPasswordToggle
          leftIcon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />
        {/* Password strength bar */}
        {passwordStrength && !errors.password && (
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full bg-[var(--color-ms-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: passwordStrength.width,
                  backgroundColor: passwordStrength.color,
                }}
              />
            </div>
            <p
              className="text-xs capitalize"
              style={{ color: passwordStrength.color }}
            >
              {passwordStrength.level}
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div className="ms-animate-fade-in" style={{ animationDelay: '180ms', opacity: 0 }}>
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          disabled={loading}
          showPasswordToggle
          leftIcon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          }
        />
      </div>

      {/* Submit */}
      <div className="ms-animate-fade-in" style={{ animationDelay: '240ms', opacity: 0 }}>
        <Button
          type="submit"
          fullWidth
          loading={loading}
          size="lg"
        >
          Create Account
        </Button>
      </div>

      {/* Login link */}
      <p
        className="text-center text-sm text-[var(--color-ms-text-secondary)] ms-animate-fade-in"
        style={{ animationDelay: '300ms', opacity: 0 }}
      >
        Already have an account?{' '}
        <Link
          to="/login"
          className="
            text-[var(--color-ms-accent-light)]
            hover:text-[var(--color-ms-accent-hover)]
            font-medium
            transition-colors duration-[var(--duration-ms-fast)]
          "
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
