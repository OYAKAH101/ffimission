import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { homePathForRole } from '../utils/roles';
import Spinner from '../components/ui/Spinner';

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center gap-3 text-navy-700">
      <Spinner className="size-6" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// IMPORTANT: these guards are a convenience, not security.
// They stop a signed-out visitor from *seeing* a screen. Anyone can edit
// JavaScript in their own browser, so the real protection is the backend
// checking the session and the user's role on every API request.
// ----------------------------------------------------------------------------

// Waits for the "who is signed in?" check, then lets signed-in users through.
export function RequireAuth() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Checking your session…" />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  // Accounts start with a temporary password and must choose their own before using anything else.
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

// The role is read from the authenticated account, never from the URL or a
// value the person can change. A wrong-role visitor is sent to their own home.
export function RequireRole({ role }) {
  const { user } = useAuth();
  if (user.role !== role) return <Navigate to={homePathForRole(user.role)} replace />;
  return <Outlet />;
}

// "/" sends people to the right place.
export function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  return <Navigate to={user ? homePathForRole(user.role) : '/login'} replace />;
}
