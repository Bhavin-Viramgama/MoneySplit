import type { ReactNode } from 'react';
import { Logo } from '../../../components/ui/Logo';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Shared layout wrapper for login/register pages.
 * Centered card with animated gradient background.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[var(--color-ms-bg-primary)]">
        {/* Gradient orbs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--color-ms-accent) 0%, transparent 70%)',
            animation: 'ms-float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            animation: 'ms-float 10s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, var(--color-ms-positive) 0%, transparent 70%)',
            animation: 'ms-float 12s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md ms-animate-slide-up">
        <div
          className="
            ms-glass-strong
            rounded-[var(--radius-ms-xl)]
            shadow-[var(--shadow-ms-lg)]
            p-8 sm:p-10
          "
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo size="lg" animated />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-ms-text-primary)] mb-1.5">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[var(--color-ms-text-secondary)]">{subtitle}</p>
            )}
          </div>

          {/* Form content */}
          {children}
        </div>

        {/* Bottom subtle text */}
        <p className="text-center text-xs text-[var(--color-ms-text-muted)] mt-6">
          Track finances between friends, transparently.
        </p>
      </div>
    </div>
  );
}
