import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '../../../types';
import * as authService from '../services/auth.service';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider — wraps the application with auth state management.
 *
 * - Restores session on mount
 * - Listens to auth state changes (login, logout, token refresh, expiry)
 * - Fetches the user profile when authenticated
 * - Provides signIn, signUp, signOut actions
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch profile when we have a user
  const loadProfile = useCallback(async (userId: string) => {
    const data = await authService.fetchProfile(userId);
    if (data) {
      setProfile(data as UserProfile);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Initial session check
    authService.getSession().then(({ session: currentSession }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        loadProfile(currentSession.user.id);
      }
      setInitialized(true);
    });

    // Subscribe to changes
    const unsubscribe = authService.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, [loadProfile]);

  const handleSignIn = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        const result = await authService.signIn(username, password);
        if (result.error) {
          return { error: result.error };
        }
        // Session will be set by onAuthStateChange listener
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSignUp = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        const result = await authService.signUp(username, password);
        if (result.error) {
          return { error: result.error };
        }
        // Session will be set by onAuthStateChange listener
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        initialized,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
