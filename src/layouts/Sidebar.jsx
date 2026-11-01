import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import Logo from '../components/Logo';
import { Avatar, Spinner } from '../components/ui';
import { navFor } from '../config/navigation';
import { ROLE_LABELS } from '../utils/roles';
import { SCHOOL } from '../utils/config';

// Navigation list for the signed-in role. Used as a fixed column on large
// screens and inside a slide-over drawer on small ones.
export default function Sidebar({ user, onSignOut, signingOut, onClose, closeRef }) {
  const items = navFor(user.role);

  return (
    <div className="flex h-full flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">{SCHOOL.name}</p>
          <p className="mt-0.5 text-xs text-navy-100">School Portal</p>
        </div>
        {onClose && (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-10 items-center justify-center rounded-lg text-navy-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-marian-300"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {items.map(({ to, label, icon: Icon, end, ready }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-marian-300',
                    isActive
                      ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--color-blush-300)]'
                      : 'text-navy-100 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="flex-1">{label}</span>
                {!ready && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-navy-100">
                    Soon
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-navy-100">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/25 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-marian-300 disabled:opacity-60"
        >
          {signingOut ? <Spinner className="size-4" /> : <LogOut aria-hidden="true" className="size-4" />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
