import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * Route guard for public pages (login, register).
 * Redirects authenticated users away from auth pages.
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { session, initialized } = useAuth();

  if (!initialized) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-ms-bg-primary)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
