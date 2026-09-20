import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { loginSchema } from '../../../lib/validation';
import { useAuth } from '../hooks/useAuth';
import type { ZodError } from 'zod';

/**
 * Login form with username + password.
 * No "Forgot Password" link — recovery is deferred to Milestone 2.
 */
export function LoginForm() {
  const { signIn, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Validate with Zod
    const result = loginSchema.safeParse({ username, password });
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

    // Attempt login
    const { error } = await signIn(result.data.username, result.data.password);
    if (error) {
      setGeneralError(error);
    }
    // On success, the auth context handles redirect via session change
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 ms-stagger">
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
          leftIcon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        />
      </div>

      <div className="ms-animate-fade-in" style={{ animationDelay: '120ms', opacity: 0 }}>
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
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
      </div>

      <div className="ms-animate-fade-in" style={{ animationDelay: '180ms', opacity: 0 }}>
        <Button
          type="submit"
          fullWidth
          loading={loading}
          size="lg"
        >
          Sign In
        </Button>
      </div>

      {/* Register link */}
      <p
        className="text-center text-sm text-[var(--color-ms-text-secondary)] ms-animate-fade-in"
        style={{ animationDelay: '240ms', opacity: 0 }}
      >
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="
            text-[var(--color-ms-accent-light)]
            hover:text-[var(--color-ms-accent-hover)]
            font-medium
            transition-colors duration-[var(--duration-ms-fast)]
          "
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
