import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Hammer } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { findNavItem } from '../config/navigation';
import { homePathForRole } from '../utils/roles';
import { Button, Card } from '../components/ui';

// Stand-in for screens that are planned but not built. It says so plainly
// instead of showing a fake page.
export default function ComingSoonPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const item = findNavItem(user.role, pathname);
  const Icon = item?.icon ?? Hammer;

  return (
    <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-marian-50 text-marian-700">
        <Icon aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-black text-navy-900">{item?.label ?? 'This page'}</h1>
      <p className="mt-2 text-base leading-relaxed text-navy-700">
        {item?.description ?? 'This page does not exist yet.'}
      </p>
      <p className="mt-4 rounded-lg bg-navy-50 p-3 text-sm text-navy-700">
        This screen is planned but not built yet. It needs the school server and database before it can show
        real information.
      </p>
      <Button as={Link} to={homePathForRole(user.role)} variant="secondary" icon={ArrowLeft} className="mt-6">
        Back to dashboard
      </Button>
    </Card>
  );
}
