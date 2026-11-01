import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { Avatar, Badge } from '../components/ui';
import Sidebar from './Sidebar';
import { ROLE_LABELS } from '../utils/roles';
import { useAsync } from '../hooks/useAsync';
import { getCurrentTerm } from '../services/dataService';
import { formatLongDate } from '../utils/format';

// Frame for every signed-in screen: sidebar, top bar and the page content.
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const termState = useAsync(getCurrentTerm, []);
  const term = termState.data;
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const wasOpen = useRef(false);

  // Close the drawer after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Drawer behaviour: Escape closes it, the page behind does not scroll,
  // focus moves into the drawer and returns to the menu button afterwards.
  useEffect(() => {
    if (menuOpen) {
      wasOpen.current = true;
      closeButtonRef.current?.focus();
      const onKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false);
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        document.body.style.overflow = '';
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      menuButtonRef.current?.focus();
    }
    return undefined;
  }, [menuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-navy-900 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <Sidebar user={user} onSignOut={handleSignOut} signingOut={signingOut} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-navy-900/60"
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="relative h-full w-72 max-w-[85%] shadow-2xl"
          >
            <Sidebar
              user={user}
              onSignOut={handleSignOut}
              signingOut={signingOut}
              onClose={() => setMenuOpen(false)}
              closeRef={closeButtonRef}
            />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-100 bg-white px-4 sm:px-6 lg:px-8">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="-ml-2 flex size-11 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-marian-600 lg:hidden"
        >
          <Menu aria-hidden="true" className="size-6" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy-900">{ROLE_LABELS[user.role]} portal</p>
          <p className="hidden truncate text-xs text-navy-600 sm:block">{formatLongDate(new Date())}</p>
        </div>

        {term && (
          <span className="hidden md:inline-flex">
            <Badge tone="info">
              {term.session} {term.term}
            </Badge>
          </span>
        )}
        <div className="hidden items-center gap-2.5 sm:flex">
          <Avatar name={user.name} />
          <span className="hidden max-w-44 truncate text-sm font-semibold text-navy-900 xl:block">
            {user.name}
          </span>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
