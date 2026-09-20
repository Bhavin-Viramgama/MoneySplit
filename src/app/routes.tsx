import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { DashboardPage } from '../features/friendships/pages/DashboardPage';
import { InviteAcceptPage } from '../features/friendships/pages/InviteAcceptPage';
import { FriendshipPage } from '../features/ledger/pages/FriendshipPage';
import { GroupDetailsPage } from '../features/groups/pages/GroupDetailsPage';
import { ProfileSettingsPage } from '../features/payments/pages/ProfileSettingsPage';
import { ProfilePage } from '../features/auth/pages/ProfilePage';

/**
 * Page wrapper for animations
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

/**
 * Application route configuration.
 *
 * Public routes: /login, /register
 * Protected routes: / (dashboard), and future pages
 */
export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
      {/* Public routes — redirect to dashboard if authenticated */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <PageTransition>
              <LoginPage />
            </PageTransition>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <PageTransition>
              <RegisterPage />
            </PageTransition>
          </PublicRoute>
        }
      />

      {/* Protected routes — require authentication */}
      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
        <Route path="/invite/:token" element={<PageTransition><InviteAcceptPage /></PageTransition>} />
        <Route path="/friendship/:id" element={<PageTransition><FriendshipPage /></PageTransition>} />
        <Route path="/groups/:id" element={<PageTransition><GroupDetailsPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><ProfileSettingsPage /></PageTransition>} />
        {/* Future milestone routes will be added here */}
      </Route>

      {/* Catch-all — redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
