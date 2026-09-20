import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that requires authentication.
 * Shows loading spinner during session restoration.
 * Redirects to /login if unauthenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, initialized } = useAuth();

  // Still loading — show spinner
  if (!initialized) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-ms-bg-primary)]">
        <div className="text-center space-y-4 ms-animate-fade-in">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-[var(--color-ms-text-muted)]">Restoring session…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
