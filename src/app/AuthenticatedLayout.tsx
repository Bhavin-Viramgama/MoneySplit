import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';

/**
 * Authenticated layout shell.
 *
 * Minimal for Milestone 1:
 * - Top navigation bar with logo, username, and logout
 * - Main content area via <Outlet />
 * - Responsive: full-width on mobile
 */
export function AuthenticatedLayout() {
  const { profile, signOut, loading } = useAuth();
  const displayName = profile?.display_name || profile?.username || 'User';

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[var(--color-ms-bg-primary)] overflow-hidden relative">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/" className="hover:opacity-80 transition-opacity">
                <Logo size="sm" />
              </Link>
            </div>

            {/* Right side — settings + user info + logout */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Settings Icon (Mobile & PC) */}
              <Link to="/settings" className="p-2 text-slate-400 hover:text-white transition-colors" title="Settings">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>

              {/* Avatar + username */}
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div
                  className="
                    w-8 h-8 rounded-full
                    bg-gradient-to-r from-[var(--color-ms-accent)] via-[#818cf8] to-[var(--color-ms-accent-light)]
                    flex items-center justify-center
                    text-sm font-bold text-white
                    shadow-[var(--shadow-ms-sm)]
                  "
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-[var(--color-ms-text-primary)]">
                  {displayName}
                </span>
              </Link>

              {/* Logout */}
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                loading={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 relative w-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
