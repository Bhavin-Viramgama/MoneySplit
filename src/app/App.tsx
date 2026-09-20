import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/hooks/useAuth';
import { AppRoutes } from './routes';

/**
 * Root application component.
 * Wraps the app with auth context and router.
 */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
